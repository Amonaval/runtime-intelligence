import {
  AttributionQuality,
  EvidenceLevel,
  RuntimeEventType,
} from '../../core/evidence-protocol.js';
import { LdsNetwork } from '../../core/network.js';
import { LdsVitals } from '../../core/vitals.js';
import { LdsConsole } from '../../core/console.js';
import { SequentialApiDetector } from '../../core/sequential-api-detector.js';
import { captureSourceProvenance, SourceProvenanceKind } from '../../core/source-provenance.js';

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

function _browserEvidence(source = null) {
  return source ? {
    level: EvidenceLevel.ATTRIBUTION,
    attribution: AttributionQuality.SOURCE_ATTRIBUTED,
    confidence: 0.95,
  } : {
    level: EvidenceLevel.OBSERVATION,
    attribution: AttributionQuality.DETERMINISTIC,
    confidence: 1,
  };
}

function _provenancePayload(provenance) {
  return provenance ? { sourceProvenance: provenance } : {};
}

function _applicationStack(provenance) {
  const frames = Array.isArray(provenance?.frames) ? provenance.frames : [];
  if (!frames.length) return null;
  return frames.map(frame => {
    if (!frame?.file) return null;
    const line = Number.isFinite(frame.line) ? `:${frame.line}` : '';
    const column = Number.isFinite(frame.column) ? `:${frame.column}` : '';
    return `at ${frame.functionName || 'application'} (${frame.file}${line}${column})`;
  }).filter(Boolean).join('\n') || null;
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
  #consoleUnsubscribe = null;
  #sequential = null;
  #started = false;
  #onError = null;
  #onUnhandledRejection = null;
  #interactionHandlers = [];
  #networkAttached = false;
  #vitalsAttached = false;
  #consoleAttached = false;
  #hadIntelligenceFlag = false;
  #previousIntelligenceFlag;

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
    this.#hadIntelligenceFlag = Object.prototype.hasOwnProperty.call(win, '__LDS_INTELLIGENCE_ENABLED__');
    this.#previousIntelligenceFlag = win.__LDS_INTELLIGENCE_ENABLED__;
    win.__LDS_INTELLIGENCE_ENABLED__ = true;

    try {
      if (typeof this.#network?.init === 'function') {
        const attached = this.#network.init();
        this.#networkAttached = attached !== false;
      }
    } catch {}
    try {
      if (typeof this.#vitals?.init === 'function') {
        const attached = this.#vitals.init();
        this.#vitalsAttached = attached !== false;
      }
    } catch {}
    try {
      if (typeof this.#consoleCapture?.attach === 'function') {
        const attached = this.#consoleCapture.attach(win);
        this.#consoleAttached = attached !== false;
      }
    } catch {}

    if (typeof this.#consoleCapture?.subscribe === 'function') {
      try {
        this.#consoleUnsubscribe = this.#consoleCapture.subscribe(entry => this.#recordConsole(entry));
      } catch {
        this.#consoleUnsubscribe = null;
      }
    }

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
        const captured = captureSourceProvenance({
          source: _errorSource(event),
          stack: event?.error?.stack || null,
          kind: SourceProvenanceKind.ERROR_ORIGIN,
          basis: event?.filename ? 'browser-error-event' : 'runtime-stack',
        });
        this.#store.emit({
          type: RuntimeEventType.ERROR,
          framework: { name: 'browser', adapterVersion: 'browser-runtime-surface-4' },
          source: captured.source,
          correlation: this.#correlationContext?.correlation?.(),
          evidence: _browserEvidence(captured.source),
          payload: {
            phase: 'window.error',
            message: event?.error?.message || event?.message || 'Unhandled browser error',
            stack: _applicationStack(captured.provenance),
            ..._provenancePayload(captured.provenance),
          },
        });
      };
      this.#onUnhandledRejection = event => {
        const captured = captureSourceProvenance({
          stack: event?.reason?.stack || null,
          kind: SourceProvenanceKind.ERROR_ORIGIN,
          basis: 'runtime-stack',
        });
        this.#store.emit({
          type: RuntimeEventType.ERROR,
          framework: { name: 'browser', adapterVersion: 'browser-runtime-surface-4' },
          source: captured.source,
          correlation: this.#correlationContext?.correlation?.(),
          evidence: _browserEvidence(captured.source),
          payload: {
            phase: 'unhandledrejection',
            message: event?.reason?.message || String(event?.reason || 'Unhandled promise rejection'),
            stack: _applicationStack(captured.provenance),
            ..._provenancePayload(captured.provenance),
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
    this.#consoleUnsubscribe?.();
    this.#consoleUnsubscribe = null;
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

    if (this.#consoleAttached) {
      try { this.#consoleCapture?.detach?.(win); } catch {}
      this.#consoleAttached = false;
    }
    if (this.#vitalsAttached) {
      try { this.#vitals?.detach?.(); } catch {}
      this.#vitalsAttached = false;
    }
    if (this.#networkAttached) {
      try { this.#network?.detach?.(); } catch {}
      this.#networkAttached = false;
    }

    if (win?.__LDS_INTELLIGENCE_ENABLED__ === true) {
      if (this.#hadIntelligenceFlag) win.__LDS_INTELLIGENCE_ENABLED__ = this.#previousIntelligenceFlag;
      else {
        try { delete win.__LDS_INTELLIGENCE_ENABLED__; } catch { win.__LDS_INTELLIGENCE_ENABLED__ = undefined; }
      }
    }
    this.#hadIntelligenceFlag = false;
    this.#previousIntelligenceFlag = undefined;
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

  #recordConsole(entry) {
    if (!entry || (entry.level !== 'warn' && entry.level !== 'error')) return;
    const captured = captureSourceProvenance({
      stack: entry.callStack || null,
      kind: SourceProvenanceKind.INVOCATION,
      basis: 'console-call-stack',
      skipPatterns: ['/core/console.js'],
    });
    this.#store.emit({
      type: RuntimeEventType.DIAGNOSTIC,
      framework: { name: 'browser', adapterVersion: 'browser-runtime-surface-4' },
      source: captured.source,
      correlation: this.#correlationContext?.correlation?.(),
      evidence: _browserEvidence(captured.source),
      payload: {
        diagnostic: 'browser.console-message',
        consoleMessage: true,
        level: entry.level,
        message: entry.message || '',
        stack: _applicationStack(captured.provenance),
        ..._provenancePayload(captured.provenance),
      },
    });
  }

  #recordNetwork(entry) {
    if (!entry) return;
    const traceId = `net-${Date.now()}-${++_networkTraceSequence}`;
    const interactionId = this.#correlationContext?.currentInteraction?.() || null;
    const captured = captureSourceProvenance({
      stack: entry.callStack || null,
      kind: SourceProvenanceKind.INVOCATION,
      basis: 'network-call-stack',
    });
    this.#store.emit({
      type: RuntimeEventType.NETWORK_COMPLETED,
      framework: { name: 'browser', adapterVersion: 'browser-runtime-surface-4' },
      source: captured.source,
      correlation: { traceId, interactionId },
      evidence: _browserEvidence(captured.source),
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
        ..._provenancePayload(captured.provenance),
      },
    });
  }

  #recordSequentialOpportunity(opportunity) {
    if (!opportunity) return;
    const source = opportunity.callerFile ? {
      file: opportunity.callerFile,
      line: Number.parseInt(opportunity.callerLine, 10) || null,
      functionName: opportunity.callerFn || null,
    } : null;
    const captured = captureSourceProvenance({
      source,
      kind: SourceProvenanceKind.COMMON_ORIGIN,
      basis: 'sequential-request-common-origin',
    });
    this.#store.emit({
      type: RuntimeEventType.DIAGNOSTIC,
      framework: { name: 'browser', adapterVersion: 'browser-runtime-surface-4' },
      source: captured.source,
      correlation: this.#correlationContext?.correlation?.(),
      evidence: {
        level: captured.source ? EvidenceLevel.ATTRIBUTION : EvidenceLevel.CORRELATION,
        attribution: captured.source
          ? AttributionQuality.SOURCE_ATTRIBUTED
          : AttributionQuality.TEMPORAL_INFERENCE,
        confidence: captured.source ? 0.9 : 0.75,
      },
      payload: {
        diagnostic: 'network.sequential-api-opportunity',
        sequentialApiOpportunity: true,
        callCount: opportunity.callCount,
        totalMs: opportunity.totalMs,
        estimatedSavingsMs: opportunity.estimatedSavingsMs,
        callerFn: opportunity.callerFn || null,
        ..._provenancePayload(captured.provenance),
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
          framework: { name: 'browser', adapterVersion: 'browser-runtime-surface-4' },
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
