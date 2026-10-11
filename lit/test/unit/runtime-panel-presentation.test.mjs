import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRuntimeReportHtml,
  createRuntimeReport,
  enhanceRuntimeIssueForFramework,
} from '../../src/panel/runtime-panel-presentation.js';

test('React issue recommendations never fall back to Lit lifecycle advice', () => {
  const slow = enhanceRuntimeIssueForFramework({
    issueType: 'slow-render',
    recommendation: 'Move work into updated()',
    component: 'ProductGrid',
  }, { framework: 'react' });
  assert.match(slow.recommendation, /React Profiler/);
  assert.doesNotMatch(slow.recommendation, /updated\(|disconnectedCallback|@lit-labs/);

  const resource = enhanceRuntimeIssueForFramework({
    issueType: 'resource-outlived-owner',
    recommendation: 'Use disconnectedCallback',
    component: 'SearchPanel',
  }, { framework: 'react' });
  assert.match(resource.recommendation, /useEffect\/useLayoutEffect/);
  assert.doesNotMatch(resource.recommendation, /disconnectedCallback/);

  const virtual = enhanceRuntimeIssueForFramework({
    issueType: 'virtualization-opportunity',
    recommendation: 'Use @lit-labs/virtualizer',
    component: 'Results',
  }, { framework: 'react' });
  assert.match(virtual.recommendation, /react-virtual|react-window/);
  assert.doesNotMatch(virtual.recommendation, /@lit-labs/);
});

test('worker findings degrade gracefully when script attribution is unavailable', () => {
  const issue = enhanceRuntimeIssueForFramework({
    issueType: 'worker-opportunity',
    component: '(main thread)',
    filePath: 'src/components//.js',
    details: 'Main thread blocked for 1250ms by .',
    observed: { durationMs: 1250, scriptUrl: '' },
  }, { framework: 'react' });

  assert.equal(issue.filePath, '');
  assert.match(issue.details, /No reliable script\/function attribution/);
  assert.doesNotMatch(issue.details, /by \./);
});

test('normalized report exports diagnostics, opportunities, intelligence and evidence capsule', () => {
  const events = [
    {
      id: 'evt-worker', type: 'diagnostic', owner: { id: 'o1', name: 'Grid' }, source: null,
      evidence: { level: 'correlation' }, correlation: {},
      payload: { workerOpportunity: true, durationMs: 180, diagnostic: 'worker' },
    },
    {
      id: 'evt-seq', type: 'diagnostic', owner: { id: 'o2', name: 'Search' }, source: { file: 'Search.jsx' },
      evidence: { level: 'attribution' }, correlation: {},
      payload: { sequentialApiOpportunity: true, callCount: 3, diagnostic: 'sequential' },
    },
    {
      id: 'evt-error', type: 'error', owner: { id: 'o3', name: 'Editor' }, source: { file: 'Editor.jsx' },
      evidence: { level: 'attribution' }, correlation: {}, payload: { message: 'boom' },
    },
    {
      id: 'evt-render', type: 'component.update.completed', owner: { id: 'o4', name: 'Heavy' }, source: { file: 'Heavy.jsx' },
      evidence: { level: 'observation' }, correlation: {}, payload: { actualDurationMs: 220 },
    },
  ];
  const store = { snapshot: () => events };
  const windowTarget = {
    __LDS_RUNTIME_FRAMEWORK__: 'react',
    __LDS_SESSION_ID__: 'session-1',
    __LDS_INTELLIGENCE__: { headline: 'Worker candidate' },
    __LDS_INTELLIGENCE_PIPELINE__: { exportCapsule: () => ({ id: 'capsule-1' }) },
  };

  const report = createRuntimeReport({
    baseReport: { errors: [], perf: {} },
    store,
    windowTarget,
  });

  assert.equal(report.framework, 'react');
  assert.equal(report.summary.evidenceCount, 4);
  assert.equal(report.summary.diagnosticCount, 2);
  assert.equal(report.summary.opportunityCount, 2);
  assert.equal(report.opportunities[0].kind, 'worker-opportunity');
  assert.equal(report.opportunities[1].kind, 'sequential-api-opportunity');
  assert.equal(report.intelligence.headline, 'Worker candidate');
  assert.equal(report.evidenceCapsule.id, 'capsule-1');
  assert.ok(report.normalizedFindings.some(item => item.kind === 'runtime-error'));
  assert.ok(report.normalizedFindings.some(item => item.kind === 'slow-render'));

  const html = buildRuntimeReportHtml(report);
  assert.match(html, /Optimization \/ reliability opportunities/);
  assert.match(html, /sequential-api-opportunity/);
  assert.match(html, /Worker candidate/);
});
