import { evidenceStore } from '../core/evidence-store.js';
import { VueIntelligenceRuntime } from './VueIntelligenceRuntime.js';

function _defaultSource(proxy) {
  const file = proxy?.$?.type?.__file
    || proxy?.$options?.__file
    || null;
  return file ? { file } : null;
}

function _defaultName(proxy) {
  const type = proxy?.$?.type || null;
  return type?.name
    || type?.__name
    || proxy?.$options?.name
    || proxy?.$options?.__name
    || 'vue-component';
}

function _safeResolveSource(proxy, sourceResolver) {
  if (typeof sourceResolver !== 'function') return _defaultSource(proxy);
  try {
    return sourceResolver(proxy) || _defaultSource(proxy);
  } catch {
    return _defaultSource(proxy);
  }
}

function _included(proxy, componentFilter) {
  if (typeof componentFilter !== 'function') return true;
  try {
    return componentFilter(proxy) !== false;
  } catch {
    return false;
  }
}

function _disabledController() {
  return Object.freeze({
    enabled: false,
    runtime: null,
    adapter: null,
    store: null,
    stop() { return false; },
  });
}

/**
 * Installs thin Vue lifecycle/error hooks that feed the shared UREP pipeline.
 * Call before app.mount(). Diagnostics are installed only for literal true.
 */
function installVueRuntimeIntelligence(app, {
  enabled = true,
  runtime: externalRuntime = null,
  store = evidenceStore,
  version = null,
  windowTarget = typeof window !== 'undefined' ? window : null,
  sourceResolver = null,
  componentFilter = null,
  slowRenderThresholdMs = undefined,
} = {}) {
  if (enabled !== true) return _disabledController();

  if (!app || typeof app.mixin !== 'function' || !app.config) {
    throw new TypeError('installVueRuntimeIntelligence requires a Vue app created by createApp().');
  }

  const runtime = externalRuntime || new VueIntelligenceRuntime({
    store,
    version,
    windowTarget,
    slowRenderThresholdMs,
  });
  if (!runtime.adapter || typeof runtime.start !== 'function' || typeof runtime.stop !== 'function') {
    throw new TypeError('installVueRuntimeIntelligence requires a compatible VueIntelligenceRuntime.');
  }

  const adapter = runtime.adapter;
  let active = true;
  const previousErrorHandler = app.config.errorHandler;

  const sourceFor = proxy => _safeResolveSource(proxy, sourceResolver);
  const mixin = {
    beforeMount() {
      if (!active || !_included(this, componentFilter)) return;
      try {
        const parent = this.$parent || null;
        const parentOwner = parent ? adapter.ownerOf?.(parent) : null;
        adapter.connect(this, {
          name: _defaultName(this),
          source: sourceFor(this),
          parentId: parentOwner?.connected ? parentOwner.id : null,
        });
      } catch {}
    },

    mounted() {
      if (!active || !adapter.isManaged?.(this)) return;
      try {
        const parent = this.$parent || null;
        if (parent && adapter.isManaged?.(parent)) adapter.linkParent?.(this, parent);
      } catch {}
    },

    beforeUpdate() {
      if (!active || !adapter.isManaged?.(this)) return;
      try { adapter.recordUpdateStarted?.(this, { source: sourceFor(this) }); } catch {}
    },

    updated() {
      if (!active || !adapter.isManaged?.(this)) return;
      try { adapter.recordUpdateCompleted?.(this, { source: sourceFor(this) }); } catch {}
    },

    unmounted() {
      if (!active || !adapter.isManaged?.(this)) return;
      try { adapter.disconnect?.(this, { source: sourceFor(this), reason: 'unmounted' }); } catch {}
    },
  };

  const runtimeErrorHandler = function runtimeIntelligenceVueErrorHandler(error, instance, info) {
    if (active) {
      try {
        adapter.recordError?.(instance, error, {
          source: sourceFor(instance),
          phase: 'vue-error-handler',
          info,
        });
      } catch {}
    }

    if (typeof previousErrorHandler === 'function') {
      return previousErrorHandler.call(app.config, error, instance, info);
    }
    return undefined;
  };

  try {
    runtime.start();
    app.mixin(mixin);
    app.config.errorHandler = runtimeErrorHandler;
  } catch (error) {
    try { runtime.stop(); } catch {}
    throw error;
  }

  return Object.freeze({
    enabled: true,
    runtime,
    adapter,
    store: runtime.store,
    stop() {
      if (!active) return false;
      active = false;
      if (app.config.errorHandler === runtimeErrorHandler) {
        app.config.errorHandler = previousErrorHandler;
      }
      try { runtime.stop(); } catch {}
      return true;
    },
  });
}

export { installVueRuntimeIntelligence };
