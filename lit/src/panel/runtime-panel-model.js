import { RuntimeEventType } from '../core/evidence-protocol.js';

const OPPORTUNITY_FLAGS = Object.freeze([
  'domDuplication',
  'virtualizationOpportunity',
  'expensivePaint',
  'workerOpportunity',
  'idleOpportunity',
]);

function _isOpportunity(event) {
  const payload = event?.payload || {};
  return OPPORTUNITY_FLAGS.some(flag => payload[flag] === true);
}

function _label(event) {
  const payload = event?.payload || {};
  if (payload.budgetViolation) return `Update budget: ${payload.tag || event.owner?.name || 'unknown'}`;
  if (payload.domDuplication) return `DOM duplication: ${payload.duplicateTag || 'pattern'}`;
  if (payload.virtualizationOpportunity) return `Virtualize: ${payload.childTag || event.owner?.name || 'list'}`;
  if (payload.expensivePaint) return `Paint: ${payload.selector || payload.pattern || 'expensive pattern'}`;
  if (payload.workerOpportunity) return `Worker candidate: ${payload.scriptUrl || 'main-thread task'}`;
  if (payload.idleOpportunity) return `Idle scheduling: ${payload.ownerTag || event.owner?.name || 'update'}`;
  if (payload.diagnostic) return String(payload.diagnostic);
  return event.type || 'runtime event';
}

function buildRuntimeIntelligencePanelModel({ store, adapter = null, limit = 40 } = {}) {
  if (!store || typeof store.snapshot !== 'function') {
    throw new TypeError('buildRuntimeIntelligencePanelModel requires an EvidenceStore-compatible store.');
  }

  const events = store.snapshot();
  const diagnostics = events.filter(event => event.type === RuntimeEventType.DIAGNOSTIC);
  const opportunities = diagnostics.filter(_isOpportunity);
  const byType = {};
  for (const event of events) byType[event.type] = (byType[event.type] || 0) + 1;

  const adapterDescription = adapter?.describe?.() || null;
  const latestFramework = [...events].reverse().find(event => event.framework?.name)?.framework || null;
  const recent = events.slice(-Math.max(1, limit)).reverse().map(event => Object.freeze({
    id: event.id,
    type: event.type,
    timestamp: event.timestamp,
    owner: event.owner?.name || event.owner?.id || null,
    framework: event.framework?.name || null,
    evidenceLevel: event.evidence?.level || null,
    confidence: event.evidence?.confidence ?? null,
    label: _label(event),
    opportunity: _isOpportunity(event),
  }));

  return Object.freeze({
    eventCount: events.length,
    diagnosticCount: diagnostics.length,
    opportunityCount: opportunities.length,
    byType: Object.freeze(byType),
    framework: adapterDescription || latestFramework,
    recent: Object.freeze(recent),
  });
}

export { OPPORTUNITY_FLAGS, buildRuntimeIntelligencePanelModel };
