import {
  AttributionQuality,
  EvidenceLevel,
  RuntimeEventType,
} from '../../core/evidence-protocol.js';
import { LdsNetwork } from '../../core/network.js';
import { LdsVitals } from '../../core/vitals.js';
import { LdsConsole } from '../../core/console.js';
import { SequentialApiDetector } from '../../core/sequential-api-detector.js';

let _networkTraceSequence = 0;
let _interactionSequence = 0;

function _pathWithoutQuery(value) {
  if (typeof value !== 'string') return null;
  return value.split('?')[0].slice(0, 180) || null;
}

function _errorSource(errorEvent) {
  const file = errorEvent?.filename || null;
  return file ? {
    file,
    line: Number.isFinite(errorEvent?.lineno) ? errorEvent.lineno : null,
    column: Number.isFinite(errorEvent?.colno) ? errorEvent.colno : null,
  } : null;
}

function _browserEvidence() {
  return {
    level: EvidenceLevel.OBSERVATION,
    attribution: AttributionQuality.DETERMINISTIC,
    confidence: 1,
  };
}

class BrowserRuntimeSurface {
  #store;
  #windowTarget;
  #documentTarget;
  #network;
  #vitals;
  #consoleCapture;
  #sequentialFactory;
  #networkUnsubscribe = null;
  #sequential = null;
  #started = false;
  #onError = null;
  #onUnhandledRejection = null;
  #interactionHandlers = [];

  constructor({
    store,
    windowTarget = typeof window !== 'undefined' ? window : null,
    documentTarget = windowTarget?.document || (typeof document !== 'undefined' ? document : null),
    network = LdsNetwork,
    vitals = LdsVitals,
    consoleCapture = LdsConsole,
    sequentialDetectorFactory = options => new SequentialApiDetector(options),
  } = {}) {
    if (!store || typeof store.emit !== 'function') {
      throw new TypeError('BrowserRuntimeSurface requires an EvidenceStore-compatible store.');
    }
    this.#store = store;
    this.#windowTarget = windowTarget;
    this.#documentTarget = documentTarget;
    this.#network = network;
    this.#vitals = vitals;
    this.#consoleCapture = consoleCapture;
    this.#sequentialFactory = sequentialDetectorFactory;
  }

  get started() { return this.#started; }

  start() {
    if (this.#started || !this.#windowTarget) return this;
    this.#started = true;
    const w = this.#windowTarget;

    // Existing shared collectors use this flag to capture useful call-site data.
    w.__LDS_INTELLIGENCE_ENABLED__ = true;

    try { this.#network?.init?.(); } catch { /* fail-safe diagnostics */ }
    try { this.#vitals?.init?.(); } catch { /* fail-safe diagnostics */ }
    try { this.#consoleCapture?.attach?.(w); } catch { /* fail-safe diagnostics */ }

    if (typeof this.#network?.subscribe === 'function') {
      this.#networkUnsubscribe = this.#network.subscribe(entry => this.#recordNetwork(entry));
      try {
        this.#sequential = this.#sequentialFactory({
          network: this.#network,
          onOpportunity: opportunity => this.#recordSequentialOpportunity(opportunity),
        });
        this.#sequential?.start?.();
      } catch { this.#sequential = null; }
    }

    if (typeof w.addEventListener === 'function') {
      this.#onError = event => {
        const error = event?.error;
        this.#store.emit({
          type: RuntimeEventType.ERROR,
          framework: { name: 'browser', adapterVersion: 'browser-runtime-surface-1' },
          source: _errorSource(event),
          evidence: _browserEvidence(),
          payload: {
            phase: 'window.error',
            message: error?.message || event?.message || 'Unhandled browser error',
            stack: error?.stack || null,
          },
        });
      };
      this.#onUnhandledRejection = event => {
        const reason = event?.reason;
        this.#store.emit({
          type: RuntimeEventType.ERROR,
          framework: { name: 'browser', adapterVersion: 'browser-runtime-surface-1' },
          evidence: _browserEvidence(),
          payload: {
            phase: 'unhandledrejection',
            message: reason?.message || String(reason || 'Unhandled promise rejection'),
            stack: reason?.stack || null,
          },
        });
      };
      w.addEventListener('error', this.#onError);
      w.addEventListener('unhandledrejection', this.#onUnhandledRejection);
    }

    this.#installInteractionCapture();
    return this;
  }

