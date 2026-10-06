import { createEvidenceEvent, validateEvidenceEvent } from './evidence-protocol.js';

/**
 * Bounded framework-neutral event store with bounded eviction tombstones.
 * Correlation references have explicit states: present, evicted, or unknown.
 */
class EvidenceStore {
  #events = [];
  #subscribers = new Set();
  #sequence = 0;
  #idSequence = 0;
  #maxEntries;
  #clock;
  #evicted = new Map();

  constructor({ maxEntries = 1000, clock = () => Date.now() } = {}) {
    this.#maxEntries = Math.max(50, maxEntries);
    this.#clock = clock;
  }

  emit(input, context = {}) {
    const sequence = ++this.#sequence;
    const id = input.id || `evt-${++this.#idSequence}`;
    const event = createEvidenceEvent(input, { ...context, id, sequence, timestamp: this.#clock() });
    const validation = validateEvidenceEvent(event, { resolveReference: ref => this.resolveReference(ref) });
    if (!validation.valid) {
      throw new TypeError(`Invalid runtime evidence: ${validation.errors.join(', ')}`);
    }
    this.#events.push(event);
    if (this.#events.length > this.#maxEntries) {
      const removed = this.#events.splice(0, this.#events.length - this.#maxEntries);
      for (const old of removed) this.#rememberEvicted(old);
    }
    for (const subscriber of this.#subscribers) {
      try { subscriber(event); } catch { /* diagnostics must not break app runtime */ }
    }
    return event;
  }

  #rememberEvicted(event) {
    this.#evicted.set(event.id, event.sequence);
    while (this.#evicted.size > this.#maxEntries) {
      this.#evicted.delete(this.#evicted.keys().next().value);
    }
  }

  resolveReference(id) {
    if (!id) return { status: 'none', sequence: null };
    const event = this.#events.find(item => item.id === id);
    if (event) return { status: 'present', sequence: event.sequence, event };
    if (this.#evicted.has(id)) return { status: 'evicted', sequence: this.#evicted.get(id), event: null };
    return { status: 'unknown', sequence: null, event: null };
  }

  subscribe(fn) {
    if (typeof fn !== 'function') throw new TypeError('EvidenceStore.subscribe requires a function');
    this.#subscribers.add(fn);
    return () => this.#subscribers.delete(fn);
  }

  snapshot({ type = null, ownerId = null, traceId = null } = {}) {
    return this.#events.filter(event =>
      (!type || event.type === type) &&
      (!ownerId || event.owner?.id === ownerId) &&
      (!traceId || event.correlation.traceId === traceId)
    );
  }

  clear() { this.#events.length = 0; this.#evicted.clear(); }
  size() { return this.#events.length; }
}

const evidenceStore = new EvidenceStore();
if (typeof window !== 'undefined') {
  window.__LDS_EVIDENCE_STORE__ = evidenceStore;
  window.__LDS_EVIDENCE__ = () => evidenceStore.snapshot();
}
export { EvidenceStore, evidenceStore };
