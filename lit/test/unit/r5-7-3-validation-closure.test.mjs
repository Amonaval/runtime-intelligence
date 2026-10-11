import assert from 'node:assert/strict';
import test from 'node:test';

import { SequentialApiDetector } from '../../src/core/sequential-api-detector.js';
import { UpdateBudgetMonitor } from '../../src/core/update-budget-monitor.js';
import { createRuntimeReport } from '../../src/panel/runtime-panel-presentation.js';
import { createDeveloperIntelligenceSummary } from '../../src/integration/shared/developer-intelligence-summary.js';

class FakeNetwork {
  subscribers = new Set();
  subscribe(fn) { this.subscribers.add(fn); return () => this.subscribers.delete(fn); }
  emit(entry) { for (const fn of this.subscribers) fn(entry); }
}

class FakeStore {
  events = [];
  subscribers = new Set();
  emit(event) {
    const next = { id: event.id || `evt-${this.events.length + 1}`, timestamp: event.timestamp ?? Date.now(), ...event };
    this.events.push(next);
    for (const fn of [...this.subscribers]) fn(next);
    return next;
  }
  subscribe(fn) { this.subscribers.add(fn); return () => this.subscribers.delete(fn); }
  snapshot(filter = null) {
    if (!filter?.type) return [...this.events];
    return this.events.filter(event => event.type === filter.type);
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

test('sequential detector finds a same-origin chain inside a noisy concurrent batch', async () => {
  const network = new FakeNetwork();
  const opportunities = [];
  const detector = new SequentialApiDetector({
    network,
    onOpportunity: opportunity => opportunities.push(opportunity),
  });
  detector.start();

  const sequentialStack = 'Error\n    at runSequential (examples/react-fault-lab/src/main.jsx:120:3)\n    at onClick (examples/react-fault-lab/src/main.jsx:300:3)';
  const noisyStack = 'Error\n    at runSlow (examples/react-fault-lab/src/main.jsx:100:3)';

  network.emit({ url: '/api/noisy', durationMs: 2600, startedAt: 900, endedAt: 3500, callStack: noisyStack });
  network.emit({ url: '/api/fast?i=0', durationMs: 90, startedAt: 1000, endedAt: 1090, callStack: sequentialStack });
  network.emit({ url: '/api/fast?i=1', durationMs: 90, startedAt: 1098, endedAt: 1188, callStack: sequentialStack });
  network.emit({ url: '/api/fast?i=2', durationMs: 90, startedAt: 1196, endedAt: 1286, callStack: sequentialStack });

  await sleep(320);
  detector.stop();

  assert.equal(opportunities.length, 1);
  assert.equal(opportunities[0].callCount, 3);
  assert.equal(opportunities[0].estimatedSavingsMs, 180);
  assert.match(opportunities[0].callerFn, /runSequential/);
});

test('normalized report deduplicates high-level findings while preserving raw evidence counts', () => {
  const store = new FakeStore();
  const owner = { id: 'react-1', name: 'FaultLab.RenderStorm', kind: 'component' };
  for (let i = 0; i < 2; i += 1) {
    store.emit({
      id: `budget-${i}`,
      type: 'diagnostic',
      owner,
      source: { file: 'examples/react-fault-lab/src/main.jsx' },
      evidence: { level: 'correlation', attribution: 'temporal-inference', confidence: 0.7 },
      payload: { budgetViolation: true, tag: owner.name, updateCount: 6 + i, windowMs: 100, countPerWindow: 5 },
    });
  }

  const report = createRuntimeReport({ store, framework: 'react', windowTarget: null });
  assert.equal(report.summary.rawOpportunityCount, 2);
  assert.equal(report.summary.opportunityCount, 1);
  assert.equal(report.summary.rawNormalizedFindingCount, 2);
  assert.equal(report.summary.normalizedFindingCount, 1);
  assert.equal(report.opportunities[0].occurrenceCount, 2);
  assert.deepEqual([...report.opportunities[0].eventIds].sort(), ['budget-0', 'budget-1']);
});

test('update budget diagnostics preserve component source and framework metadata', () => {
  const store = new FakeStore();
  const monitor = new UpdateBudgetMonitor({ store });
  monitor.start();
  const owner = { id: 'react-2', name: 'FaultLab.EffectLoop', kind: 'component' };
  const source = { file: 'examples/react-fault-lab/src/main.jsx' };
  for (let i = 0; i < 6; i += 1) {
    store.emit({
      id: `render-${i}`,
      type: 'component.update.completed',
      timestamp: 1000 + i * 10,
      framework: { name: 'react', adapterVersion: 'test' },
      owner,
      source,
      correlation: { interactionId: 'interaction-test' },
      payload: { actualDurationMs: 1 },
    });
  }
  monitor.stop();

  const diagnostic = store.events.find(event => event.type === 'diagnostic' && event.payload?.budgetViolation);
  assert.ok(diagnostic);
  assert.equal(diagnostic.source.file, source.file);
  assert.equal(diagnostic.framework.name, 'react');
  assert.equal(diagnostic.correlation.interactionId, 'interaction-test');
  assert.equal(diagnostic.correlation.causedByEventId, null);
});

test('correlated co-occurrence is presented as a related signal, not a likely cause', () => {
  const triggerEvent = {
    type: 'diagnostic',
    framework: { name: 'react' },
    payload: { expensivePaint: true, property: 'boxShadow' },
  };
  const summary = createDeveloperIntelligenceSummary({
    triggerEvent,
    incident: { events: [triggerEvent] },
    rootCause: { strength: 'correlated', rootLabel: 'FaultLab.LeakyResource' },
    rootEvent: { owner: { name: 'FaultLab.LeakyResource' } },
  });

  assert.equal(summary.relationshipLabel, 'Related signal');
  assert.match(summary.likelyCause, /temporal co-occurrence only/i);
  assert.doesNotMatch(summary.likelyCause, /likely contributor/i);
});
