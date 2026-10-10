import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import { IdleSchedulingAdvisor } from '../../src/core/idle-scheduling-advisor.js';
import { WorkerOpportunityAdvisor } from '../../src/core/worker-opportunity-advisor.js';
import { RuntimeEventType } from '../../src/core/evidence-protocol.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');

function emit(store, type, options = {}) {
  return store.emit({
    type,
    framework: { name: 'react', adapterVersion: 'test' },
    owner: options.owner || null,
    payload: options.payload || {},
  });
}

test('idle adviser accepts React Profiler actualDurationMs and respects explicit interaction evidence', () => {
  let now = 1_000;
  const store = new EvidenceStore({ clock: () => now, privacyPolicy: false });
  const advisor = new IdleSchedulingAdvisor({ store, minUpdateDurationMs: 16, lookbackWindowMs: 500 });
  advisor.start();

  const owner = { id: 'react-owner-1', name: 'ReactSlowArea' };
  emit(store, RuntimeEventType.INTERACTION, { payload: { kind: 'click' } });
  now += 100;
  emit(store, RuntimeEventType.UPDATE_COMPLETED, {
    owner,
    payload: { actualDurationMs: 80 },
  });

  assert.equal(
    store.snapshot({ type: RuntimeEventType.DIAGNOSTIC }).filter(e => e.payload?.idleOpportunity).length,
    0,
    'an interaction-adjacent render must not be called idle work',
  );

  now += 700;
  emit(store, RuntimeEventType.UPDATE_COMPLETED, {
    owner,
    payload: { actualDurationMs: 80 },
  });

  const opportunities = store.snapshot({ type: RuntimeEventType.DIAGNOSTIC })
    .filter(e => e.payload?.idleOpportunity);
  assert.equal(opportunities.length, 1);
  assert.equal(opportunities[0].payload.durationMs, 80);
  assert.equal(opportunities[0].payload.ownerTag, 'ReactSlowArea');

  advisor.stop();
});

test('worker adviser correlates long tasks with browser runtime responseSizeKB/path payloads', () => {
  let observerCallback = null;
  let perfNow = 200;
  class FakePerformanceObserver {
    constructor(callback) { observerCallback = callback; }
    observe() {}
    disconnect() {}
  }

  const store = new EvidenceStore({ privacyPolicy: false });
  const fakeWindow = {
    PerformanceObserver: FakePerformanceObserver,
    location: { origin: 'http://fault-lab.local' },
    performance: {
      timeOrigin: 1_000,
      now: () => perfNow,
    },
  };
  const advisor = new WorkerOpportunityAdvisor({ store, windowTarget: fakeWindow });
  advisor.start();

  emit(store, RuntimeEventType.NETWORK_COMPLETED, {
    payload: {
      path: '/api/fault-lab/large',
      responseSizeKB: 180,
      durationMs: 90,
    },
  });

  perfNow = 220;
  observerCallback({
    getEntries: () => [{
      duration: 180,
      startTime: 220,
      attribution: [],
    }],
  });

  const opportunities = store.snapshot({ type: RuntimeEventType.DIAGNOSTIC })
    .filter(e => e.payload?.workerOpportunity);
  assert.equal(opportunities.length, 1);
  assert.equal(opportunities[0].payload.trigger, 'large-network-response');
  assert.equal(opportunities[0].payload.networkUrl, '/api/fault-lab/large');
  assert.equal(opportunities[0].payload.networkResponseKB, 180);

  advisor.stop();
});

test('React Fault Lab is validation-only and excluded from the published package files', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  assert.equal(pkg.files.some(entry => String(entry).startsWith('examples')), false);

  const labPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'examples/react-fault-lab/package.json'), 'utf8'));
  assert.equal(labPkg.dependencies['runtime-intelligence'], 'file:../..');

  const injected = fs.readFileSync(
    path.join(repoRoot, 'examples/react-fault-lab/src/injected-scenarios.js'),
    'utf8',
  );
  assert.match(injected, /fault-lab-injected/);
});
