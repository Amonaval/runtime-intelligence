import { RuntimeEventType } from '../core/evidence-protocol.js';

function _location(source) {
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

function _candidateEvent(issue, store) {
  let events = [];
  try { events = store?.snapshot?.() || []; } catch { return null; }
  const component = issue?.component;

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (!event?.source?.file) continue;
    if (issue?.issueType === 'network-error') {
      if (event.type === RuntimeEventType.NETWORK_COMPLETED && event.payload?.isError === true) return event;
      continue;
    }
    if (issue?.issueType === 'runtime-error' && event.type !== RuntimeEventType.ERROR) continue;
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
  const callStacks = existingStacks.length ? existingStacks : (provenanceStack ? [provenanceStack] : []);
  const label = issue.issueType === 'network-error' && provenance?.kind === 'invocation'
    ? 'Latest failed request invocation'
    : _provenanceLabel(provenance?.kind);
  const prefix = location ? `📍 ${label}: ${location}` : null;
  const details = prefix && !String(issue.details || '').includes(location)
    ? `${prefix}\n${issue.details || ''}`.trim()
    : issue.details;

  return Object.freeze({
    ...issue,
    filePath: event.source.file,
    callStacks,
    details,
    sourceProvenance: provenance,
    evidenceLevel: event.evidence?.level === 'attribution' ? 'attribution' : issue.evidenceLevel,
  });
}

export { enrichPinpointIssueSource };
