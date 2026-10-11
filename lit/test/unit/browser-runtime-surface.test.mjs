import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import { RuntimeEventType } from '../../src/core/evidence-protocol.js';
import { BrowserRuntimeSurface } from '../../src/integration/shared/browser-runtime-surface.js';

test('shared browser surface emits evidence and fully releases owned browser instrumentation', () => {
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
  let consoleSubscriber = null;
  const lifecycle = { networkInit: 0, networkDetach: 0, vitalsInit: 0, vitalsDetach: 0, consoleAttach: 0, consoleDetach: 0 };
  const network = {
    init(){ lifecycle.networkInit += 1; },
    detach(){ lifecycle.networkDetach += 1; },
    subscribe(fn){ networkSubscriber = fn; return () => { networkSubscriber = null; }; },
  };
  const vitals = {
    init(){ lifecycle.vitalsInit += 1; },
    detach(){ lifecycle.vitalsDetach += 1; },
  };
  const consoleCapture = {
    attach(){ lifecycle.consoleAttach += 1; },
    detach(){ lifecycle.consoleDetach += 1; },
    subscribe(fn){ consoleSubscriber = fn; return () => { consoleSubscriber = null; }; },
  };
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

  assert.equal(fakeWindow.__LDS_INTELLIGENCE_ENABLED__, true);
  networkSubscriber({ url: '/api/items?token=secret', method: 'GET', status: 200, durationMs: 42, type: 'fetch' });
  consoleSubscriber({
    level: 'warn',
    message: 'inventory stale',
    callStack: 'Error\n    at warnUser (http://localhost/src/Feature.jsx:41:9)',
  });
  listeners.get('error')({ message: 'boom', filename: '/src/App.tsx', lineno: 9, colno: 4 });
  docListeners.get('click')({ target: { tagName: 'BUTTON', getAttribute: () => 'button' } });

  assert.equal(store.snapshot({ type: RuntimeEventType.NETWORK_COMPLETED }).length, 1);
  assert.equal(store.snapshot({ type: RuntimeEventType.NETWORK_COMPLETED })[0].payload.path, '/api/items');
  const consoleEvidence = store.snapshot({ type: RuntimeEventType.DIAGNOSTIC })
    .find(event => event.payload?.consoleMessage === true);
  assert.ok(consoleEvidence);
  assert.equal(consoleEvidence.source?.file, 'src/Feature.jsx');
  assert.equal(consoleEvidence.source?.line, 41);
  assert.equal(consoleEvidence.source?.column, 9);
  assert.equal(consoleEvidence.source?.functionName, 'warnUser');
  assert.equal(consoleEvidence.evidence?.level, 'attribution');
  assert.equal(consoleEvidence.evidence?.attribution, 'source-attributed');
  assert.equal(consoleEvidence.payload?.sourceProvenance?.kind, 'invocation');
  assert.equal(consoleEvidence.payload?.sourceProvenance?.basis, 'console-call-stack');
  assert.equal(store.snapshot({ type: RuntimeEventType.ERROR }).length, 1);
  assert.equal(store.snapshot({ type: RuntimeEventType.INTERACTION }).length, 1);
  assert.equal(surface.started, true);

  surface.stop();
  assert.equal(surface.started, false);
  assert.equal(networkSubscriber, null);
  assert.equal(consoleSubscriber, null);
  assert.equal(docListeners.size, 0);
  assert.equal(listeners.size, 0);
  assert.equal('__LDS_INTELLIGENCE_ENABLED__' in fakeWindow, false);
  assert.deepEqual(lifecycle, {
    networkInit: 1,
    networkDetach: 1,
    vitalsInit: 1,
    vitalsDetach: 1,
    consoleAttach: 1,
    consoleDetach: 1,
  });
});

test('shared browser surface restores a pre-existing intelligence flag', () => {
  const store = new EvidenceStore({ privacyPolicy: false });
  const fakeWindow = {
    __LDS_INTELLIGENCE_ENABLED__: 'host-owned',
    document: { addEventListener(){}, removeEventListener(){} },
    addEventListener(){},
    removeEventListener(){},
  };
  const inert = { init(){}, detach(){}, subscribe(){ return () => {}; } };
  const surface = new BrowserRuntimeSurface({
    store,
    windowTarget: fakeWindow,
    documentTarget: fakeWindow.document,
    network: inert,
    vitals: { init(){}, detach(){} },
    consoleCapture: { attach(){}, detach(){} },
    sequentialDetectorFactory: () => ({ start(){}, stop(){} }),
  }).start();

  surface.stop();
  assert.equal(fakeWindow.__LDS_INTELLIGENCE_ENABLED__, 'host-owned');
});
