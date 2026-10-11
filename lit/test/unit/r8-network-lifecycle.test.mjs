import test from 'node:test';
import assert from 'node:assert/strict';
import { LdsNetwork } from '../../src/core/network.js';

function host(t) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const requests = [];
  class Xhr {
    handlers = new Set();
    status = 200;
    open(method, url) { this.method = method; this.url = url; }
    send() { if (this.failSend) throw this.failSend; return 'sent'; }
    addEventListener(type, fn) { this.handlers.add(fn); }
    removeEventListener(type, fn) { this.handlers.delete(fn); }
    getResponseHeader() { return '1024'; }
    complete() { for (const fn of [...this.handlers]) fn(); }
  }
  const win = { XMLHttpRequest: Xhr, location: { href: 'https://app.example/' }, performance: { now: () => 10 }, fetch: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) };
  const originalFetch = win.fetch;
  const originalOpen = Xhr.prototype.open, originalSend = Xhr.prototype.send;
  Object.defineProperty(globalThis, 'window', { value: win, configurable: true, writable: true });
  const entries = [];
  const unsubscribe = LdsNetwork.subscribe(entry => entries.push(entry));
  t.after(() => { LdsNetwork.detach(); LdsNetwork.detach(); unsubscribe(); if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window; });
  return { win, Xhr, requests, entries, originalFetch, originalOpen, originalSend };
}

test('fetch completions from a stopped generation preserve results/rejections without polluting restarted evidence', async t => {
  const h = host(t);
  LdsNetwork.init();
  const oldSuccess = h.win.fetch('/old-success');
  const oldFailure = h.win.fetch('/old-failure');
  const failure = new Error('original transport rejection');
  // Attach a rejection assertion before settling the promise.
  const rejected = assert.rejects(oldFailure, error => error === failure);
  LdsNetwork.detach();
  assert.equal(h.win.fetch, h.originalFetch);
  LdsNetwork.init();
  const current = h.win.fetch('/current');
  const response = { status: 200, headers: { get: () => '1024' } };
  h.requests[0].resolve(response); h.requests[1].reject(failure); h.requests[2].resolve(response);
  assert.equal(await oldSuccess, response);
  await rejected;
  assert.equal(await current, response);
  assert.deepEqual(h.entries.map(e => e.url), ['/current']);
});

test('XHR listeners are released on completion, final detach and synchronous send failure', t => {
  const h = host(t);
  LdsNetwork.init(); LdsNetwork.init();
  const xhr = new h.Xhr();
  xhr.open('GET', '/first');
  assert.equal(xhr.send(), 'sent');
  assert.equal(xhr.handlers.size, 1);
  LdsNetwork.detach();
  assert.equal(xhr.handlers.size, 1, 'another client still owns collection');
  xhr.complete(); xhr.complete();
  assert.equal(xhr.handlers.size, 0);
  assert.equal(h.entries.length, 1);
  xhr.open('GET', '/pending'); xhr.send();
  const late = [...xhr.handlers][0];
  LdsNetwork.detach();
  assert.equal(xhr.handlers.size, 0);
  assert.equal(h.Xhr.prototype.open, h.originalOpen);
  assert.equal(h.Xhr.prototype.send, h.originalSend);
  LdsNetwork.init(); late();
  assert.equal(h.entries.length, 1, 'detached request cannot emit after restart');
  const bad = new h.Xhr(); bad.open('GET', '/throws');
  bad.failSend = new Error('send failed');
  assert.throws(() => bad.send(), error => error === bad.failSend);
  assert.equal(bad.handlers.size, 0);
});

test('100 XHR reuse cycles retain no loadend handlers and report one completion per request', t => {
  const h = host(t);
  const xhr = new h.Xhr();
  for (let i = 0; i < 100; i++) {
    LdsNetwork.init();
    xhr.open('GET', `/request-${i}`); xhr.send(); xhr.complete();
    assert.equal(xhr.handlers.size, 0);
    LdsNetwork.detach();
  }
  assert.equal(h.entries.length, 100);
  assert.equal(new Set(h.entries.map(e => e.url)).size, 100);
});
