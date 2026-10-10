import { EvidenceGraph } from '../../core/evidence-graph.js';
import { RootCauseGrouper } from '../../core/root-cause.js';
import { IncidentFlightRecorder } from '../../core/incident-flight-recorder.js';
import { createEvidenceCapsule } from '../../core/evidence-capsule.js';
import { RuntimeEventType } from '../../core/evidence-protocol.js';
import { BackgroundSessionStore } from '../../core/background-session-store.js';
import { NavigationBridge } from './navigation-bridge.js';
import { NetworkStateCorrelator } from './network-state-correlator.js';
import { createReadyDeveloperSummary, createDeveloperIntelligenceSummary } from './developer-intelligence-summary.js';
import { installRuntimeIntelligencePanelPresentation } from './panel-intelligence-presentation.js';

const DEFAULT_SLOW_RENDER_THRESHOLD_MS = 100;
const MAX_CHAIN = 24;
const MEANINGFUL_DIAGNOSTIC_FLAGS = Object.freeze(['sequentialApiOpportunity','resourceLifetimeViolation','budgetViolation','domDuplication','virtualizationOpportunity','expensivePaint','workerOpportunity']);
function _meaningfulDiagnostic(e){return e?.type===RuntimeEventType.DIAGNOSTIC&&MEANINGFUL_DIAGNOSTIC_FLAGS.some(k=>e.payload?.[k]===true);}
function _eventRef(e){return e?Object.freeze({id:e.id,type:e.type,sequence:e.sequence,ownerId:e.owner?.id||null,evidenceLevel:e.evidence?.level||null}):null;}
function _freeze(value,seen=new WeakSet()){if(!value||typeof value!=='object'||seen.has(value))return value;seen.add(value);for(const c of Object.values(value))_freeze(c,seen);return Object.freeze(value);}

