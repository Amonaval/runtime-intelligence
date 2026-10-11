/**
 * gate.js — debug flag resolution and per-tool enablement.
 *
 * No framework deps, no Syndigo deps. Works in any LitElement project.
 *
 * Activation:
 *   window.__LDS_DEBUG__ = true                    // all tools
 *   window.__LDS_DEBUG__ = { perf: true, network: true }  // selective
 *   window.__LDS_APP_CONFIG__ = { debugEnabled: true }    // app-level config
 */

const RUNTIME_TOOL_KEYS = Object.freeze([
    'intelligence',
    'memory',
    'errorBoundary',
    'perf',
    'propAudit',
    'inspector',
    'eventTracer',
    'slowApi',
    'console',
    'vitals',
    'network',
    'cycleDetector',
    'resourceTracker',
    'workflowBaseline',
    'falcorView',
    'monitorBackground',
]);

function _getDebugFlag() {
    if (typeof window === 'undefined') return false;
    if (window.__LDS_DEBUG__ !== undefined) return window.__LDS_DEBUG__;
    const cfg = window.__LDS_APP_CONFIG__?.debugEnabled;
    if (cfg != null) return cfg;
    return false;
}

function _toolEnabled(toolKey) {
    if (typeof window === 'undefined') return false;

    // Per-tool standalone flags — work without master flag
    if (toolKey === 'perf'             && window.__LDS_PERF_ENABLED__)        return true;
    if (toolKey === 'propAudit'        && window.__LDS_PROP_DEBUG__)           return true;
    if (toolKey === 'inspector'        && window.__LDS_INSPECTOR__)            return true;
    if (toolKey === 'eventTracer'      && window.__LDS_EVENTS_TRACE__)         return true;
    if (toolKey === 'slowApi'          && window.__LDS_SLOW_API__)             return true;
    if (toolKey === 'console'          && window.__LDS_CONSOLE_ENABLED__)      return true;
    if (toolKey === 'vitals'           && window.__LDS_VITALS_ENABLED__)       return true;
    if (toolKey === 'network'          && window.__LDS_NETWORK_ENABLED__)      return true;
    if (toolKey === 'intelligence'     && window.__LDS_INTELLIGENCE_ENABLED__) return true;
    if (toolKey === 'cycleDetector'    && window.__LDS_CYCLE_DETECT__)         return true;
    if (toolKey === 'resourceTracker'  && window.__LDS_RESOURCE_TRACKER__)     return true;
    if (toolKey === 'workflowBaseline' && window.__LDS_WORKFLOW_BASELINE__)    return true;
    if (toolKey === 'falcorView'       && window.__LDS_FALCOR_VIEW__)          return true;
    if (toolKey === 'monitorBackground' && window.__LDS_MONITOR_BACKGROUND__)  return true;

    const flag = _getDebugFlag();
    if (!flag) return false;
    if (flag === true) return true;
    if (typeof flag === 'object' && flag !== null) return !!flag[toolKey];
    return false;
}

function _runtimeEnabled() {
    if (typeof window === 'undefined') return false;
    return RUNTIME_TOOL_KEYS.some(toolKey => _toolEnabled(toolKey));
}

export { RUNTIME_TOOL_KEYS, _getDebugFlag, _runtimeEnabled, _toolEnabled };
