import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AttributionQuality,
  CapabilitySupport,
  EvidenceLevel,
  FrameworkCapability,
  RuntimeEventType,
  createEvidenceEvent,
  summarizeRuntimeValue,
  validateEvidenceEvent,
} from '../../src/core/evidence-protocol.js';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import { FrameworkAdapter } from '../../src/adapter/FrameworkAdapter.js';

test('universal protocol normalizes framework-neutral evidence', () => {
  const event=createEvidenceEvent({
    type:RuntimeEventType.UPDATE_COMPLETED,
    framework:{name:'react',version:'19'},
    owner:{id:'cmp-1',name:'MemberGrid'},
    evidence:{level:EvidenceLevel.CORRELATION,attribution:AttributionQuality.TEMPORAL_INFERENCE,confidence:0.73},
    payload:{durationMs:42},
  },{id:'evt-1',sequence:1,timestamp:100});
  assert.equal(event.type,'component.update.completed');
  assert.equal(event.framework.name,'react');
  assert.equal(event.evidence.level,'correlation');
  assert.equal(event.evidence.attribution,'temporal-inference');
  assert.deepEqual(validateEvidenceEvent(event),{valid:true,errors:[]});
});

test('protocol represents future high-confidence proof and cross-framework causal signals', () => {
  assert.equal(EvidenceLevel.RETAINER_CONFIRMED,'retainer-confirmed');
  assert.equal(RuntimeEventType.DEPENDENCY_TRIGGERED,'dependency.triggered');
  assert.equal(RuntimeEventType.BROWSER_FRAME,'browser.frame');
  assert.equal(RuntimeEventType.NAVIGATION,'navigation');
  const event=createEvidenceEvent({
    type:RuntimeEventType.DEPENDENCY_TRIGGERED,
    framework:{name:'vue'},
    evidence:{level:EvidenceLevel.ATTRIBUTION,attribution:AttributionQuality.FRAMEWORK_REPORTED,confidence:0.98},
    payload:{key:'filters.status',operation:'set'},
  },{id:'evt-dep',sequence:2,timestamp:101});
  assert.deepEqual(validateEvidenceEvent(event),{valid:true,errors:[]});
});

test('value summaries avoid retaining raw object graphs', () => {
  const sensitive={email:'person@example.com',token:'secret',nested:{huge:true}};
  const summary=summarizeRuntimeValue(sensitive);
  assert.equal(summary.type,'object');
  assert.equal('email' in summary,false);
  assert.equal(summary.summary.includes('secret'),false);
});

test('bounded evidence store drops oldest events without breaking subscribers', () => {
  let now=0; const seen=[];
  const store=new EvidenceStore({maxEntries:50,clock:()=>++now});
  store.subscribe(e=>seen.push(e.id));
  for(let i=0;i<60;i++) store.emit({type:RuntimeEventType.DIAGNOSTIC,framework:{name:'plain'},payload:{i}});
  assert.equal(store.size(),50);
  assert.equal(store.snapshot()[0].payload.i,10);
  assert.equal(seen.length,60);
});

test('adapter capability contract does not imply unsupported framework facts', () => {
  const store=new EvidenceStore();
  const adapter=new FrameworkAdapter({framework:'react',store,capabilities:{
    [FrameworkCapability.UPDATE_LIFECYCLE]:CapabilitySupport.FRAMEWORK_REPORTED,
    [FrameworkCapability.UPDATE_CAUSE]:CapabilitySupport.INFERRED,
  }});
  assert.equal(adapter.capability(FrameworkCapability.UPDATE_LIFECYCLE),'framework-reported');
  assert.equal(adapter.capability(FrameworkCapability.UPDATE_CAUSE),'inferred');
  assert.equal(adapter.capability(FrameworkCapability.REACTIVE_DEPENDENCY),'unsupported');
});
