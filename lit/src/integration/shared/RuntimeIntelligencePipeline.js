import { EvidenceGraph } from '../../core/evidence-graph.js';
import { RootCauseGrouper } from '../../core/root-cause.js';
import { IncidentFlightRecorder } from '../../core/incident-flight-recorder.js';
import { createEvidenceCapsule } from '../../core/evidence-capsule.js';
import { RuntimeEventType } from '../../core/evidence-protocol.js';
import { UpdateBudgetMonitor } from '../../core/update-budget-monitor.js';
import { NavigationBridge } from './navigation-bridge.js';
import { NetworkStateCorrelator } from './network-state-correlator.js';
import {
  createReadyDeveloperSummary,
  createDeveloperIntelligenceSummary,
} from './developer-intelligence-summary.js';
import { installRuntimeIntelligencePanelPresentation } from './panel-intelligence-presentation.js';

const DEFAULT_SLOW_RENDER_THRESHOLD_MS = 100;
const MAX_CHAIN = 24;
const MEANINGFUL_DIAGNOSTIC_FLAGS = Object.freeze([
  'sequentialApiOpportunity',
  'resourceLifetimeViolation',
  'budgetViolation',
  'domDuplication',
  'virtualizationOpportunity',
  'expensivePaint',
  'workerOpportunity',
]);

function _meaningfulDiagnostic(event) {
  return event?.type === RuntimeEventType.DIAGNOSTIC
    && MEANINGFUL_DIAGNOSTIC_FLAGS.some(flag => event.payload?.[flag] === true);
}

function _eventRef(event) {
  return event ? Object.freeze({
    id: event.id,
    type: event.type,
    sequence: event.sequence,
    ownerId: event.owner?.id || null,
    evidenceLevel: event.evidence?.level || null,
  }) : null;
}

function _freezePresentation(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) _freezePresentation(child, seen);
  return Object.freeze(value);
}

class RuntimeIntelligencePipeline {
  #store;
  #windowTarget;
  #framework;
  #slowRenderThresholdMs;
  #grouper;
  #recorder;
  #navigationBridge;
  #networkCorrelator;
  #budgetMonitor;
  #backgroundStore;
  #unsubscribe = null;
  #latest = null;
  #latestCapsule = null;
  #analysisContext = null;
  #sequence = 0;

