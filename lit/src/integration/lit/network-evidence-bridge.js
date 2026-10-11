import {
    AttributionQuality,
    EvidenceLevel,
    RuntimeEventType,
} from '../../core/evidence-protocol.js';
import { evidenceStore } from '../../core/evidence-store.js';
import { LdsNetwork } from '../../core/network.js';
import { captureSourceProvenance, SourceProvenanceKind } from '../../core/source-provenance.js';

let _networkTraceSequence = 0;

function _nextNetworkTraceId(entry) {
    const startedAt = Number.isFinite(entry?.startTime) ? Math.round(entry.startTime) : Date.now();
    _networkTraceSequence += 1;
    return `net-trace-${startedAt}-${_networkTraceSequence}`;
}

function _safePath(entry) {
    const value = typeof entry?.url === 'string' ? entry.url : '';
    return value.split('?')[0].slice(0, 160) || null;
}

function recordLegacyNetworkEntry(entry, { store = evidenceStore } = {}) {
    if (!entry || !store || typeof store.emit !== 'function') return null;
    const captured = captureSourceProvenance({
        stack: entry.callStack || null,
        kind: SourceProvenanceKind.INVOCATION,
        basis: 'network-call-stack',
    });
    return store.emit({
        type: RuntimeEventType.NETWORK_COMPLETED,
        framework: {
            name: 'browser',
            adapterVersion: 'legacy-network-bridge-2',
        },
        source: captured.source,
        correlation: {
            traceId: _nextNetworkTraceId(entry),
        },
        evidence: captured.source ? {
            level: EvidenceLevel.ATTRIBUTION,
            attribution: AttributionQuality.SOURCE_ATTRIBUTED,
            confidence: 0.95,
        } : {
            level: EvidenceLevel.OBSERVATION,
            attribution: AttributionQuality.DETERMINISTIC,
            confidence: 1,
        },
        payload: {
            path: _safePath(entry),
            method: entry.method || 'GET',
            status: Number.isFinite(entry.status) ? entry.status : null,
            durationMs: Number.isFinite(entry.durationMs) ? entry.durationMs : null,
            responseSizeKB: Number.isFinite(entry.responseSizeKB) ? entry.responseSizeKB : null,
            transport: entry.type || null,
            isError: entry.isError === true,
            isSlow: entry.isSlow === true,
            isLarge: entry.isLarge === true,
            ...(captured.provenance ? { sourceProvenance: captured.provenance } : {}),
        },
    });
}

const _bridges = new WeakMap();
function installLegacyNetworkEvidenceBridge({ network = LdsNetwork, store = evidenceStore } = {}) {
    if (!network || typeof network.subscribe !== 'function' || !store || typeof store.emit !== 'function') return null;
    let stores = _bridges.get(network);
    if (!stores) { stores = new WeakMap(); _bridges.set(network, stores); }
    if (stores.has(store)) return stores.get(store);
    let active = true;
    const unsubscribe = network.subscribe(entry => {
        if (active) recordLegacyNetworkEntry(entry, { store });
    });
    const cleanup = () => {
        if (!active) return;
        active = false;
        stores.delete(store);
        unsubscribe?.();
    };
    stores.set(store, cleanup);
    return cleanup;
}

export { installLegacyNetworkEvidenceBridge, recordLegacyNetworkEntry };
