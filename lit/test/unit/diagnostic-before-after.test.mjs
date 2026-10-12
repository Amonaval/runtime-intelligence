import test from 'node:test';
import assert from 'node:assert/strict';
import { MetricDirection } from '../../src/core/workflow-verification.js';
import {
  DiagnosticBeforeAfterStatus,
  createDiagnosticBeforeAfterSession,
} from '../../src/panel/diagnostic-before-after.js';

const event = (id, sequence, type = 'error') => Object.freeze({
  id,
  sequence,
  timestamp: sequence,
  type,
  framework: Object.freeze({ name: 'react' }),
  owner: Object.freeze({ id: 'owner-grid', name: 'Grid' }),
  source: null,
  correlation: Object.freeze({ traceId: null, interactionId: null, parentEventId: null, causedByEventId: null }),
  evidence: Object.freeze({ level: 'observation', attribution: 'unknown', confidence: null }),
  payload: Object.freeze({}),
});

function mutableStore(initial = []) {
  let events = initial;
  return {
    snapshot: () => events,
    set(next) { events = next; },
  };
}

function createSession(store, overrides = {}) {
  let tick = 100;
  return createDiagnosticBeforeAfterSession({
    store,
    workflowId: 'save-product',
    target: { metricId: 'count:error', direction: MetricDirection.DECREASE },
    intervention: { id: 'fix-1', description: 'remove duplicate failing request', applied: true },
    clock: () => ++tick,
    runIdFactory: phase => `${phase}-${tick}`,
    ...overrides,
  });
}

test('before/after session isolates baseline and replay windows in a cumulative store', () => {
  const store = mutableStore([event('historical', 1)]);
  const session = createSession(store);

  assert.equal(session.getState().status, DiagnosticBeforeAfterStatus.AWAITING_BASELINE);
  assert.match(session.getState().nextAction, /capture the baseline/i);

  store.set([event('historical', 1), event('e1', 2), event('e2', 3)]);
  const baseline = session.captureBaseline({ runId: 'before' });
  assert.equal(baseline.status, DiagnosticBeforeAfterStatus.AWAITING_REPLAY);
  assert.equal(baseline.baseline.run.metrics['count:error'], 2);
  assert.equal(baseline.windows.baselineStartSequence, 1);
  assert.equal(baseline.windows.replayStartSequence, 3);
  assert.match(baseline.nextAction, /apply the intended fix/i);

  // The store remains cumulative. Old baseline evidence must not be counted again.
  store.set([event('historical', 1), event('e1', 2), event('e2', 3), event('unrelated-after', 4, 'diagnostic')]);
  const replay = session.captureReplay({ runId: 'after' });
  assert.equal(replay.status, DiagnosticBeforeAfterStatus.IMPROVED);
  assert.equal(replay.comparison.metric.before, 2);
  assert.equal(replay.comparison.metric.after, 0);
  assert.equal(replay.verification.verificationConfirmed, true);
  assert.equal(replay.verification.causalityConfirmed, false);
  assert.equal(replay.verification.evidenceLevel, 'correlation');
  assert.match(replay.evidenceNote, /correlation-level/i);
});

test('no meaningful change is presented as unchanged', () => {
  const store = mutableStore([]);
  const session = createSession(store, {
    target: {
      metricId: 'count:error',
      direction: MetricDirection.DECREASE,
      minimumAbsoluteImprovement: 2,
    },
  });
  store.set([event('e1', 1), event('e2', 2)]);
  session.captureBaseline({ runId: 'before' });
  store.set([event('e1', 1), event('e2', 2), event('e3', 3)]);
  const replay = session.captureReplay({ runId: 'after' });
  assert.equal(replay.status, DiagnosticBeforeAfterStatus.UNCHANGED);
  assert.equal(replay.verification.outcome, 'not-confirmed');
  assert.match(replay.headline, /No meaningful improvement/);
});

test('regression and inconclusive comparisons are explicit', () => {
  const store = mutableStore([]);
  const regressed = createSession(store);
  store.set([event('e1', 1)]);
  regressed.captureBaseline({ runId: 'before' });
  store.set([event('e1', 1), event('e2', 2), event('e3', 3)]);
  assert.equal(regressed.captureReplay({ runId: 'after' }).status, DiagnosticBeforeAfterStatus.REGRESSED);

  const store2 = mutableStore([]);
  const inconclusive = createSession(store2, { intervention: { id: 'fix-2', applied: false } });
  store2.set([event('b1', 1)]);
  inconclusive.captureBaseline({ runId: 'before-2' });
  const result = inconclusive.captureReplay({ runId: 'after-2' });
  assert.equal(result.status, DiagnosticBeforeAfterStatus.INCONCLUSIVE);
  assert.equal(result.verification.reason, 'intervention-not-confirmed-applied');
});

test('replay cannot be captured before baseline and reset starts a fresh window', () => {
  const store = mutableStore([event('historical', 1)]);
  const session = createSession(store);
  assert.throws(() => session.captureReplay(), /baseline before capturing the replay/);
  store.set([event('historical', 1), event('baseline', 2)]);
  session.captureBaseline({ runId: 'before' });
  store.set([event('historical', 1), event('baseline', 2), event('noise', 3)]);
  const reset = session.reset();
  assert.equal(reset.status, DiagnosticBeforeAfterStatus.AWAITING_BASELINE);
  assert.equal(reset.baseline, null);
  assert.equal(reset.verification, null);
  assert.equal(reset.windows.baselineStartSequence, 3);
});

test('session state is immutable and JSON-safe', () => {
  const store = mutableStore([]);
  const session = createSession(store);
  store.set([event('e1', 1)]);
  const state = session.captureBaseline({ runId: 'before' });
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.target), true);
  assert.equal(Object.isFrozen(state.windows), true);
  assert.doesNotThrow(() => JSON.stringify(session.toJSON()));
});
