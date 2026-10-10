const EVENT_LABELS = Object.freeze({
  'owner.created': 'component connected',
  'owner.destroyed': 'component disconnected',
  interaction: 'user interaction',
  'state.changed': 'state change',
  'dependency.triggered': 'dependency trigger',
  'component.update.requested': 'update requested',
  'component.update.started': 'render started',
  'component.update.completed': 'render completed',
  'resource.acquired': 'resource acquired',
  'resource.released': 'resource released',
  'network.started': 'network request started',
  'network.completed': 'network request completed',
  'browser.frame': 'browser frame',
  navigation: 'navigation',
  error: 'runtime error',
  diagnostic: 'diagnostic signal',
});

function _label(type) {
  return EVENT_LABELS[type] || String(type || 'runtime signal').replaceAll('.', ' ');
}

function _sourceText(source) {
  if (!source?.file) return null;
  return `${source.file}${source.line ? `:${source.line}` : ''}`;
}

function _strengthText(rootCause) {
  const strength = rootCause?.strength || 'correlated';
  if (strength === 'confirmed' || strength === 'causality-confirmed') return 'Confirmed';
  if (strength === 'attributed') return 'High confidence';
  if (strength === 'lifetime-violation' || strength === 'retainer-confirmed') return 'Strong evidence';
  return 'Possible';
}

function _eventCounts(events = []) {
  const counts = {};
  for (const event of events) {
    counts[event?.type] = (counts[event?.type] || 0) + 1;
  }
  return counts;
}

function _impactItems(events, triggerEvent) {
  const counts = _eventCounts(events);
  const items = [];
  const durationMs = triggerEvent?.payload?.actualDurationMs ?? triggerEvent?.payload?.durationMs;
  if (Number.isFinite(durationMs)) items.push(`${Math.round(durationMs)} ms render`);
  if (counts['component.update.completed']) items.push(`${counts['component.update.completed']} renders`);
  if (counts['state.changed']) items.push(`${counts['state.changed']} state changes`);
  if (counts['network.completed']) items.push(`${counts['network.completed']} network requests`);
  if (counts.error) items.push(`${counts.error} runtime errors`);
  return items.slice(0, 4);
}

function _diagnosticFinding(event) {
  const payload = event?.payload || {};
  if (payload.sequentialApiOpportunity) {
    return {
      headline: 'Sequential API opportunity detected',
      problem: `${payload.callCount || 'Multiple'} API calls appear sequential${Number.isFinite(payload.estimatedSavingsMs) ? ` with about ${Math.round(payload.estimatedSavingsMs)} ms potential overlap` : ''}.`,
      nextAction: 'Inspect the attributed call site and verify whether independent requests can be parallelized.',
    };
  }
  if (payload.resourceLifetimeViolation) {
    return {
      headline: 'Resource lifetime violation detected',
      problem: `A React owner was destroyed while ${payload.resourceCount || 1} tracked resource${payload.resourceCount === 1 ? '' : 's'} remained acquired.`,
      nextAction: 'Inspect the owner cleanup path and release each tracked listener, timer, subscription or observer.',
    };
  }
  if (payload.budgetViolation) {
    return {
      headline: 'Update budget exceeded',
      problem: `${payload.tag || event.owner?.name || 'A component'} exceeded its configured update budget.`,
      nextAction: 'Inspect recent tracked state changes and parent updates before increasing the budget.',
    };
  }
  if (payload.domDuplication) {
    return {
      headline: 'DOM duplication opportunity',
      problem: `Repeated DOM for ${payload.duplicateTag || 'a component'} was observed.`,
      nextAction: 'Inspect the shared ancestor and verify whether repeated instances can be hoisted or reused.',
    };
  }
  if (payload.virtualizationOpportunity) {
    return {
      headline: 'Virtualization opportunity',
      problem: `A large rendered list was observed${payload.childCount ? ` (${payload.childCount} children)` : ''}.`,
      nextAction: 'Inspect the list container and consider windowing if most rows are off-screen.',
    };
  }
  if (payload.expensivePaint) {
    return {
      headline: 'Expensive paint pattern observed',
      problem: `An expensive CSS paint pattern was observed${payload.property ? ` for ${payload.property}` : ''}.`,
      nextAction: 'Inspect the affected elements and verify paint cost in browser performance tooling.',
    };
  }
  if (payload.workerOpportunity) {
    return {
      headline: 'Main-thread worker opportunity',
      problem: `A long main-thread task was observed${Number.isFinite(payload.durationMs) ? ` (${Math.round(payload.durationMs)} ms)` : ''}.`,
      nextAction: 'Inspect the attributed processing path and verify whether CPU-heavy work can move off the main thread.',
    };
  }
  return null;
}

