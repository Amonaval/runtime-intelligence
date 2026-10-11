import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  createRuntimeIntelligenceLoader,
  isRuntimeIntelligenceEnabled,
} from '../../src/loader/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const sourceUrl = relativePath => pathToFileURL(path.join(root, relativePath)).href;

async function withWindow(fakeWindow, fn) {
  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, 'window');
  const previousWindow = globalThis.window;
  globalThis.window = fakeWindow;
  try { return await fn(); }
  finally {
    if (hadWindow) globalThis.window = previousWindow;
    else delete globalThis.window;
  }
}

test('conditional loader fails closed and invokes zero module loaders when disabled', async () => {
  const calls = [];
  const load = createRuntimeIntelligenceLoader({
    loaders: {
      core: async () => { calls.push('core'); return { kind: 'core' }; },
      react: async () => { calls.push('react'); return { kind: 'react' }; },
      lit: async () => { calls.push('lit'); return { kind: 'lit' }; },
      panel: async () => { calls.push('panel'); return { kind: 'panel' }; },
    },
  });

  assert.equal(isRuntimeIntelligenceEnabled(true), true);
  assert.equal(isRuntimeIntelligenceEnabled(1), false);
  assert.equal(isRuntimeIntelligenceEnabled('true'), false);

  const result = await load({ enabled: false, framework: 'react', panel: true });
  assert.equal(result.enabled, false);
  assert.deepEqual(calls, []);
});

test('conditional loader imports only the selected framework and optional panel', async () => {
  const calls = [];
  const load = createRuntimeIntelligenceLoader({
    loaders: {
      core: async () => { calls.push('core'); return { kind: 'core' }; },
      react: async () => { calls.push('react'); return { kind: 'react' }; },
      lit: async () => { calls.push('lit'); return { kind: 'lit' }; },
      panel: async () => { calls.push('panel'); return { kind: 'panel' }; },
    },
  });

  const result = await load({ enabled: true, framework: 'react', panel: true });
  assert.equal(result.enabled, true);
  assert.equal(result.framework, 'react');
  assert.equal(result.frameworkModule.kind, 'react');
  assert.equal(result.panelModule.kind, 'panel');
  assert.deepEqual(calls, ['react', 'panel']);
});

test('network interception is reversible and initialization makes no outbound request', { concurrency: false }, async () => {
  let outboundCalls = 0;
  class FakeXhr {
    addEventListener() {}
    getResponseHeader() { return null; }
  }
  FakeXhr.prototype.open = function () {};
  FakeXhr.prototype.send = function () {};

  const originalFetch = async () => { outboundCalls += 1; return null; };
  const originalOpen = FakeXhr.prototype.open;
  const originalSend = FakeXhr.prototype.send;
  const fakeWindow = {
    fetch: originalFetch,
    XMLHttpRequest: FakeXhr,
    location: { href: 'https://example.test/app' },
    performance: { now: () => 1 },
  };

  await withWindow(fakeWindow, async () => {
    const mod = await import(`${sourceUrl('lit/src/core/network.js')}?r6=${Date.now()}`);
    mod.LdsNetwork.init();
    assert.notEqual(fakeWindow.fetch, originalFetch);
    assert.notEqual(FakeXhr.prototype.open, originalOpen);
    assert.notEqual(FakeXhr.prototype.send, originalSend);
    assert.equal(outboundCalls, 0);

    mod.LdsNetwork.detach();
    assert.equal(fakeWindow.fetch, originalFetch);
    assert.equal(FakeXhr.prototype.open, originalOpen);
    assert.equal(FakeXhr.prototype.send, originalSend);
    assert.equal('__LDS_NETWORK_LOG__' in fakeWindow, false);
  });
});

test('console capture has no import-time globals and restores console methods on detach', { concurrency: false }, async () => {
  const messages = [];
  const fakeConsole = {
    error(...args) { messages.push(['error', ...args]); },
    warn(...args) { messages.push(['warn', ...args]); },
    log(...args) { messages.push(['log', ...args]); },
  };
  const originalError = fakeConsole.error;
  const originalWarn = fakeConsole.warn;
  const fakeWindow = {
    console: fakeConsole,
    document: {},
    addEventListener() {},
  };

  await withWindow(fakeWindow, async () => {
    const mod = await import(`${sourceUrl('lit/src/core/console.js')}?r6=${Date.now()}`);
    assert.equal('__LDS_CONSOLE__' in fakeWindow, false);
    mod.LdsConsole.attach(fakeWindow);
    assert.notEqual(fakeConsole.error, originalError);
    assert.notEqual(fakeConsole.warn, originalWarn);
    assert.equal(Array.isArray(fakeWindow.__LDS_CONSOLE__), true);

    mod.LdsConsole.detach(fakeWindow);
    assert.equal(fakeConsole.error, originalError);
    assert.equal(fakeConsole.warn, originalWarn);
    assert.equal('__LDS_CONSOLE__' in fakeWindow, false);
    assert.equal('__LDS_CONSOLE_CLEAR__' in fakeWindow, false);
  });
});

test('vitals observers disconnect when the last runtime consumer stops', { concurrency: false }, async () => {
  const observers = [];
  class FakeObserver {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  const fakeWindow = {
    PerformanceObserver: FakeObserver,
    performance: { timeOrigin: 0 },
  };

  await withWindow(fakeWindow, async () => {
    const mod = await import(`${sourceUrl('lit/src/core/vitals.js')}?r6=${Date.now()}`);
    mod.LdsVitals.init();
    assert.equal(fakeWindow.__LDS_VITALS__ != null, true);
    assert.equal(observers.length >= 4, true);

    mod.LdsVitals.detach();
    assert.equal(observers.every(observer => observer.disconnected), true);
    assert.equal('__LDS_VITALS__' in fakeWindow, false);
  });
});

test('Lit runtime gate stays off by default and honors explicit debug flags', { concurrency: false }, async () => {
  const fakeWindow = {};
  await withWindow(fakeWindow, async () => {
    const mod = await import(`${sourceUrl('lit/src/core/gate.js')}?r6=${Date.now()}`);
    assert.equal(mod._runtimeEnabled(), false);
    fakeWindow.__LDS_NETWORK_ENABLED__ = true;
    assert.equal(mod._runtimeEnabled(), true);
    delete fakeWindow.__LDS_NETWORK_ENABLED__;
    fakeWindow.__LDS_DEBUG__ = { perf: true };
    assert.equal(mod._runtimeEnabled(), true);
  });
});

test('Lit mixin gates adapter and collector work behind runtime activation', () => {
  const source = fs.readFileSync(path.join(root, 'lit/src/LitDebugMixin.js'), 'utf8');
  assert.match(source, /this\[_runtimeActive\] = _runtimeEnabled\(\)/);
  assert.match(source, /if \(!this\[_runtimeActive\]\) return/);
  assert.match(source, /if \(this\[_runtimeActive\]\) litAdapter\.recordUpdateRequested/);
});

test('React provider keeps runtime construction behind the enabled branch', () => {
  const source = fs.readFileSync(path.join(root, 'lit/src/react/RuntimeIntelligenceReact.js'), 'utf8');
  assert.match(source, /if \(enabled && !runtimeRef\.current\)/);
  assert.match(source, /const activeRuntime = enabled \? runtime : null/);
});
