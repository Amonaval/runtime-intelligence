/**
 * LdsSlowApiMonitor — annotates slow API calls with a visible badge.
 * Generic: wraps any object's methods via wrapObject().
 */
const _log=[]; let _activeEl=null;
const _setActive=el=>{_activeEl=el;},_clearActive=()=>{_activeEl=null;};
if(typeof window!=='undefined'){
 window.__LDS_SLOW_API_LOG__=_log;
 window.__LDS_SLOW_API_REPORT__=function(){const rows=_log.map(e=>({ts:e.ts,ms:e.ms,method:e.method,component:e.tag||'?',operation:e.operation}));console.table(rows);return rows;};
}
const _BADGE_CSS=['position:absolute','top:4px','right:4px','z-index:2147483646','background:#f57c00','color:#fff','border:none','border-radius:3px','padding:2px 6px','font-size:11px','font-family:monospace','cursor:pointer','pointer-events:auto','white-space:nowrap','box-shadow:0 1px 4px rgba(0,0,0,0.3)'].join(';');
function _showBadge(el,entry){if(!el||window.__LDS_SLOW_API_SILENT__)return;try{const computed=getComputedStyle(el);if(computed.position==='static')el.style.position='relative';const badge=document.createElement('button');badge.style.cssText=_BADGE_CSS;badge.textContent=`⏱ ${entry.ms}ms`;badge.title=`Slow API: ${entry.operation} — click for details`;badge.addEventListener('click',e=>{e.stopPropagation();console.log('[LdsSlowApi]',entry);});const root=el.shadowRoot||el;root.appendChild(badge);setTimeout(()=>{if(badge.parentNode)badge.remove();},8000);}catch(_){}}
function _extractOperation(args){try{const req=args[0];if(typeof req==='string')return req.split('/').filter(Boolean).slice(-2).join('/');if(req&&req.entity&&req.entity.type)return req.entity.type;if(req&&req.params&&req.params.query&&req.params.query.filters){const f=req.params.query.filters;return f.typesCriteria?f.typesCriteria.join(','):'query';}if(req&&req.url)return req.url.split('/').filter(Boolean).slice(-1)[0];}catch(_){}return'unknown';}
function _wrapMethod(obj,method){const orig=obj[method];if(!orig||orig.__ldsSlowApiWrapped)return;obj[method]=function(...args){if(!window.__LDS_SLOW_API__)return orig.apply(this,args);const t0=performance.now(),tag=_activeEl?_activeEl.tagName.toLowerCase():null,capturedEl=_activeEl,operation=_extractOperation(args),result=orig.apply(this,args),threshold=window.__LDS_SLOW_API_MS__||2000;if(result&&typeof result.then==='function')result.then(response=>{const ms=Math.round(performance.now()-t0);if(ms<threshold)return;const entry={ts:new Date().toLocaleTimeString('en-US',{hour12:false,fractionalSecondDigits:3}),ms,method,tag,operation,request:args[0],response,status:response&&response.response&&response.response.status};_log.push(entry);if(_log.length>100)_log.shift();if(capturedEl)_showBadge(capturedEl,entry);});return result;};obj[method].__ldsSlowApiWrapped=true;}
function wrapObject(obj,methods){if(obj)methods.forEach(m=>_wrapMethod(obj,m));}
function attach(el){el.__ldsSetApiContext=()=>_setActive(el);el.__ldsClearApiContext=()=>_clearActive();_setActive(el);Promise.resolve().then(()=>{if(_activeEl===el)_clearActive();});}
function detach(el){delete el.__ldsSetApiContext;delete el.__ldsClearApiContext;if(_activeEl===el)_clearActive();}
const LdsSlowApiMonitor={attach,detach,wrapObject};
export { LdsSlowApiMonitor };
