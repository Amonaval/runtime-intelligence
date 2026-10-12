import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const manifest = readJson('benchmarks/value-proof/faults.json');
const oracleFile = readJson('benchmarks/value-proof/oracles.json');
const template = readJson('benchmarks/value-proof/results-template.json');

assert.equal(manifest.schemaVersion, '1.0');
assert.equal(manifest.mission, 'R9.4A');
assert.equal(manifest.faults.length, 9, 'R9.4A pilot must stay frozen at nine faults.');

const modeIds = manifest.runModes.map(mode => mode.id);
assert.deepEqual(modeIds, ['native', 'ri-level-0', 'ri-targeted']);
const modeSet = new Set(modeIds);
assert.equal(modeSet.size, 3);

const ids = manifest.faults.map(fault => fault.id);
assert.equal(new Set(ids).size, ids.length, 'Fault ids must be unique.');

const countBy = key => manifest.faults.reduce((counts, fault) => {
  counts[fault[key]] = (counts[fault[key]] || 0) + 1;
  return counts;
}, {});
assert.deepEqual(countBy('framework'), { react: 3, vue: 3, lit: 3 });
assert.deepEqual(countBy('category'), {
  'source-provenance': 3,
  'cross-signal': 3,
  'action-verification': 3,
});

const firstPosition = { native: 0, 'ri-level-0': 0, 'ri-targeted': 0 };
for (const fault of manifest.faults) {
  assert.equal(typeof fault.title, 'string');
  assert.equal(typeof fault.trigger, 'string');
  assert.equal(typeof fault.symptom, 'string');
  assert.equal(typeof fault.targetedLimit, 'string');
  assert.equal(fault.runOrder.length, 3);
  assert.deepEqual([...fault.runOrder].sort(), [...modeIds].sort(), `${fault.id} must run each mode exactly once.`);
  firstPosition[fault.runOrder[0]] += 1;
  assert(fs.existsSync(path.join(root, fault.lab)), `Missing declared lab: ${fault.lab}`);
}
assert.deepEqual(firstPosition, { native: 3, 'ri-level-0': 3, 'ri-targeted': 3 }, 'First-run exposure must be counterbalanced.');

assert.equal(oracleFile.schemaVersion, '1.0');
assert.equal(oracleFile.mission, 'R9.4A');
assert.equal(oracleFile.oracles.length, 9);
const oracleIds = oracleFile.oracles.map(oracle => oracle.faultId);
assert.deepEqual([...oracleIds].sort(), [...ids].sort(), 'Every fault must have exactly one oracle.');
const biasCounts = oracleFile.oracles.reduce((counts, oracle) => {
  counts[oracle.biasClass] = (counts[oracle.biasClass] || 0) + 1;
  assert.equal(typeof oracle.truth, 'string');
  assert(Array.isArray(oracle.sourceFiles) && oracle.sourceFiles.length > 0);
  for (const sourceFile of oracle.sourceFiles) {
    assert(fs.existsSync(path.join(root, sourceFile)), `Missing oracle source file: ${sourceFile}`);
  }
  return counts;
}, {});
assert.deepEqual(biasCounts, {
  'analyzer-favorable': 3,
  'known-limit': 3,
  neutral: 3,
}, 'Corpus must include equal favorable, neutral and known-limit cases.');

const frozenText = JSON.stringify(manifest);
for (const prohibited of ['expectedWinner', 'expectedTimeSaved', 'expectedSpeedup']) {
  assert(!frozenText.includes(prohibited), `Protocol must not encode ${prohibited}.`);
}

assert.equal(template.schemaVersion, '1.0');
assert.equal(template.mission, 'R9.4A');
assert.equal(template.protocol.humanTimingOnly, true);
assert.equal(template.protocol.readOracleOnlyAfterAllModesForFault, true);
assert.deepEqual(template.runs, [], 'Committed result template must not contain fabricated runs.');

console.log(JSON.stringify({
  mission: manifest.mission,
  result: 'PASS',
  faults: manifest.faults.length,
  frameworks: countBy('framework'),
  categories: countBy('category'),
  firstRunCounterbalance: firstPosition,
  biasClasses: biasCounts,
  note: 'This validates the frozen study contract only; it does not claim Runtime Intelligence wins.',
}, null, 2));
