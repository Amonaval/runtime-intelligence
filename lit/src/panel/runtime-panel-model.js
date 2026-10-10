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

function _round(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

function _sourceLabel(source) {
  if (!source) return null;
  const file = source.file || null;
  const fn = source.functionName || null;
  if (file && fn) return `${file}#${fn}`;
  return file || fn || null;
}

function _label(event) {
  const payload = event?.payload || {};
  if (payload.budgetViolation) return `Update budget: ${payload.tag || event.owner?.name || 'unknown'}`;
  if (payload.domDuplication) return `DOM duplication: ${payload.duplicateTag || 'pattern'}`;
  if (payload.virtualizationOpportunity) return `Virtualize: ${payload.childTag || event.owner?.name || 'list'}`;
  if (payload.expensivePaint) return `Paint: ${payload.selector || payload.pattern || 'expensive pattern'}`;
  if (payload.workerOpportunity) return `Worker candidate: ${payload.scriptUrl || 'main-thread task'}`;
  if (payload.idleOpportunity) return `Idle scheduling: ${payload.ownerTag || event.owner?.name || 'update'}`;
  if (event?.type === RuntimeEventType.UPDATE_COMPLETED && Number.isFinite(payload.actualDurationMs)) {
    const name = event.owner?.name || payload.profilerId || 'profiled boundary';
    const phase = payload.phase || 'render';
    return `${name}: ${_round(payload.actualDurationMs)}ms ${phase}`;
  }
  if (payload.diagnostic) return String(payload.diagnostic);
  return event.type || 'runtime event';
}

function _buildRenderActivity(events, limit) {
  const renders = events.filter(event =>
    event.type === RuntimeEventType.UPDATE_COMPLETED
    && Number.isFinite(event.payload?.actualDurationMs)
  );
  const grouped = new Map();

  for (const event of renders) {
    const name = event.owner?.name || event.payload?.profilerId || 'profiled boundary';
    const source = _sourceLabel(event.source);
    const key = `${name}\u0000${source || ''}`;
    let item = grouped.get(key);
    if (!item) {
      item = {
        name,
        source,
        commits: 0,
        mountCommits: 0,
        updateCommits: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
        lastTimestamp: null,
      };
      grouped.set(key, item);
    }
    const duration = event.payload.actualDurationMs;
    item.commits += 1;
    item.totalDurationMs += duration;
    item.maxDurationMs = Math.max(item.maxDurationMs, duration);
    item.lastTimestamp = event.timestamp;
    if (event.payload?.phase === 'mount') item.mountCommits += 1;
    else item.updateCommits += 1;
  }

  const boundaries = [...grouped.values()]
    .map(item => Object.freeze({
      ...item,
      totalDurationMs: _round(item.totalDurationMs),
      avgDurationMs: _round(item.totalDurationMs / item.commits),
      maxDurationMs: _round(item.maxDurationMs),
    }))
    .sort((a, b) =>
      (b.totalDurationMs - a.totalDurationMs)
      || (b.maxDurationMs - a.maxDurationMs)
      || (b.commits - a.commits)
    )
    .slice(0, Math.max(1, limit));

  const totalDurationMs = renders.reduce((sum, event) => sum + event.payload.actualDurationMs, 0);
  return Object.freeze({
    totalCommits: renders.length,
    totalDurationMs: _round(totalDurationMs),
    maxDurationMs: renders.length ? _round(Math.max(...renders.map(event => event.payload.actualDurationMs))) : 0,
    boundaries: Object.freeze(boundaries),
    interpretation: 'Profiler observations ranked by recorded duration within each named boundary. Nested boundaries can overlap, so totals are not exclusive and no render cause is inferred.',
  });
}

function buildRuntimeIntelligencePanelModel({ store, adapter = null, limit = 40, renderBoundaryLimit = 8 } = {}) {
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
  const renderActivity = _buildRenderActivity(events, renderBoundaryLimit);
  const recent = events.slice(-Math.max(1, limit)).reverse().map(event => Object.freeze({
    id: event.id,
    type: event.type,
    timestamp: event.timestamp,
    owner: event.owner?.name || event.owner?.id || null,
    framework: event.framework?.name || null,
    source: _sourceLabel(event.source),
    phase: event.payload?.phase || null,
    durationMs: Number.isFinite(event.payload?.actualDurationMs) ? _round(event.payload.actualDurationMs) : null,
    evidenceLevel: event.evidence?.level || null,
    attribution: event.evidence?.attribution || null,
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
    renderActivity,
    recent: Object.freeze(recent),
  });
}

export { OPPORTUNITY_FLAGS, buildRuntimeIntelligencePanelModel };