  stop() {
    if (!this.#started) return this;
    this.#started = false;
    this.#networkUnsubscribe?.();
    this.#networkUnsubscribe = null;
    try { this.#sequential?.stop?.(); } catch { /* noop */ }
    this.#sequential = null;

    const w = this.#windowTarget;
    if (w?.removeEventListener) {
      if (this.#onError) w.removeEventListener('error', this.#onError);
      if (this.#onUnhandledRejection) w.removeEventListener('unhandledrejection', this.#onUnhandledRejection);
    }
    this.#onError = null;
    this.#onUnhandledRejection = null;

    for (const [type, handler] of this.#interactionHandlers) {
      try { this.#documentTarget?.removeEventListener?.(type, handler, true); } catch { /* noop */ }
    }
    this.#interactionHandlers = [];
    return this;
  }

  describe() {
    return Object.freeze({
      started: this.#started,
      network: !!this.#network,
      vitals: !!this.#vitals,
      console: !!this.#consoleCapture,
      interactions: this.#interactionHandlers.map(([type]) => type),
    });
  }

  #recordNetwork(entry) {
    if (!entry) return;
    const traceId = `net-${Date.now()}-${++_networkTraceSequence}`;
    this.#store.emit({
      type: RuntimeEventType.NETWORK_COMPLETED,
      framework: { name: 'browser', adapterVersion: 'browser-runtime-surface-1' },
      correlation: { traceId },
      evidence: _browserEvidence(),
      payload: {
        path: _pathWithoutQuery(entry.url || entry.fullUrl),
        method: entry.method || 'GET',
        status: Number.isFinite(entry.status) ? entry.status : null,
        durationMs: Number.isFinite(entry.durationMs) ? entry.durationMs : null,
        responseSizeKB: Number.isFinite(entry.responseSizeKB) ? entry.responseSizeKB : null,
        transport: entry.type || null,
        isError: entry.isError === true,
        isSlow: entry.isSlow === true,
        isLarge: entry.isLarge === true,
      },
    });
  }

  #recordSequentialOpportunity(opportunity) {
    if (!opportunity) return;
    this.#store.emit({
      type: RuntimeEventType.DIAGNOSTIC,
      framework: { name: 'browser', adapterVersion: 'browser-runtime-surface-1' },
      source: opportunity.callerFile ? {
        file: opportunity.callerFile,
        line: Number.parseInt(opportunity.callerLine, 10) || null,
        functionName: opportunity.callerFn || null,
      } : null,
      evidence: {
        level: opportunity.callerFile ? EvidenceLevel.ATTRIBUTION : EvidenceLevel.CORRELATION,
        attribution: opportunity.callerFile ? AttributionQuality.SOURCE_ATTRIBUTED : AttributionQuality.TEMPORAL_INFERENCE,
        confidence: opportunity.callerFile ? 0.9 : 0.75,
      },
      payload: {
        diagnostic: 'network.sequential-api-opportunity',
        sequentialApiOpportunity: true,
        callCount: opportunity.callCount,
        totalMs: opportunity.totalMs,
        estimatedSavingsMs: opportunity.estimatedSavingsMs,
        callerFn: opportunity.callerFn || null,
      },
    });
  }

  #installInteractionCapture() {
    const doc = this.#documentTarget;
    if (!doc?.addEventListener) return;
    for (const type of ['click', 'change', 'submit']) {
      const handler = event => {
        const target = event?.target;
        const interactionId = `interaction-${Date.now()}-${++_interactionSequence}`;
        this.#store.emit({
          type: RuntimeEventType.INTERACTION,
          framework: { name: 'browser', adapterVersion: 'browser-runtime-surface-1' },
          correlation: { interactionId },
          evidence: _browserEvidence(),
          payload: {
            kind: type,
            targetTag: target?.tagName?.toLowerCase?.() || null,
            targetRole: target?.getAttribute?.('role') || null,
          },
        });
      };
      doc.addEventListener(type, handler, true);
      this.#interactionHandlers.push([type, handler]);
    }
  }
}

export { BrowserRuntimeSurface };
