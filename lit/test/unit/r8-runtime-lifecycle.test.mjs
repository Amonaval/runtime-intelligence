import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import { ReactIntelligenceRuntime } from '../../src/react/ReactIntelligenceRuntime.js';
import { VueIntelligenceRuntime } from '../../src/vue/VueIntelligenceRuntime.js';
import { LitIntelligencePipeline } from '../../src/integration/lit/LitIntelligencePipeline.js';
import { installLitIntelligencePanelPresentation } from '../../src/integration/lit/panel-intelligence-presentation.js';
import { ownBrowserProperty } from '../../src/integration/shared/owned-browser-properties.js';

function fixture() {
  const listeners = new Map();
  const win = {
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    document: { querySelectorAll: () => [] },
    customElements: { get: () => undefined, whenDefined: () => new Promise(() => {}) },
  };
  const store = new EvidenceStore({ privacyPolicy: false });
  const subscribe = store.subscribe.bind(store);
  const live = new Set();
  store.subscribe = fn => {
    live.add(fn);
    const cleanup = subscribe(fn);
    return () => { live.delete(fn); cleanup(); };
  };
  return { win, store, live, listenerCount: () => [...listeners.values()].reduce((n, set) => n + set.size, 0) };
}

test('React and Vue runtime overlap restores the live pipeline in either stop order and releases stores and listeners', () => {
  for (const order of [[0, 1], [1, 0]]) {
    const f = fixture();
    const original = { value: 'host-pipeline', writable: true, configurable: true, enumerable: false };
    Object.defineProperty(f.win, '__LDS_INTELLIGENCE_PIPELINE__', original);
    const originalPush = () => 'host-result';
    const originalReplace = () => 'host-replace';
    f.win.history = { pushState: originalPush, replaceState: originalReplace };
    const runtimes = [new ReactIntelligenceRuntime({ store: f.store, windowTarget: f.win }), new VueIntelligenceRuntime({ store: f.store, windowTarget: f.win })];
    runtimes.forEach(r => r.start());
    const newest = f.win.__LDS_INTELLIGENCE_PIPELINE__;
    assert.equal(f.listenerCount() > 0, true);
    runtimes[order[0]].stop();
    assert.equal(typeof f.win.__LDS_INTELLIGENCE_PIPELINE__.snapshot, 'function');
    if (order[0] === 0) assert.equal(f.win.__LDS_INTELLIGENCE_PIPELINE__, newest);
    else assert.notEqual(f.win.__LDS_INTELLIGENCE_PIPELINE__, newest);
    runtimes[order[1]].stop();
    assert.deepEqual(Object.getOwnPropertyDescriptor(f.win, '__LDS_INTELLIGENCE_PIPELINE__'), original);
    assert.equal('__LDS_INTELLIGENCE__' in f.win, false);
    assert.equal(f.win.history.pushState, originalPush);
    assert.equal(f.win.history.replaceState, originalReplace);
    assert.equal(f.live.size, 0);
    assert.equal(f.listenerCount(), 0);
  }
});

test('repeated Lit pipeline start/stop releases export, watch, analysis globals and subscriptions', () => {
  const f = fixture();
  const runtime = new LitIntelligencePipeline({ store: f.store, windowTarget: f.win, adapter: null });
  for (let iteration = 0; iteration < 25; iteration++) {
    runtime.start();
    assert.equal(f.win.__LDS_INTELLIGENCE_PIPELINE__, runtime);
    assert.equal(typeof f.win.__LDS_EXPORT_SESSION_REPORT__, 'function');
    runtime.stop();
    runtime.resume(); // Explicit old controller calls must not reinstall stopped globals.
    for (const key of ['INTELLIGENCE_PIPELINE', 'INTELLIGENCE', 'CASCADE_REPORT', 'EXPORT_SESSION_REPORT', 'FALCOR_CALL_GRAPH', 'SEQUENTIAL_API_DETECTOR', 'WATCH_PROPERTY', 'UNWATCH_PROPERTY']) {
      assert.equal(`__LDS_${key}__` in f.win, false, key);
    }
    assert.equal(f.live.size, 0);
    assert.equal(f.listenerCount(), 0);
  }
});

test('owned property retains host replacements across update and arbitrary teardown order', () => {
  const target = {};
  const a = ownBrowserProperty(target, 'value', 'first');
  const b = ownBrowserProperty(target, 'value', 'second');
  Object.defineProperty(target, 'value', { get: () => 'host', configurable: true, enumerable: false });
  b.update('updated'); a.release(); b.release();
  assert.equal(target.value, 'host');
  assert.equal(Object.getOwnPropertyDescriptor(target, 'value').enumerable, false);
});

test('managed pending panel definition does not install a stale bridge after cleanup', async () => {
  const f = fixture();
  let defined;
  f.win.customElements.whenDefined = () => new Promise(resolve => { defined = resolve; });
  class Panel {}
  const cleanup = installLitIntelligencePanelPresentation({ target: f.win, managed: true });
  cleanup();
  f.win.customElements.get = () => Panel;
  defined(); await Promise.resolve();
  assert.equal(Panel.prototype.__ldsIntelligencePresentationPatched, undefined);
  assert.equal(f.listenerCount(), 0);
  assert.equal('__LDS_INTELLIGENCE_PANEL_BRIDGE_INSTALLED__' in f.win, false);
  assert.equal(installLitIntelligencePanelPresentation({ target: f.win }), true);
  assert.equal(f.listenerCount(), 2); // Boolean legacy API intentionally has page lifetime.
});

