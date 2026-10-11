import test from 'node:test';
import assert from 'node:assert/strict';
import { VueAdapter } from '../../src/adapter/vue/VueAdapter.js';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import {
  AttributionQuality,
  CapabilitySupport,
  EvidenceLevel,
  FrameworkCapability,
  RuntimeEventType,
} from '../../src/core/evidence-protocol.js';

function setup(options = {}) {
  const store = new EvidenceStore({ privacyPolicy: false });
  const adapter = new VueAdapter({ store, version: '3.x', ...options });
  return { store, adapter, token: {} };
}

test('Vue capability contract keeps update cause and reactive dependency unsupported', () => {
  const { adapter } = setup();
  assert.equal(adapter.capability(FrameworkCapability.UPDATE_CAUSE), CapabilitySupport.UNSUPPORTED);
  assert.equal(adapter.capability(FrameworkCapability.REACTIVE_DEPENDENCY), CapabilitySupport.UNSUPPORTED);
  assert.equal(adapter.capability(FrameworkCapability.UPDATE_LIFECYCLE), CapabilitySupport.FRAMEWORK_REPORTED);
  assert.equal(adapter.capability(FrameworkCapability.RENDER_TIMING), CapabilitySupport.PARTIAL);
  assert.equal(adapter.capability(FrameworkCapability.RESOURCE_OWNERSHIP), CapabilitySupport.PARTIAL);
});

test('Vue update timing is an observation with structural start parent only', () => {
  const { adapter, token } = setup();
  adapter.connect(token, { name: 'ExampleCard' });
  const started = adapter.recordUpdateStarted(token);
  const completed = adapter.recordUpdateCompleted(token);

  assert.equal(started.type, RuntimeEventType.UPDATE_STARTED);
  assert.equal(completed.type, RuntimeEventType.UPDATE_COMPLETED);
  assert.equal(completed.evidence.level, EvidenceLevel.OBSERVATION);
  assert.equal(completed.evidence.attribution, AttributionQuality.FRAMEWORK_REPORTED);
  assert.equal(completed.correlation.parentEventId, started.id);
  assert.equal(completed.correlation.causedByEventId, null);
  assert.equal(completed.payload.timingScope, 'beforeUpdate-to-updated');
  assert.equal(completed.payload.renderOnly, false);
});

test('Vue lifecycle generations isolate reconnects', () => {
  const { adapter, token } = setup();
  const first = adapter.connect(token);
  adapter.disconnect(token);
  const second = adapter.connect(token);

  assert.equal(first.instanceId, second.instanceId);
  assert.equal(second.lifecycleGeneration, 2);
  assert.notEqual(first.id, second.id);
});

test('Vue error handler evidence can remain unowned when lifecycle ownership is unavailable', () => {
  const { adapter } = setup();
  const event = adapter.recordError({}, new Error('synthetic failure'), { info: 'render' });

  assert.equal(event.type, RuntimeEventType.ERROR);
  assert.equal(event.owner, null);
  assert.equal(event.evidence.level, EvidenceLevel.OBSERVATION);
  assert.equal(event.evidence.attribution, AttributionQuality.FRAMEWORK_REPORTED);
});

test('explicit resource ownership remains recordable through owner teardown', () => {
  const { adapter, token } = setup();
  adapter.connect(token);
  const acquired = adapter.recordResourceAcquired(token, {
    resourceId: 'timer-1',
    resourceType: 'interval',
  });

  assert.equal(acquired.type, RuntimeEventType.RESOURCE_ACQUIRED);
  assert.equal(acquired.payload.ownership, 'explicit');

  adapter.disconnect(token);
  const released = adapter.recordResourceReleased(token, {
    resourceId: 'timer-1',
    resourceType: 'interval',
  });
  assert.equal(released.type, RuntimeEventType.RESOURCE_RELEASED);
});

test('Vue parent links are structural diagnostics, not causal edges', () => {
  const { adapter } = setup();
  const parent = {};
  const child = {};
  const parentOwner = adapter.connect(parent, { name: 'Parent' });
  adapter.connect(child, { name: 'Child' });
  const owner = adapter.linkParent(child, parent);
  const link = adapter.store.snapshot().find(event => event.payload?.diagnostic === 'vue.owner.parent-linked');

  assert.equal(owner.parentId, parentOwner.id);
  assert.equal(link.payload.structuralOnly, true);
  assert.equal(link.correlation.causedByEventId, null);
});

test('Vue diagnostics snapshot is structural and immutable', () => {
  const { adapter, token } = setup();
  adapter.connect(token);
  adapter.recordUpdateStarted(token);
  const snapshot = adapter.diagnosticsSnapshot(token);

  assert.equal(snapshot.connected, true);
  assert.equal(snapshot.updateInProgress, true);
  assert.equal(Object.isFrozen(snapshot), true);
});
