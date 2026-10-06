/**
 * Universal Runtime Evidence Protocol (UREP) v1.
 *
 * This module is intentionally framework-neutral. Lit/React/Vue/Angular/Svelte
 * adapters emit the same event envelope and advertise how strongly each signal
 * can be attributed. The core never assumes a framework exposes Lit semantics.
 */

const SCHEMA_VERSION = '1.0';

const EvidenceLevel = Object.freeze({
    OBSERVATION: 'observation',
    CORRELATION: 'correlation',
    ATTRIBUTION: 'attribution',
    LIFETIME_VIOLATION: 'lifetime-violation',
    CAUSALITY_CONFIRMED: 'causality-confirmed',
});

const AttributionQuality = Object.freeze({
    DETERMINISTIC: 'deterministic',
    FRAMEWORK_REPORTED: 'framework-reported',
    SOURCE_ATTRIBUTED: 'source-attributed',
    TEMPORAL_INFERENCE: 'temporal-inference',
    HEURISTIC: 'heuristic',
    UNKNOWN: 'unknown',
});

const CapabilitySupport = Object.freeze({
    DETERMINISTIC: 'deterministic',
    FRAMEWORK_REPORTED: 'framework-reported',
    PARTIAL: 'partial',
    INFERRED: 'inferred',
    UNSUPPORTED: 'unsupported',
});

const FrameworkCapability = Object.freeze({
    OWNER_LIFECYCLE: 'owner-lifecycle',
    UPDATE_LIFECYCLE: 'update-lifecycle',
    UPDATE_CAUSE: 'update-cause',
    STATE_CHANGE: 'state-change',
    RENDER_TIMING: 'render-timing',
    SOURCE_LOCATION: 'source-location',
    REACTIVE_DEPENDENCY: 'reactive-dependency',
    RESOURCE_OWNERSHIP: 'resource-ownership',
    EFFECT_LIFECYCLE: 'effect-lifecycle',
});

const RuntimeEventType = Object.freeze({
    OWNER_CREATED: 'owner.created',
    OWNER_DESTROYED: 'owner.destroyed',
    INTERACTION: 'interaction',
    STATE_CHANGED: 'state.changed',
    UPDATE_REQUESTED: 'component.update.requested',
    UPDATE_STARTED: 'component.update.started',
    UPDATE_COMPLETED: 'component.update.completed',
    RESOURCE_ACQUIRED: 'resource.acquired',
    RESOURCE_RELEASED: 'resource.released',
    NETWORK_STARTED: 'network.started',
    NETWORK_COMPLETED: 'network.completed',
    ERROR: 'error',
    DIAGNOSTIC: 'diagnostic',
});

const _evidenceLevels = new Set(Object.values(EvidenceLevel));
const _attributionQualities = new Set(Object.values(AttributionQuality));
const _eventTypes = new Set(Object.values(RuntimeEventType));

function _plainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

/**
 * Privacy-aware runtime value summary. Raw object graphs are intentionally not
 * retained in the universal protocol by default.
 */
function summarizeRuntimeValue(value, { maxString = 100, maxKeys = 5 } = {}) {
    if (value === undefined) return { type: 'undefined', summary: 'undefined' };
    if (value === null) return { type: 'null', summary: 'null' };
    const type = typeof value;
    if (type === 'string') {
        return { type, summary: value.length > maxString ? `${value.slice(0, maxString)}…` : value, length: value.length };
    }
    if (type === 'number' || type === 'boolean' || type === 'bigint') {
        return { type, summary: String(value) };
    }
    if (type === 'symbol') return { type, summary: String(value) };
    if (type === 'function') return { type, summary: `[Function ${value.name || 'anonymous'}]` };
    if (Array.isArray(value)) return { type: 'array', summary: `Array[${value.length}]`, length: value.length };
    const keys = Object.keys(value).slice(0, maxKeys);
    return {
        type: 'object',
        summary: `{${keys.join(',')}${Object.keys(value).length > maxKeys ? ',…' : ''}}`,
        keys,
    };
}

function normalizeSource(source) {
    if (!source) return null;
    if (typeof source === 'string') return { file: source, line: null, column: null, functionName: null };
    return {
        file: source.file || source.url || null,
        line: Number.isFinite(source.line) ? source.line : null,
        column: Number.isFinite(source.column) ? source.column : null,
        functionName: source.functionName || source.function || null,
    };
}

function normalizeOwner(owner) {
    if (!owner) return null;
    return {
        id: owner.id || null,
        kind: owner.kind || 'component',
        name: owner.name || owner.label || null,
        instanceId: owner.instanceId || null,
        parentId: owner.parentId || null,
    };
}

function createEvidenceEvent(input, context = {}) {
    if (!input || !_eventTypes.has(input.type)) {
        throw new TypeError(`Unknown runtime evidence event type: ${input?.type}`);
    }
    const evidence = _plainObject(input.evidence);
    const level = _evidenceLevels.has(evidence.level) ? evidence.level : EvidenceLevel.OBSERVATION;
    const attribution = _attributionQualities.has(evidence.attribution)
        ? evidence.attribution
        : AttributionQuality.UNKNOWN;
    const confidence = Number.isFinite(evidence.confidence)
        ? Math.max(0, Math.min(1, evidence.confidence))
        : null;

    return Object.freeze({
        schemaVersion: SCHEMA_VERSION,
        id: input.id || context.id || null,
        sequence: Number.isFinite(input.sequence) ? input.sequence : (context.sequence ?? null),
        timestamp: Number.isFinite(input.timestamp) ? input.timestamp : (context.timestamp ?? Date.now()),
        type: input.type,
        framework: {
            name: input.framework?.name || context.framework?.name || 'unknown',
            version: input.framework?.version || context.framework?.version || null,
            adapterVersion: input.framework?.adapterVersion || context.framework?.adapterVersion || null,
        },
        owner: normalizeOwner(input.owner),
        source: normalizeSource(input.source),
        correlation: {
            traceId: input.correlation?.traceId || null,
            interactionId: input.correlation?.interactionId || null,
            parentEventId: input.correlation?.parentEventId || null,
            causedByEventId: input.correlation?.causedByEventId || null,
        },
        evidence: { level, attribution, confidence },
        payload: _plainObject(input.payload),
    });
}

function validateEvidenceEvent(event) {
    const errors = [];
    if (!event || event.schemaVersion !== SCHEMA_VERSION) errors.push('schemaVersion');
    if (!event?.id) errors.push('id');
    if (!Number.isFinite(event?.sequence)) errors.push('sequence');
    if (!Number.isFinite(event?.timestamp)) errors.push('timestamp');
    if (!_eventTypes.has(event?.type)) errors.push('type');
    if (!event?.framework?.name) errors.push('framework.name');
    if (!_evidenceLevels.has(event?.evidence?.level)) errors.push('evidence.level');
    if (!_attributionQualities.has(event?.evidence?.attribution)) errors.push('evidence.attribution');
    return { valid: errors.length === 0, errors };
}

export {
    SCHEMA_VERSION,
    EvidenceLevel,
    AttributionQuality,
    CapabilitySupport,
    FrameworkCapability,
    RuntimeEventType,
    summarizeRuntimeValue,
    createEvidenceEvent,
    validateEvidenceEvent,
};
