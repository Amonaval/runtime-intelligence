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

test('before/after session guides the developer from baseline to replay', () => {
  const store = mutableStore([event('e1', 1), event('e2', 2)]);
  const session = createSession(store);

  assert.equal(session.getState().status, DiagnosticBeforeAfterStatus.AWAITING_BASELINE);
  assert.match(session.getState().nextAction, /capture the baseline/i);

  const baseline = session.captureBaseline({ runId: 'before' });
  assert.equal(baseline.status, DiagnosticBeforeAfterStatus.AWAITING_REPLAY);
  assert.equal(baseline.baseline.run.metrics['count:error'], 2);
  assert.match(baseline.nextAction, /apply the intended fix/i);

  store.set([]);
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
  const store = mutableStore([event('e1', 1), event('e2', 2)]);
  const session = createSession(store, {
    target: {
      metricId: 'count:error',
      direction: MetricDirection.DECREASE,
      minimumAbsoluteImprovement: 2,
    },
  });
  session.captureBaseline({ runId: 'before' });
  store.set([event('e3', 1)]);
  const replay = session.captureReplay({ runId: 'after' });
  assert.equal(replay.status, DiagnosticBeforeAfterStatus.UNCHANGED);
  assert.equal(replay.verification.outcome, 'not-confirmed');
  assert.match(replay.headline, /No meaningful improvement/);
});

test('regression and inconclusive comparisons are explicit', () => {
  const store = mutableStore([event('e1', 1)]);
  const regressed = createSession(store);
  regressed.captureBaseline({ runId: 'before' });
  store.set([event('e2', 1), event('e3', 2)]);
  assert.equal(regressed.captureReplay({ runId: 'after' }).status, DiagnosticBeforeAfterStatus.REGRESSED);

  const inconclusive = createSession(store, { intervention: { id: 'fix-2', applied: false } });
  inconclusive.captureBaseline({ runId: 'before-2' });
  store.set([]);
  const result = inconclusive.captureReplay({ runId: 'after-2' });
  assert.equal(result.status, DiagnosticBeforeAfterStatus.INCONCLUSIVE);
  assert.equal(result.verification.reason, 'intervention-not-confirmed-applied');
});

test('replay cannot be captured before baseline and reset restarts the experience', () => {
  const store = mutableStore([]);
  const session = createSession(store);
  assert.throws(() => session.captureReplay(), /baseline before capturing the replay/);
  session.captureBaseline({ runId: 'before' });
  const reset = session.reset();
  assert.equal(reset.status, DiagnosticBeforeAfterStatus.AWAITING_BASELINE);
  assert.equal(reset.baseline, null);
  assert.equal(reset.verification, null);
});

test('session state is immutable and JSON-safe', () => {
  const store = mutableStore([event('e1', 1)]);
  const session = createSession(store);
  const state = session.captureBaseline({ runId: 'before' });
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.target), true);
  assert.doesNotThrow(() => JSON.stringify(session.toJSON()));
});
