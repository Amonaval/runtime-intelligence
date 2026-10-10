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
    framework: { name: 'fault-lab-injected', adapterVersion: '1' },
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
    payload: { scenario: 'injected-full-coverage' },
  });

  emit(store, {
    type: RuntimeEventType.UPDATE_COMPLETED,
    owner: syntheticOwner,
    correlation: { parentEventId: created.id },
    payload: {
      actualDurationMs: 640,
      baseDurationMs: 650,
      phase: 'update',
      scenario: 'injected-slow-render',
    },
  });

  for (let i = 0; i < 7; i += 1) {
    emit(store, {
      type: RuntimeEventType.STATE_CHANGED,
      owner: syntheticOwner,
      payload: {
        property: 'query',
        oldValue: { type: 'string', summary: `q${i}` },
        newValue: { type: 'string', summary: `q${i + 1}` },
        sameReference: false,
      },
    });
  }

  emit(store, {
    type: RuntimeEventType.NETWORK_COMPLETED,
    owner: syntheticOwner,
    payload: {
      path: '/api/fault-lab/injected-slow',
      method: 'GET',
      status: 200,
      durationMs: 2600,
      responseSizeKB: 8,
      isSlow: true,
      scenario: 'injected-slow-api',
    },
  });

  const diagnosticPayloads = [
    { diagnostic: 'lab.dom-duplication', domDuplication: true, duplicateTag: 'div', instanceCount: 4, strength: 'high' },
    { diagnostic: 'lab.virtualization', virtualizationOpportunity: true, childTag: 'div', childCount: 120, offScreenRatio: 0.92, parentTag: 'section', strength: 'high' },
    { diagnostic: 'lab.expensive-paint', expensivePaint: true, property: 'boxShadow', elementCount: 14 },
    { diagnostic: 'lab.worker-opportunity', workerOpportunity: true, durationMs: 180, trigger: 'longtask-only', strength: 'high' },
    { diagnostic: 'lab.sequential-api', sequentialApiOpportunity: true, callCount: 3, totalMs: 280, estimatedSavingsMs: 180, callerFn: 'injectFullCoveragePack' },
    { diagnostic: 'lab.budget', budgetViolation: true, ownerId: syntheticOwner.id, tag: syntheticOwner.name, updateCount: 8, windowMs: 100, countPerWindow: 5, totalMs: 82 },
  ];

  for (const payload of diagnosticPayloads) {
    emit(store, {
      type: RuntimeEventType.DIAGNOSTIC,
      owner: syntheticOwner,
      evidence: {
        level: EvidenceLevel.CORRELATION,
        attribution: AttributionQuality.HEURISTIC,
        confidence: 0.75,
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
    },
  });

  emit(store, {
    type: RuntimeEventType.RESOURCE_ACQUIRED,
    owner: syntheticOwner,
    payload: { resourceId: 'fault-lab-resource', resourceType: 'interval' },
  });
  emit(store, {
    type: RuntimeEventType.OWNER_DESTROYED,
    owner: syntheticOwner,
    payload: { scenario: 'injected-resource-lifetime' },
  });

  return {
    label: 'Injected full coverage pack',
    expected: [
      'Perf entry + slow render evidence',
      'render reasons/property thrash',
      'slow API',
      'DOM/virtualization/paint/worker/sequential opportunities',
      'update-budget finding',
      'runtime error',
      'resource lifetime violation',
      'Intelligence finding',
    ],
  };
}
