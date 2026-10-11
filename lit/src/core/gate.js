/**
 * gate.js — debug flag resolution and per-tool enablement.
 *
 * No framework deps, no Syndigo deps. Works in any LitElement project.
 *
 * Preferred new-project activation is programmatic through
 * configureLitRuntimeIntelligence(). Legacy window.__LDS_* flags remain as a
 * compatibility bridge for existing consumers.
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

let _programmaticDebugFlag;
let _programmaticOwner = null;

function _hasOwn(object, key) {
    return object != null && Object.prototype.hasOwnProperty.call(object, key);
}

function _ownTruthy(object, key) {
    return _hasOwn(object, key) && !!object[key];
}

function _setProgrammaticDebugFlag(flag, owner) {
    _programmaticDebugFlag = flag;
    _programmaticOwner = owner || null;
}

function _clearProgrammaticDebugFlag(owner) {
    if (_programmaticOwner !== (owner || null)) return false;
    _programmaticDebugFlag = undefined;
    _programmaticOwner = null;
    return true;
}

function _getDebugFlag() {
    if (_programmaticDebugFlag !== undefined) return _programmaticDebugFlag;
    if (typeof window === 'undefined') return false;
    if (_hasOwn(window, '__LDS_DEBUG__')) return window.__LDS_DEBUG__;

    if (!_hasOwn(window, '__LDS_APP_CONFIG__')) return false;
    const config = window.__LDS_APP_CONFIG__;
    if (!config || !_hasOwn(config, 'debugEnabled')) return false;
    return config.debugEnabled;
}

function _toolEnabled(toolKey) {
    const flag = _getDebugFlag();

    // A programmatic configuration is authoritative. This prevents old
    // compatibility globals from silently expanding a selective new-project
    // configuration.
    if (_programmaticDebugFlag !== undefined) {
        if (flag === true) return true;
        return typeof flag === 'object' && flag !== null && _ownTruthy(flag, toolKey);
    }

    if (typeof window === 'undefined') return false;

    // Legacy per-tool standalone flags — kept for compatibility only. Only own
    // window properties are accepted so inherited/prototype-polluted values
    // cannot accidentally activate runtime instrumentation.
    if (toolKey === 'perf'              && _ownTruthy(window, '__LDS_PERF_ENABLED__'))         return true;
    if (toolKey === 'propAudit'         && _ownTruthy(window, '__LDS_PROP_DEBUG__'))            return true;
    if (toolKey === 'inspector'         && _ownTruthy(window, '__LDS_INSPECTOR__'))             return true;
    if (toolKey === 'eventTracer'       && _ownTruthy(window, '__LDS_EVENTS_TRACE__'))          return true;
    if (toolKey === 'slowApi'           && _ownTruthy(window, '__LDS_SLOW_API__'))              return true;
    if (toolKey === 'console'           && _ownTruthy(window, '__LDS_CONSOLE_ENABLED__'))       return true;
    if (toolKey === 'vitals'            && _ownTruthy(window, '__LDS_VITALS_ENABLED__'))        return true;
    if (toolKey === 'network'           && _ownTruthy(window, '__LDS_NETWORK_ENABLED__'))       return true;
    if (toolKey === 'intelligence'      && _ownTruthy(window, '__LDS_INTELLIGENCE_ENABLED__'))  return true;
    if (toolKey === 'cycleDetector'     && _ownTruthy(window, '__LDS_CYCLE_DETECT__'))          return true;
    if (toolKey === 'resourceTracker'   && _ownTruthy(window, '__LDS_RESOURCE_TRACKER__'))      return true;
    if (toolKey === 'workflowBaseline'  && _ownTruthy(window, '__LDS_WORKFLOW_BASELINE__'))     return true;
    if (toolKey === 'falcorView'        && _ownTruthy(window, '__LDS_FALCOR_VIEW__'))           return true;
    if (toolKey === 'monitorBackground' && _ownTruthy(window, '__LDS_MONITOR_BACKGROUND__'))   return true;

    if (!flag) return false;
    if (flag === true) return true;
    if (typeof flag === 'object' && flag !== null) return _ownTruthy(flag, toolKey);
    return false;
}

function _runtimeEnabled() {
    return RUNTIME_TOOL_KEYS.some(toolKey => _toolEnabled(toolKey));
}

export {
    RUNTIME_TOOL_KEYS,
    _clearProgrammaticDebugFlag,
    _getDebugFlag,
    _runtimeEnabled,
    _setProgrammaticDebugFlag,
    _toolEnabled,
};
