import {
  RUNTIME_TOOL_KEYS,
  _clearProgrammaticDebugFlag,
  _setProgrammaticDebugFlag,
} from '../core/gate.js';

function _normalizeTools(tools) {
  if (tools === true || tools == null) return true;
  if (tools === false) return false;
  if (typeof tools !== 'object') {
    throw new TypeError('configureLitRuntimeIntelligence tools must be true, false, or an object.');
  }

  const normalized = {};
  for (const key of RUNTIME_TOOL_KEYS) {
    if (Object.prototype.hasOwnProperty.call(tools, key)) normalized[key] = tools[key] === true;
  }
  return Object.freeze(normalized);
}

function configureLitRuntimeIntelligence({
  enabled = false,
  tools = true,
} = {}) {
  if (enabled !== true) {
    return Object.freeze({
      enabled: false,
      tools: false,
      stop() { return false; },
    });
  }

  const owner = Symbol('lit-runtime-intelligence-programmatic-gate');
  const normalizedTools = _normalizeTools(tools);
  _setProgrammaticDebugFlag(normalizedTools, owner);
  let active = true;

  return Object.freeze({
    enabled: true,
    tools: normalizedTools,
    stop() {
      if (!active) return false;
      active = false;
      return _clearProgrammaticDebugFlag(owner);
    },
  });
}

export { configureLitRuntimeIntelligence };
