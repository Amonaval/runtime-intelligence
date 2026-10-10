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
  adapter.connect(token, { name: 'ProductGrid' });
  adapter.recordProfilerRender(token, { id: 'ProductGrid', phase: 'update', actualDuration: 21 });
  store.emit({
    type: RuntimeEventType.DIAGNOSTIC,
    evidence: { level: EvidenceLevel.OBSERVATION, attribution: AttributionQuality.HEURISTIC, confidence: 0.7 },
    payload: { virtualizationOpportunity: true, childTag: 'ProductCard' },
  });

  const model = buildRuntimeIntelligencePanelModel({ store, adapter });
  assert.equal(model.framework.framework, 'react');
  assert.equal(model.eventCount, 3);
  assert.equal(model.diagnosticCount, 1);
  assert.equal(model.opportunityCount, 1);
  assert.equal(model.recent[0].opportunity, true);
});
