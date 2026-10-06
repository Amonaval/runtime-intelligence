import { createEvidenceEvent } from './evidence-protocol.js';

/**
 * Bounded framework-neutral event store. It is intentionally tiny: capture now,
 * graph/correlation intelligence later. Consumers can subscribe without coupling
 * adapters to the panel or to any specific diagnosis engine.
 */
class EvidenceStore {
    #events = [];
    #subscribers = new Set();
    #sequence = 0;
    #idSequence = 0;
    #maxEntries;
    #clock;

    constructor({ maxEntries = 1000, clock = () => Date.now() } = {}) {
        this.#maxEntries = Math.max(50, maxEntries);
        this.#clock = clock;
    }

    emit(input, context = {}) {
        const sequence = ++this.#sequence;
        const id = input.id || `evt-${++this.#idSequence}`;
        const event = createEvidenceEvent(input, {
            ...context,
            id,
            sequence,
            timestamp: this.#clock(),
        });
        this.#events.push(event);
        if (this.#events.length > this.#maxEntries) {
            this.#events.splice(0, this.#events.length - this.#maxEntries);
        }
        for (const subscriber of this.#subscribers) {
            try { subscriber(event); } catch { /* diagnostics must not break app runtime */ }
        }
        return event;
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

    clear() { this.#events.length = 0; }
    size() { return this.#events.length; }
}

const evidenceStore = new EvidenceStore();

if (typeof window !== 'undefined') {
    window.__LDS_EVIDENCE_STORE__ = evidenceStore;
    window.__LDS_EVIDENCE__ = () => evidenceStore.snapshot();
}

export { EvidenceStore, evidenceStore };
