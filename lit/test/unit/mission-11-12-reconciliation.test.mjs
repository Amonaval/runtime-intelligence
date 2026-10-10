import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import { RuntimeEventType } from '../../src/core/evidence-protocol.js';

function makeStore() { return new EvidenceStore({ maxEntries: 50 }); }

test('Mission 11/12 public exports remain reachable from the package barrel', async () => {
    const mod = await import('../../src/index.js');
    for (const name of [
        'BackgroundSessionStore', 'FalcorCallGraph', 'SequentialApiDetector',
        'DomDuplicationAdvisor', 'VirtualizationAdvisor', 'PaintAdvisor',
        'WorkerOpportunityAdvisor', 'IdleSchedulingAdvisor',
    ]) {
        assert.equal(typeof mod[name], 'function', `${name} should be exported`);
    }
});

test('canonical Mission 10F update budget monitor still exposes episodeStart semantics', async () => {
    const { UpdateBudgetMonitor } = await import('../../src/core/update-budget-monitor.js');
    const store = makeStore();
    const monitor = new UpdateBudgetMonitor({ store, budget: { countPerWindow: 1, windowMs: 100 } }).start();
    const owner = { id: 'o1', name: 'x-test' };
    store.emit({ type: RuntimeEventType.UPDATE_COMPLETED, owner, timestamp: 10, payload: { durationMs: 1 } });
    store.emit({ type: RuntimeEventType.UPDATE_COMPLETED, owner, timestamp: 20, payload: { durationMs: 1 } });
    const violations = store.snapshot({ type: RuntimeEventType.DIAGNOSTIC }).filter(e => e.payload?.budgetViolation);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].payload.episodeStart, true);
    monitor.stop();
});
