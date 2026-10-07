import { EvidenceGraph } from '../../core/evidence-graph.js';
import { RootCauseGrouper } from '../../core/root-cause.js';
import { IncidentFlightRecorder } from '../../core/incident-flight-recorder.js';
import { createEvidenceCapsule } from '../../core/evidence-capsule.js';
import { RuntimeEventType } from '../../core/evidence-protocol.js';
import { evidenceStore } from '../../core/evidence-store.js';
import { installLitIntelligencePanelPresentation } from './panel-intelligence-presentation.js';

function _eventRef(event) {
    return event ? Object.freeze({
        id: event.id,
        type: event.type,
        sequence: event.sequence,
        ownerId: event.owner?.id || null,
        evidenceLevel: event.evidence?.level || null,
    }) : null;
}

function _portableClone(value, memo = new WeakMap(), stack = new WeakSet()) {
    if (value === null || typeof value !== 'object') return value;
    if (stack.has(value)) return '[Circular]';
    if (memo.has(value)) return memo.get(value);

    const out = Array.isArray(value) ? [] : {};
    memo.set(value, out);
    stack.add(value);
    for (const [key, child] of Object.entries(value)) {
        out[key] = _portableClone(child, memo, stack);
    }
    stack.delete(value);
    return out;
}

function _freezePresentation(value, seen = new WeakSet()) {
    if (!value || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const child of Object.values(value)) _freezePresentation(child, seen);
    return Object.freeze(value);
}

class LitIntelligencePipeline {
    #store;
    #windowTarget;
    #recorder;
    #grouper;
    #unsubscribe = null;
    #latest = null;
    #analysisContext = null;
    #capsuleSequence = 0;

    constructor({
        store = evidenceStore,
        windowTarget = typeof window !== 'undefined' ? window : null,
        recorderOptions = {},
        rootCauseOptions = {},
    } = {}) {
        if (!store || typeof store.subscribe !== 'function' || typeof store.snapshot !== 'function') {
            throw new TypeError('LitIntelligencePipeline requires an EvidenceStore-compatible store.');
        }
        this.#store = store;
        this.#windowTarget = windowTarget;
        this.#grouper = new RootCauseGrouper(rootCauseOptions);
        this.#recorder = new IncidentFlightRecorder({
            store,
            start: false,
            autoFreeze: event => event?.type === RuntimeEventType.ERROR
                ? { reason: 'lit-runtime-error', postTriggerEvents: 0 }
                : false,
            ...recorderOptions,
        });
    }

    start() {
        if (this.#unsubscribe) return this;
        this.#recorder.start();
        this.#unsubscribe = this.#store.subscribe(event => this.#onEvidence(event));
        if (this.#windowTarget) {
            this.#windowTarget.__LDS_INTELLIGENCE_PIPELINE__ = this;
            installLitIntelligencePanelPresentation({ target: this.#windowTarget });
        }
        return this;
    }

    stop() {
        if (this.#unsubscribe) this.#unsubscribe();
        this.#unsubscribe = null;
        this.#recorder.stop();
        return this;
    }

    snapshot() {
        return this.#latest;
    }

    recorder() {
        return this.#recorder;
    }

    resume({ clear = true } = {}) {
        this.#recorder.resume({ clear });
        this.#latest = null;
        this.#analysisContext = null;
        this.#publish();
        return this;
    }

    recordVerification(verification) {
        if (!this.#analysisContext || !verification) return null;
        const verificationSnapshot = _portableClone(verification);
        const capsule = this.#buildCapsule({
            ...this.#analysisContext,
            verification: verificationSnapshot,
        });
        this.#analysisContext = { ...this.#analysisContext, verification: verificationSnapshot };
        this.#latest = _freezePresentation({
            ...this.#latest,
            verification: verificationSnapshot,
            capsule,
            updatedAt: Date.now(),
        });
        this.#publish();
        return this.#latest;
    }

    #onEvidence(event) {
        if (event?.type !== RuntimeEventType.ERROR) return;
        const incident = this.#recorder.incident();
        if (!incident) return;
        this.#analyze(event, incident);
    }

    #analyze(triggerEvent, incident) {
        const graph = new EvidenceGraph(incident.events);
        const clusters = this.#grouper.group(graph);
        const rootCause = clusters.find(cluster => cluster.eventIds.includes(triggerEvent.id)) || clusters[0] || null;
        const rootEvent = rootCause?.rootEventId ? graph.node(rootCause.rootEventId) : null;
        const causalChain = rootCause
            ? rootCause.eventIds.map(id => _eventRef(graph.node(id))).filter(Boolean)
            : [_eventRef(triggerEvent)].filter(Boolean);
        const context = {
            triggerEvent,
            incident,
            rootCause,
            rootEvent,
            causalChain,
            verification: null,
        };
        const capsule = this.#buildCapsule(context);
        this.#analysisContext = context;
        this.#latest = _freezePresentation({
            schemaVersion: '1.0',
            surface: 'lds-debug-panel:pinpoint',
            status: 'incident-captured',
            trigger: _eventRef(triggerEvent),
            rootCause: rootCause ? {
                id: rootCause.id,
                strength: rootCause.strength,
                rootEventId: rootCause.rootEventId,
                rootLabel: rootCause.rootLabel,
                score: rootCause.score,
            } : null,
            incident: {
                id: incident.id,
                reason: incident.reason,
                eventCount: incident.eventCount,
            },
            verification: null,
            capsule,
            updatedAt: Date.now(),
        });
        this.#publish();
    }

    #buildCapsule({ triggerEvent, incident, rootCause, rootEvent, causalChain, verification }) {
        return createEvidenceCapsule({
            id: `lit-capsule-${++this.#capsuleSequence}-${triggerEvent.id}`,
            problem: {
                title: 'Lit runtime error',
                summary: triggerEvent.payload?.message || 'Lit component runtime error',
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
            recommendation: rootCause ? {
                summary: `Inspect ${rootCause.rootLabel} and preserve the recorded evidence strength (${rootCause.strength}).`,
            } : {
                summary: 'Inspect the attributed component error and surrounding UREP evidence.',
            },
            verification,
            environment: {
                framework: 'lit',
                presentationSurface: 'lds-debug-panel:pinpoint',
            },
        });
    }

    #publish() {
        if (!this.#windowTarget) return;
        this.#windowTarget.__LDS_INTELLIGENCE__ = this.#latest;
        const EventCtor = this.#windowTarget.CustomEvent;
        if (typeof this.#windowTarget.dispatchEvent === 'function' && typeof EventCtor === 'function') {
            this.#windowTarget.dispatchEvent(new EventCtor('lds-intelligence-updated', {
                detail: this.#latest,
            }));
        }
    }
}

let _defaultPipeline = null;
function getLitIntelligencePipeline() {
    if (!_defaultPipeline) _defaultPipeline = new LitIntelligencePipeline();
    return _defaultPipeline;
}

export { LitIntelligencePipeline, getLitIntelligencePipeline };
