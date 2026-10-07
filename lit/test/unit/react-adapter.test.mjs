import test from 'node:test';
import assert from 'node:assert/strict';
import { ReactAdapter } from '../../src/adapter/react/ReactAdapter.js';
import {
  AttributionQuality,
  CapabilitySupport,
  EvidenceLevel,
  FrameworkCapability,
  RuntimeEventType,
} from '../../src/core/evidence-protocol.js';

class MockStore {
  constructor() {
    this.events = [];
    this.sequence = 0;
  }
  emit(input) {
    const event = Object.freeze({
      ...input,
      id: input.id || `evt-${this.sequence + 1}`,
      sequence: ++this.sequence,
      timestamp: this.sequence * 10,
      correlation: Object.freeze({
        traceId: input.correlation?.traceId || null,
        interactionId: input.correlation?.interactionId || null,
        parentEventId: input.correlation?.parentEventId || null,
        causedByEventId: input.correlation?.causedByEventId || null,
      }),
      evidence: Object.freeze({ ...(input.evidence || {}) }),
      payload: Object.freeze({ ...(input.payload || {}) }),
      owner: input.owner ? Object.freeze({ ...input.owner }) : null,
      framework: Object.freeze({ ...(input.framework || {}) }),
    });
    this.events.push(event);
    return event;
  }
  snapshot() { return [...this.events]; }
}

function setup() {
  const store = new MockStore();
  const adapter = new ReactAdapter({ store, version: '19.x' });
  const token = {};
  return { store, adapter, token };
}

test('declares honest React capability limits', () => {
  const { adapter } = setup();
  assert.equal(adapter.capability(FrameworkCapability.RENDER_TIMING), CapabilitySupport.PARTIAL);
  const profilingAdapter = new ReactAdapter({ store: new MockStore(), profilingEnabled: true });
  assert.equal(profilingAdapter.capability(FrameworkCapability.RENDER_TIMING), CapabilitySupport.FRAMEWORK_REPORTED);
  assert.equal(adapter.capability(FrameworkCapability.OWNER_LIFECYCLE), CapabilitySupport.PARTIAL);
  assert.equal(adapter.capability(FrameworkCapability.UPDATE_LIFECYCLE), CapabilitySupport.PARTIAL);
  assert.equal(adapter.capability(FrameworkCapability.UPDATE_CAUSE), CapabilitySupport.PARTIAL);
  assert.equal(adapter.capability(FrameworkCapability.STATE_CHANGE), CapabilitySupport.PARTIAL);
  assert.equal(adapter.capability(FrameworkCapability.RESOURCE_OWNERSHIP), CapabilitySupport.PARTIAL);
  assert.equal(adapter.capability(FrameworkCapability.EFFECT_LIFECYCLE), CapabilitySupport.PARTIAL);
  assert.equal(adapter.capability(FrameworkCapability.REACTIVE_DEPENDENCY), CapabilitySupport.UNSUPPORTED);
});

test('explicit capability overrides can strengthen only integrations that can actually prove coverage', () => {
  const adapter = new ReactAdapter({
    store: new MockStore(),
    capabilities: {
      [FrameworkCapability.OWNER_LIFECYCLE]: CapabilitySupport.FRAMEWORK_REPORTED,
      [FrameworkCapability.RESOURCE_OWNERSHIP]: CapabilitySupport.FRAMEWORK_REPORTED,
    },
  });
  assert.equal(adapter.capability(FrameworkCapability.OWNER_LIFECYCLE), CapabilitySupport.FRAMEWORK_REPORTED);
  assert.equal(adapter.capability(FrameworkCapability.RESOURCE_OWNERSHIP), CapabilitySupport.FRAMEWORK_REPORTED);
});

test('lifecycle generations isolate reconnects while physical instance remains stable', () => {
  const { adapter, token } = setup();
  const first = adapter.connect(token, { name: 'Editor' });
  const destroyed = adapter.disconnect(token);
  const second = adapter.connect(token, { name: 'Editor' });
  assert.equal(first.instanceId, second.instanceId);
  assert.equal(first.lifecycleGeneration, 1);
  assert.equal(second.lifecycleGeneration, 2);
  assert.notEqual(first.id, second.id);
  assert.equal(destroyed.type, RuntimeEventType.OWNER_DESTROYED);
  assert.equal(destroyed.evidence.attribution, AttributionQuality.FRAMEWORK_REPORTED);
});

test('React Profiler callback emits framework-reported render timing without invented cause', () => {
  const { adapter, token } = setup();
  adapter.connect(token, { name: 'Grid' });
  const onRender = adapter.createProfilerCallback(token);
  const event = onRender('Grid', 'update', 12.5, 20, 100, 115);
  assert.equal(event.type, RuntimeEventType.UPDATE_COMPLETED);
  assert.equal(event.evidence.level, EvidenceLevel.OBSERVATION);
  assert.equal(event.evidence.attribution, AttributionQuality.FRAMEWORK_REPORTED);
  assert.equal(event.evidence.confidence, 1);
  assert.equal(event.payload.actualDurationMs, 12.5);
  assert.equal(event.payload.baseDurationMs, 20);
  assert.equal(event.payload.profilingEnabled, false);
  assert.equal(event.correlation.causedByEventId, null);
});

