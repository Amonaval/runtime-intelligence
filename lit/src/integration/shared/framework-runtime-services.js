import { IdleSchedulingAdvisor } from '../../core/idle-scheduling-advisor.js';
import { UpdateBudgetMonitor } from '../../core/update-budget-monitor.js';
import { DomDuplicationAdvisor } from '../../core/dom-duplication-advisor.js';
import { VirtualizationAdvisor } from '../../core/virtualization-advisor.js';
import { PaintAdvisor } from '../../core/paint-advisor.js';
import { WorkerOpportunityAdvisor } from '../../core/worker-opportunity-advisor.js';
import { BackgroundSessionStore } from '../../core/background-session-store.js';
import { BrowserRuntimeSurface } from './browser-runtime-surface.js';
import { RuntimeIntelligencePipeline } from './RuntimeIntelligencePipeline.js';

/**
 * Shared runtime service composition for framework adapters.
 *
 * Adapters produce evidence; this layer owns the framework-neutral browser
 * surface, update budgets, advisers and intelligence pipeline.
 */
function createFrameworkRuntimeServices({
  store,
  windowTarget = null,
  correlationContext = null,
  framework = 'unknown',
  slowRenderThresholdMs = undefined,
} = {}) {
  if (!store || typeof store.emit !== 'function' || typeof store.subscribe !== 'function') {
    throw new TypeError('createFrameworkRuntimeServices requires an EvidenceStore-compatible store.');
  }

  const budgetMonitor = new UpdateBudgetMonitor({ store });
  const services = [
    budgetMonitor,
    new IdleSchedulingAdvisor({ store }),
  ];

  if (!windowTarget) return services;

  const backgroundStore = new BackgroundSessionStore();
  services.unshift(
    new BrowserRuntimeSurface({
      store,
      windowTarget,
      documentTarget: windowTarget.document || null,
      correlationContext,
    }),
    new RuntimeIntelligencePipeline({
      store,
      windowTarget,
      framework,
      backgroundStore,
      budgetMonitor,
      ...(Number.isFinite(slowRenderThresholdMs)
        ? { slowRenderThresholdMs }
        : {}),
    }),
  );

  services.push(
    new DomDuplicationAdvisor({ store, windowTarget }),
    new VirtualizationAdvisor({ store, windowTarget }),
    new PaintAdvisor({ store, windowTarget }),
    new WorkerOpportunityAdvisor({ store, windowTarget }),
  );

  return services;
}

export { createFrameworkRuntimeServices };
