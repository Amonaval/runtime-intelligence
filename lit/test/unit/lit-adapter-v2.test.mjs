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

test('Lit adapter emits deterministic lifecycle and framework-reported update cause', () => {
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
    RuntimeEventType.UPDATE_REQUESTED,
    RuntimeEventType.STATE_CHANGED,
    RuntimeEventType.UPDATE_STARTED,
    RuntimeEventType.UPDATE_COMPLETED,
    RuntimeEventType.OWNER_DESTROYED,
  ]);
  assert.equal(events[0].evidence.attribution,'deterministic');
  assert.equal(events[1].evidence.attribution,'framework-reported');
  assert.equal(events[1].payload.property,'value');
  assert.equal(events[1].payload.newValue.summary,'{id}');
  assert.equal(events[1].payload.newValue.id,undefined);
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