test('one explicit scheduled request is structural parent context, not causal proof', () => {
  const { adapter, token } = setup();
  adapter.connect(token);
  const requested = adapter.recordUpdateRequested(token, { reason: 'set-filter', source: { file: '/src/Grid.jsx', line: 20 } });
  const rendered = adapter.recordProfilerRender(token, { id: 'Grid', phase: 'update', actualDuration: 5 });
  assert.equal(rendered.correlation.parentEventId, requested.id);
  assert.equal(rendered.correlation.causedByEventId, null);
  assert.equal(rendered.payload.pendingRequestCount, 1);
});

test('batched concurrent requests do not invent a single parent or cause', () => {
  const { adapter, token } = setup();
  adapter.connect(token);
  adapter.recordUpdateRequested(token, { reason: 'dispatch-a' });
  adapter.recordUpdateRequested(token, { reason: 'dispatch-b' });
  const rendered = adapter.recordProfilerRender(token, { id: 'Panel', actualDuration: 4 });
  assert.equal(rendered.payload.pendingRequestCount, 2);
  assert.equal(rendered.correlation.parentEventId, null);
  assert.equal(rendered.correlation.causedByEventId, null);
});

test('state instrumentation stays observation-level and does not claim render causality', () => {
  const { adapter, token } = setup();
  adapter.connect(token);
  const event = adapter.recordStateChange(token, 'selection', { id: 1 }, { id: 2 }, {
    source: { file: '/src/useSelection.js', line: 8 },
  });
  assert.equal(event.type, RuntimeEventType.STATE_CHANGED);
  assert.equal(event.evidence.level, EvidenceLevel.OBSERVATION);
  assert.equal(event.evidence.attribution, AttributionQuality.SOURCE_ATTRIBUTED);
  assert.equal(event.correlation.causedByEventId, null);
});

test('resource ownership events are deterministic locally but adapter capability remains partial', () => {
  const { adapter, token } = setup();
  const owner = adapter.connect(token);
  const acquired = adapter.recordResourceAcquired(token, {
    resourceId: 'timer-1',
    resourceType: 'interval',
  });
  const released = adapter.recordResourceReleased(token, {
    resourceId: 'timer-1',
    resourceType: 'interval',
  });
  assert.equal(acquired.type, RuntimeEventType.RESOURCE_ACQUIRED);
  assert.equal(acquired.owner.id, owner.id);
  assert.equal(acquired.evidence.level, EvidenceLevel.ATTRIBUTION);
  assert.equal(acquired.evidence.attribution, AttributionQuality.DETERMINISTIC);
  assert.equal(released.type, RuntimeEventType.RESOURCE_RELEASED);
  assert.equal(adapter.createCapabilityResolver()('react', FrameworkCapability.RESOURCE_OWNERSHIP), CapabilitySupport.PARTIAL);
});

test('effect bridge reports effect lifecycle as diagnostics without synthetic causality', () => {
  const { adapter, token } = setup();
  adapter.connect(token);
  const effect = adapter.createEffectBridge(token, 'subscription-effect');
  const started = effect.start();
  const cleaned = effect.cleanup();
  assert.equal(started.type, RuntimeEventType.DIAGNOSTIC);
  assert.equal(started.payload.diagnostic, 'react.effect.started');
  assert.equal(cleaned.payload.diagnostic, 'react.effect.cleanup');
  assert.equal(started.correlation.causedByEventId, null);
  assert.equal(cleaned.correlation.causedByEventId, null);
});

test('effect cleanup can still be recorded after owner disconnect for unmount ordering', () => {
  const { adapter, token } = setup();
  adapter.connect(token);
  adapter.disconnect(token);
  const cleaned = adapter.recordEffectCleanup(token, 'late-cleanup');
  assert.equal(cleaned.type, RuntimeEventType.DIAGNOSTIC);
  assert.equal(cleaned.payload.diagnostic, 'react.effect.cleanup');
});

test('disconnect clears pending update context before the next lifecycle generation', () => {
  const { adapter, token } = setup();
  adapter.connect(token);
  adapter.recordUpdateRequested(token, { reason: 'queued' });
  adapter.disconnect(token);
  adapter.connect(token);
  const rendered = adapter.recordProfilerRender(token, { actualDuration: 1 });
  assert.equal(rendered.payload.pendingRequestCount, 0);
  assert.equal(rendered.correlation.parentEventId, null);
});

test('invalid or disconnected tokens fail closed instead of breaking the app', () => {
  const { adapter, token } = setup();
  assert.equal(adapter.connect(null), null);
  assert.equal(adapter.recordProfilerRender(token, { actualDuration: 1 }), null);
  assert.equal(adapter.recordResourceAcquired(token, { resourceId: 'x' }), null);
  assert.equal(adapter.disconnect(token), null);
});

test('duplicate connect is idempotent for an active lifecycle', () => {
  const { adapter, store, token } = setup();
  const first = adapter.connect(token, { name: 'Editor' });
  const second = adapter.connect(token, { name: 'Editor' });
  assert.equal(first, second);
  assert.equal(store.events.filter(event => event.type === RuntimeEventType.OWNER_CREATED).length, 1);
});

test('diagnostics snapshot exposes only structural adapter state', () => {
  const { adapter, token } = setup();
  adapter.connect(token);
  adapter.recordUpdateRequested(token);
  const snapshot = adapter.diagnosticsSnapshot(token);
  assert.equal(snapshot.connected, true);
  assert.equal(snapshot.lifecycleGeneration, 1);
  assert.equal(snapshot.pendingUpdateRequests, 1);
  assert.equal(Object.isFrozen(snapshot), true);
});
