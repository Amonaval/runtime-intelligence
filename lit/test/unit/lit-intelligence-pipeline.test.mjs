import assert from 'node:assert/strict';
import test from 'node:test';

import { LitAdapter } from '../../src/adapter/lit/LitAdapter.js';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import { RuntimeEventType } from '../../src/core/evidence-protocol.js';
import { LitIntelligencePipeline } from '../../src/integration/lit/LitIntelligencePipeline.js';
import { recordLegacyLitError } from '../../src/integration/lit/legacy-collector-bridge.js';

function fakeLitElement() {
    return {
        localName: 'x-order-card',
        requestUpdate() {},
        performUpdate() {},
        status: 'old',
    };
}

test('Lit error collector reaches UREP, incident analysis, capsule and verification without duplicate lifecycle', () => {
    const store = new EvidenceStore({ capacity: 100 });
    const adapter = new LitAdapter({ store });
    const pipeline = new LitIntelligencePipeline({ store, windowTarget: null });
    const el = fakeLitElement();

    pipeline.start();
    const owner = adapter.connect(el);
    el.status = 'new';
    const updateRequested = adapter.recordUpdateRequested(el, 'status', 'old');
    adapter.recordUpdateStarted(el);
    adapter.recordUpdateCompleted(el);

    const error = new Error('render exploded');
    error.stack = 'Error: render exploded\n    at render (src/components/x-order-card/x-order-card.js:42:7)';
    const errorEvent = recordLegacyLitError(el, {
        phase: 'updated',
        message: error.message,
    }, error, { adapter });

    assert.equal(errorEvent.type, RuntimeEventType.ERROR);
    assert.equal(errorEvent.owner.id, owner.id);
    assert.equal(errorEvent.correlation.causedByEventId, updateRequested.id);
    assert.equal(errorEvent.source.file, 'src/components/x-order-card/x-order-card.js');
    assert.ok(errorEvent.privacy);

    const events = store.snapshot();
    assert.equal(events.filter(event => event.type === RuntimeEventType.OWNER_CREATED).length, 1);
    assert.equal(events.filter(event => event.type === RuntimeEventType.UPDATE_REQUESTED).length, 1);
    assert.equal(events.filter(event => event.type === RuntimeEventType.ERROR).length, 1);

    const snapshot = pipeline.snapshot();
    assert.equal(snapshot.status, 'incident-captured');
    assert.equal(snapshot.surface, 'lds-debug-panel:pinpoint');
    assert.equal(snapshot.trigger.type, RuntimeEventType.ERROR);
    assert.ok(snapshot.rootCause);
    assert.equal(snapshot.incident.reason, 'lit-runtime-error');
    assert.ok(snapshot.capsule.evidence.eventIds.includes(errorEvent.id));
    assert.equal(snapshot.capsule.privacy.enforced, true);

    const verified = pipeline.recordVerification({
        outcome: 'confirmed',
        confirmed: true,
        metrics: [{ key: 'errors', before: 1, after: 0 }],
    });
    assert.equal(verified.verification.outcome, 'confirmed');
    assert.equal(verified.capsule.verification.outcome, 'confirmed');

    pipeline.stop();
});

test('slow Lit UPDATE_COMPLETED becomes an incident without bridging legacy perf TTI', () => {
    const store = new EvidenceStore({ capacity: 100 });
    const adapter = new LitAdapter({ store });
    const pipeline = new LitIntelligencePipeline({
        store,
        windowTarget: null,
        slowUpdateThresholdMs: 500,
    });
    const el = fakeLitElement();

    pipeline.start();
    adapter.connect(el);
    const requested = adapter.recordUpdateRequested(el, null, undefined);
    const started = adapter.recordUpdateStarted(el);

    const originalNow = globalThis.performance?.now;
    const originalPerformance = globalThis.performance;
    let now = 1000;
    Object.defineProperty(globalThis, 'performance', {
        configurable: true,
        value: { now: () => now },
    });

    try {
        // The adapter's start above may use the native performance clock. Emit a
        // deterministic slow completion directly through the same adapter/store
        // contract to exercise the pipeline's UREP trigger semantics.
        const slow = adapter.emit(RuntimeEventType.UPDATE_COMPLETED, {
            owner: adapter.ownerOf(el),
            correlation: {
                parentEventId: started?.id || requested?.id || null,
                causedByEventId: requested?.id || null,
            },
            payload: { durationMs: 750 },
        });

        const snapshot = pipeline.snapshot();
        assert.ok(snapshot);
        assert.equal(snapshot.trigger.id, slow.id);
        assert.equal(snapshot.trigger.type, RuntimeEventType.UPDATE_COMPLETED);
        assert.equal(snapshot.incident.reason, 'lit-slow-update');
        assert.equal(snapshot.capsule.problem.title, 'Lit slow update');
        assert.equal(snapshot.capsule.environment.slowUpdateThresholdMs, 500);
    } finally {
        if (originalPerformance === undefined) delete globalThis.performance;
        else Object.defineProperty(globalThis, 'performance', {
            configurable: true,
            value: originalPerformance,
        });
        void originalNow;
        pipeline.stop();
    }
});

test('sub-threshold Lit update does not create an intelligence incident', () => {
    const store = new EvidenceStore({ capacity: 20 });
    const adapter = new LitAdapter({ store });
    const pipeline = new LitIntelligencePipeline({
        store,
        windowTarget: null,
        slowUpdateThresholdMs: 500,
    });
    const el = fakeLitElement();

    pipeline.start();
    adapter.connect(el);
    adapter.emit(RuntimeEventType.UPDATE_COMPLETED, {
        owner: adapter.ownerOf(el),
        payload: { durationMs: 499.9 },
    });

    assert.equal(pipeline.snapshot(), null);
    assert.equal(pipeline.recorder().incident(), null);
    pipeline.stop();
});
