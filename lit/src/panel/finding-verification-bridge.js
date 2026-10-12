import { MetricDirection } from '../core/workflow-verification.js';
import { createDiagnosticBeforeAfterSession } from './diagnostic-before-after.js';

const FindingVerificationSupport = Object.freeze({
  SUPPORTED: 'supported',
  UNSUPPORTED: 'unsupported',
});

function _deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) _deepFreeze(child, seen);
  return Object.freeze(value);
}

function _slug(value) {
  return String(value || 'runtime')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'runtime';
}

function _ownerMetricBase(finding) {
  const ownerId = finding?.owner?.id || null;
  const ownerName = finding?.owner?.name || finding?.component || null;
  return { ownerId, ownerName };
}

function _unsupported(finding, reason) {
  return _deepFreeze({
    support: FindingVerificationSupport.UNSUPPORTED,
    supported: false,
    findingKind: finding?.kind || finding?.issueType || null,
    reason,
    workflowId: null,
    target: null,
    metrics: [],
    evidenceNote: 'Runtime Intelligence will not invent a verification metric when the finding does not map cleanly to an observable workflow metric.',
  });
}

function _supported(finding, { workflowSuffix, metric, target, note }) {
  const kind = finding?.kind || finding?.issueType || 'finding';
  const owner = finding?.owner?.name || finding?.owner?.id || finding?.component || 'runtime';
  return _deepFreeze({
    support: FindingVerificationSupport.SUPPORTED,
    supported: true,
    findingKind: kind,
    findingId: finding?.id || null,
    workflowId: `verify-${_slug(kind)}-${_slug(owner)}-${workflowSuffix}`,
    target,
    metrics: metric ? [metric] : [],
    evidenceNote: note,
  });
}

function createFindingVerificationPlan(finding = {}) {
  const kind = finding?.kind || finding?.issueType;
  const owner = _ownerMetricBase(finding);

  if (!kind) return _unsupported(finding, 'finding-kind-unavailable');

  if (kind === 'runtime-error') {
    const metricId = `finding:error-count:${_slug(owner.ownerId || owner.ownerName)}`;
    return _supported(finding, {
      workflowSuffix: 'errors',
      metric: {
        id: metricId,
        type: 'error',
        aggregate: 'count',
        ...owner,
      },
      target: {
        metricId,
        direction: MetricDirection.DECREASE,
        minimumAbsoluteImprovement: 1,
      },
      note: 'Verification measures whether error observations for the same owner decrease. It does not prove the attempted change caused the decrease.',
    });
  }

  if (kind === 'update-budget-opportunity' || kind === 'render-storm') {
    const metricId = `finding:update-count:${_slug(owner.ownerId || owner.ownerName)}`;
    return _supported(finding, {
      workflowSuffix: 'updates',
      metric: {
        id: metricId,
        type: 'component.update.completed',
        aggregate: 'count',
        ...owner,
      },
      target: {
        metricId,
        direction: MetricDirection.DECREASE,
        minimumAbsoluteImprovement: 1,
      },
      note: 'Verification measures owner-scoped completed updates across the replayed workflow. A lower count is verified improvement, not causal proof.',
    });
  }

  if (kind === 'slow-render') {
    const payload = finding?.payload || finding?.observed || {};
    const payloadPath = Number.isFinite(payload.actualDurationMs)
      ? 'actualDurationMs'
      : (Number.isFinite(payload.durationMs) ? 'durationMs' : null);
    if (!payloadPath) {
      return _unsupported(finding, 'render-duration-field-unavailable');
    }
    const metricId = `finding:render-avg-ms:${_slug(owner.ownerId || owner.ownerName)}`;
    return _supported(finding, {
      workflowSuffix: 'render-duration',
      metric: {
        id: metricId,
        type: 'component.update.completed',
        payloadPath,
        aggregate: 'avg',
        ...owner,
      },
      target: {
        metricId,
        direction: MetricDirection.DECREASE,
      },
      note: `Verification reuses the observed ${payloadPath} field for the same owner and compares average render duration. No statistical or causal claim is added.`,
    });
  }

  return _unsupported(finding, `no-safe-default-metric-for-${kind}`);
}

function createFindingVerificationSession({
  finding,
  store,
  intervention = { applied: true },
  workflowId = null,
  target = null,
  metrics = null,
  ...sessionOptions
} = {}) {
  const plan = createFindingVerificationPlan(finding);
  if (!plan.supported && (!target || !workflowId)) {
    throw new TypeError(`Finding cannot be auto-configured for verification: ${plan.reason}. Supply an explicit workflowId and target instead.`);
  }

  return createDiagnosticBeforeAfterSession({
    store,
    workflowId: workflowId || plan.workflowId,
    target: target || plan.target,
    metrics: metrics || plan.metrics,
    intervention,
    ...sessionOptions,
  });
}

export {
  FindingVerificationSupport,
  createFindingVerificationPlan,
  createFindingVerificationSession,
};