function createReadyDeveloperSummary() {
  return Object.freeze({
    status: 'ready',
    headline: 'Runtime Intelligence is ready',
    explanation: 'Use the application normally. The same mature product correlates framework, browser, network and ownership evidence when a meaningful finding occurs.',
    problem: null,
    likelyCause: null,
    confidence: null,
    source: null,
    impact: Object.freeze([]),
    nextAction: 'Reproduce the workflow you want to investigate, then open this tab. Perf, Network, Pinpoint and other tabs remain the detailed evidence views.',
    technicalEvidence: Object.freeze({ available: false, eventCount: 0 }),
    verification: null,
  });
}

function createDeveloperIntelligenceSummary({
  triggerEvent,
  incident,
  rootCause,
  rootEvent,
  verification = null,
} = {}) {
  if (!triggerEvent || !incident) return createReadyDeveloperSummary();

  const diagnostic = triggerEvent.type === 'diagnostic' ? _diagnosticFinding(triggerEvent) : null;
  const isError = triggerEvent.type === 'error';
  const durationMs = triggerEvent.payload?.actualDurationMs ?? triggerEvent.payload?.durationMs;
  const ownerName = triggerEvent.owner?.name || triggerEvent.framework?.name || 'runtime';
  const rootLabel = rootCause?.rootLabel || rootEvent?.owner?.name || null;
  const source = _sourceText(rootEvent?.source || triggerEvent.source);
  const impact = _impactItems(incident.events || [], triggerEvent);
  const strength = rootCause?.strength || 'correlated';

  const problem = diagnostic?.problem || (isError
    ? `${ownerName} hit a runtime error${triggerEvent.payload?.message ? `: ${triggerEvent.payload.message}` : ''}`
    : `${ownerName} had a slow render observation${Number.isFinite(durationMs) ? ` (${Math.round(durationMs)} ms)` : ''}`);

  const likelyCause = rootLabel
    ? strength === 'confirmed'
      ? `${rootLabel} caused this problem — causality confirmed.`
      : strength === 'attributed'
        ? `${rootLabel} is a likely contributor — strong evidence links it to this finding.`
        : `${rootLabel} was the strongest related signal. This is correlation, not a confirmed cause.`
    : 'The finding was captured, but there is not enough evidence to identify a contributor.';

  const nextAction = diagnostic?.nextAction || (source
    ? `Start at ${source}${rootLabel ? ` and inspect ${rootLabel}` : ''}.`
    : isError
      ? 'Inspect the attributed error and surrounding runtime evidence.'
      : 'Inspect state, interaction and network activity immediately around this render.');

  return Object.freeze({
    status: 'incident-captured',
    headline: diagnostic?.headline || (isError ? 'Runtime error captured' : 'Render hotspot captured'),
    explanation: 'This finding combines related runtime signals while preserving their evidence strength. Temporal relationships are shown as correlations, not causes.',
    problem,
    likelyCause,
    confidence: _strengthText(rootCause),
    source,
    impact: Object.freeze(impact),
    nextAction,
    technicalEvidence: Object.freeze({
      available: true,
      eventCount: Array.isArray(incident.events) ? incident.events.length : 0,
      triggerType: _label(triggerEvent.type),
    }),
    verification: verification ? Object.freeze({
      outcome: verification.outcome || null,
      confirmed: verification.confirmed === true,
    }) : null,
  });
}

export { createReadyDeveloperSummary, createDeveloperIntelligenceSummary };
