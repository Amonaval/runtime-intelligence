import {
  AttributionQuality,
  EvidenceLevel,
  RuntimeEventType,
} from 'runtime-intelligence/core';

const SOURCE = { file: 'examples/react-fault-lab/src/injected-scenarios.js' };

function owner(name, id = `fault-lab-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`) {
  return { id, kind: 'component', name, lifecycleGeneration: 1 };
}

function emit(store, input) {
  return store.emit({
    framework: { name: 'fault-lab-injected', adapterVersion: '3' },
    source: SOURCE,
    evidence: {
      level: EvidenceLevel.OBSERVATION,
      attribution: AttributionQuality.DETERMINISTIC,
      confidence: 1,
    },
    ...input,
  });
}

export function injectFullCoveragePack(store) {
  const syntheticOwner = owner('InjectedScenario');
  const created = emit(store, {
    type: RuntimeEventType.OWNER_CREATED,
    owner: syntheticOwner,
    payload: { scenario: 'injected-full-coverage', synthetic: true },
  });

  emit(store, {
    type: RuntimeEventType.INTERACTION,
    owner: syntheticOwner,
    correlation: { interactionId: 'fault-lab-injected-interaction' },
    payload: { kind: 'click', scenario: 'injected-interaction', synthetic: true },
  });

  emit(store, {
    type: RuntimeEventType.UPDATE_REQUESTED,
    owner: syntheticOwner,
    correlation: { parentEventId: created.id, interactionId: 'fault-lab-injected-interaction' },
    payload: { reason: 'fault-lab-injected', stateKey: 'query', synthetic: true },
  });

  emit(store, {
    type: RuntimeEventType.UPDATE_COMPLETED,
    owner: syntheticOwner,
    correlation: { parentEventId: created.id, interactionId: 'fault-lab-injected-interaction' },
    payload: {
      actualDurationMs: 640,
      baseDurationMs: 650,
      phase: 'update',
      scenario: 'injected-slow-render',
      synthetic: true,
    },
  });

  for (let i = 0; i < 8; i += 1) {
    emit(store, {
      type: RuntimeEventType.STATE_CHANGED,
      owner: syntheticOwner,
      correlation: { interactionId: 'fault-lab-injected-interaction' },
      payload: {
        property: 'query',
        oldValue: { type: 'string', summary: `q${i}` },
        newValue: { type: 'string', summary: `q${i + 1}` },
        sameReference: false,
        synthetic: true,
      },
    });
  }

  emit(store, {
    type: RuntimeEventType.NETWORK_COMPLETED,
    owner: syntheticOwner,
    correlation: { interactionId: 'fault-lab-injected-interaction', traceId: 'fault-lab-injected-net' },
    payload: {
      path: '/api/fault-lab/injected-slow',
      method: 'GET',
      status: 200,
      durationMs: 2600,
      responseSizeKB: 8,
      isSlow: true,
      scenario: 'injected-slow-api',
      synthetic: true,
    },
  });

  emit(store, {
    type: RuntimeEventType.NETWORK_COMPLETED,
    owner: syntheticOwner,
    payload: {
      path: '/api/fault-lab/injected-error',
      method: 'POST',
      status: 503,
      durationMs: 180,
      responseSizeKB: 2,
      isError: true,
      scenario: 'injected-network-error',
      synthetic: true,
    },
  });

  const diagnosticPayloads = [
    { diagnostic: 'lab.dom-duplication', domDuplication: true, duplicateTag: 'div', instanceCount: 4, commonAncestorTag: 'section', identicalContent: true, strength: 'high', synthetic: true },
    { diagnostic: 'lab.virtualization', virtualizationOpportunity: true, childTag: 'div', childCount: 120, offScreenRatio: 0.92, parentTag: 'section', strength: 'high', synthetic: true },
    { diagnostic: 'lab.expensive-paint', expensivePaint: true, property: 'boxShadow', elementCount: 20, exampleTag: 'div', synthetic: true },
    { diagnostic: 'lab.worker-opportunity', workerOpportunity: true, durationMs: 180, trigger: 'longtask-only', strength: 'high', synthetic: true },
    { diagnostic: 'lab.sequential-api', sequentialApiOpportunity: true, callCount: 3, totalMs: 280, estimatedSavingsMs: 180, callerFn: 'injectFullCoveragePack', synthetic: true },
    { diagnostic: 'lab.budget', budgetViolation: true, ownerId: syntheticOwner.id, tag: syntheticOwner.name, updateCount: 8, windowMs: 100, countPerWindow: 5, totalMs: 82, synthetic: true },
    { diagnostic: 'lab.idle', idleOpportunity: true, ownerTag: syntheticOwner.name, durationMs: 180, trigger: 'non-urgent', strength: 'medium', synthetic: true },
    { diagnostic: 'lab.paint-timing', paintTiming: true, metric: 'first-contentful-paint', valueMs: 3400, synthetic: true },
    { diagnostic: 'lab.network-correlation', networkCorrelation: true, ownerId: syntheticOwner.id, traceId: 'fault-lab-injected-net', synthetic: true },
    { diagnostic: 'lab.orphan-suspect', orphanSuspect: true, ownerId: syntheticOwner.id, synthetic: true },
    { diagnostic: 'lab.resource-lifetime', resourceLifetimeViolation: true, resourceCount: 1, resourceTypes: ['interval'], synthetic: true },
  ];

  for (const payload of diagnosticPayloads) {
    emit(store, {
      type: RuntimeEventType.DIAGNOSTIC,
      owner: syntheticOwner,
      evidence: {
        level: payload.resourceLifetimeViolation ? EvidenceLevel.LIFETIME_VIOLATION : EvidenceLevel.CORRELATION,
        attribution: payload.resourceLifetimeViolation ? AttributionQuality.SOURCE_ATTRIBUTED : AttributionQuality.HEURISTIC,
        confidence: payload.resourceLifetimeViolation ? 1 : 0.75,
      },
      payload,
    });
  }

  emit(store, {
    type: RuntimeEventType.ERROR,
    owner: syntheticOwner,
    evidence: {
      level: EvidenceLevel.ATTRIBUTION,
      attribution: AttributionQuality.SOURCE_ATTRIBUTED,
      confidence: 0.95,
    },
    payload: {
      phase: 'fault-lab-injected',
      message: 'Injected Runtime Intelligence validation error',
      stack: 'at InjectedScenario (examples/react-fault-lab/src/injected-scenarios.js:1:1)',
      synthetic: true,
    },
  });

  // Synthetic resource-lifetime coverage is emitted directly above. Do not use
  // acquire/destroy here because a derived diagnostic could lose synthetic
  // provenance and masquerade as a behaviorally observed leak.
  emit(store, {
    type: RuntimeEventType.OWNER_DESTROYED,
    owner: syntheticOwner,
    payload: { scenario: 'injected-owner-destroyed', synthetic: true },
  });

  for (let i = 0; i < 6; i += 1) {
    emit(store, {
      type: RuntimeEventType.OWNER_CREATED,
      owner: owner('InjectedRetainedChild', `fault-lab-retained-${i}`),
      payload: { scenario: 'injected-retained-owner', synthetic: true },
    });
  }

  return {
    label: 'Injected full normalized coverage pack',
    expected: [
      'slow render + interaction correlation',
      'tracked state/property thrash',
      'slow + failed network evidence',
      'DOM duplication + virtualization + expensive paint',
      'worker + sequential API + idle scheduling opportunities',
      'update-budget finding',
      'paint timing + network correlation diagnostics',
      'runtime error',
      'synthetic resource lifetime diagnostic with provenance preserved',
      'retained owner/mount spike',
      'Intelligence finding + evidence capsule',
    ],
  };
}
