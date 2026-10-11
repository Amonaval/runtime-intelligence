import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import { LitAdapter } from '../../src/adapter/lit/LitAdapter.js';
import { ReactAdapter } from '../../src/adapter/react/ReactAdapter.js';
import { VueAdapter } from '../../src/adapter/vue/VueAdapter.js';
import { RuntimeEventType, FrameworkCapability, CapabilitySupport, validateEvidenceEvent } from '../../src/core/evidence-protocol.js';

for (const Adapter of [LitAdapter, ReactAdapter, VueAdapter]) {
  test(`${Adapter.name}: instances isolate ownership and correlation in a shared store`, () => {
    const store = new EvidenceStore();
    const a = new Adapter({ store }), b = new Adapter({ store });
    const target = { localName: 'test-view', requestUpdate() {}, performUpdate() {}, count: 1 };
    const first = a.connect(target, { source: { file: 'src/First.js', line: 10 }, name: 'first' });
    const second = b.connect(target, { source: { file: 'src/Second.js', line: 20 }, name: 'second' });
    assert.notEqual(first.id, second.id);
    assert.notEqual(first, second);
    assert.equal(store.snapshot({ type: RuntimeEventType.OWNER_CREATED }).length, 2);
    a.disconnect(target);
    assert.equal(a.ownerOf(target).connected, false);
    assert.equal(b.ownerOf(target).connected, true);
    const restarted = a.connect(target);
    assert.notEqual(restarted.id, first.id);
    assert.notEqual(restarted.id, second.id);
    assert.equal(restarted.lifecycleGeneration, 2);
    b.disconnect(target); a.disconnect(target);
    const events = store.snapshot();
    for (const event of events) {
      assert.equal(event.framework.name, a.framework);
      assert.equal(validateEvidenceEvent(event, { resolveReference: id => store.resolveReference(id) }).valid, true);
      assert.equal(event.correlation.causedByEventId, null, 'registration/lifetime is not causality');
    }
    assert.equal(events.filter(e => e.source?.file === 'src/First.js').length, 2);
    assert.equal(events.filter(e => e.source?.file === 'src/Second.js').length, 2);
  });
}

test('Lit pending request/render state does not cross adapter stores', () => {
  const storeA = new EvidenceStore(), storeB = new EvidenceStore();
  const a = new LitAdapter({ store: storeA }), b = new LitAdapter({ store: storeB });
  const target = { localName: 'test-view', requestUpdate() {}, performUpdate() {}, count: 1 };
  a.connect(target); b.connect(target);
  const requestA = a.recordUpdateRequested(target, 'count', 0);
  b.recordUpdateStarted(target);
  const completeB = b.recordUpdateCompleted(target);
  assert.equal(completeB.correlation.causedByEventId, null);
  assert.equal(storeB.snapshot({ type: RuntimeEventType.STATE_CHANGED }).length, 0);
  a.recordUpdateStarted(target);
  const completeA = a.recordUpdateCompleted(target);
  assert.equal(completeA.correlation.causedByEventId, requestA.id);
});

test('React adapter callback bridges cannot attach old work to a reconnected lifecycle', () => {
  const store = new EvidenceStore();
  const adapter = new ReactAdapter({ store });
  const token = {};
  adapter.connect(token);
  const profiler = adapter.createProfilerCallback(token);
  const effect = adapter.createEffectBridge(token, 'effect');
  effect.start(); profiler('view', 'update', 4, 5, 1, 2);
  adapter.disconnect(token);
  assert.equal(effect.cleanup().payload.diagnostic, 'react.effect.cleanup', 'same lifecycle cleanup after disconnect remains supported');
  adapter.connect(token);
  const before = store.size();
  assert.equal(profiler('old-view', 'update', 90, 90, 1, 2), null);
  assert.equal(effect.start(), null); assert.equal(effect.cleanup(), null);
  assert.equal(store.size(), before);
  assert.ok(adapter.createProfilerCallback(token)('current-view', 'update', 4, 5, 1, 2));
});

test('React/Vue adapters keep unsupported causality and dependency capabilities explicit', () => {
  for (const Adapter of [ReactAdapter, VueAdapter]) {
    const adapter = new Adapter({ store: new EvidenceStore() });
    assert.equal(adapter.capability(FrameworkCapability.UPDATE_CAUSE), CapabilitySupport.UNSUPPORTED);
    assert.equal(adapter.capability(FrameworkCapability.REACTIVE_DEPENDENCY), CapabilitySupport.UNSUPPORTED);
  }
});
