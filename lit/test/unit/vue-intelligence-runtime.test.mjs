import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import {
  VueIntelligenceRuntime,
  createVueIntelligenceRuntime,
} from '../../src/vue/VueIntelligenceRuntime.js';

test('Vue runtime reuses shared services and stays browser-optional', () => {
  const store = new EvidenceStore({ privacyPolicy: false });
  const runtime = createVueIntelligenceRuntime({ store, windowTarget: null, version: '3.x' });

  assert.ok(runtime instanceof VueIntelligenceRuntime);
  assert.equal(runtime.started, false);
  runtime.start();
  const description = runtime.describe();
  assert.equal(runtime.started, true);
  assert.equal(description.framework, 'vue');
  assert.equal(description.adapter.framework, 'vue');
  assert.deepEqual(description.services, ['IdleSchedulingAdvisor']);
  runtime.stop();
  assert.equal(runtime.started, false);
});
