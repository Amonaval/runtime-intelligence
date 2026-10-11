import { findingDeveloperGuidance } from './finding-developer-guidance.js';
import { shapeLegacyRuntimeReport, sanitizeRuntimeReport } from './legacy-report-privacy.js';

const OPPORTUNITY_FLAGS = Object.freeze([
  ['sequentialApiOpportunity', 'sequential-api-opportunity'],
  ['budgetViolation', 'update-budget-opportunity'],
  ['domDuplication', 'dom-duplication'],
  ['virtualizationOpportunity', 'virtualization-opportunity'],
  ['expensivePaint', 'expensive-paint'],
  ['workerOpportunity', 'worker-opportunity'],
  ['idleOpportunity', 'idle-scheduling-opportunity'],
  ['resourceLifetimeViolation', 'resource-lifetime-violation'],
]);

function _frameworkName(windowTarget, fallback = 'unknown') {
  return windowTarget?.__LDS_RUNTIME_FRAMEWORK__ || fallback || 'unknown';
}

function _recommendation(kind, framework = 'unknown') {
  const fw = String(framework || 'unknown').toLowerCase();
  const react = fw === 'react';

  if (react) {
    switch (kind) {
      case 'runtime-error':
        return 'Inspect the React/browser stack and the nearest component or async boundary. Check rejected promises, effect/event-handler failures, and invalid state/prop assumptions.';
      case 'render-storm':
      case 'property-thrash':
      case 'update-budget-opportunity':
        return 'Inspect repeated state/context updates and effect feedback loops. Stabilize derived objects/callbacks only where profiling proves churn, batch related updates, and split broad context subscriptions when appropriate.';
      case 'slow-render':
      case 'high-avg-tti':
        return 'Use the React Profiler to isolate the expensive boundary. Move non-render CPU work out of render, memoize only proven expensive pure calculations, split/lazy heavy children, and virtualize large collections.';
      case 'memory-leak':
      case 'resource-outlived-owner':
      case 'resource-lifetime-violation':
        return 'Return cleanup from useEffect/useLayoutEffect: clear timers, remove listeners, unsubscribe observers/event buses, abort pending work, and release tracked resources before the component owner unmounts.';
      case 'circular-update':
        return 'Break the React state/effect feedback loop. Re-check effect dependency arrays, avoid mirroring derived state, and guard state writes that can retrigger the same effect chain.';
      case 'virtualization-opportunity':
        return 'Virtualize the collection with a React-compatible virtualizer such as @tanstack/react-virtual or react-window, and render only the visible window plus a small overscan.';
      case 'dom-duplication':
        return 'Keep singleton UI such as dialogs/tooltips/overlays shared (often via a portal/provider) and control its content/visibility with state instead of mounting duplicate instances.';
      case 'worker-opportunity':
        return 'If this work is CPU-heavy and DOM-independent, move it to a Web Worker. Otherwise split/chunk the computation and keep user-critical React updates on the main thread.';
      case 'idle-scheduling-opportunity':
        return 'For non-urgent React rendering consider startTransition; for non-React background work consider scheduler.postTask or requestIdleCallback. Do not defer user-critical updates.';
      case 'sequential-api-opportunity':
        return 'If the requests are independent, start them together and await Promise.all/Promise.allSettled. Preserve sequential ordering only when a later request truly depends on an earlier result.';
      case 'expensive-paint':
        return 'Reduce repeated expensive CSS effects, simplify shadows/filters, and profile paint/composite cost before adding will-change. Prefer fewer promoted layers rather than blanket GPU hints.';
      case 'network-error':
        return 'Inspect the failing request, status, auth/CORS state, and backend availability. Treat 5xx as a server-side failure unless client evidence proves otherwise.';
      default:
        break;
    }
  }

  switch (kind) {
    case 'worker-opportunity':
      return 'If the work is CPU-heavy and DOM-independent, consider a Web Worker; otherwise split the task into smaller chunks and verify the improvement with a repeat run.';
    case 'sequential-api-opportunity':
      return 'Parallelize independent requests and keep sequential ordering only when data dependencies require it.';
    case 'update-budget-opportunity':
      return 'Reduce repeated updates inside the measured window and verify the change against the same runtime workflow.';
    case 'virtualization-opportunity':
      return 'Use a framework-appropriate virtual list so off-screen rows are not mounted unnecessarily.';
    case 'resource-lifetime-violation':
    case 'resource-outlived-owner':
      return 'Release listeners, timers, subscriptions, observers and other owned resources before the component/owner is destroyed.';
    default:
      return null;
  }
}

