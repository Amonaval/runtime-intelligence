import { ReactAdapter } from '../adapter/react/ReactAdapter.js';
import { evidenceStore } from '../core/evidence-store.js';
import { RuntimeCorrelationContext } from '../integration/shared/runtime-correlation-context.js';
import { createFrameworkRuntimeServices } from '../integration/shared/framework-runtime-services.js';

function _defaultWindow() {
  return typeof window !== 'undefined' ? window : null;
}

class ReactIntelligenceRuntime {
  #store;
  #adapter;
  #windowTarget;
  #correlationContext;
  #started = false;
  #services = [];

  constructor({
    store = evidenceStore,
    adapter = null,
    profilingEnabled = true,
    windowTarget = _defaultWindow(),
    correlationContext = null,
  } = {}) {
    if (!store || typeof store.emit !== 'function' || typeof store.subscribe !== 'function') {
      throw new TypeError('ReactIntelligenceRuntime requires an EvidenceStore-compatible store.');
    }
    this.#store = store;
    this.#windowTarget = windowTarget;
    this.#correlationContext = correlationContext || new RuntimeCorrelationContext();
    this.#adapter = adapter || new ReactAdapter({
      store,
      profilingEnabled,
      correlationContext: this.#correlationContext,
    });
  }

  get store() { return this.#store; }
  get adapter() { return this.#adapter; }
  get started() { return this.#started; }
  get correlationContext() { return this.#correlationContext; }

  start() {
    if (this.#started) return this;
    this.#started = true;

    this.#services = createFrameworkRuntimeServices({
      store: this.#store,
      windowTarget: this.#windowTarget,
      correlationContext: this.#correlationContext,
      framework: 'react',
    });

    for (const service of this.#services) {
      try { service.start?.(); } catch {}
    }
    return this;
  }

  stop() {
    if (!this.#started) return this;
    this.#started = false;
    for (const service of [...this.#services].reverse()) {
      try { service.stop?.(); } catch {}
    }
    this.#services = [];
    this.#correlationContext.clear();
    return this;
  }

  describe() {
    return Object.freeze({
      framework: 'react',
      started: this.#started,
      services: this.#services.map(service => service.constructor?.name || 'unknown'),
      adapter: this.#adapter.describe(),
    });
  }
}

function createReactIntelligenceRuntime(options = {}) {
  return new ReactIntelligenceRuntime(options);
}

export { ReactIntelligenceRuntime, createReactIntelligenceRuntime };
