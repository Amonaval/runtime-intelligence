import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRuntimeOpportunitiesModel,
  decorateRuntimeOpportunity,
  opportunityNavigation,
  opportunitySummary,
} from '../../src/panel/runtime-opportunities-model.js';

function opportunity({
  id,
  kind,
  payload = {},
  owner = null,
  source = null,
  evidence = { level: 'observation', attribution: 'heuristic', confidence: 0.7 },
  synthetic = false,
  occurrenceCount = 1,
}) {
  return {
    id,
    kind,
    payload: synthetic ? { ...payload, synthetic: true } : payload,
    owner,
    source,
    evidence,
    synthetic,
    occurrenceCount,
    recommendation: `Recommendation for ${kind}`,
  };
}

test('opportunities model classifies, counts and prioritizes observed and synthetic findings', () => {
  const model = buildRuntimeOpportunitiesModel({
    opportunities: [
      opportunity({
        id: 'seq',
        kind: 'sequential-api-opportunity',
        payload: { callCount: 3, estimatedSavingsMs: 720, callerFn: 'loadDashboard' },
        source: { file: 'src/load.js', line: 42 },
        evidence: { level: 'attribution', attribution: 'source-attributed', confidence: 0.9 },
      }),
      opportunity({
        id: 'resource',
        kind: 'resource-lifetime-violation',
        owner: { name: 'SearchPanel' },
        payload: { resourceCount: 1, resourceTypes: ['interval'] },
        evidence: { level: 'lifetime-violation', attribution: 'source-attributed', confidence: 1 },
      }),
      opportunity({
        id: 'virt',
        kind: 'virtualization-opportunity',
        payload: { childCount: 120, offScreenRatio: 0.92 },
        synthetic: true,
      }),
    ],
  });

  assert.equal(model.total, 3);
  assert.equal(model.observed, 2);
  assert.equal(model.synthetic, 1);
  assert.equal(model.high, 3);
  assert.equal(model.categoryCounts.network, 1);
  assert.equal(model.categoryCounts.memory, 1);
  assert.equal(model.categoryCounts.rendering, 1);
  assert.equal(model.items[0].origin, 'observed');
  assert.equal(model.items.at(-1).origin, 'synthetic');
});

test('opportunities model filters by category, origin and evidence level', () => {
  const opportunities = [
    opportunity({ id: 'a', kind: 'sequential-api-opportunity', evidence: { level: 'attribution' } }),
    opportunity({ id: 'b', kind: 'virtualization-opportunity', synthetic: true, evidence: { level: 'correlation' } }),
    opportunity({ id: 'c', kind: 'expensive-paint', evidence: { level: 'observation' } }),
  ];

  const network = buildRuntimeOpportunitiesModel({ opportunities, filters: { category: 'network' } });
  assert.deepEqual(network.items.map(item => item.id), ['a']);

  const synthetic = buildRuntimeOpportunitiesModel({ opportunities, filters: { origin: 'synthetic' } });
  assert.deepEqual(synthetic.items.map(item => item.id), ['b']);

  const observation = buildRuntimeOpportunitiesModel({ opportunities, filters: { evidence: 'observation' } });
  assert.deepEqual(observation.items.map(item => item.id), ['c']);
});

test('opportunity summaries expose the useful developer facts rather than raw payloads', () => {
  assert.equal(
    opportunitySummary({ kind: 'sequential-api-opportunity', payload: { callCount: 3, estimatedSavingsMs: 323, callerFn: 'runSequential' } }),
    '3 sequential calls in runSequential() · ~323ms potential saving',
  );
  assert.equal(
    opportunitySummary({ kind: 'update-budget-opportunity', payload: { updateCount: 6, windowMs: 100, countPerWindow: 5 } }),
    '6 updates / 100ms · budget 5',
  );
  assert.equal(
    opportunitySummary({ kind: 'virtualization-opportunity', payload: { childCount: 1800, offScreenRatio: 1 } }),
    '1800 children · 100% off-screen',
  );
});

test('opportunity navigation drills into the mature evidence views', () => {
  assert.deepEqual(opportunityNavigation({ kind: 'sequential-api-opportunity' }), { tab: 'network', label: 'Open Network' });
  assert.deepEqual(opportunityNavigation({ kind: 'update-budget-opportunity' }), { tab: 'perf', label: 'Open Perf' });
  assert.deepEqual(opportunityNavigation({ kind: 'worker-opportunity' }), { tab: 'pinpoint', pinpointType: 'worker-opportunity', label: 'Open Pinpoint' });
  assert.deepEqual(opportunityNavigation({ kind: 'resource-lifetime-violation' }), { tab: 'pinpoint', label: 'Open Pinpoint' });
});

test('decorated opportunity keeps source, evidence, occurrences and framework recommendation intact', () => {
  const item = decorateRuntimeOpportunity(opportunity({
    id: 'seq',
    kind: 'sequential-api-opportunity',
    payload: { callCount: 3, estimatedSavingsMs: 323 },
    source: { file: 'src/main.jsx', line: 111 },
    evidence: { level: 'attribution', attribution: 'source-attributed', confidence: 0.9 },
    occurrenceCount: 4,
  }));

  assert.equal(item.sourceLabel, 'src/main.jsx:111');
  assert.equal(item.evidenceLevel, 'attribution');
  assert.equal(item.occurrenceCount, 4);
  assert.equal(item.recommendation, 'Recommendation for sequential-api-opportunity');
});