function enhanceRuntimeIssueForFramework(issue, { framework = 'unknown' } = {}) {
  if (!issue || typeof issue !== 'object') return issue;
  const next = { ...issue };
  const recommendation = _recommendation(next.issueType, framework);
  if (recommendation) next.recommendation = recommendation;

  if (next.issueType === 'worker-opportunity' && !next.observed?.scriptUrl) {
    const durationMs = next.observed?.durationMs;
    next.details = Number.isFinite(durationMs)
      ? `Main thread was blocked for ${durationMs}ms. No reliable script/function attribution was available.`
      : 'A main-thread worker-offload opportunity was observed, but no reliable script/function attribution was available.';
  }

  if (['browser', '(network)', '(main thread)', '(page load)', '(multiple)', '(runtime)'].includes(next.component)) {
    if (!next.callStacks?.length) next.filePath = '';
  }
  next.developerGuidance = findingDeveloperGuidance(next, { framework });
  return next;
}

function _opportunityFromDiagnostic(event, framework) {
  const payload = event?.payload || {};
  const match = OPPORTUNITY_FLAGS.find(([flag]) => payload[flag] === true);
  if (!match) return null;
  const [flag, kind] = match;
  return Object.freeze({
    id: event.id,
    kind,
    flag,
    owner: event.owner || null,
    source: event.source || null,
    evidence: event.evidence || null,
    correlation: event.correlation || null,
    recommendation: _recommendation(kind, framework),
    payload,
    synthetic: payload.synthetic === true,
  });
}

function _normalizedFinding(event, framework) {
  if (!event) return null;
  if (event.type === 'error') {
    return Object.freeze({
      id: event.id,
      kind: 'runtime-error',
      owner: event.owner || null,
      source: event.source || null,
      evidence: event.evidence || null,
      message: event.payload?.message || 'Runtime error',
      recommendation: _recommendation('runtime-error', framework),
      payload: event.payload || {},
      synthetic: event.payload?.synthetic === true,
    });
  }
  if (event.type === 'component.update.completed') {
    const durationMs = event.payload?.actualDurationMs ?? event.payload?.durationMs;
    if (Number.isFinite(durationMs) && durationMs >= 100) {
      return Object.freeze({
        id: event.id,
        kind: 'slow-render',
        owner: event.owner || null,
        source: event.source || null,
        evidence: event.evidence || null,
        message: `${event.owner?.name || 'Component boundary'} rendered in ${Math.round(durationMs)}ms`,
        recommendation: _recommendation('slow-render', framework),
        payload: event.payload || {},
        synthetic: event.payload?.synthetic === true,
      });
    }
  }
  if (event.type === 'diagnostic') {
    const opportunity = _opportunityFromDiagnostic(event, framework);
    if (opportunity) return opportunity;
  }
  return null;
}

function _semanticKey(item) {
  const payload = item?.payload || {};
  const owner = item?.owner?.name || item?.owner?.id || payload.tag || payload.ownerTag || 'runtime';
  const source = item?.source?.file || '';
  const synthetic = item?.synthetic === true || payload.synthetic === true ? 'synthetic' : 'observed';
  const discriminator = [
    payload.diagnostic,
    payload.property,
    payload.duplicateTag,
    payload.commonAncestorTag,
    payload.childTag,
    payload.parentTag,
    payload.scriptUrl,
    payload.path,
    payload.networkPath,
    payload.metric,
    item?.message,
  ].filter(Boolean).join('|');
  return `${item?.kind || item?.flag || 'finding'}::${owner}::${source}::${synthetic}::${discriminator}`;
}

function _dedupeSemantic(items = []) {
  const byKey = new Map();
  for (const item of items) {
    const key = _semanticKey(item);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...item,
        occurrenceCount: 1,
        eventIds: [item.id].filter(Boolean),
      });
      continue;
    }
    existing.occurrenceCount += 1;
    if (item.id) existing.eventIds.push(item.id);
    const currentConfidence = Number(existing.evidence?.confidence) || 0;
    const nextConfidence = Number(item.evidence?.confidence) || 0;
    if (nextConfidence > currentConfidence) {
      const count = existing.occurrenceCount;
      const eventIds = existing.eventIds;
      Object.assign(existing, item, { occurrenceCount: count, eventIds });
    }
  }
  return [...byKey.values()].map(item => Object.freeze({
    ...item,
    eventIds: Object.freeze([...new Set(item.eventIds)]),
  }));
}

