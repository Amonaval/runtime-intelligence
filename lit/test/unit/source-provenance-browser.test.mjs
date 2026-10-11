import test from 'node:test';
import assert from 'node:assert/strict';
import {BrowserRuntimeSurface} from '../../src/integration/shared/browser-runtime-surface.js';

function setup(){
 const events=[]; const listeners=new Map(); let subscriber;
 const fakeWindow={document:{addEventListener(){},removeEventListener(){}},addEventListener(t,f){listeners.set(t,f)},removeEventListener(t){listeners.delete(t)}};
 const network={init(){},detach(){},subscribe(fn){subscriber=fn; return()=>{subscriber=null}}};
 const surface=new BrowserRuntimeSurface({store:{emit(e){events.push(e);return {timestamp:1}}},windowTarget:fakeWindow,documentTarget:fakeWindow.document,network,vitals:{init(){},detach(){}},consoleCapture:{attach(){},detach(){}},sequentialDetectorFactory:()=>({start(){},stop(){}})}).start();
 return {events,listeners,networkEvent:e=>subscriber(e),surface};
}

test('network provenance finds TrustWeave caller and does not persist raw stack',()=>{
 const h=setup();
 h.networkEvent({url:'/api/members?token=x',method:'GET',status:200,durationMs:40,type:'fetch',callStack:`Error\n at _patchedFetch (/repo/node_modules/runtime-intelligence/lit/src/core/network.js:80:1)\n at apiClient (webpack-internal:///(app-pages-browser)/./lib/api-client.ts:44:11)\n at loadMembers (webpack-internal:///(app-pages-browser)/./components/NetworkApp.tsx:187:7)`});
 const e=h.events.find(x=>x.type==='network.completed');
 assert.deepEqual(e.source,{file:'lib/api-client.ts',line:44,column:11,functionName:'apiClient'});
 assert.equal(e.evidence.level,'attribution');
 assert.equal(e.payload.sourceProvenance.kind,'invocation');
 assert.equal(e.payload.sourceProvenance.frames[1].file,'components/NetworkApp.tsx');
 assert.equal(JSON.stringify(e.payload).includes('_patchedFetch'),false);
 assert.equal('stack' in e.payload,false);
 h.surface.stop();
});

test('unhandled rejection receives error-origin source attribution',()=>{
 const h=setup();
 const err=new Error('bad');
 err.stack='Error: bad\n at loadMembers (webpack-internal:///(app-pages-browser)/./components/NetworkApp.tsx:91:5)';
 h.listeners.get('unhandledrejection')({reason:err});
 const e=h.events.find(x=>x.type==='error');
 assert.equal(e.source.file,'components/NetworkApp.tsx');
 assert.equal(e.source.line,91);
 assert.equal(e.payload.sourceProvenance.kind,'error-origin');
 assert.equal(e.evidence.level,'attribution');
 h.surface.stop();
});

test('internal-only stack stays observation instead of inventing source',()=>{
 const h=setup();
 h.networkEvent({url:'/api/x',callStack:'Error\n at x (/repo/node_modules/react-dom/index.js:1:1)'});
 const e=h.events.find(x=>x.type==='network.completed');
 assert.equal(e.source,null);
 assert.equal(e.evidence.level,'observation');
 assert.equal(e.payload.sourceProvenance,undefined);
 h.surface.stop();
});

test('legacy Lit network bridge preserves invocation provenance instead of dropping captured stack', async () => {
  const { recordLegacyNetworkEntry } = await import('../../src/integration/lit/network-evidence-bridge.js');
  const emitted = [];
  const store = { emit(input) { emitted.push(input); return input; } };
  recordLegacyNetworkEntry({
    url: '/api/items?token=secret',
    method: 'GET',
    status: 500,
    durationMs: 30,
    type: 'fetch',
    isError: true,
    callStack: 'Error\n at request (webpack-internal:///(app-pages-browser)/./services/items.ts:55:9)',
  }, { store });
  assert.equal(emitted[0].source.file, 'services/items.ts');
  assert.equal(emitted[0].source.line, 55);
  assert.equal(emitted[0].payload.sourceProvenance.kind, 'invocation');
  assert.equal(emitted[0].evidence.level, 'attribution');
});
