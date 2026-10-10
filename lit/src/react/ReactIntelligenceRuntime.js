import { ReactAdapter } from '../adapter/react/ReactAdapter.js';
import { evidenceStore } from '../core/evidence-store.js';
import { UpdateBudgetMonitor } from '../core/update-budget-monitor.js';
import { IdleSchedulingAdvisor } from '../core/idle-scheduling-advisor.js';
import { DomDuplicationAdvisor } from '../core/dom-duplication-advisor.js';
import { VirtualizationAdvisor } from '../core/virtualization-advisor.js';
import { PaintAdvisor } from '../core/paint-advisor.js';
import { WorkerOpportunityAdvisor } from '../core/worker-opportunity-advisor.js';
import { BackgroundSessionStore } from '../core/background-session-store.js';
import { BrowserRuntimeSurface } from '../integration/shared/browser-runtime-surface.js';
import { RuntimeCorrelationContext } from '../integration/shared/runtime-correlation-context.js';
import { RuntimeIntelligencePipeline } from '../integration/shared/RuntimeIntelligencePipeline.js';
function _defaultWindow(){return typeof window!=='undefined'?window:null;}
class ReactIntelligenceRuntime{
 #store;#adapter;#windowTarget;#correlationContext;#started=false;#services=[];
 constructor({store=evidenceStore,adapter=null,profilingEnabled=true,windowTarget=_defaultWindow(),correlationContext=null}={}){if(!store||typeof store.emit!=='function'||typeof store.subscribe!=='function')throw new TypeError('ReactIntelligenceRuntime requires an EvidenceStore-compatible store.');this.#store=store;this.#windowTarget=windowTarget;this.#correlationContext=correlationContext||new RuntimeCorrelationContext();this.#adapter=adapter||new ReactAdapter({store,profilingEnabled,correlationContext:this.#correlationContext});}
 get store(){return this.#store;}get adapter(){return this.#adapter;}get started(){return this.#started;}get correlationContext(){return this.#correlationContext;}
 start(){if(this.#started)return this;this.#started=true;const services=[new UpdateBudgetMonitor({store:this.#store}),new IdleSchedulingAdvisor({store:this.#store})];if(this.#windowTarget){const background=new BackgroundSessionStore();services.unshift(new BrowserRuntimeSurface({store:this.#store,windowTarget:this.#windowTarget,documentTarget:this.#windowTarget.document||null,correlationContext:this.#correlationContext}),new RuntimeIntelligencePipeline({store:this.#store,windowTarget:this.#windowTarget,framework:'react',backgroundStore:background}));services.push(new DomDuplicationAdvisor({store:this.#store,windowTarget:this.#windowTarget}),new VirtualizationAdvisor({store:this.#store,windowTarget:this.#windowTarget}),new PaintAdvisor({store:this.#store,windowTarget:this.#windowTarget}),new WorkerOpportunityAdvisor({store:this.#store,windowTarget:this.#windowTarget}));}this.#services=services;for(const s of services){try{s.start?.();}catch{}}return this;}
 stop(){if(!this.#started)return this;this.#started=false;for(const s of[...this.#services].reverse()){try{s.stop?.();}catch{}}this.#services=[];this.#correlationContext.clear();return this;}
 describe(){return Object.freeze({framework:'react',started:this.#started,services:this.#services.map(s=>s.constructor?.name||'unknown'),adapter:this.#adapter.describe()});}
}
function createReactIntelligenceRuntime(options={}){return new ReactIntelligenceRuntime(options);}export{ReactIntelligenceRuntime,createReactIntelligenceRuntime};