  constructor({
    store,
    windowTarget = typeof window !== 'undefined' ? window : null,
    framework = 'unknown',
    slowRenderThresholdMs = DEFAULT_SLOW_RENDER_THRESHOLD_MS,
    rootCauseOptions = {},
    backgroundStore = null,
    budgetMonitor = null,
  } = {}) {
    if (!store || typeof store.subscribe !== 'function' || typeof store.snapshot !== 'function') {
      throw new TypeError('RuntimeIntelligencePipeline requires an EvidenceStore-compatible store.');
    }

    this.#store = store;
    this.#windowTarget = windowTarget;
    this.#framework = framework;
    this.#slowRenderThresholdMs = Number.isFinite(slowRenderThresholdMs) && slowRenderThresholdMs >= 0
      ? slowRenderThresholdMs
      : DEFAULT_SLOW_RENDER_THRESHOLD_MS;
    this.#grouper = new RootCauseGrouper(rootCauseOptions);
    this.#backgroundStore = backgroundStore || null;
    this.#budgetMonitor = budgetMonitor || new UpdateBudgetMonitor({ store });
    this.#recorder = new IncidentFlightRecorder({
      store,
      start: false,
      autoFreeze: event => event?.type === RuntimeEventType.ERROR
        ? { reason: 'runtime-error', postTriggerEvents: 0 }
        : false,
    });
    this.#navigationBridge = windowTarget
      ? new NavigationBridge({ store, windowTarget })
      : null;
    this.#networkCorrelator = new NetworkStateCorrelator({ store });
  }

  start() {
    if (this.#unsubscribe) return this;
    this.#recorder.start();
    this.#unsubscribe = this.#store.subscribe(event => this.#onEvidence(event));
    this.#latest = createReadyDeveloperSummary();
    this.#navigationBridge?.start();
    this.#networkCorrelator.start();
    this.#budgetMonitor.start?.();

    if (this.#windowTarget) {
      this.#windowTarget.__LDS_INTELLIGENCE_PIPELINE__ = this;
      this.#windowTarget.__LDS_INTELLIGENCE_ENABLED__ = true;
      installRuntimeIntelligencePanelPresentation({ target: this.#windowTarget });
    }

    this.#publish();
    return this;
  }

  stop() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#recorder.stop();
    this.#navigationBridge?.stop();
    this.#networkCorrelator.stop();
    this.#budgetMonitor.stop?.();
    return this;
  }

  snapshot() { return this.#latest; }
  exportCapsule() { return this.#latestCapsule; }
  recorder() { return this.#recorder; }
  networkCorrelator() { return this.#networkCorrelator; }
  navigationBridge() { return this.#navigationBridge; }
  budgetMonitor() { return this.#budgetMonitor; }
  cascadeReport() { return null; }
  backgroundHistory() { return this.#backgroundStore?.load?.() ?? []; }

  exportSessionReport() {
    const history = this.backgroundHistory();
    const escaped = String(JSON.stringify(history, null, 2))
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;');
    return `<!doctype html><html><body style="font:14px monospace"><h2>Runtime Intelligence Session</h2><pre>${escaped}</pre></body></html>`;
  }

  resume({ clear = true } = {}) {
    this.#recorder.resume({ clear });
    this.#analysisContext = null;
    this.#latestCapsule = null;
    this.#latest = createReadyDeveloperSummary();
    this.#publish();
    return this;
  }

  recordVerification(verification) {
    if (!this.#analysisContext || !verification) return null;
    this.#analysisContext = { ...this.#analysisContext, verification };
    this.#latestCapsule = this.#buildCapsule(this.#analysisContext);
    this.#latest = _freezePresentation(
      createDeveloperIntelligenceSummary(this.#analysisContext),
    );
    this.#publish();
    return this.#latest;
  }

  #onEvidence(event) {
    if (event.type === RuntimeEventType.ERROR) {
      const incident = this.#recorder.incident();
      if (incident) this.#analyze(event, incident);
      return;
    }

    if (_meaningfulDiagnostic(event)) {
      this.#analyze(event, this.#rollingIncident(event, 'runtime-diagnostic'));
      return;
    }

    if (event.type === RuntimeEventType.UPDATE_COMPLETED) {
      const durationMs = event.payload?.actualDurationMs ?? event.payload?.durationMs;
      if (
        Number.isFinite(durationMs)
        && durationMs >= this.#slowRenderThresholdMs
        && !this.#recorder.incident()
      ) {
        this.#analyze(
          event,
          this.#rollingIncident(event, 'slow-render-observation'),
        );
      }
    }

    if (
      event.type === RuntimeEventType.DIAGNOSTIC
      && (event.payload?.networkCorrelation || event.payload?.orphanSuspect)
    ) {
      this.#dispatchPanelUpdate();
    }
  }

  #rollingIncident(triggerEvent, reason) {
    const events = [...this.#recorder.snapshot()];
    if (!events.some(event => event.id === triggerEvent.id)) events.push(triggerEvent);
    events.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    return Object.freeze({
      id: `transient-${this.#framework}-${++this.#sequence}`,
      reason,
      triggerEventId: triggerEvent.id,
      triggerSequence: triggerEvent.sequence,
      frozenAt: Date.now(),
      eventCount: events.length,
      firstSequence: events[0]?.sequence ?? null,
      lastSequence: events.at(-1)?.sequence ?? null,
      firstTimestamp: events[0]?.timestamp ?? null,
      lastTimestamp: events.at(-1)?.timestamp ?? null,
      events: Object.freeze(events),
    });
  }

  #analyze(triggerEvent, incident) {
    const graph = new EvidenceGraph(incident.events);
    const clusters = this.#grouper.group(graph);
    const rootCause = clusters.find(cluster => cluster.eventIds.includes(triggerEvent.id))
      || clusters[0]
      || null;
    const rootEvent = rootCause?.rootEventId
      ? graph.node(rootCause.rootEventId)
      : null;
    const causalChain = rootCause
      ? rootCause.eventIds
        .slice(-MAX_CHAIN)
        .map(id => _eventRef(graph.node(id)))
        .filter(Boolean)
      : [_eventRef(triggerEvent)].filter(Boolean);

    this.#analysisContext = {
      triggerEvent,
      incident,
      rootCause,
      rootEvent,
      causalChain,
      verification: null,
    };
    this.#latestCapsule = this.#buildCapsule(this.#analysisContext);
    this.#latest = _freezePresentation(
      createDeveloperIntelligenceSummary(this.#analysisContext),
    );

    if (this.#backgroundStore && this.#latest?.problem) {
      try {
        const diagnostics = this.#store.snapshot({ type: RuntimeEventType.DIAGNOSTIC });
        this.#backgroundStore.push({
          pageUrl: this.#windowTarget?.location?.href ?? '',
          timestamp: Date.now(),
          title: this.#latest.headline,
          rootLabel: rootCause?.rootLabel ?? '',
          strength: rootCause?.strength ?? '',
          networkCorrelationCount: diagnostics.filter(item => item.payload?.networkCorrelation).length,
          budgetViolationCount: diagnostics.filter(item => item.payload?.budgetViolation).length,
        });
      } catch {}
    }

    this.#publish();
  }

  #buildCapsule({
    triggerEvent,
    incident,
    rootCause,
    rootEvent,
    causalChain,
    verification,
  }) {
    const isError = triggerEvent.type === RuntimeEventType.ERROR;
    const isDiagnostic = triggerEvent.type === RuntimeEventType.DIAGNOSTIC;
    const durationMs = triggerEvent.payload?.actualDurationMs ?? triggerEvent.payload?.durationMs;

    return createEvidenceCapsule({
      id: `${this.#framework}-capsule-${++this.#sequence}-${triggerEvent.id}`,
      problem: {
        title: isError
          ? 'Runtime error'
          : isDiagnostic
            ? 'Runtime optimization finding'
            : 'Render hotspot observation',
        summary: isError
          ? triggerEvent.payload?.message || 'Runtime error'
          : isDiagnostic
            ? triggerEvent.payload?.diagnostic || 'Runtime diagnostic'
            : `${this.#framework} render took ${Math.round(durationMs || 0)}ms`,
        type: triggerEvent.type,
      },
      trigger: {
        eventId: triggerEvent.id,
        sequence: triggerEvent.sequence,
        reason: incident.reason,
      },
      owner: triggerEvent.owner,
      source: rootEvent?.source || triggerEvent.source,
      incident,
      rootCause,
      causalChain,
      recommendation: {
        summary: rootCause
          ? `Inspect ${rootCause.rootLabel}; evidence strength is ${rootCause.strength}.`
          : 'Inspect the attributed runtime evidence and reproduce before changing code.',
      },
      verification,
      environment: {
        framework: this.#framework,
        presentationSurface: 'lds-debug-panel:intelligence',
        ...(isError || isDiagnostic
          ? {}
          : { slowRenderThresholdMs: this.#slowRenderThresholdMs }),
      },
    });
  }

  #dispatchPanelUpdate() {
    if (!this.#windowTarget) return;
    const EventCtor = this.#windowTarget.CustomEvent;
    if (
      typeof this.#windowTarget.dispatchEvent === 'function'
      && typeof EventCtor === 'function'
    ) {
      this.#windowTarget.dispatchEvent(new EventCtor('lds-intelligence-updated', {
        detail: this.#latest,
      }));
    }
  }

  #publish() {
    if (!this.#windowTarget) return;
    this.#windowTarget.__LDS_INTELLIGENCE__ = this.#latest;
    this.#dispatchPanelUpdate();
  }
}

export { DEFAULT_SLOW_RENDER_THRESHOLD_MS, RuntimeIntelligencePipeline };
