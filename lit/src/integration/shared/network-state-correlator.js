import { EvidenceLevel, AttributionQuality, RuntimeEventType } from '../../core/evidence-protocol.js';
const DEFAULT_WINDOW_MS = 500;
const DEFAULT_MAX_PENDING = 20;
class NetworkStateCorrelator {
  #store; #windowMs; #maxPending; #pending = []; #unsubscribe = null; #active = false; #linkCount = 0;
  constructor({ store, correlationWindowMs = DEFAULT_WINDOW_MS, maxPendingCorrelations = DEFAULT_MAX_PENDING } = {}) {
    if (!store || typeof store.emit !== 'function' || typeof store.subscribe !== 'function') throw new TypeError('NetworkStateCorrelator requires an EvidenceStore-compatible store.');
    this.#store = store;
    this.#windowMs = Number.isFinite(correlationWindowMs) && correlationWindowMs > 0 ? correlationWindowMs : DEFAULT_WINDOW_MS;
    this.#maxPending = Number.isFinite(maxPendingCorrelations) && maxPendingCorrelations > 0 ? Math.floor(maxPendingCorrelations) : DEFAULT_MAX_PENDING;
  }
  start() { if (this.#active) return this; this.#active = true; this.#unsubscribe = this.#store.subscribe(e => this.#onEvent(e)); return this; }
  stop() { if (!this.#active) return this; this.#active = false; this.#unsubscribe?.(); this.#unsubscribe = null; this.#pending = []; return this; }
  linkCount() { return this.#linkCount; }
  #onEvent(event) {
    if (!this.#active) return;
    const now = event.timestamp ?? Date.now(); this.#pending = this.#pending.filter(p => p.expiresAt > now);
    if (event.type === RuntimeEventType.NETWORK_COMPLETED) {
      if (this.#pending.length >= this.#maxPending) this.#pending.shift();
      this.#pending.push({ traceId: event.correlation?.traceId || `net-trace-${event.id}`, networkEventId: event.id, expiresAt: now + this.#windowMs, path: event.payload?.path ?? null, method: event.payload?.method ?? 'GET', timestamp: now });
      return;
    }
    if (event.type !== RuntimeEventType.STATE_CHANGED || !this.#pending.length) return;
    const p = this.#pending.at(-1); this.#linkCount += 1;
    try {
      this.#store.emit({ type: RuntimeEventType.DIAGNOSTIC, owner: event.owner, source: event.source,
        correlation: { causedByEventId: null, traceId: p.traceId, interactionId: event.correlation?.interactionId || null },
        evidence: { level: EvidenceLevel.CORRELATION, attribution: AttributionQuality.TEMPORAL_INFERENCE, confidence: 0.6 },
        payload: { networkCorrelation: true, networkEventId: p.networkEventId, stateEventId: event.id, stateOwnerId: event.owner?.id ?? null, stateOwnerTag: event.owner?.name ?? null, stateProperty: event.payload?.property ?? null, networkPath: p.path, networkMethod: p.method, tracedMs: Math.round(Math.max(0, now - p.timestamp) * 10) / 10, traceId: p.traceId } });
    } catch {}
  }
}
export { NetworkStateCorrelator };
