import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import { RuntimeEventType } from '../../src/core/evidence-protocol.js';
import { LitAdapter } from '../../src/adapter/lit/LitAdapter.js';

function fakeLit(){
  return {
    localName:'product-editor', value:{id:2},
    requestUpdate(){}, async performUpdate(){}, updateComplete:Promise.resolve(),
    constructor:{properties:{value:{type:Object}}}, updated(){},
  };
}

test('Lit adapter emits deterministic lifecycle and preserves causal update order', () => {
  let now=100;
  const store=new EvidenceStore({clock:()=>++now});
  const adapter=new LitAdapter({store});
  const el=fakeLit();
  adapter.connect(el,{source:{file:'product-editor.js',line:10}});
  adapter.recordUpdateRequested(el,'value',{id:1});
  adapter.recordUpdateStarted(el);
  adapter.recordUpdateCompleted(el);
  adapter.disconnect(el);

  const events=store.snapshot();
  assert.deepEqual(events.map(e=>e.type),[
    RuntimeEventType.OWNER_CREATED,
    RuntimeEventType.STATE_CHANGED,
    RuntimeEventType.UPDATE_REQUESTED,
    RuntimeEventType.UPDATE_STARTED,
    RuntimeEventType.UPDATE_COMPLETED,
    RuntimeEventType.OWNER_DESTROYED,
  ]);

  const [ownerCreated,stateChanged,updateRequested,updateStarted,updateCompleted] = events;
  assert.equal(ownerCreated.evidence.attribution,'deterministic');
  assert.equal(stateChanged.evidence.attribution,'framework-reported');
  assert.equal(stateChanged.payload.property,'value');
  assert.equal(stateChanged.payload.newValue.summary,'{id}');
  assert.equal(stateChanged.payload.newValue.id,undefined);

  assert.equal(updateRequested.correlation.causedByEventId,stateChanged.id);
  assert.equal(updateRequested.correlation.parentEventId,stateChanged.id);
  assert.equal(updateStarted.correlation.causedByEventId,updateRequested.id);
  assert.equal(updateStarted.correlation.parentEventId,updateRequested.id);
  assert.equal(updateCompleted.correlation.causedByEventId,updateRequested.id);
  assert.equal(updateCompleted.correlation.parentEventId,updateStarted.id);
});

test('unspecified requestUpdate remains an observation without invented state cause', () => {
  const store=new EvidenceStore();
  const adapter=new LitAdapter({store});
  const el=fakeLit();
  adapter.connect(el);
  const event=adapter.recordUpdateRequested(el,undefined,undefined);
  assert.equal(event.type,RuntimeEventType.UPDATE_REQUESTED);
  assert.equal(event.evidence.level,'observation');
  assert.equal(event.correlation.causedByEventId,null);
  assert.equal(store.snapshot().filter(e=>e.type===RuntimeEventType.STATE_CHANGED).length,0);
});

test('disconnect clears unfinished update correlation state', () => {
  const store=new EvidenceStore();
  const adapter=new LitAdapter({store});
  const el=fakeLit();
  adapter.connect(el);
  adapter.recordUpdateRequested(el,'value',{id:1});
  adapter.recordUpdateStarted(el);
  adapter.disconnect(el);
  adapter.connect(el);
  const completed=adapter.recordUpdateCompleted(el);
  assert.equal(completed.correlation.causedByEventId,null);
  assert.equal(completed.payload.durationMs,null);
});

test('Lit v1 helper surface remains available during migration', async () => {
  const adapter=new LitAdapter({store:new EvidenceStore()});
  const el=fakeLit();
  let before=0,after=0,reasons=0;
  adapter.wrapRenderCycle(el,()=>before++,()=>after++);
  adapter.hookRequestUpdate(el,()=>reasons++);
  el.requestUpdate('value',null);
  await el.performUpdate();
  assert.equal(before,1); assert.equal(after,1); assert.equal(reasons,1);
  assert.deepEqual(adapter.getDeclaredProps(el),{value:{type:Object}});
});

test('LitDebugMixin preserves synchronous performUpdate return semantics', async () => {
    const { LitDebugMixin } = await import('../../src/LitDebugMixin.js');
    class Base {
        constructor() { this.updateComplete = Promise.resolve(true); }
        requestUpdate() { return 'requested'; }
        performUpdate() { return 42; }
    }
    const Mixed = LitDebugMixin(Base);
    const instance = new Mixed();
    instance.localName = 'sync-element';
    const result = instance.performUpdate();
    assert.equal(result, 42);
    assert.equal(result instanceof Promise, false);
});
