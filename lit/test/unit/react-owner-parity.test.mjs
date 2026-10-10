import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import { RuntimeEventType } from '../../src/core/evidence-protocol.js';
import { ReactAdapter } from '../../src/adapter/react/ReactAdapter.js';
import { RuntimePanelEvidenceBridge } from '../../src/panel/runtime-evidence-bridge.js';

test('React ownership evidence feeds mature perf/memory/resource workflows', () => {
  let now = 1000;
  const store = new EvidenceStore({ privacyPolicy: false, clock: () => ++now });
  const adapter = new ReactAdapter({ store, profilingEnabled: true });
  const fakeWindow = {};
  const bridge = new RuntimePanelEvidenceBridge({ store, windowTarget: fakeWindow }).start();
  const parent = {};
  const child = {};
  adapter.connect(parent, { name: 'Parent', source: 'src/Parent.tsx' });
  adapter.connect(child, { name: 'Child', source: 'src/Child.tsx' });
  adapter.linkParent(child, parent);
  assert.equal(adapter.ownerOf(child).parentId, adapter.ownerOf(parent).id);

  adapter.recordUpdateRequested(child, { stateKey: 'query', oldValue: '', newValue: 'a', source: 'src/Child.tsx' });
  adapter.recordStateChange(child, 'query', '', 'a', { source: 'src/Child.tsx' });
  adapter.recordProfilerRender(child, { id: 'Child', phase: 'update', actualDuration: 18, source: 'src/Child.tsx' });
  adapter.recordResourceAcquired(child, { resourceId: 'timer-1', resourceType: 'timer', source: 'src/Child.tsx' });
  adapter.disconnect(child, { source: 'src/Child.tsx' });

  assert.equal(fakeWindow.__LDS_PERF__.Child.count, 1);
  assert.equal(fakeWindow.__LDS_RENDER_REASONS__.Child.at(-1).prop, 'query');
  assert.equal(fakeWindow.__LDS_MEMORY__.Child.unmounted, 1);
  assert.equal(fakeWindow.__LDS_RESOURCE_VIOLATIONS__.length, 1);
  assert.equal(fakeWindow.__LDS_RESOURCE_VIOLATIONS__[0].resources[0].eventType, 'timer');
  assert.equal(store.snapshot({ type: RuntimeEventType.DIAGNOSTIC }).some(e => e.payload?.diagnostic === 'react.owner.parent-linked'), true);
  bridge.stop();
});
