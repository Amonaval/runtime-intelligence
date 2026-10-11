import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import { BrowserRuntimeSurface } from '../../src/integration/shared/browser-runtime-surface.js';

function fixture({ failSubscribe = false, failCleanup = false, failDetectorStart = false } = {}) {
  const listeners = new Map();
  const retained = [];
  const live = new Set();
  const clients = { network: 0, console: 0, vitals: 0, detector: 0 };
  const target = prefix => ({
    addEventListener(type, fn) { listeners.set(`${prefix}:${type}:${listeners.size}`, fn); retained.push([type, fn]); },
    removeEventListener(type, fn) {
      for (const [key, value] of listeners) if (key.startsWith(`${prefix}:${type}:`) && value === fn) listeners.delete(key);
      if (failCleanup) throw new Error('host cleanup failure');
    },
  });
  const win = { ...target('window'), document: target('document') };
  const subscribe = fn => {
    if (failSubscribe) throw new Error('subscription unavailable');
    live.add(fn); retained.push(['collector', fn]);
    return () => { live.delete(fn); if (failCleanup) throw new Error('unsubscribe failure'); };
  };
  const collector = key => ({
    init() { clients[key]++; }, attach() { clients[key]++; }, subscribe,
    detach() { clients[key]--; if (failCleanup) throw new Error('detach failure'); },
  });
  const options = {
    windowTarget: win, documentTarget: win.document,
    network: collector('network'), consoleCapture: collector('console'), vitals: collector('vitals'),
    sequentialDetectorFactory: ({ onOpportunity }) => ({
      start() { clients.detector++; retained.push(['sequential', onOpportunity]); if (failDetectorStart) throw new Error('start failure'); },
      stop() { clients.detector--; if (failCleanup) throw new Error('detector stop failure'); },
    }),
  };
  const surface = () => new BrowserRuntimeSurface({ ...options, store: new EvidenceStore({ privacyPolicy: false }) });
  return { win, options, surface, listeners, retained, live, clients };
}
const released = f => {
  assert.equal(f.listeners.size, 0);
  assert.equal(f.live.size, 0);
  assert.deepEqual(f.clients, { network: 0, console: 0, vitals: 0, detector: 0 });
};

test('overlapping surfaces retain page flag until last release in either order', () => {
  for (const order of [[0, 1], [1, 0]]) {
    const f = fixture();
    const original = { value: 'host', writable: true, enumerable: false, configurable: true };
    Object.defineProperty(f.win, '__LDS_INTELLIGENCE_ENABLED__', original);
    const surfaces = [f.surface().start(), f.surface().start()];
    surfaces[order[0]].stop();
    assert.equal(f.win.__LDS_INTELLIGENCE_ENABLED__, true);
    surfaces[order[1]].stop();
    assert.deepEqual(Object.getOwnPropertyDescriptor(f.win, '__LDS_INTELLIGENCE_ENABLED__'), original);
    released(f);
  }
});

test('host flag replacement survives the last surface stop', () => {
  const f = fixture();
  const a = f.surface().start(), b = f.surface().start();
  f.win.__LDS_INTELLIGENCE_ENABLED__ = 'new-host-value';
  b.stop(); a.stop();
  assert.equal(f.win.__LDS_INTELLIGENCE_ENABLED__, 'new-host-value');
  released(f);
});

test('immutable host flag does not break browser startup or cleanup', () => {
  const f = fixture();
  Object.defineProperty(f.win, '__LDS_INTELLIGENCE_ENABLED__', { value: false });
  const surface = f.surface();
  assert.doesNotThrow(() => surface.start());
  assert.equal(surface.started, true);
  assert.doesNotThrow(() => surface.stop());
  assert.equal(f.win.__LDS_INTELLIGENCE_ENABLED__, false);
  released(f);
});

test('cleanup failures cannot skip remaining owned resources; stop stays idempotent', () => {
  const f = fixture({ failCleanup: true });
  const surface = f.surface().start();
  assert.doesNotThrow(() => surface.stop().stop());
  assert.equal('__LDS_INTELLIGENCE_ENABLED__' in f.win, false);
  released(f);
});

test('subscription failures and partial detector startup release acquired resources', () => {
  for (const options of [{ failSubscribe: true }, { failDetectorStart: true }]) {
    const f = fixture(options);
    const surface = f.surface();
    assert.doesNotThrow(() => surface.start());
    surface.stop();
    released(f);
  }
});

test('100 restart cycles release listeners/subscribers and ignore callbacks from older generations', () => {
  const f = fixture();
  const store = new EvidenceStore({ privacyPolicy: false });
  const surface = new BrowserRuntimeSurface({ ...f.options, store });
  for (let cycle = 0; cycle < 100; cycle++) {
    surface.start().start();
    assert.equal(f.listeners.size, 5, 'two window + three interaction listeners, no duplicate start');
    assert.equal(f.live.size, 2);
    const current = f.retained.at(-1)[1];
    current({ target: { tagName: 'BUTTON' } });
    surface.stop().stop();
    released(f);
  }
  const count = store.snapshot().length;
  const stale = [...f.retained];
  surface.start();
  for (const [type, fn] of stale) {
    fn(type === 'collector' ? { level: 'warn', message: 'stale', url: '/stale' } : type === 'sequential' ? { callCount: 2 } : { message: 'stale', reason: 'stale', target: { tagName: 'BUTTON' } });
  }
  assert.equal(store.snapshot().length, count, 'late callbacks must not emit into restarted runtime');
  surface.stop();
  released(f);
});
