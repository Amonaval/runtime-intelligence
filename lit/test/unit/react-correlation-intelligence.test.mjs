import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import { RuntimeEventType } from '../../src/core/evidence-protocol.js';
import { EvidenceGraph, EdgeRelation } from '../../src/core/evidence-graph.js';
import { ReactAdapter } from '../../src/adapter/react/ReactAdapter.js';
import { RuntimeCorrelationContext } from '../../src/integration/shared/runtime-correlation-context.js';
import { RuntimeIntelligencePipeline } from '../../src/integration/shared/RuntimeIntelligencePipeline.js';

test('interaction context correlates React render and network without inventing cause', () => {
  let now=1000;const store=new EvidenceStore({privacyPolicy:false,clock:()=>++now});const context=new RuntimeCorrelationContext({maxInteractionAgeMs:1500});const adapter=new ReactAdapter({store,profilingEnabled:true,correlationContext:context});
  const interaction=store.emit({type:RuntimeEventType.INTERACTION,framework:{name:'browser'},correlation:{interactionId:'i-1'},payload:{kind:'click'}});context.noteInteraction('i-1',interaction.timestamp);
  const token={};adapter.connect(token,{name:'SearchResults',source:'src/SearchResults.tsx'});adapter.recordProfilerRender(token,{id:'SearchResults',phase:'update',actualDuration:140,source:'src/SearchResults.tsx'});
  store.emit({type:RuntimeEventType.NETWORK_COMPLETED,framework:{name:'browser'},correlation:{interactionId:'i-1',traceId:'n-1'},payload:{path:'/api/search',durationMs:80}});
  const events=store.snapshot();const graph=new EvidenceGraph(events);const edges=graph.edges().filter(e=>e.relation===EdgeRelation.INTERACTION_CONTEXT);
  assert.ok(edges.length>=2);assert.equal(events.some(e=>e.correlation?.causedByEventId),false);
});

test('shared intelligence pipeline reports correlation as possible, not confirmed', () => {
  let now=2000;const store=new EvidenceStore({privacyPolicy:false,clock:()=>++now});const fakeWindow={location:{href:'https://example.test/'},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},dispatchEvent(){},addEventListener(){},removeEventListener(){}};
  const pipeline=new RuntimeIntelligencePipeline({store,windowTarget:fakeWindow,framework:'react',slowRenderThresholdMs:100}).start();
  store.emit({type:RuntimeEventType.INTERACTION,framework:{name:'browser'},correlation:{interactionId:'i-2'},payload:{kind:'click'}});
  store.emit({type:RuntimeEventType.UPDATE_COMPLETED,framework:{name:'react'},owner:{id:'c1',name:'Results'},source:'src/Results.tsx',correlation:{interactionId:'i-2'},payload:{actualDurationMs:130}});
  const summary=pipeline.snapshot();assert.equal(summary.status,'incident-captured');assert.equal(summary.confidence,'Possible');assert.match(summary.likelyCause,/correlation, not a confirmed cause/i);assert.ok(pipeline.exportCapsule());pipeline.stop();
});
