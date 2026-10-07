import test from 'node:test';
import assert from 'node:assert/strict';

import { LitAdapter } from '../../src/adapter/lit/LitAdapter.js';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import { RuntimeEventType } from '../../src/core/evidence-protocol.js';
import { recordLegacyLitError } from '../../src/integration/lit/legacy-collector-bridge.js';
import { LitIntelligencePipeline } from '../../src/integration/lit/LitIntelligencePipeline.js';

test('Lit error collector flows through UREP into root-cause, recorder, capsule, and verification presentation', () => {
    const store = new EvidenceStore({ maxEntries: 100 });
    const adapter = new LitAdapter({ store });
    const pipeline = new LitIntelligencePipeline({ store, windowTarget: null });
    pipeline.start();

    const el = {
        localName: 'x-order-card',
        tagName: 'X-ORDER-CARD',
        requestUpdate() {},
        performUpdate() {},
        status: 'after',
    };

    const owner = adapter.connect(el);
    const request = adapter.recordUpdateRequested(el, 'status', 'before');
    adapter.recordUpdateStarted(el);
    adapter.recordUpdateCompleted(el);

    const error = new Error('render failed');
    error.stack = 'Error: render failed\n    at render (src/components/x-order-card/x-order-card.js:42:7)';
    const errorEvent = recordLegacyLitError(el, {
        phase: 'render',
        message: error.message,
        stack: error.stack,
    }, error, { adapter });

    assert.equal(errorEvent.type, RuntimeEventType.ERROR);
    assert.equal(errorEvent.owner.id, owner.id);
    assert.equal(errorEvent.correlation.causedByEventId, request.id);
    assert.equal(errorEvent.source.file, 'src/components/x-order-card/x-order-card.js');
    assert.ok(errorEvent.privacy, 'collector evidence must cross the EvidenceStore privacy boundary');

    const events = store.snapshot();
    assert.equal(events.filter(event => event.type === RuntimeEventType.OWNER_CREATED).length, 1);
    assert.equal(events.filter(event => event.type === RuntimeEventType.UPDATE_REQUESTED).length, 1);
    assert.equal(events.filter(event => event.type === RuntimeEventType.ERROR).length, 1);

    const presentation = pipeline.snapshot();
    assert.equal(presentation.status, 'incident-captured');
    assert.equal(presentation.surface, 'lds-debug-panel:pinpoint');
    assert.equal(presentation.trigger.id, errorEvent.id);
    assert.ok(presentation.rootCause, 'generic root-cause grouping should produce a cluster');
    assert.equal(presentation.incident.reason, 'lit-runtime-error');
    assert.ok(
        presentation.capsule.evidence.references.some(ref => ref.id === errorEvent.id),
        'evidence capsule should reference the collector error event',
    );
    assert.equal(presentation.capsule.privacy.enforced, true);

    const verified = pipeline.recordVerification({
        source: 'panel-replay',
        outcome: 'confirmed',
        confirmed: true,
        metrics: [{ label: 'Error count', before: 1, after: 0 }],
    });
    assert.equal(verified.verification.outcome, 'confirmed');
    assert.equal(verified.capsule.verification.outcome, 'confirmed');

    pipeline.stop();
});
