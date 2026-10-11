import { VueAdapter } from '../adapter/vue/VueAdapter.js';
import { evidenceStore } from '../core/evidence-store.js';
import { IdleSchedulingAdvisor } from '../core/idle-scheduling-advisor.js';
import { DomDuplicationAdvisor } from '../core/dom-duplication-advisor.js';
import { VirtualizationAdvisor } from '../core/virtualization-advisor.js';
import { PaintAdvisor } from '../core/paint-advisor.js';
import { WorkerOpportunityAdvisor } from '../core/worker-opportunity-advisor.js';
import { BackgroundSessionStore } from '../core/background-session-store.js';
import { BrowserRuntimeSurface } from '../integration/shared/browser-runtime-surface.js';
import { RuntimeCorrelationContext } from '../integration/shared/runtime-correlation-context.js';
import { RuntimeIntelligencePipeline } from '../integration/shared/RuntimeIntelligencePipeline.js';

function _defaultWindow() {
  return typeof window !== 'undefined' ? window : null;
}

class VueIntelligenceRuntime {
  #store;
  #adapter;
  #windowTarget;
  #correlationContext;
  #started = false;
  #services = [];
  #slowRenderThresholdMs;

  constructor({
    store = evidenceStore,
    adapter = null,
    version = null,
    windowTarget = _defaultWindow(),
    correlationContext = null,
    slowRenderThresholdMs = undefined,
  } = {}) {
    if (!store || typeof store.emit !== 'function' || typeof store.subscribe !== 'function') {
      throw new TypeError('VueIntelligenceRuntime requires an EvidenceStore-compatible store.');
    }

    this.#store = store;
    this.#windowTarget = windowTarget;
    this.#correlationContext = correlationContext || new RuntimeCorrelationContext();
    this.#adapter = adapter || new VueAdapter({
      store,
      version,
      correlationContext: this.#correlationContext,
    });
    this.#slowRenderThresholdMs = slowRenderThresholdMs;
  }

  get store() { return this.#store; }
  get adapter() { return this.#adapter; }
  get started() { return this.#started; }
  get correlationContext() { return this.#correlationContext; }

  start() {
    if (this.#started) return this;
    this.#started = true;

    const services = [
      new IdleSchedulingAdvisor({ store: this.#store }),
    ];

    if (this.#windowTarget) {
      const backgroundStore = new BackgroundSessionStore();
      services.unshift(
        new BrowserRuntimeSurface({
          store: this.#store,
          windowTarget: this.#windowTarget,
          documentTarget: this.#windowTarget.document || null,
          correlationContext: this.#correlationContext,
        }),
        new RuntimeIntelligencePipeline({
          store: this.#store,
          windowTarget: this.#windowTarget,
          framework: 'vue',
          backgroundStore,
          ...(Number.isFinite(this.#slowRenderThresholdMs)
            ? { slowRenderThresholdMs: this.#slowRenderThresholdMs }
            : {}),
        }),
      );
      services.push(
        new DomDuplicationAdvisor({ store: this.#store, windowTarget: this.#windowTarget }),
        new VirtualizationAdvisor({ store: this.#store, windowTarget: this.#windowTarget }),
        new PaintAdvisor({ store: this.#store, windowTarget: this.#windowTarget }),
        new WorkerOpportunityAdvisor({ store: this.#store, windowTarget: this.#windowTarget }),
      );
    }

    this.#services = services;
    for (const service of services) {
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
      framework: 'vue',
      started: this.#started,
      services: this.#services.map(service => service.constructor?.name || 'unknown'),
      adapter: this.#adapter.describe(),
    });
  }
}

function createVueIntelligenceRuntime(options = {}) {
  return new VueIntelligenceRuntime(options);
}

export { VueIntelligenceRuntime, createVueIntelligenceRuntime };