class RuntimeIntelligencePipeline {
  #store;#window;#framework;#threshold;#grouper;#recorder;#nav;#networkCorrelator;#background;#unsubscribe=null;#latest=null;#latestCapsule=null;#context=null;#seq=0;
  constructor({store,windowTarget=typeof window!=='undefined'?window:null,framework='unknown',slowRenderThresholdMs=DEFAULT_SLOW_RENDER_THRESHOLD_MS,rootCauseOptions={},backgroundStore=null}={}){
    if(!store||typeof store.subscribe!=='function'||typeof store.snapshot!=='function')throw new TypeError('RuntimeIntelligencePipeline requires an EvidenceStore-compatible store.');
    this.#store=store;this.#window=windowTarget;this.#framework=framework;this.#threshold=Number.isFinite(slowRenderThresholdMs)&&slowRenderThresholdMs>=0?slowRenderThresholdMs:DEFAULT_SLOW_RENDER_THRESHOLD_MS;this.#grouper=new RootCauseGrouper(rootCauseOptions);this.#background=backgroundStore||null;
    this.#recorder=new IncidentFlightRecorder({store,start:false,autoFreeze:e=>e?.type===RuntimeEventType.ERROR?{reason:'runtime-error',postTriggerEvents:0}:false});
    if(windowTarget)this.#nav=new NavigationBridge({store,windowTarget});
    this.#networkCorrelator=new NetworkStateCorrelator({store});
  }
  start(){if(this.#unsubscribe)return this;this.#recorder.start();this.#unsubscribe=this.#store.subscribe(e=>this.#onEvidence(e));this.#latest=createReadyDeveloperSummary();this.#nav?.start();this.#networkCorrelator.start();if(this.#window){this.#window.__LDS_INTELLIGENCE_PIPELINE__=this;this.#window.__LDS_INTELLIGENCE_ENABLED__=true;installRuntimeIntelligencePanelPresentation({target:this.#window});}this.#publish();return this;}
  stop(){this.#unsubscribe?.();this.#unsubscribe=null;this.#recorder.stop();this.#nav?.stop();this.#networkCorrelator.stop();return this;}
  snapshot(){return this.#latest;}
  exportCapsule(){return this.#latestCapsule;}
  recorder(){return this.#recorder;}
  networkCorrelator(){return this.#networkCorrelator;}
  navigationBridge(){return this.#nav??null;}
  budgetMonitor(){return null;}
  cascadeReport(){return null;}
  backgroundHistory(){return this.#background?.load?.()??[];}
  exportSessionReport(){const rows=this.backgroundHistory();return `<!doctype html><html><body style="font:14px monospace"><h2>Runtime Intelligence Session</h2><pre>${String(JSON.stringify(rows,null,2)).replaceAll('&','&amp;').replaceAll('<','&lt;')}</pre></body></html>`;}
  resume({clear=true}={}){this.#recorder.resume({clear});this.#context=null;this.#latestCapsule=null;this.#latest=createReadyDeveloperSummary();this.#publish();return this;}
  recordVerification(verification){if(!this.#context||!verification)return null;this.#context={...this.#context,verification};this.#latestCapsule=this.#buildCapsule(this.#context);this.#latest=_freeze(createDeveloperIntelligenceSummary(this.#context));this.#publish();return this.#latest;}
  #onEvidence(event){
    if(event.type===RuntimeEventType.ERROR){const incident=this.#recorder.incident();if(incident)this.#analyze(event,incident,'runtime-error');return;}
    if(_meaningfulDiagnostic(event)){this.#analyze(event,this.#rollingIncident(event,'runtime-diagnostic'),'runtime-diagnostic');return;}
    if(event.type===RuntimeEventType.UPDATE_COMPLETED){const ms=event.payload?.actualDurationMs??event.payload?.durationMs;if(Number.isFinite(ms)&&ms>=this.#threshold&&!this.#recorder.incident())this.#analyze(event,this.#rollingIncident(event,'slow-render-observation'),'slow-render-observation');}
    if(event.type===RuntimeEventType.DIAGNOSTIC&&(event.payload?.networkCorrelation||event.payload?.orphanSuspect))this.#dispatch();
  }
  #rollingIncident(trigger,reason){const events=[...this.#recorder.snapshot()].sort((a,b)=>(a.sequence??0)-(b.sequence??0));return Object.freeze({id:`transient-${this.#framework}-${++this.#seq}`,reason,triggerEventId:trigger.id,triggerSequence:trigger.sequence,frozenAt:Date.now(),eventCount:events.length,firstSequence:events[0]?.sequence??null,lastSequence:events.at(-1)?.sequence??null,firstTimestamp:events[0]?.timestamp??null,lastTimestamp:events.at(-1)?.timestamp??null,events:Object.freeze(events)});}
  #analyze(triggerEvent,incident,reason){const graph=new EvidenceGraph(incident.events);const clusters=this.#grouper.group(graph);const rootCause=clusters.find(c=>c.eventIds.includes(triggerEvent.id))||clusters[0]||null;const rootEvent=rootCause?.rootEventId?graph.node(rootCause.rootEventId):null;const causalChain=rootCause?rootCause.eventIds.slice(-MAX_CHAIN).map(id=>_eventRef(graph.node(id))).filter(Boolean):[_eventRef(triggerEvent)].filter(Boolean);this.#context={triggerEvent,incident,rootCause,rootEvent,causalChain,verification:null};this.#latestCapsule=this.#buildCapsule(this.#context);this.#latest=_freeze(createDeveloperIntelligenceSummary(this.#context));if(this.#background&&this.#latest?.problem){try{this.#background.push({pageUrl:this.#window?.location?.href??'',timestamp:Date.now(),title:this.#latest.headline,rootLabel:rootCause?.rootLabel??'',strength:rootCause?.strength??'',networkCorrelationCount:this.#store.snapshot({type:RuntimeEventType.DIAGNOSTIC}).filter(d=>d.payload?.networkCorrelation).length,budgetViolationCount:this.#store.snapshot({type:RuntimeEventType.DIAGNOSTIC}).filter(d=>d.payload?.budgetViolation).length});}catch{}}this.#publish();}
  #buildCapsule({triggerEvent,incident,rootCause,rootEvent,causalChain,verification}){const isError=triggerEvent.type===RuntimeEventType.ERROR;const isDiagnostic=triggerEvent.type===RuntimeEventType.DIAGNOSTIC;const ms=triggerEvent.payload?.actualDurationMs??triggerEvent.payload?.durationMs;return createEvidenceCapsule({id:`${this.#framework}-capsule-${++this.#seq}-${triggerEvent.id}`,problem:{title:isError?'Runtime error':isDiagnostic?'Runtime optimization finding':'Render hotspot observation',summary:isError?(triggerEvent.payload?.message||'Runtime error'):isDiagnostic?(triggerEvent.payload?.diagnostic||'Runtime diagnostic'):`${this.#framework} render took ${Math.round(ms||0)}ms`,type:triggerEvent.type},trigger:{eventId:triggerEvent.id,sequence:triggerEvent.sequence,reason:incident.reason},owner:triggerEvent.owner,source:rootEvent?.source||triggerEvent.source,incident,rootCause,causalChain,recommendation:{summary:rootCause?`Inspect ${rootCause.rootLabel}; evidence strength is ${rootCause.strength}.`:'Inspect the attributed runtime evidence and reproduce before changing code.'},verification,environment:{framework:this.#framework,presentationSurface:'lds-debug-panel:intelligence',...(isError||isDiagnostic?{}:{slowRenderThresholdMs:this.#threshold})}});}
  #dispatch(){if(!this.#window)return;const EventCtor=this.#window.CustomEvent;if(typeof this.#window.dispatchEvent==='function'&&typeof EventCtor==='function')this.#window.dispatchEvent(new EventCtor('lds-intelligence-updated',{detail:this.#latest}));}
  #publish(){if(!this.#window)return;this.#window.__LDS_INTELLIGENCE__=this.#latest;this.#dispatch();}
}
export {DEFAULT_SLOW_RENDER_THRESHOLD_MS,RuntimeIntelligencePipeline};