test('public Lit activation stop detaches connected owners and permits a fresh page session', async t => {
  const { LitDebugMixin } = await import('../../src/LitDebugMixin.js');
  const { configureLitRuntimeIntelligence } = await import('../../src/lit/configureLitRuntimeIntelligence.js');
  const { evidenceStore } = await import('../../src/core/evidence-store.js');
  const f = fixture();
  const previous = globalThis.window;
  globalThis.window = f.win;
  t.after(() => { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; });
  class Base { constructor() { this.localName = 'r8-owner'; this.tagName = 'R8-OWNER'; } requestUpdate() {} performUpdate() {} }
  const Element = LitDebugMixin(Base);
  for (let iteration = 0; iteration < 3; iteration++) {
    const control = configureLitRuntimeIntelligence({ enabled: true, tools: { intelligence: true } });
    const element = new Element();
    element.connectedCallback();
    const before = evidenceStore.snapshot().filter(e => e.type === 'owner.destroyed').length;
    assert.equal(typeof f.win.__LDS_INTELLIGENCE_PIPELINE__.snapshot, 'function');
    assert.equal(control.stop(), true);
    assert.equal(evidenceStore.snapshot().filter(e => e.type === 'owner.destroyed').length, before + 1);
    assert.equal('__LDS_INTELLIGENCE_PIPELINE__' in f.win, false);
    assert.equal(f.listenerCount(), 0);
    element.disconnectedCallback();
    assert.equal(evidenceStore.snapshot().filter(e => e.type === 'owner.destroyed').length, before + 1);
  }
});

test('Lit update settled after stop and reconnect cannot complete the new owner update', async t => {
  const { LitDebugMixin } = await import('../../src/LitDebugMixin.js');
  const { configureLitRuntimeIntelligence } = await import('../../src/lit/configureLitRuntimeIntelligence.js');
  const { evidenceStore } = await import('../../src/core/evidence-store.js');
  const f = fixture();
  const previous = globalThis.window;
  globalThis.window = f.win;
  t.after(() => { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; });
  let settle;
  class Base {
    constructor() { this.localName = 'r8-async'; this.tagName = 'R8-ASYNC'; }
    requestUpdate() {}
    performUpdate() { return new Promise(resolve => { settle = resolve; }); }
  }
  const element = new (LitDebugMixin(Base))();
  let controller = configureLitRuntimeIntelligence({ enabled: true, tools: { intelligence: true } });
  element.connectedCallback();
  const pending = element.performUpdate();
  controller.stop();
  controller = configureLitRuntimeIntelligence({ enabled: true, tools: { intelligence: true } });
  t.after(() => controller.stop());
  element.connectedCallback();
  const before = evidenceStore.snapshot().filter(e => e.type === 'component.update.completed').length;
  settle(); await pending;
  assert.equal(evidenceStore.snapshot().filter(e => e.type === 'component.update.completed').length, before);
  controller.stop();
});

test('Lit selective session stop preserves independently acquired network and vitals collectors', async t => {
  const { LitDebugMixin } = await import('../../src/LitDebugMixin.js');
  const { configureLitRuntimeIntelligence } = await import('../../src/lit/configureLitRuntimeIntelligence.js');
  const { LdsNetwork } = await import('../../src/core/network.js');
  const { LdsVitals } = await import('../../src/core/vitals.js');
  const previous = globalThis.window;
  const f = fixture();
  const originalFetch = async () => ({ headers: { get: () => '0' }, status: 200 });
  const observers = [];
  f.win.fetch = originalFetch;
  f.win.PerformanceObserver = class {
    constructor() { this.disconnected = false; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  };
  globalThis.window = f.win;
  t.after(() => {
    LdsNetwork.detach(); LdsVitals.detach();
    if (previous === undefined) delete globalThis.window; else globalThis.window = previous;
  });
  assert.equal(LdsNetwork.init(), true);
  assert.equal(LdsVitals.init(), true);
  const externalFetchPatch = f.win.fetch;
  const control = configureLitRuntimeIntelligence({ enabled: true, tools: { intelligence: true, network: false, vitals: false } });
  t.after(() => control.stop());
  class Base { constructor() { this.localName = 'r8-selective'; this.tagName = 'R8-SELECTIVE'; } requestUpdate() {} performUpdate() {} }
  const element = new (LitDebugMixin(Base))();
  element.connectedCallback();
  control.stop();
  assert.equal(f.win.fetch, externalFetchPatch);
  assert.equal(observers.length > 0, true);
  assert.equal(observers.some(observer => observer.disconnected), false);
  LdsNetwork.detach(); LdsVitals.detach();
  assert.equal(f.win.fetch, originalFetch);
  assert.equal(observers.every(observer => observer.disconnected), true);
});
