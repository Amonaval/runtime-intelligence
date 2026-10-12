import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FindingVerificationSupport,
  createFindingVerificationPlan,
  createFindingVerificationSession,
} from '../../src/panel/finding-verification-bridge.js';

const event = (id, sequence, type, owner, payload = {}) => Object.freeze({
  id,
  sequence,
  timestamp: sequence * 10,
  type,
  framework: Object.freeze({ name: 'lit', version: '3.3.3', adapterVersion: 'test' }),
  owner: owner ? Object.freeze(owner) : null,
  source: null,
  correlation: Object.freeze({ traceId: null, interactionId: null, parentEventId: null, causedByEventId: null }),
  evidence: Object.freeze({ level: 'observation', attribution: 'unknown', confidence: null }),
  payload: Object.freeze(payload),
});

function mutableStore(initial = []) {
  let events = initial;
  return {
    snapshot: () => events,
    set(next) { events = next; },
  };
}

test('runtime-error finding derives an owner-scoped error-count verification plan', () => {
  const plan = createFindingVerificationPlan({
    id: 'finding-1',
    kind: 'runtime-error',
    owner: { id: 'owner-editor', name: 'Editor' },
  });

  assert.equal(plan.support, FindingVerificationSupport.SUPPORTED);
  assert.equal(plan.supported, true);
  assert.equal(plan.target.direction, 'decrease');
  assert.equal(plan.target.minimumAbsoluteImprovement, 1);
  assert.equal(plan.metrics[0].type, 'error');
  assert.equal(plan.metrics[0].ownerId, 'owner-editor');
  assert.match(plan.workflowId, /verify-runtime-error-editor-errors/);
});

test('update-budget finding derives owner-scoped update-count verification', () => {
  const plan = createFindingVerificationPlan({
    kind: 'update-budget-opportunity',
    owner: { id: 'grid', name: 'Grid' },
  });
  assert.equal(plan.supported, true);
  assert.equal(plan.metrics[0].type, 'component.update.completed');
  assert.equal(plan.metrics[0].aggregate, 'count');
  assert.equal(plan.target.direction, 'decrease');
});

test('slow-render reuses only an actually observed duration field', () => {
  const actual = createFindingVerificationPlan({
    kind: 'slow-render',
    owner: { id: 'grid', name: 'Grid' },
    payload: { actualDurationMs: 220 },
  });
  assert.equal(actual.supported, true);
  assert.equal(actual.metrics[0].payloadPath, 'actualDurationMs');

  const duration = createFindingVerificationPlan({
    kind: 'slow-render',
    owner: { id: 'card', name: 'Card' },
    observed: { durationMs: 180 },
  });
  assert.equal(duration.supported, true);
  assert.equal(duration.metrics[0].payloadPath, 'durationMs');

  const unknown = createFindingVerificationPlan({ kind: 'slow-render', owner: { name: 'Unknown' } });
  assert.equal(unknown.supported, false);
  assert.equal(unknown.reason, 'render-duration-field-unavailable');
});

test('ambiguous opportunity is explicitly unsupported instead of inventing a target', () => {
  const plan = createFindingVerificationPlan({
    kind: 'virtualization-opportunity',
    owner: { name: 'Results' },
    payload: { childCount: 1500 },
  });
  assert.equal(plan.support, FindingVerificationSupport.UNSUPPORTED);
  assert.equal(plan.supported, false);
  assert.equal(plan.target, null);
  assert.match(plan.evidenceNote, /will not invent/i);
});

test('finding session flows directly into R9.2 before-after verification', () => {
  const owner = { id: 'owner-editor', name: 'Editor' };
  const store = mutableStore([
    event('e1', 1, 'error', owner, { message: 'boom' }),
    event('e2', 2, 'error', owner, { message: 'boom again' }),
    event('other', 3, 'error', { id: 'other', name: 'Other' }, { message: 'unrelated' }),
  ]);
  let now = 100;
  const session = createFindingVerificationSession({
    finding: { kind: 'runtime-error', owner },
    store,
    intervention: { id: 'fix-error', applied: true },
    clock: () => now,
    runIdFactory: phase => `${phase}-${now}`,
  });

  const before = session.captureBaseline();
  const metricId = before.target.metricId;
  assert.equal(before.baseline.run.metrics[metricId], 2);

  now = 200;
  store.set([event('other-2', 1, 'error', { id: 'other', name: 'Other' }, { message: 'still unrelated' })]);
  const after = session.captureReplay();
  assert.equal(after.status, 'improved');
  assert.equal(after.replay.metrics[metricId], 0);
  assert.equal(after.verification.verificationConfirmed, true);
  assert.equal(after.verification.causalityConfirmed, false);
  assert.equal(after.verification.evidenceLevel, 'correlation');
});

test('unsupported finding can be used only with an explicit developer target', () => {
  const store = mutableStore([]);
  assert.throws(() => createFindingVerificationSession({
    finding: { kind: 'virtualization-opportunity' },
    store,
  }), /cannot be auto-configured/i);

  assert.doesNotThrow(() => createFindingVerificationSession({
    finding: { kind: 'virtualization-opportunity' },
    store,
    workflowId: 'explicit-virtual-list',
    target: { metricId: 'events.total', direction: 'decrease' },
  }));
});
