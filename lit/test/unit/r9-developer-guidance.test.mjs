import test from 'node:test';
import assert from 'node:assert/strict';
import { findingDeveloperGuidance } from '../../src/panel/finding-developer-guidance.js';
import { enhanceRuntimeIssueForFramework, createRuntimeReport, buildRuntimeReportHtml } from '../../src/panel/runtime-panel-presentation.js';
import { buildRuntimeOpportunitiesModel } from '../../src/panel/runtime-opportunities-model.js';

test('R9 explains provenance without changing source or evidence strength', () => {
  for (const [kind, wording] of Object.entries({ invocation: /invoked/, registration: /registered/, 'error-origin': /error stack/, 'component-definition': /definition/, 'component-registration': /boundary/, 'common-origin': /share/ })) {
    const issue = { issueType: 'slow-render', sourceLocation: { file: 'src/App.jsx' }, evidenceLevel: 'correlation', sourceProvenance: { kind, precision: 'module-location' }, sourceMatch: 'latest-matching-event' };
    const enhanced = enhanceRuntimeIssueForFramework(issue, { framework: 'react' });
    assert.match(enhanced.developerGuidance.whySource, wording);
    assert.match(enhanced.developerGuidance.whySource, /generated code/);
    assert.match(enhanced.developerGuidance.whySource, /may not explain every occurrence/);
    assert.match(enhanced.developerGuidance.evidenceLimit, /correlation.*do not/);
    assert.equal(enhanced.evidenceLevel, 'correlation');
    assert.equal(enhanced.sourceLocation, issue.sourceLocation);
    assert.equal(issue.developerGuidance, undefined);
  }
});

test('R9 recommends only targeted framework-appropriate adoption steps', () => {
  for (const [framework, expected] of [['react', /RuntimeIntelligenceProfiler/], ['vue', /sourceResolver/], ['lit', /shared base/]]) {
    const advice = findingDeveloperGuidance({ kind: 'slow-render' }, { framework });
    assert.equal(advice.adoptionLevel, 1);
    assert.match(advice.whySource, /Source unavailable/);
    assert.match(advice.whatNext, expected);
  }
  const resource = findingDeveloperGuidance({ kind: 'resource-lifetime-violation' }, { framework: 'react' });
  assert.equal(resource.adoptionLevel, 2);
  assert.match(resource.whatNext, /useRuntimeResource/);
  assert.equal(findingDeveloperGuidance({ kind: 'runtime-error' }).adoptionLevel, 0);
  assert.match(findingDeveloperGuidance({ evidence: { level: 'retainer-confirmed' } }).evidenceLimit, /does not establish/);
  assert.match(findingDeveloperGuidance({ evidence: { level: 'causality-confirmed' } }).evidenceLimit, /verify the proposed fix/);
  assert.match(findingDeveloperGuidance({ source: { file: 'context.js' } }).whySource, /causal role is unproven/);
});

test('R9 JSON, opportunity model and escaped HTML preserve guidance and limitations', () => {
  const report = createRuntimeReport({ framework: 'react', windowTarget: null, store: { snapshot: () => [
    { id: 'slow', type: 'component.update.completed', evidence: { level: 'observation' }, payload: { actualDurationMs: 150 } },
    { id: 'resource', type: 'diagnostic', source: { file: '<script>bad</script>' }, evidence: { level: 'attribution' }, payload: { resourceLifetimeViolation: true, sourceProvenance: { kind: 'registration' } } },
  ] } });
  const slow = report.normalizedFindings.find(item => item.kind === 'slow-render');
  assert.equal(slow.source, null);
  assert.equal(slow.evidence.level, 'observation');
  assert.equal(slow.developerGuidance.adoptionLevel, 1);
  assert.equal(report.opportunities[0].developerGuidance.adoptionLevel, 2);
  const model = buildRuntimeOpportunitiesModel({ opportunities: report.opportunities });
  assert.deepEqual(model.items[0].developerGuidance, report.opportunities[0].developerGuidance);
  const html = buildRuntimeReportHtml(report);
  assert.match(html, /Why this source\?/);
  assert.match(html, /What next\?/);
  assert.match(html, /RuntimeIntelligenceProfiler/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>bad/);
});
