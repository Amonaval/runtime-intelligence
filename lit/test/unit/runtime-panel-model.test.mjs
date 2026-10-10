import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import { RuntimeEventType, EvidenceLevel, AttributionQuality } from '../../src/core/evidence-protocol.js';
import { ReactAdapter } from '../../src/adapter/react/ReactAdapter.js';
import { buildRuntimeIntelligencePanelModel } from '../../src/panel/runtime-panel-model.js';

test('framework-neutral panel model summarizes React evidence and opportunities', () => {
  const store = new EvidenceStore({ privacyPolicy: false });
  const adapter = new ReactAdapter({ store, profilingEnabled: true });
  const token = {};
  adapter.connect(token, { name: 'ProductGrid', source: { file: '/src/ProductGrid.jsx', functionName: 'ProductGrid' } });
  adapter.recordProfilerRender(token, { id: 'ProductGrid', phase: 'mount', actualDuration: 21, source: { file: '/src/ProductGrid.jsx', functionName: 'ProductGrid' } });
  adapter.recordProfilerRender(token, { id: 'ProductGrid', phase: 'update', actualDuration: 9, source: { file: '/src/ProductGrid.jsx', functionName: 'ProductGrid' } });
  store.emit({
    type: RuntimeEventType.DIAGNOSTIC,
    evidence: { level: EvidenceLevel.OBSERVATION, attribution: AttributionQuality.HEURISTIC, confidence: 0.7 },
    payload: { virtualizationOpportunity: true, childTag: 'ProductCard' },
  });

  const model = buildRuntimeIntelligencePanelModel({ store, adapter });
  assert.equal(model.framework.framework, 'react');
  assert.equal(model.eventCount, 4);
  assert.equal(model.diagnosticCount, 1);
  assert.equal(model.opportunityCount, 1);
  assert.equal(model.recent[0].opportunity, true);
  assert.equal(model.renderActivity.totalCommits, 2);
  assert.equal(model.renderActivity.totalDurationMs, 30);
  assert.equal(model.renderActivity.boundaries.length, 1);
  assert.deepEqual(model.renderActivity.boundaries[0], {
    name: 'ProductGrid',
    source: '/src/ProductGrid.jsx#ProductGrid',
    commits: 2,
    mountCommits: 1,
    updateCommits: 1,
    totalDurationMs: 30,
    maxDurationMs: 21,
    lastTimestamp: model.renderActivity.boundaries[0].lastTimestamp,
    avgDurationMs: 15,
  });
  assert.match(model.renderActivity.interpretation, /nested boundaries can overlap/i);
  assert.match(model.renderActivity.interpretation, /no render cause is inferred/i);
  assert.equal(model.recent.find(event => event.type === RuntimeEventType.UPDATE_COMPLETED)?.source, '/src/ProductGrid.jsx#ProductGrid');
});

test('render activity ranks recorded work without inventing causality', () => {
  const store = new EvidenceStore({ privacyPolicy: false });
  const adapter = new ReactAdapter({ store, profilingEnabled: true });
  const a = {};
  const b = {};
  adapter.connect(a, { name: 'A' });
  adapter.connect(b, { name: 'B' });
  adapter.recordProfilerRender(a, { id: 'A', phase: 'update', actualDuration: 4 });
  adapter.recordProfilerRender(a, { id: 'A', phase: 'update', actualDuration: 5 });
  adapter.recordProfilerRender(b, { id: 'B', phase: 'update', actualDuration: 20 });

  const model = buildRuntimeIntelligencePanelModel({ store, adapter });
  assert.equal(model.renderActivity.boundaries[0].name, 'B');
  assert.equal(model.renderActivity.boundaries[0].totalDurationMs, 20);
  assert.equal(model.renderActivity.boundaries[1].name, 'A');
  assert.equal(model.renderActivity.boundaries[1].totalDurationMs, 9);
  assert.equal(model.recent.some(event => 'causedByEventId' in event), false);
});
