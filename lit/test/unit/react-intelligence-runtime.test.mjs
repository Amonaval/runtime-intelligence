import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import { RuntimeEventType } from '../../src/core/evidence-protocol.js';
import { ReactIntelligenceRuntime } from '../../src/react/ReactIntelligenceRuntime.js';

test('React runtime records framework-reported profiler evidence', () => {
  const store = new EvidenceStore({ privacyPolicy: false });
  const runtime = new ReactIntelligenceRuntime({ store, windowTarget: null, profilingEnabled: true });
  const token = {};
  runtime.start();
  runtime.adapter.connect(token, { name: 'Example' });
  runtime.adapter.recordProfilerRender(token, { id: 'Example', phase: 'mount', actualDuration: 12.5 });

  const renders = store.snapshot({ type: RuntimeEventType.UPDATE_COMPLETED });
  assert.equal(renders.length, 1);
  assert.equal(renders[0].framework.name, 'react');
  assert.equal(renders[0].owner.name, 'Example');
  assert.equal(renders[0].payload.actualDurationMs, 12.5);
  runtime.stop();
});

test('React runtime starts framework-neutral advisor services without a browser', () => {
  const store = new EvidenceStore({ privacyPolicy: false });
  const runtime = new ReactIntelligenceRuntime({ store, windowTarget: null });
  runtime.start();
  const description = runtime.describe();
  assert.equal(description.started, true);
  assert.ok(description.services.includes('UpdateBudgetMonitor'));
  assert.ok(description.services.includes('IdleSchedulingAdvisor'));
  runtime.stop();
  assert.equal(runtime.started, false);
});
