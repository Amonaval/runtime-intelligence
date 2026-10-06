/**
 * LdsMemory — mount/unmount lifecycle counters + storm detector + slope-based leak detection
 *             + resource lifetime model (Phase 9).
 */
import { _toolEnabled } from './gate.js';
const _map=new Map(),_storms=[];
const _registry=typeof FinalizationRegistry!=='undefined'?new FinalizationRegistry(tag=>{const d=_map.get(tag);if(d)d.gcCount=(d.gcCount||0)+1;}):null;
const _mountCycles=[];let _currentMountCycle=null,_cycleSeq=0;
function _startNewMountCycle(){if(_currentMountCycle)_currentMountCycle.endTs=new Date().toISOString();_currentMountCycle={cycleId:++_cycleSeq,startTs:new Date().toISOString(),endTs:null,counts:{}};_mountCycles.push(_currentMountCycle);if(_mountCycles.length>10)_mountCycles.shift();}
function _mountCycleRecord(tag,field){if(!_currentMountCycle)_startNewMountCycle();const c=_currentMountCycle.counts;if(!c[tag])c[tag]={mounted:0,unmounted:0};c[tag][field]++;}
const _ledger=new Map(),_violations=[],_listenerMap=new WeakMap(),_elementIds=new WeakMap();let _instanceSeq=0,_resourceSeq=0,_currentOwner=null,_globalPatched=false;
function _getInstanceId(el){if(!_elementIds.has(el))_elementIds.set(el,++_instanceSeq);return _elementIds.get(el);}
function _registerListener(owner,eventType,target,fn,stack){const ownerId=_getInstanceId(owner),id=`rl${++_resourceSeq}`,entry={id,type:'event-listener',eventType,target,ownerId,ownerTag:owner.tagName?.toLowerCase()||'(unknown)',instanceNum:ownerId,createdAt:new Date().toISOString(),disposedAt:null,creationStack:stack||''};if(!_ledger.has(ownerId))_ledger.set(ownerId,[]);_ledger.get(ownerId).push(entry);if(fn&&typeof fn==='function')_listenerMap.set(fn,{resourceId:id,ownerId});return id;}
function _disposeListener(fn){const info=_listenerMap.get(fn);if(!info)return;const res=(_ledger.get(info.ownerId)||[]).find(r=>r.id===info.resourceId);if(res&&!res.disposedAt)res.disposedAt=new Date().toISOString();}
function _suppressedEvents(){const s=typeof window!=='undefined'&&window.__LDS_SUPPRESS_EVENTS__;return Array.isArray(s)?s:['mousemove','pointermove','touchmove','scroll','wheel','mouseenter','mouseleave'];}
function _patchGlobalListeners(){if(_globalPatched||typeof window==='undefined')return;_globalPatched=true;const wrap=(target,targetName)=>{const origAdd=target.addEventListener.bind(target),origRem=target.removeEventListener.bind(target);target.addEventListener=function(type,fn,opts){if(_currentOwner&&fn&&typeof fn==='function'&&!_suppressedEvents().includes(type))_registerListener(_currentOwner,type,targetName,fn,new Error().stack);return origAdd(type,fn,opts);};target.removeEventListener=function(type,fn,opts){if(fn&&typeof fn==='function')_disposeListener(fn);return origRem(type,fn,opts);};};wrap(window,'window');wrap(document,'document');}
if(typeof window!=='undefined'){
 window.__LDS_MEMORY__=_map;window.__LDS_STORMS__=_storms;window.__LDS_MOUNT_CYCLES__=_mountCycles;window.__LDS_RESOURCE_VIOLATIONS__=_violations;
 window.__LDS_MEMORY_REPORT__=function(){const rows=[];for(const[tag,d]of _map)rows.push({tag,mounted:d.mounted||0,unmounted:d.unmounted||0,active:(d.mounted||0)-(d.unmounted||0),gcFreed:d.gcCount||0});rows.sort((a,b)=>b.active-a.active);console.table(rows);return rows;};
 window.__LDS_MEMORY_RESET__=function(){_map.clear();_storms.length=0;_mountCycles.length=0;_currentMountCycle=null;_startNewMountCycle();};
 window.__LDS_RESOURCE_VIOLATIONS_RESET__=function(){_violations.length=0;_ledger.clear();};
}
if(typeof document!=='undefined'){_startNewMountCycle();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')_startNewMountCycle();});}
function attach(el){const tag=el.tagName.toLowerCase();if(!_map.has(tag))_map.set(tag,{mounted:0,unmounted:0,gcCount:0});const d=_map.get(tag);d.mounted++;_mountCycleRecord(tag,'mounted');const m=d.mounted;if(m===21||(m>21&&(m-21)%10===0)){_storms.push({tag,count:m,ts:new Date().toISOString(),stack:(new Error().stack||'').split('\n').slice(1,8).join('\n')});if(_storms.length>200)_storms.shift();}if(_toolEnabled('resourceTracker')){_patchGlobalListeners();_currentOwner=el;if(typeof queueMicrotask!=='undefined')queueMicrotask(()=>{if(_currentOwner===el)_currentOwner=null;});if(el.addEventListener&&!el.__ldsAddPatched){const origAdd=el.addEventListener.bind(el),origRem=el.removeEventListener.bind(el);el.__ldsAddPatched=true;el.addEventListener=function(type,fn,opts){if(fn&&typeof fn==='function'&&!_suppressedEvents().includes(type))_registerListener(el,type,'self',fn,new Error().stack);return origAdd(type,fn,opts);};el.removeEventListener=function(type,fn,opts){if(fn&&typeof fn==='function')_disposeListener(fn);return origRem(type,fn,opts);};}}if(_registry)_registry.register(el,tag);}
function detach(el){const tag=el.tagName.toLowerCase(),d=_map.get(tag);if(d)d.unmounted=(d.unmounted||0)+1;_mountCycleRecord(tag,'unmounted');if(_toolEnabled('resourceTracker')){const ownerId=_getInstanceId(el),entries=_ledger.get(ownerId)||[],surviving=entries.filter(e=>!e.disposedAt);if(surviving.length){_violations.push({ownerId,ownerTag:tag,instanceNum:ownerId,resources:surviving,detectedAt:new Date().toISOString()});if(_violations.length>100)_violations.shift();}_ledger.delete(ownerId);if(el.__ldsAddPatched){delete el.__ldsAddPatched;delete el.addEventListener;delete el.removeEventListener;}}}
const LdsMemory={attach,detach};
export { LdsMemory };
