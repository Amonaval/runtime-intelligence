import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/summarize-r9.4a-value-proof.mjs <results.json>');
  process.exit(2);
}

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'benchmarks/value-proof/faults.json'), 'utf8'));
const results = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
assert.equal(results.schemaVersion, '1.0');
assert.equal(results.mission, 'R9.4A');
assert(results.participant?.id && !results.participant.id.startsWith('replace-'), 'Record a real participant id.');
assert(results.environment?.commit && !results.environment.commit.startsWith('record-'), 'Record the tested commit SHA.');

const modeIds = manifest.runModes.map(mode => mode.id);
const faults = new Map(manifest.faults.map(fault => [fault.id, fault]));
const expectedCount = manifest.faults.length * modeIds.length;
assert.equal(results.runs.length, expectedCount, `Expected ${expectedCount} runs for one complete pilot participant.`);

const sourceOutcomes = new Set(['exact-original','exact-generated','file-only','boundary-only','contextual','unavailable','wrong']);
const diagnosisOutcomes = new Set(['actionable-correct','useful-direction','symptom-only','wrong','none']);
const actionOutcomes = new Set(['specific-change','targeted-investigation','generic','none']);
const verificationOutcomes = new Set(['supported-useful','manual-useful','unsupported-honest','misleading','not-applicable']);
const trustViolations = new Set(['none','wrong-source-presented-as-exact','generated-source-presented-as-original','correlation-presented-as-causality','unsupported-ownership-presented-as-proven','other']);
const reuseOutcomes = new Set(['yes','maybe','no']);
const seen = new Set();
const nonNegative = (value, name) => assert(Number.isFinite(value) && value >= 0, `${name} must be non-negative.`);
const nullableTime = (run, field, reasonField) => {
  const value = run[field];
  if (value == null) {
    assert(typeof run[reasonField] === 'string' && run[reasonField].trim(), `${run.faultId}/${run.mode}: ${reasonField} required when ${field} is null.`);
    return;
  }
  nonNegative(value, `${run.faultId}/${run.mode}:${field}`);
};

for (const run of results.runs) {
  const fault = faults.get(run.faultId);
  assert(fault, `Unknown fault: ${run.faultId}`);
  assert(modeIds.includes(run.mode), `Unknown mode: ${run.mode}`);
  const key = `${run.faultId}::${run.mode}`;
  assert(!seen.has(key), `Duplicate run: ${key}`);
  seen.add(key);
  assert.equal(run.orderIndex, fault.runOrder.indexOf(run.mode) + 1, `${key}: orderIndex does not match frozen counterbalance.`);
  assert.equal(run.humanMeasured, true, `${key}: timing/results must be human-measured, not generated.`);
  assert(['completed','aborted'].includes(run.status));
  nullableTime(run, 'elapsedToRelevantSourceMs', 'relevantSourceNotReachedReason');
  nullableTime(run, 'elapsedToActionableDiagnosisMs', 'actionableDiagnosisNotReachedReason');
  assert(sourceOutcomes.has(run.sourceOutcome), `${key}: invalid sourceOutcome`);
  assert(diagnosisOutcomes.has(run.diagnosisOutcome), `${key}: invalid diagnosisOutcome`);
  assert(actionOutcomes.has(run.actionOutcome), `${key}: invalid actionOutcome`);
  assert(verificationOutcomes.has(run.verificationOutcome), `${key}: invalid verificationOutcome`);
  assert(trustViolations.has(run.trustViolation), `${key}: invalid trustViolation`);
  assert(reuseOutcomes.has(run.wouldUseAgain), `${key}: invalid wouldUseAgain`);
  for (const metric of ['shown','useful','irrelevant','falsePositive']) nonNegative(run.findings?.[metric], `${key}:findings.${metric}`);
  nonNegative(run.instrumentation?.filesChanged, `${key}:instrumentation.filesChanged`);
  nonNegative(run.instrumentation?.linesChanged, `${key}:instrumentation.linesChanged`);
  assert.equal(run.oracleReview?.performedAfterRun, true, `${key}: oracle review must happen after the run.`);
}

const median = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const usefulSource = new Set(['exact-original','exact-generated','file-only','boundary-only']);
const usefulDiagnosis = new Set(['actionable-correct','useful-direction']);
const usefulAction = new Set(['specific-change','targeted-investigation']);

const byMode = {};
for (const mode of modeIds) {
  const runs = results.runs.filter(run => run.mode === mode);
  const sourceTimes = runs.map(run => run.elapsedToRelevantSourceMs).filter(Number.isFinite);
  const diagnosisTimes = runs.map(run => run.elapsedToActionableDiagnosisMs).filter(Number.isFinite);
  byMode[mode] = {
    runs: runs.length,
    usefulSourceRuns: runs.filter(run => usefulSource.has(run.sourceOutcome)).length,
    usefulDiagnosisRuns: runs.filter(run => usefulDiagnosis.has(run.diagnosisOutcome)).length,
    usefulActionRuns: runs.filter(run => usefulAction.has(run.actionOutcome)).length,
    oracleMatchedRuns: runs.filter(run => run.oracleReview.matched === true).length,
    sourceReachedRuns: sourceTimes.length,
    diagnosisReachedRuns: diagnosisTimes.length,
    medianTimeToRelevantSourceMs: median(sourceTimes),
    medianTimeToActionableDiagnosisMs: median(diagnosisTimes),
    irrelevantFindings: runs.reduce((sum, run) => sum + run.findings.irrelevant, 0),
    falsePositiveFindings: runs.reduce((sum, run) => sum + run.findings.falsePositive, 0),
    trustViolations: runs.filter(run => run.trustViolation !== 'none').map(run => ({ faultId: run.faultId, violation: run.trustViolation })),
    wouldUseAgain: {
      yes: runs.filter(run => run.wouldUseAgain === 'yes').length,
      maybe: runs.filter(run => run.wouldUseAgain === 'maybe').length,
      no: runs.filter(run => run.wouldUseAgain === 'no').length,
    },
    medianInstrumentationFilesChanged: median(runs.map(run => run.instrumentation.filesChanged)),
    medianInstrumentationLinesChanged: median(runs.map(run => run.instrumentation.linesChanged)),
  };
}

const summary = {
  mission: 'R9.4A',
  studyId: results.studyId,
  participantId: results.participant.id,
  testedCommit: results.environment.commit,
  byMode,
  criticalTrustPass: Object.values(byMode).every(row => row.trustViolations.length === 0),
  interpretation: [
    'No automatic product winner is declared by this script.',
    'Timing medians include only runs where the milestone was actually reached; always read the reached-run counts beside them.',
    'R9.4A is a one-participant protocol/value pilot. A promising result still requires independent or real-consumer validation.',
  ],
};

if (process.env.RI_VALUE_PROOF_SUMMARY) {
  fs.writeFileSync(process.env.RI_VALUE_PROOF_SUMMARY, JSON.stringify(summary, null, 2) + '\n');
}
console.log(JSON.stringify(summary, null, 2));
