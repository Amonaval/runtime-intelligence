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
  enabled = false,
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

  const ownsRuntime = externalRuntime == null;
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
  const managedTargets = new Set();
  const observedObjectErrors = new WeakSet();
  const observedPrimitiveErrors = new Set();

  const sourceFor = proxy => _safeResolveSource(proxy, sourceResolver);

  function recordErrorOnce(error, instance, info, phase) {
    if (!active || (instance && !_included(instance, componentFilter))) return;

    const isObjectError = (typeof error === 'object' && error !== null) || typeof error === 'function';
    if (isObjectError) {
      if (observedObjectErrors.has(error)) return;
      observedObjectErrors.add(error);
      Promise.resolve().then(() => observedObjectErrors.delete(error));
    } else {
      const key = `${typeof error}:${String(error)}:${String(info || '')}`;
      if (observedPrimitiveErrors.has(key)) return;
      observedPrimitiveErrors.add(key);
      Promise.resolve().then(() => observedPrimitiveErrors.delete(key));
    }

    try {
      adapter.recordError?.(instance, error, {
        source: sourceFor(instance),
        phase,
        info,
      });
    } catch {}
  }

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
        if (adapter.isManaged?.(this)) managedTargets.add(this);
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

    errorCaptured(error, instance, info) {
      recordErrorOnce(error, instance, info, 'vue-error-captured');
      return undefined;
    },

    unmounted() {
      if (!adapter.isManaged?.(this)) {
        managedTargets.delete(this);
        return;
      }
      if (active) {
        try { adapter.disconnect?.(this, { source: sourceFor(this), reason: 'unmounted' }); } catch {}
      }
      managedTargets.delete(this);
    },
  };

  const runtimeErrorHandler = typeof previousErrorHandler === 'function'
    ? function runtimeIntelligenceVueErrorHandler(error, instance, info) {
      recordErrorOnce(error, instance, info, 'vue-error-handler');
      return previousErrorHandler.call(app.config, error, instance, info);
    }
    : null;

  function stop() {
    if (!active) return false;
    for (const target of managedTargets) {
      if (!adapter.isManaged?.(target)) continue;
      try { adapter.disconnect?.(target, { source: sourceFor(target), reason: 'runtime-stop' }); } catch {}
    }
    managedTargets.clear();
    active = false;
    if (runtimeErrorHandler && app.config.errorHandler === runtimeErrorHandler) {
      app.config.errorHandler = previousErrorHandler;
    }
    if (ownsRuntime) {
      try { runtime.stop(); } catch {}
    }
    return true;
  }

  try {
    runtime.start();
    app.mixin(mixin);
    if (runtimeErrorHandler) app.config.errorHandler = runtimeErrorHandler;
    if (typeof app.onUnmount === 'function') {
      app.onUnmount(() => {
        Promise.resolve().then(() => stop());
      });
    }
  } catch (error) {
    if (ownsRuntime) {
      try { runtime.stop(); } catch {}
    }
    throw error;
  }

  return Object.freeze({
    enabled: true,
    runtime,
    adapter,
    store: runtime.store,
    stop,
  });
}

export { installVueRuntimeIntelligence };
