import { RuntimeEventType } from '../core/evidence-protocol.js';

function _location(source) {
  if (!source?.file) return null;
  const line = Number.isFinite(source.line) ? `:${source.line}` : '';
  const column = Number.isFinite(source.column) ? `:${source.column}` : '';
  return `${source.file}${line}${column}`;
}

function _provenanceLabel(kind) {
  switch (kind) {
    case 'invocation': return 'Invocation';
    case 'registration': return 'Resource registration';
    case 'error-origin': return 'Error origin';
    case 'component-definition': return 'Component definition';
    case 'component-registration': return 'Component boundary';
    case 'common-origin': return 'Common request origin';
    default: return 'Related runtime source';
  }
}

function _stackFromProvenance(provenance) {
  const frames = Array.isArray(provenance?.frames) ? provenance.frames : [];
  if (!frames.length) return null;
  return frames.map(frame => {
    const location = _location(frame);
    return location ? `at ${frame.functionName || 'application'} (${location})` : null;
  }).filter(Boolean).join('\n') || null;
}

function _eventMatchesIssue(issue, event) {
  switch (issue?.issueType) {
    case 'network-error':
      return event.type === RuntimeEventType.NETWORK_COMPLETED && event.payload?.isError === true;
    case 'runtime-error':
      return event.type === RuntimeEventType.ERROR;
    case 'slow-render':
    case 'high-avg-tti':
      return event.type === RuntimeEventType.UPDATE_COMPLETED;
    case 'property-thrash':
      return event.type === RuntimeEventType.STATE_CHANGED
        || event.type === RuntimeEventType.UPDATE_REQUESTED;
    case 'render-storm':
      return event.type === RuntimeEventType.OWNER_CREATED;
    case 'resource-outlived-owner':
      return event.type === RuntimeEventType.DIAGNOSTIC
        && event.payload?.resourceLifetimeViolation === true;
    default:
      return true;
  }
}

function _candidateEvent(issue, store) {
  let events = [];
  try { events = store?.snapshot?.() || []; } catch { return null; }
  const component = issue?.component;

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (!event?.source?.file || !_eventMatchesIssue(issue, event)) continue;
    if (component && !['(network)', '(runtime)', 'browser'].includes(component)) {
      const owner = event.owner?.name || event.owner?.id;
      if (owner !== component) continue;
    }
    return event;
  }
  return null;
}

function enrichPinpointIssueSource(issue, store) {
  if (!issue || typeof issue !== 'object') return issue;
  const event = _candidateEvent(issue, store);
  if (!event?.source?.file) return issue;

  const location = _location(event.source);
  const provenance = event.payload?.sourceProvenance || null;
  const provenanceStack = _stackFromProvenance(provenance);
  const existingStacks = Array.isArray(issue.callStacks) ? issue.callStacks.filter(Boolean) : [];
  const callStacks = provenanceStack
    ? [provenanceStack, ...existingStacks.filter(stack => stack !== provenanceStack)]
    : existingStacks;
  const label = issue.issueType === 'network-error' && provenance?.kind === 'invocation'
    ? 'Latest failed request invocation'
    : _provenanceLabel(provenance?.kind);
  const precision = provenance?.precision;
  const coordinateLabel = precision === 'module-location'
    ? ' (generated module coordinates)'
    : precision === 'generated-runtime' ? ' (generated runtime coordinates)' : '';
  const prefix = location ? `📍 ${label}: ${location}${coordinateLabel}` : null;
  const details = prefix && !String(issue.details || '').includes(location)
    ? `${prefix}\n${issue.details || ''}`.trim()
    : issue.details;

  return Object.freeze({
    ...issue,
    filePath: event.source.file,
    callStacks,
    details,
    sourceProvenance: provenance,
    sourceLocation: event.source,
    evidenceLevel: event.evidence?.level === 'attribution' ? 'attribution' : issue.evidenceLevel,
  });
}

export { enrichPinpointIssueSource };
