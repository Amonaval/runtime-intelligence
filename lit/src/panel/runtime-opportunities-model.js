const CATEGORY_BY_KIND = Object.freeze({
  'sequential-api-opportunity': 'network',
  'update-budget-opportunity': 'performance',
  'dom-duplication': 'rendering',
  'virtualization-opportunity': 'rendering',
  'expensive-paint': 'rendering',
  'worker-opportunity': 'scheduling',
  'idle-scheduling-opportunity': 'scheduling',
  'resource-lifetime-violation': 'memory',
});

const CATEGORY_LABELS = Object.freeze({
  performance: 'Performance',
  network: 'Network',
  rendering: 'Rendering',
  scheduling: 'Scheduling',
  memory: 'Memory',
  other: 'Other',
});

const KIND_LABELS = Object.freeze({
  'sequential-api-opportunity': 'Sequential API calls',
  'update-budget-opportunity': 'Excess component updates',
  'dom-duplication': 'Duplicate DOM',
  'virtualization-opportunity': 'Virtualization candidate',
  'expensive-paint': 'Expensive paint pattern',
  'worker-opportunity': 'Main-thread worker candidate',
  'idle-scheduling-opportunity': 'Idle scheduling candidate',
  'resource-lifetime-violation': 'Resource lifetime violation',
});

const KIND_ICONS = Object.freeze({
  'sequential-api-opportunity': '⚡',
  'update-budget-opportunity': '🔁',
  'dom-duplication': '🧩',
  'virtualization-opportunity': '📋',
  'expensive-paint': '🎨',
  'worker-opportunity': '🧵',
  'idle-scheduling-opportunity': '⏱',
  'resource-lifetime-violation': '🧠',
});

const PRIORITY_RANK = Object.freeze({ high: 0, medium: 1, low: 2 });

function opportunityCategory(kind) {
  return CATEGORY_BY_KIND[kind] || 'other';
}

function opportunityPriority(item) {
  const payload = item?.payload || {};
  switch (item?.kind) {
    case 'resource-lifetime-violation':
      return 'high';
    case 'sequential-api-opportunity':
      return Number(payload.estimatedSavingsMs) >= 500 ? 'high' : 'medium';
    case 'update-budget-opportunity': {
      const budget = Number(payload.countPerWindow) || 0;
      const count = Number(payload.updateCount) || 0;
      return budget > 0 && count >= budget * 2 ? 'high' : 'medium';
    }
    case 'virtualization-opportunity':
      return Number(payload.childCount) >= 1000 || Number(payload.offScreenRatio) >= 0.9 ? 'high' : 'medium';
    case 'worker-opportunity':
      return Number(payload.durationMs) >= 500 ? 'high' : 'medium';
    case 'dom-duplication':
      return payload.identicalContent === true && Number(payload.instanceCount) >= 4 ? 'high' : 'medium';
    case 'expensive-paint':
    case 'idle-scheduling-opportunity':
      return 'medium';
    default:
      return 'low';
  }
}

function opportunitySummary(item) {
  const payload = item?.payload || {};
  switch (item?.kind) {
    case 'sequential-api-opportunity': {
      const calls = payload.callCount || 'Multiple';
      const savings = Number.isFinite(payload.estimatedSavingsMs) ? ` · ~${Math.round(payload.estimatedSavingsMs)}ms potential saving` : '';
      const caller = payload.callerFn ? ` in ${payload.callerFn}()` : '';
      return `${calls} sequential calls${caller}${savings}`;
    }
    case 'update-budget-opportunity':
      return `${payload.updateCount || '?'} updates / ${payload.windowMs || '?'}ms · budget ${payload.countPerWindow || '?'}`;
    case 'virtualization-opportunity':
      return `${payload.childCount || '?'} children · ${Math.round((payload.offScreenRatio || 0) * 100)}% off-screen`;
    case 'dom-duplication':
      return `${payload.instanceCount || '?'} <${payload.duplicateTag || 'element'}> instances${payload.identicalContent ? ' with identical content' : ''}`;
    case 'expensive-paint':
      return `${payload.property || 'expensive CSS'} on ${payload.elementCount || '?'} elements`;
    case 'worker-opportunity':
      return `${Math.round(payload.durationMs || 0)}ms main-thread work${payload.trigger ? ` · ${payload.trigger}` : ''}`;
    case 'idle-scheduling-opportunity':
      return `${Math.round(payload.durationMs || 0)}ms non-urgent work${payload.ownerTag ? ` · ${payload.ownerTag}` : ''}`;
    case 'resource-lifetime-violation': {
      const types = Array.isArray(payload.resourceTypes) ? payload.resourceTypes.join(', ') : 'resource';
      return `${payload.resourceCount || 1} tracked ${types} remained acquired after owner teardown`;
    }
    default:
      return payload.diagnostic || item?.kind || 'Runtime opportunity';
  }
}

