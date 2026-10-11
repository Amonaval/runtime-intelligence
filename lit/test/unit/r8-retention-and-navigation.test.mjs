import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import { UpdateBudgetMonitor } from '../../src/core/update-budget-monitor.js';
import { NavigationBridge } from '../../src/integration/shared/navigation-bridge.js';
import { installLegacyNetworkEvidenceBridge } from '../../src/integration/lit/network-evidence-bridge.js';
import { RuntimePanelEvidenceBridge } from '../../src/panel/runtime-evidence-bridge.js';

test('budget episode state is evicted at owner destruction and across bounded owner churn', () => {
  const store = new EvidenceStore({ maxEntries: 50 });
  const monitor = new UpdateBudgetMonitor({ store, budget: { countPerWindow: 1, windowMs: 100000 } }).start();
  const update = id => store.emit({ type: 'component.update.completed', owner: { id, name: id }, payload: { durationMs: 1 } });
  update('first');
  for (let i = 0; i < 1000; i++) update(`other-${i}`);
  update('first');
  assert.equal(monitor.violationCount(), 0, 'oldest history no longer retained');
  update('first');
  assert.equal(monitor.violationCount(), 1);
  store.emit({ type: 'owner.destroyed', owner: { id: 'first', name: 'first' }, payload: {} });
  update('first'); update('first');
  assert.equal(monitor.violationCount(), 2, 'destruction clears previous violating episode');
  monitor.stop();
});

test('legacy network bridge isolates stores, releases idempotently and reinstalls after cleanup', () => {
  const subscribers = new Set();
  const network = { subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); } };
  const a = new EvidenceStore(), b = new EvidenceStore();
  const first = installLegacyNetworkEvidenceBridge({ network, store: a });
  assert.equal(installLegacyNetworkEvidenceBridge({ network, store: a }), first);
  const other = installLegacyNetworkEvidenceBridge({ network, store: b });
  assert.equal(subscribers.size, 2);
  for (const fn of subscribers) fn({ url: '/test', status: 200 });
  first(); first(); other();
  assert.equal(subscribers.size, 0);
  const second = installLegacyNetworkEvidenceBridge({ network, store: a });
  assert.notEqual(second, first);
  for (const fn of subscribers) fn({ url: '/next', status: 200 });
  assert.equal(a.size(), 2); assert.equal(b.size(), 1);
  second();
});

test('navigation keeps host identity/results, preserves replacements and drops stale wrapper work', () => {
  const original = function (...args) { assert.equal(this, win.history); return args.length; };
  const win = { history: { pushState: original, replaceState: original }, location: { href: 'https://app.example/' }, addEventListener() {}, removeEventListener() {} };
  const storeA = new EvidenceStore(), storeB = new EvidenceStore();
  const a = new NavigationBridge({ store: storeA, windowTarget: win, orphanCheckDelayMs: 0 }).start();
  const old = win.history.pushState;
  const b = new NavigationBridge({ store: storeB, windowTarget: win, orphanCheckDelayMs: 0 }).start();
  assert.equal(win.history.pushState({}, '', '/test'), 3);
  a.stop();
  const before = storeA.size();
  assert.equal(win.history.pushState({}, '', '/next'), 3);
  assert.equal(storeA.size(), before);
  b.stop();
  assert.equal(win.history.pushState, original);
  a.start(); old({}, '', '/stale');
  assert.equal(storeA.size(), before);
  const replacement = () => 99;
  win.history.pushState = replacement;
  a.stop();
  assert.equal(win.history.pushState, replacement);
});

test('navigation cancels queued orphan checks instead of retaining timer work after stop', t => {
  const originalSet = globalThis.setTimeout, originalClear = globalThis.clearTimeout;
  const timers = new Map(); let sequence = 0;
  globalThis.setTimeout = callback => { const id = ++sequence; timers.set(id, callback); return id; };
  globalThis.clearTimeout = id => timers.delete(id);
  t.after(() => { globalThis.setTimeout = originalSet; globalThis.clearTimeout = originalClear; });
  const win = { history: { pushState() {}, replaceState() {} }, location: { href: '/' }, addEventListener() {}, removeEventListener() {} };
  const store = new EvidenceStore();
  const bridge = new NavigationBridge({ store, windowTarget: win }).start();
  for (let i = 0; i < 100; i++) win.history.pushState({}, '', '/next');
  assert.equal(timers.size, 1, 'rapid navigation keeps one pending settled-navigation check');
  const stale = [...timers.values()][0];
  bridge.stop(); assert.equal(timers.size, 0);
  const before = store.size(); bridge.start(); stale();
  assert.equal(store.size(), before);
  bridge.stop();
});

test('panel bridge releases live resolver/store references in either order without clobbering host', () => {
  for (const order of [[0, 1], [1, 0]]) {
    const resolver = () => 'host.js';
    const win = { __LDS_TAG_TO_FILE__: resolver, __LDS_EVIDENCE_STORE__: 'host-store', __LDS_EVIDENCE__: 'host-snapshot' };
    const bridges = [new RuntimePanelEvidenceBridge({ store: new EvidenceStore(), windowTarget: win }).start(), new RuntimePanelEvidenceBridge({ store: new EvidenceStore(), windowTarget: win }).start()];
    bridges[order[0]].stop(); bridges[order[1]].stop();
    assert.equal(win.__LDS_TAG_TO_FILE__, resolver);
    assert.equal(win.__LDS_EVIDENCE_STORE__, 'host-store'); assert.equal(win.__LDS_EVIDENCE__, 'host-snapshot');
    const bridge = new RuntimePanelEvidenceBridge({ store: new EvidenceStore(), windowTarget: win }).start();
    const replacement = () => 'replacement.js'; win.__LDS_TAG_TO_FILE__ = replacement;
    bridge.stop(); assert.equal(win.__LDS_TAG_TO_FILE__, replacement);
  }
});
