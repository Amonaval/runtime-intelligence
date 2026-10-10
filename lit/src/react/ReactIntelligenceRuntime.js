import { ReactAdapter } from '../adapter/react/ReactAdapter.js';
import { evidenceStore } from '../core/evidence-store.js';
import { UpdateBudgetMonitor } from '../core/update-budget-monitor.js';
import { IdleSchedulingAdvisor } from '../core/idle-scheduling-advisor.js';
import { DomDuplicationAdvisor } from '../core/dom-duplication-advisor.js';
import { VirtualizationAdvisor } from '../core/virtualization-advisor.js';
import { PaintAdvisor } from '../core/paint-advisor.js';
import { WorkerOpportunityAdvisor } from '../core/worker-opportunity-advisor.js';

function _defaultWindow() {
  return typeof window !== 'undefined' ? window : null;
}

class ReactIntelligenceRuntime {
  #store;
  #adapter;
  #windowTarget;
  #started = false;
  #services = [];

  constructor({
    store = evidenceStore,
    adapter = null,
    profilingEnabled = true,
    windowTarget = _defaultWindow(),
  } = {}) {
    if (!store || typeof store.emit !== 'function' || typeof store.subscribe !== 'function') {
      throw new TypeError('ReactIntelligenceRuntime requires an EvidenceStore-compatible store.');
    }
    this.#store = store;
    this.#windowTarget = windowTarget;
    this.#adapter = adapter || new ReactAdapter({ store, profilingEnabled });
  }

  get store() { return this.#store; }
  get adapter() { return this.#adapter; }
  get started() { return this.#started; }

  start() {
    if (this.#started) return this;
    this.#started = true;

    const services = [
      new UpdateBudgetMonitor({ store: this.#store }),
      new IdleSchedulingAdvisor({ store: this.#store }),
    ];

    if (this.#windowTarget) {
      services.push(
        new DomDuplicationAdvisor({ store: this.#store, windowTarget: this.#windowTarget }),
        new VirtualizationAdvisor({ store: this.#store, windowTarget: this.#windowTarget }),
        new PaintAdvisor({ store: this.#store, windowTarget: this.#windowTarget }),
        new WorkerOpportunityAdvisor({ store: this.#store, windowTarget: this.#windowTarget }),
      );
    }

    this.#services = services;
    for (const service of services) {
      try { service.start?.(); } catch { /* diagnostics must never break the host app */ }
    }
    return this;
  }

  stop() {
    if (!this.#started) return this;
    this.#started = false;
    for (const service of [...this.#services].reverse()) {
      try { service.stop?.(); } catch { /* best-effort cleanup */ }
    }
    this.#services = [];
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
