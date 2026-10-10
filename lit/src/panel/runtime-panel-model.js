import { RuntimeEventType } from '../core/evidence-protocol.js';

const OPPORTUNITY_FLAGS = Object.freeze([
  'domDuplication',
  'virtualizationOpportunity',
  'expensivePaint',
  'workerOpportunity',
  'idleOpportunity',
]);

function _opportunityFlag(event) {
  const payload = event?.payload || {};
  return OPPORTUNITY_FLAGS.find(flag => payload[flag] === true) || null;
}

function _isOpportunity(event) {
  return _opportunityFlag(event) != null;
}

function _round(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

function _sourceLabel(source) {
  if (!source) return null;
  if (typeof source === 'string') return source;
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

function _opportunityGuidance(flag) {
  switch (flag) {
    case 'virtualizationOpportunity':
      return Object.freeze({
        why: 'A repeated child/list structure was observed that may be worth virtualizing when the rendered collection is large.',
        inspect: 'Inspect the named list/component and confirm visible item count, scroll cost, and whether off-screen rows are rendered.',
      });
    case 'domDuplication':
      return Object.freeze({
        why: 'Repeated DOM structure was observed. This can increase layout, style, memory, and update work when the duplicated region is large.',
        inspect: 'Inspect the repeated element/component and verify whether duplication is intentional and bounded.',
      });
    case 'expensivePaint':
      return Object.freeze({
        why: 'A paint-cost pattern was observed. This is a heuristic signal, not proof of a user-visible paint bottleneck.',
        inspect: 'Inspect the affected selector/pattern in DevTools Performance and Rendering before changing CSS.',
      });
    case 'workerOpportunity':
      return Object.freeze({
        why: 'Main-thread work was observed that may be movable off the UI thread if it is CPU-heavy and independent of DOM access.',
        inspect: 'Inspect the named task/script and confirm CPU time, frequency, and DOM dependencies before introducing a worker.',
      });
    case 'idleOpportunity':
      return Object.freeze({
        why: 'Non-urgent work was observed on the main thread and may be deferrable.',
        inspect: 'Inspect whether this work affects the immediate interaction; defer only work that is not required for the current frame.',
      });
    default:
      return Object.freeze({
        why: 'A runtime optimization opportunity was observed.',
        inspect: 'Inspect the supporting evidence before changing code.',
      });
  }
}

function _buildOpportunitySummaries(opportunities) {
  const grouped = new Map();
  for (const event of opportunities) {
    const flag = _opportunityFlag(event);
    const source = _sourceLabel(event.source);
    const label = _label(event);
    const key = `${flag || 'opportunity'}\u0000${label}\u0000${source || ''}`;
    let item = grouped.get(key);
    if (!item) {
      const guidance = _opportunityGuidance(flag);
      item = {
        flag,
        label,
        source,
        count: 0,
        confidence: null,
        attribution: event.evidence?.attribution || null,
        evidenceLevel: event.evidence?.level || null,
        lastTimestamp: null,
        why: guidance.why,
        inspect: guidance.inspect,
      };
      grouped.set(key, item);
    }
    item.count += 1;
    item.lastTimestamp = event.timestamp;
    const confidence = event.evidence?.confidence;
    if (Number.isFinite(confidence)) item.confidence = Math.max(item.confidence ?? 0, confidence);
  }
  return Object.freeze([...grouped.values()]
    .sort((a, b) => (b.count - a.count) || ((b.confidence ?? 0) - (a.confidence ?? 0)))
    .map(item => Object.freeze(item)));
}

function _looksLikeOverlappingBoundary(a, b) {
  if (!a || !b || a.name === b.name) return false;
  if (Math.abs(a.commits - b.commits) > 1) return false;
  if (Math.abs(a.updateCommits - b.updateCommits) > 1) return false;
  const totalBase = Math.max(a.totalDurationMs, b.totalDurationMs, 1);
  const maxBase = Math.max(a.maxDurationMs, b.maxDurationMs, 1);
  return Math.abs(a.totalDurationMs - b.totalDurationMs) / totalBase <= 0.2
    && Math.abs(a.maxDurationMs - b.maxDurationMs) / maxBase <= 0.2;
}

function _specificityScore(item) {
  let score = 0;
  if (item.source) score += 2;
  if (item.source && !/(^|\/)layout\.[jt]sx?(#|$)/i.test(item.source)) score += 3;
  if (!/root/i.test(item.name)) score += 1;
  return score;
}

function _collapseOverlappingBoundaries(boundaries) {
  const visible = [];
  const hidden = [];
  for (const item of boundaries) {
    const matchIndex = visible.findIndex(existing => _looksLikeOverlappingBoundary(existing, item));
    if (matchIndex < 0) {
      visible.push(item);
      continue;
    }
    const existing = visible[matchIndex];
    if (_specificityScore(item) > _specificityScore(existing)) {
      visible[matchIndex] = item;
      hidden.push(existing);
    } else {
      hidden.push(item);
    }
  }
  return Object.freeze({
    visible: Object.freeze(visible),
    hidden: Object.freeze(hidden),
  });
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

  const display = _collapseOverlappingBoundaries(boundaries);
  const totalDurationMs = renders.reduce((sum, event) => sum + event.payload.actualDurationMs, 0);
  return Object.freeze({
    totalCommits: renders.length,
    totalDurationMs: _round(totalDurationMs),
    maxDurationMs: renders.length ? _round(Math.max(...renders.map(event => event.payload.actualDurationMs))) : 0,
    boundaries: Object.freeze(boundaries),
    displayBoundaries: display.visible,
    hiddenOverlapCount: display.hidden.length,
    interpretation: 'Profiler observations rank recorded work within named boundaries. Similar nested boundaries are collapsed in the default view because their timings can overlap; no render cause is inferred.',
  });
}

function _buildRecentSignals(events, limit = 10) {
  const grouped = new Map();
  for (const event of [...events].reverse()) {
    const source = _sourceLabel(event.source);
    const label = _label(event);
    const key = `${event.type}\u0000${label}\u0000${source || ''}`;
    let item = grouped.get(key);
    if (!item) {
      item = {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        owner: event.owner?.name || event.owner?.id || null,
        source,
        label,
        occurrences: 0,
        evidenceLevel: event.evidence?.level || null,
        attribution: event.evidence?.attribution || null,
        confidence: event.evidence?.confidence ?? null,
        opportunity: _isOpportunity(event),
      };
      grouped.set(key, item);
    }
    item.occurrences += 1;
  }
  return Object.freeze([...grouped.values()].slice(0, Math.max(1, limit)).map(item => Object.freeze(item)));
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
    opportunitySummaries: _buildOpportunitySummaries(opportunities),
    byType: Object.freeze(byType),
    framework: adapterDescription || latestFramework,
    renderActivity,
    recentSignals: _buildRecentSignals(events),
    recent: Object.freeze(recent),
  });
}

export { OPPORTUNITY_FLAGS, buildRuntimeIntelligencePanelModel };