function opportunityNavigation(item) {
  switch (item?.kind) {
    case 'sequential-api-opportunity':
      return Object.freeze({ tab: 'network', label: 'Open Network' });
    case 'update-budget-opportunity':
      return Object.freeze({ tab: 'perf', label: 'Open Perf' });
    case 'resource-lifetime-violation':
      return Object.freeze({ tab: 'pinpoint', label: 'Open Pinpoint' });
    case 'dom-duplication':
    case 'virtualization-opportunity':
    case 'expensive-paint':
    case 'worker-opportunity':
    case 'idle-scheduling-opportunity':
      return Object.freeze({ tab: 'pinpoint', pinpointType: item.kind, label: 'Open Pinpoint' });
    default:
      return Object.freeze({ tab: 'intelligence', label: 'Open Intelligence' });
  }
}

function _sourceLabel(item) {
  const source = item?.source;
  if (!source?.file) return null;
  const line = Number.isFinite(source.line) ? `:${source.line}` : '';
  const column = Number.isFinite(source.column) ? `:${source.column}` : '';
  return `${source.file}${line}${column}`;
}

function _provenanceLabel(kind) {
  switch (kind) {
    case 'invocation': return 'Request invocation';
    case 'registration': return 'Resource registration';
    case 'error-origin': return 'Error origin';
    case 'component-definition': return 'Component definition';
    case 'component-registration': return 'Component boundary';
    case 'common-origin': return 'Common request origin';
    case 'related': return 'Related source';
    default: return null;
  }
}

function _applicationFrames(item) {
  const frames = item?.payload?.sourceProvenance?.frames;
  if (!Array.isArray(frames)) return Object.freeze([]);
  return Object.freeze(frames.slice(0, 5).map(frame => Object.freeze({
    file: frame?.file || null,
    line: Number.isFinite(frame?.line) ? frame.line : null,
    column: Number.isFinite(frame?.column) ? frame.column : null,
    functionName: frame?.functionName || null,
  })).filter(frame => frame.file));
}

function decorateRuntimeOpportunity(item) {
  const origin = item?.synthetic === true || item?.payload?.synthetic === true ? 'synthetic' : 'observed';
  const category = opportunityCategory(item?.kind);
  const provenance = item?.payload?.sourceProvenance || null;
  return Object.freeze({
    ...item,
    origin,
    category,
    categoryLabel: CATEGORY_LABELS[category] || CATEGORY_LABELS.other,
    label: KIND_LABELS[item?.kind] || String(item?.kind || 'Opportunity').replaceAll('-', ' '),
    icon: KIND_ICONS[item?.kind] || '💡',
    priority: opportunityPriority(item),
    summary: opportunitySummary(item),
    sourceLabel: _sourceLabel(item),
    sourceProvenance: provenance,
    sourceProvenanceLabel: _provenanceLabel(provenance?.kind),
    applicationFrames: _applicationFrames(item),
    evidenceLevel: item?.evidence?.level || 'observation',
    navigation: opportunityNavigation(item),
  });
}

function buildRuntimeOpportunitiesModel({ opportunities = [], filters = {} } = {}) {
  const all = opportunities.map(decorateRuntimeOpportunity);
  const category = filters.category || 'all';
  const origin = filters.origin || 'all';
  const evidence = filters.evidence || 'all';

  const filtered = all.filter(item => {
    if (category !== 'all' && item.category !== category) return false;
    if (origin !== 'all' && item.origin !== origin) return false;
    if (evidence !== 'all' && item.evidenceLevel !== evidence) return false;
    return true;
  }).sort((a, b) => {
    const priority = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    if (priority !== 0) return priority;
    if (a.origin !== b.origin) return a.origin === 'observed' ? -1 : 1;
    return (b.occurrenceCount || 1) - (a.occurrenceCount || 1);
  });

  const categoryCounts = {};
  const evidenceLevels = new Set();
  for (const item of all) {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    evidenceLevels.add(item.evidenceLevel);
  }

  return Object.freeze({
    total: all.length,
    observed: all.filter(item => item.origin === 'observed').length,
    synthetic: all.filter(item => item.origin === 'synthetic').length,
    high: all.filter(item => item.priority === 'high').length,
    medium: all.filter(item => item.priority === 'medium').length,
    low: all.filter(item => item.priority === 'low').length,
    categoryCounts: Object.freeze(categoryCounts),
    evidenceLevels: Object.freeze([...evidenceLevels].sort()),
    filters: Object.freeze({ category, origin, evidence }),
    items: Object.freeze(filtered),
  });
}

export {
  CATEGORY_LABELS,
  KIND_LABELS,
  opportunityCategory,
  opportunityPriority,
  opportunitySummary,
  opportunityNavigation,
  decorateRuntimeOpportunity,
  buildRuntimeOpportunitiesModel,
};