function createRuntimeReport({
  baseReport = {},
  store = null,
  windowTarget = typeof window !== 'undefined' ? window : null,
  framework = null,
  note = '',
} = {}) {
  const fw = framework || _frameworkName(windowTarget, 'unknown');
  const evidence = store?.snapshot?.() || [];
  const diagnostics = evidence.filter(event => event.type === 'diagnostic');
  const rawOpportunities = diagnostics.map(event => _opportunityFromDiagnostic(event, fw)).filter(Boolean);
  const rawFindings = evidence.map(event => _normalizedFinding(event, fw)).filter(Boolean);
  const withGuidance = item => Object.freeze({ ...item, developerGuidance: findingDeveloperGuidance(item, { framework: fw }) });
  const opportunities = _dedupeSemantic(rawOpportunities).map(withGuidance);
  const normalizedFindings = _dedupeSemantic(rawFindings).map(withGuidance);
  const byType = {};
  for (const event of evidence) byType[event.type] = (byType[event.type] || 0) + 1;

  let evidenceCapsule = null;
  try { evidenceCapsule = windowTarget?.__LDS_INTELLIGENCE_PIPELINE__?.exportCapsule?.() || null; } catch {}

  return Object.freeze(sanitizeRuntimeReport({
    schemaVersion: 'runtime-intelligence-report/1',
    reportTime: new Date().toISOString(),
    note: note || baseReport?.note || '',
    framework: fw,
    sessionId: baseReport?.sessionId || windowTarget?.__LDS_SESSION_ID__ || null,
    summary: Object.freeze({
      evidenceCount: evidence.length,
      diagnosticCount: diagnostics.length,
      opportunityCount: opportunities.length,
      rawOpportunityCount: rawOpportunities.length,
      normalizedFindingCount: normalizedFindings.length,
      rawNormalizedFindingCount: rawFindings.length,
      evidenceByType: Object.freeze(byType),
    }),
    normalizedFindings: Object.freeze(normalizedFindings),
    opportunities: Object.freeze(opportunities),
    diagnostics: Object.freeze(diagnostics),
    intelligence: windowTarget?.__LDS_INTELLIGENCE__ || null,
    evidenceCapsule,
    evidence: Object.freeze([...evidence]),
    legacyReport: shapeLegacyRuntimeReport(baseReport || {}),
  }));
}

function _escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function _originBadge(item) {
  return item?.synthetic === true || item?.payload?.synthetic === true ? 'synthetic' : 'observed';
}

function _guidanceHtml(item, framework) {
  const guidance = findingDeveloperGuidance(item, { framework });
  return `<strong>Why this source?</strong> ${_escapeHtml(guidance.whySource)}<br><strong>What next?</strong> ${_escapeHtml(guidance.whatNext)}<br>Adoption level ${guidance.adoptionLevel}<br>${_escapeHtml(guidance.evidenceLimit)}`;
}

