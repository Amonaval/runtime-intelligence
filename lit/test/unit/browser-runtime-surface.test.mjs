import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import { RuntimeEventType } from '../../src/core/evidence-protocol.js';
import { BrowserRuntimeSurface } from '../../src/integration/shared/browser-runtime-surface.js';

test('shared browser surface emits network, errors and interactions into UREP', () => {
  const store = new EvidenceStore({ privacyPolicy: false });
  const listeners = new Map();
  const docListeners = new Map();
  const fakeWindow = {
    document: {
      addEventListener(type, fn){ docListeners.set(type, fn); },
      removeEventListener(type){ docListeners.delete(type); },
    },
    addEventListener(type, fn){ listeners.set(type, fn); },
    removeEventListener(type){ listeners.delete(type); },
  };
  let networkSubscriber = null;
  const network = {
    init(){},
    subscribe(fn){ networkSubscriber = fn; return () => { networkSubscriber = null; }; },
  };
  const vitals = { init(){} };
  const consoleCapture = { attach(){} };
  const detector = { start(){}, stop(){} };
  const surface = new BrowserRuntimeSurface({
    store,
    windowTarget: fakeWindow,
    documentTarget: fakeWindow.document,
    network,
    vitals,
    consoleCapture,
    sequentialDetectorFactory: () => detector,
  }).start();

  networkSubscriber({ url: '/api/items?token=secret', method: 'GET', status: 200, durationMs: 42, type: 'fetch' });
  listeners.get('error')({ message: 'boom', filename: '/src/App.tsx', lineno: 9, colno: 4 });
  docListeners.get('click')({ target: { tagName: 'BUTTON', getAttribute: () => 'button' } });

  assert.equal(store.snapshot({ type: RuntimeEventType.NETWORK_COMPLETED }).length, 1);
  assert.equal(store.snapshot({ type: RuntimeEventType.NETWORK_COMPLETED })[0].payload.path, '/api/items');
  assert.equal(store.snapshot({ type: RuntimeEventType.ERROR }).length, 1);
  assert.equal(store.snapshot({ type: RuntimeEventType.INTERACTION }).length, 1);
  assert.equal(surface.started, true);

  surface.stop();
  assert.equal(surface.started, false);
  assert.equal(networkSubscriber, null);
  assert.equal(docListeners.size, 0);
});
