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

function _errorSource(event) {
  const file = event?.filename || null;
  if (!file) return null;
  return {
    file,
    line: Number.isFinite(event?.lineno) ? event.lineno : null,
    column: Number.isFinite(event?.colno) ? event.colno : null,
  };
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
  #correlationContext;
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
    correlationContext = null,
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
    this.#correlationContext = correlationContext;
  }

  get started() {
    return this.#started;
  }

  start() {
    if (this.#started || !this.#windowTarget) return this;
    this.#started = true;
    const win = this.#windowTarget;
    win.__LDS_INTELLIGENCE_ENABLED__ = true;

    try { this.#network?.init?.(); } catch {}
    try { this.#vitals?.init?.(); } catch {}
    try { this.#consoleCapture?.attach?.(win); } catch {}

    if (typeof this.#network?.subscribe === 'function') {
      this.#networkUnsubscribe = this.#network.subscribe(entry => this.#recordNetwork(entry));
      try {
        this.#sequential = this.#sequentialFactory({
          network: this.#network,
          onOpportunity: opportunity => this.#recordSequentialOpportunity(opportunity),
        });
        this.#sequential?.start?.();
      } catch {
        this.#sequential = null;
      }
    }

    if (typeof win.addEventListener === 'function') {
      this.#onError = event => {
        this.#store.emit({
          type: RuntimeEventType.ERROR,
          framework: { name: 'browser', adapterVersion: 'browser-runtime-surface-2' },
          source: _errorSource(event),
          correlation: this.#correlationContext?.correlation?.(),
          evidence: _browserEvidence(),
          payload: {
            phase: 'window.error',
            message: event?.error?.message || event?.message || 'Unhandled browser error',
            stack: event?.error?.stack || null,
          },
        });
      };
      this.#onUnhandledRejection = event => {
        this.#store.emit({
          type: RuntimeEventType.ERROR,
          framework: { name: 'browser', adapterVersion: 'browser-runtime-surface-2' },
          correlation: this.#correlationContext?.correlation?.(),
          evidence: _browserEvidence(),
          payload: {
            phase: 'unhandledrejection',
            message: event?.reason?.message || String(event?.reason || 'Unhandled promise rejection'),
            stack: event?.reason?.stack || null,
          },
        });
      };
      win.addEventListener('error', this.#onError);
      win.addEventListener('unhandledrejection', this.#onUnhandledRejection);
    }

    this.#installInteractionCapture();
    return this;
  }

  stop() {
    if (!this.#started) return this;
    this.#started = false;
    this.#networkUnsubscribe?.();
    this.#networkUnsubscribe = null;
    try { this.#sequential?.stop?.(); } catch {}
    this.#sequential = null;

    const win = this.#windowTarget;
    if (win?.removeEventListener) {
      if (this.#onError) win.removeEventListener('error', this.#onError);
      if (this.#onUnhandledRejection) win.removeEventListener('unhandledrejection', this.#onUnhandledRejection);
    }
    this.#onError = null;
    this.#onUnhandledRejection = null;

    for (const [type, handler] of this.#interactionHandlers) {
      try { this.#documentTarget?.removeEventListener?.(type, handler, true); } catch {}
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
    const interactionId = this.#correlationContext?.currentInteraction?.() || null;
    this.#store.emit({
      type: RuntimeEventType.NETWORK_COMPLETED,
      framework: { name: 'browser', adapterVersion: 'browser-runtime-surface-2' },
      correlation: { traceId, interactionId },
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
      framework: { name: 'browser', adapterVersion: 'browser-runtime-surface-2' },
      source: opportunity.callerFile ? {
        file: opportunity.callerFile,
        line: Number.parseInt(opportunity.callerLine, 10) || null,
        functionName: opportunity.callerFn || null,
      } : null,
      correlation: this.#correlationContext?.correlation?.(),
      evidence: {
        level: opportunity.callerFile ? EvidenceLevel.ATTRIBUTION : EvidenceLevel.CORRELATION,
        attribution: opportunity.callerFile
          ? AttributionQuality.SOURCE_ATTRIBUTED
          : AttributionQuality.TEMPORAL_INFERENCE,
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
        const emitted = this.#store.emit({
          type: RuntimeEventType.INTERACTION,
          framework: { name: 'browser', adapterVersion: 'browser-runtime-surface-2' },
          correlation: { interactionId },
          evidence: _browserEvidence(),
          payload: {
            kind: type,
            targetTag: target?.tagName?.toLowerCase?.() || null,
            targetRole: target?.getAttribute?.('role') || null,
          },
        });
        this.#correlationContext?.noteInteraction?.(
          interactionId,
          emitted?.timestamp ?? Date.now(),
        );
      };
      doc.addEventListener(type, handler, true);
      this.#interactionHandlers.push([type, handler]);
    }
  }
}

export { BrowserRuntimeSurface };