function buildRuntimeReportHtml(report) {
  report = sanitizeRuntimeReport(report);
  const findingRows = (report.normalizedFindings || []).map(item => `
    <tr><td>${_escapeHtml(item.kind)}</td><td>${_escapeHtml(item.owner?.name || item.owner?.id || 'runtime')}</td><td>${_escapeHtml(item.source?.file || '')}</td><td>${_escapeHtml(item.evidence?.level || '')}</td><td>${_escapeHtml(_originBadge(item))}</td><td>${_escapeHtml(item.occurrenceCount || 1)}</td><td>${_escapeHtml(item.message || item.payload?.diagnostic || '')}</td><td>${_escapeHtml(item.recommendation || '')}<br>${_guidanceHtml(item, report.framework)}</td></tr>`).join('');
  const opportunityRows = (report.opportunities || []).map(item => `
    <tr><td>${_escapeHtml(item.kind)}</td><td>${_escapeHtml(item.owner?.name || item.owner?.id || 'runtime')}</td><td>${_escapeHtml(item.source?.file || '')}</td><td>${_escapeHtml(item.evidence?.level || '')}</td><td>${_escapeHtml(_originBadge(item))}</td><td>${_escapeHtml(item.occurrenceCount || 1)}</td><td><pre>${_escapeHtml(JSON.stringify(item.payload, null, 2))}</pre></td><td>${_escapeHtml(item.recommendation || '')}<br>${_guidanceHtml(item, report.framework)}</td></tr>`).join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Runtime Intelligence Report</title>
<style>*{box-sizing:border-box}body{font:13px ui-monospace,SFMono-Regular,Consolas,monospace;margin:0;padding:24px;background:#111827;color:#e5e7eb}h1,h2{color:#93c5fd}h1{margin:0 0 6px}.meta{color:#9ca3af;margin-bottom:18px}.cards{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}.card{background:#1f2937;border:1px solid #374151;border-radius:8px;padding:10px 14px}.num{font-size:22px;font-weight:700}table{width:100%;border-collapse:collapse;margin:10px 0 22px}th,td{border-bottom:1px solid #374151;padding:7px;text-align:left;vertical-align:top}th{color:#9ca3af;background:#1f2937;position:sticky;top:0}pre{white-space:pre-wrap;word-break:break-word;background:#0b1220;padding:8px;border-radius:6px;max-height:380px;overflow:auto}details{margin:12px 0}summary{cursor:pointer;color:#93c5fd}.empty{color:#9ca3af}</style></head><body>
<h1>Runtime Intelligence Report</h1>
<div class="meta">${_escapeHtml(report.framework)} · ${_escapeHtml(report.reportTime)} · session ${_escapeHtml(report.sessionId || 'n/a')}</div>
<div class="cards"><div class="card"><div class="num">${_escapeHtml(report.summary?.evidenceCount || 0)}</div>evidence</div><div class="card"><div class="num">${_escapeHtml(report.summary?.diagnosticCount || 0)}</div>diagnostics</div><div class="card"><div class="num">${_escapeHtml(report.summary?.opportunityCount || 0)}</div>unique opportunities</div><div class="card"><div class="num">${_escapeHtml(report.summary?.normalizedFindingCount || 0)}</div>unique findings</div></div>
<h2>Normalized findings</h2>${findingRows ? `<table><thead><tr><th>Kind</th><th>Owner</th><th>Source</th><th>Evidence</th><th>Origin</th><th>Occurrences</th><th>Observed</th><th>Recommendation</th></tr></thead><tbody>${findingRows}</tbody></table>` : '<div class="empty">No normalized findings.</div>'}
<h2>Optimization / reliability opportunities</h2>${opportunityRows ? `<table><thead><tr><th>Kind</th><th>Owner</th><th>Source</th><th>Evidence</th><th>Origin</th><th>Occurrences</th><th>Payload</th><th>Recommendation</th></tr></thead><tbody>${opportunityRows}</tbody></table>` : '<div class="empty">No opportunities.</div>'}
<h2>Intelligence</h2><pre>${_escapeHtml(JSON.stringify(report.intelligence, null, 2))}</pre>
<h2>Evidence capsule</h2><pre>${_escapeHtml(JSON.stringify(report.evidenceCapsule, null, 2))}</pre>
<details><summary>Evidence by type</summary><pre>${_escapeHtml(JSON.stringify(report.summary?.evidenceByType || {}, null, 2))}</pre></details>
<details><summary>Legacy mature-panel report</summary><pre>${_escapeHtml(JSON.stringify(report.legacyReport || {}, null, 2))}</pre></details>
<details><summary>Complete normalized JSON</summary><pre>${_escapeHtml(JSON.stringify(report, null, 2))}</pre></details>
</body></html>`;
}

function _download({ documentTarget, content, mimeType, fileName }) {
  if (!documentTarget?.createElement || typeof Blob === 'undefined' || typeof URL === 'undefined') return null;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = documentTarget.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  documentTarget.body?.appendChild?.(anchor);
  anchor.click();
  anchor.remove?.();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}

function downloadRuntimeReport({ report, format = 'json', documentTarget = typeof document !== 'undefined' ? document : null, prefix = 'runtime-intelligence-report' } = {}) {
  if (!report) return null;
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
  report = sanitizeRuntimeReport(report);
  if (format === 'html') return _download({ documentTarget, content: buildRuntimeReportHtml(report), mimeType: 'text/html;charset=utf-8', fileName: `${prefix}-${stamp}.html` });
  return _download({ documentTarget, content: JSON.stringify(report, null, 2), mimeType: 'application/json;charset=utf-8', fileName: `${prefix}-${stamp}.json` });
}

function downloadRuntimeReports({ report, documentTarget = typeof document !== 'undefined' ? document : null, prefix } = {}) {
  return Object.freeze({
    json: downloadRuntimeReport({ report, format: 'json', documentTarget, prefix }),
    html: downloadRuntimeReport({ report, format: 'html', documentTarget, prefix }),
  });
}

export { OPPORTUNITY_FLAGS, enhanceRuntimeIssueForFramework, createRuntimeReport, buildRuntimeReportHtml, downloadRuntimeReport, downloadRuntimeReports };
