import assert from 'node:assert/strict';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { EvidenceStore } from '../lit/src/core/evidence-store.js';
import { ReactIntelligenceRuntime } from '../lit/src/react/ReactIntelligenceRuntime.js';
import { VueIntelligenceRuntime } from '../lit/src/vue/VueIntelligenceRuntime.js';
import { RuntimeIntelligencePipeline } from '../lit/src/integration/shared/RuntimeIntelligencePipeline.js';
import { createRuntimeIntelligenceLoader } from '../lit/src/loader/index.js';
const results = { scope: 'Node synthetic evidence throughput; p95 is across batch averages, not browser render latency or heap proof', node: process.version, rows: [], budgets: { ordinaryBatchP95MsPerEvent: 5, analysisBatchP95MsPerEvent: 100 } };
let calls = 0;
const disabled = createRuntimeIntelligenceLoader({ loaders: { core: () => { calls++; throw Error('disabled import'); } } });
for (let i = 0; i < 1000; i++) assert.equal((await disabled({ enabled: false })).enabled, false);
assert.equal(calls, 0);
results.disabledLoaderImports = calls;
const percentile = values => [...values].sort((a, b) => a - b)[Math.ceil(values.length * .95) - 1];
for (const mode of ['store-only', 'React browser-free runtime', 'Vue browser-free runtime', 'shared slow-analysis']) {
  const times = [];
  const count = mode === 'shared slow-analysis' ? 20 : 1000;
  for (let sample = 0; sample < 8; sample++) {
    let now = 0;
    const store = new EvidenceStore({ maxEntries: 250, clock: () => now });
    const Runtime = mode.startsWith('React') ? ReactIntelligenceRuntime : VueIntelligenceRuntime;
    const service = mode === 'store-only' ? null : mode === 'shared slow-analysis' ? new RuntimeIntelligencePipeline({ store, windowTarget: null }) : new Runtime({ store, windowTarget: null });
    service?.start();
    const start = performance.now();
    for (let i = 0; i < count; i++) {
      now += 500;
      store.emit({ type: 'component.update.completed', framework: { name: 'react', adapterVersion: 'benchmark' }, owner: { id: 'benchmark-owner', name: 'Benchmark' }, source: { file: 'src/Benchmark.js', line: 1 }, payload: { actualDurationMs: mode === 'shared slow-analysis' ? 150 : 1 } });
    }
    const duration = performance.now() - start;
    service?.stop();
    assert(store.size() <= 250);
    if (sample > 0) times.push(duration / count); // one warmup batch
  }
  const budget = mode === 'shared slow-analysis' ? results.budgets.analysisBatchP95MsPerEvent : results.budgets.ordinaryBatchP95MsPerEvent;
  const p95 = percentile(times);
  const sorted = [...times].sort((a, b) => a - b);
  results.rows.push({ mode, eventsPerBatch: count, measuredBatches: times.length, p50BatchAverageMsPerEvent: sorted[Math.floor(sorted.length / 2)], p95BatchAverageMsPerEvent: p95, budgetMsPerEvent: budget, result: p95 <= budget ? 'PASS' : 'FAIL', retentionCap: 250 });
}
if (process.env.RI_OVERHEAD_RECEIPT) fs.writeFileSync(process.env.RI_OVERHEAD_RECEIPT, JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
assert(results.rows.every(row => row.result === 'PASS'), 'Development evidence throughput budget exceeded; inspect the receipt on this hardware.');
