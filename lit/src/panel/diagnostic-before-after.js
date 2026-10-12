import {
  VerificationOutcome,
  createWorkflowBaseline,
  createWorkflowRun,
  verifyFix,
} from '../core/workflow-verification.js';

const DiagnosticBeforeAfterStatus = Object.freeze({
  AWAITING_BASELINE: 'awaiting-baseline',
  AWAITING_REPLAY: 'awaiting-replay',
  IMPROVED: 'improved',
  UNCHANGED: 'unchanged',
  REGRESSED: 'regressed',
  INCONCLUSIVE: 'inconclusive',
});

function _deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) _deepFreeze(child, seen);
  return Object.freeze(value);
}

function _ensureStore(store) {
  if (!store || typeof store.snapshot !== 'function') {
    throw new TypeError('Diagnostic before/after requires an EvidenceStore-compatible store.');
  }
  return store;
}

function _latestSequence(events = []) {
  let latest = 0;
  for (const event of events) {
    if (Number.isFinite(event?.sequence)) latest = Math.max(latest, event.sequence);
  }
  return latest;
}

function _windowAfter(store, sequence) {
  return store.snapshot().filter(event => Number.isFinite(event?.sequence) && event.sequence > sequence);
}

function _statusFromVerification(verification) {
  if (!verification) return DiagnosticBeforeAfterStatus.AWAITING_REPLAY;
  if (verification.outcome === VerificationOutcome.CONFIRMED) return DiagnosticBeforeAfterStatus.IMPROVED;
  if (verification.outcome === VerificationOutcome.REGRESSED) return DiagnosticBeforeAfterStatus.REGRESSED;
  if (verification.outcome === VerificationOutcome.NOT_CONFIRMED) return DiagnosticBeforeAfterStatus.UNCHANGED;
  return DiagnosticBeforeAfterStatus.INCONCLUSIVE;
}

function _presentation(status, verification) {
  switch (status) {
    case DiagnosticBeforeAfterStatus.AWAITING_BASELINE:
      return {
        headline: 'Capture the problem baseline',
        nextAction: 'Reproduce the target workflow, then capture the baseline.',
        evidenceNote: 'Only evidence emitted after this diagnostic session started is included in the baseline window.',
      };
    case DiagnosticBeforeAfterStatus.AWAITING_REPLAY:
      return {
        headline: 'Baseline captured',
        nextAction: 'Apply the intended fix, replay the same workflow, then capture the replay.',
        evidenceNote: 'Only evidence emitted after baseline capture is included in the replay window. The baseline remains a measurement snapshot, not causal evidence.',
      };
    case DiagnosticBeforeAfterStatus.IMPROVED:
      return {
        headline: 'Target improved',
        nextAction: verification?.causalityConfirmed
          ? 'The configured target improved and governed causal evidence is present. Preserve the evidence and regression test the fix.'
          : 'The configured target improved. Preserve the result as verified improvement; do not describe the intervention as the proven cause without stronger evidence.',
        evidenceNote: verification?.causalityConfirmed
          ? 'Causality is confirmed only because separate governed UREP causal evidence accompanied the replay.'
          : 'Before/after improvement remains correlation-level evidence under the R9.1 contract.',
      };
    case DiagnosticBeforeAfterStatus.UNCHANGED:
      return {
        headline: 'No meaningful improvement',
        nextAction: 'Review the target threshold and the attempted fix, then capture another controlled replay if useful.',
        evidenceNote: 'The replay did not meet the configured improvement threshold.',
      };
    case DiagnosticBeforeAfterStatus.REGRESSED:
      return {
        headline: 'Target regressed',
        nextAction: 'Revert or revise the attempted fix before treating it as an improvement.',
        evidenceNote: 'The configured target moved in the wrong direction on the replay.',
      };
    default:
      return {
        headline: 'Comparison inconclusive',
        nextAction: 'Make the baseline and replay comparable, confirm the intervention was applied, and ensure the target metric is available.',
        evidenceNote: 'No improvement or causal conclusion should be drawn from this comparison.',
      };
  }
}

