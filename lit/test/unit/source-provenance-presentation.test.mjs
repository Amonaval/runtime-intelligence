import test from 'node:test';
import assert from 'node:assert/strict';
import { decorateRuntimeOpportunity } from '../../src/panel/runtime-opportunities-model.js';
import { enrichPinpointIssueSource } from '../../src/panel/pinpoint-source-enrichment.js';

test('opportunity surfaces exact location, provenance meaning and bounded application stack', () => {
  const item = decorateRuntimeOpportunity({
    id: 'seq',
    kind: 'sequential-api-opportunity',
    occurrenceCount: 1,
    source: { file: 'lib/api-client.ts', line: 44, column: 11 },
    evidence: { level: 'attribution', attribution: 'source-attributed', confidence: 0.9 },
    payload: {
      callCount: 3,
      estimatedSavingsMs: 600,
      sourceProvenance: {
        kind: 'common-origin',
        precision: 'generated-runtime',
        frames: [
          { file: 'lib/api-client.ts', line: 44, column: 11, functionName: 'apiClient' },
          { file: 'components/NetworkApp.tsx', line: 187, column: 7, functionName: 'loadMembers' },
        ],
      },
    },
    recommendation: 'parallelize',
    synthetic: false,
  });

  assert.equal(item.sourceLabel, 'lib/api-client.ts:44:11');
  assert.equal(item.sourceProvenanceLabel, 'Common request origin');
  assert.equal(item.applicationFrames.length, 2);
  assert.equal(item.applicationFrames[1].file, 'components/NetworkApp.tsx');
});

test('network Pinpoint issue inherits latest failed request invocation without claiming root cause', () => {
  const event = {
    type: 'network.completed',
    source: { file: 'lib/api-client.ts', line: 44, column: 11 },
    evidence: { level: 'attribution' },
    payload: {
      isError: true,
      sourceProvenance: {
        kind: 'invocation',
        precision: 'generated-runtime',
        frames: [
          { file: 'lib/api-client.ts', line: 44, column: 11, functionName: 'apiClient' },
          { file: 'components/NetworkApp.tsx', line: 187, column: 7, functionName: 'loadMembers' },
        ],
      },
    },
  };
  const issue = {
    issueType: 'network-error',
    component: '(network)',
    filePath: '',
    details: 'GET /api/members -> 500',
    callStacks: [],
    evidenceLevel: 'observation',
  };
  const next = enrichPinpointIssueSource(issue, { snapshot: () => [event] });

  assert.equal(next.filePath, 'lib/api-client.ts');
  assert.match(next.details, /Latest failed request invocation: lib\/api-client\.ts:44:11/);
  assert.match(next.callStacks[0], /NetworkApp\.tsx:187:7/);
  assert.equal(next.evidenceLevel, 'attribution');
  assert.equal(next.sourceProvenance.kind, 'invocation');
});
