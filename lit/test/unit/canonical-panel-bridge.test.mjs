import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import { RuntimeEventType, EvidenceLevel, AttributionQuality } from '../../src/core/evidence-protocol.js';
import { RuntimePanelEvidenceBridge } from '../../src/panel/runtime-evidence-bridge.js';

const evidence = {
  level: EvidenceLevel.OBSERVATION,
  attribution: AttributionQuality.FRAMEWORK_REPORTED,
  confidence: 1,
};

test('canonical panel bridge translates React UREP evidence without a second panel model', () => {
  const store = new EvidenceStore({ privacyPolicy: false, clock: (() => { let n = 1000; return () => ++n; })() });
  const fakeWindow = {};
  const bridge = new RuntimePanelEvidenceBridge({ store, windowTarget: fakeWindow }).start();

  store.emit({
    type: RuntimeEventType.OWNER_CREATED,
    framework: { name: 'react' },
    owner: { id: 'a', name: 'ProductGrid' },
    source: { file: 'src/ProductGrid.tsx' },
    evidence,
  });
  store.emit({
    type: RuntimeEventType.UPDATE_COMPLETED,
    framework: { name: 'react' },
    owner: { id: 'a', name: 'ProductGrid' },
    source: { file: 'src/ProductGrid.tsx' },
    evidence,
    payload: { actualDurationMs: 12.5, phase: 'update' },
  });
  store.emit({
    type: RuntimeEventType.OWNER_DESTROYED,
    framework: { name: 'react' },
    owner: { id: 'a', name: 'ProductGrid' },
    evidence,
  });

  assert.equal(fakeWindow.__LDS_EVIDENCE_STORE__, store);
  assert.equal(fakeWindow.__LDS_RUNTIME_FRAMEWORK__, 'react');
  assert.equal(fakeWindow.__LDS_PERF__.ProductGrid.count, 1);
  assert.equal(fakeWindow.__LDS_PERF__.ProductGrid.totalMs, 12.5);
  assert.equal(fakeWindow.__LDS_MEMORY__.ProductGrid.mounted, 1);
  assert.equal(fakeWindow.__LDS_MEMORY__.ProductGrid.unmounted, 1);
  assert.equal(fakeWindow.__LDS_EVENTS_TIMELINE__.length, 3);
  assert.equal(fakeWindow.__LDS_TAG_TO_FILE__('ProductGrid'), 'src/ProductGrid.tsx');

  bridge.stop();
  assert.equal(bridge.started, false);
});

test('canonical panel bridge keeps Vue framework identity in compatibility data and derived lifetime diagnostics', () => {
  const store = new EvidenceStore({ privacyPolicy: false, clock: (() => { let n = 2000; return () => ++n; })() });
  const fakeWindow = {};
  const bridge = new RuntimePanelEvidenceBridge({ store, windowTarget: fakeWindow }).start();
  const owner = { id: 'vue-a', name: 'VueResourceProbe' };
  const source = { file: 'src/VueResourceProbe.vue' };

  store.emit({
    type: RuntimeEventType.OWNER_CREATED,
    framework: { name: 'vue' },
    owner,
    source,
    evidence,
  });
  store.emit({
    type: RuntimeEventType.RESOURCE_ACQUIRED,
    framework: { name: 'vue' },
    owner,
    source,
    evidence,
    payload: { resourceId: 'timer-1', resourceType: 'interval' },
  });
  store.emit({
    type: RuntimeEventType.OWNER_DESTROYED,
    framework: { name: 'vue' },
    owner,
    source,
    evidence,
  });

  assert.equal(fakeWindow.__LDS_RUNTIME_FRAMEWORK__, 'vue');
  assert.equal(fakeWindow.__LDS_RESOURCE_VIOLATIONS__[0].framework, 'vue');
  const diagnostic = store.snapshot().find(event => event.payload?.resourceLifetimeViolation === true);
  assert.equal(diagnostic?.framework?.name, 'vue');
  assert.equal(diagnostic?.payload?.diagnostic, 'vue.resource-lifetime-violation');

  bridge.stop();
});