function createDiagnosticBeforeAfterSession({
  store,
  workflowId,
  target,
  metrics = [],
  intervention = { applied: true },
  clock = () => Date.now(),
  runIdFactory = phase => `${workflowId}-${phase}-${clock()}`,
} = {}) {
  const evidenceStore = _ensureStore(store);
  if (!workflowId) throw new TypeError('Diagnostic before/after requires workflowId.');
  if (!target?.metricId) throw new TypeError('Diagnostic before/after requires target.metricId.');
  if (typeof clock !== 'function') throw new TypeError('Diagnostic before/after clock must be a function.');
  if (typeof runIdFactory !== 'function') throw new TypeError('Diagnostic before/after runIdFactory must be a function.');

  let baseline = null;
  let replay = null;
  let verification = null;
  let baselineStartSequence = _latestSequence(evidenceStore.snapshot());
  let replayStartSequence = null;

  const snapshotState = () => {
    const status = baseline ? _statusFromVerification(verification) : DiagnosticBeforeAfterStatus.AWAITING_BASELINE;
    const presentation = _presentation(status, verification);
    return _deepFreeze({
      schemaVersion: 'diagnostic-before-after/1',
      workflowId,
      status,
      headline: presentation.headline,
      nextAction: presentation.nextAction,
      evidenceNote: presentation.evidenceNote,
      target: { ...target },
      intervention: intervention ? {
        id: intervention.id || null,
        description: intervention.description || null,
        applied: intervention.applied === true,
      } : null,
      windows: {
        baselineStartSequence,
        replayStartSequence,
      },
      baseline,
      replay,
      comparison: verification ? {
        referenceRunId: verification.referenceRunId,
        candidateRunId: verification.candidateRunId,
        metric: verification.metric,
        improvement: verification.improvement,
        relativeImprovement: verification.relativeImprovement,
      } : null,
      verification,
    });
  };

  const captureBaseline = ({ runId = null, label = 'before', capturedAt = clock(), baselineId = null } = {}) => {
    const all = evidenceStore.snapshot();
    const events = all.filter(event => Number.isFinite(event?.sequence) && event.sequence > baselineStartSequence);
    const run = createWorkflowRun(events, {
      workflowId,
      runId: runId || runIdFactory('before'),
      label,
      capturedAt,
      metrics,
    });
    baseline = createWorkflowBaseline(run, {
      baselineId: baselineId || `${workflowId}-baseline-${capturedAt}`,
      label,
      createdAt: capturedAt,
    });
    replay = null;
    verification = null;
    replayStartSequence = _latestSequence(all);
    return snapshotState();
  };

  const captureReplay = ({ runId = null, label = 'after', capturedAt = clock(), causalEvidence = null } = {}) => {
    if (!baseline) throw new Error('Capture a diagnostic baseline before capturing the replay.');
    const events = _windowAfter(evidenceStore, replayStartSequence || 0);
    replay = createWorkflowRun(events, {
      workflowId,
      runId: runId || runIdFactory('after'),
      label,
      capturedAt,
      metrics,
    });
    verification = verifyFix({
      before: baseline,
      after: replay,
      intervention,
      target,
      causalEvidence,
      verifiedAt: capturedAt,
    });
    return snapshotState();
  };

  const reset = () => {
    baseline = null;
    replay = null;
    verification = null;
    baselineStartSequence = _latestSequence(evidenceStore.snapshot());
    replayStartSequence = null;
    return snapshotState();
  };

  return Object.freeze({
    captureBaseline,
    captureReplay,
    reset,
    getState: snapshotState,
    toJSON: snapshotState,
  });
}

export {
  DiagnosticBeforeAfterStatus,
  createDiagnosticBeforeAfterSession,
};
