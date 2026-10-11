import test from 'node:test';
import assert from 'node:assert/strict';

import { ReactAdapter } from '../../src/adapter/react/ReactAdapter.js';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import {
  AttributionQuality,
  EvidenceLevel,
  RuntimeEventType,
} from '../../src/core/evidence-protocol.js';
import { SourceProvenanceKind } from '../../src/core/source-provenance.js';
import { UpdateBudgetMonitor } from '../../src/core/update-budget-monitor.js';
import {
  captureReactInvocationSource,
  captureReactRegistrationSource,
} from '../../src/react/react-source-provenance.js';
import { RuntimePanelEvidenceBridge } from '../../src/panel/runtime-evidence-bridge.js';
import { enrichPinpointIssueSource } from '../../src/panel/pinpoint-source-enrichment.js';
import { decorateRuntimeOpportunity } from '../../src/panel/runtime-opportunities-model.js';

const source = (file, line = null, column = null) => ({ file, line, column });
const provenance = (kind, file, line, column) => ({
  kind,
  basis: 'test',
  precision: 'source-location',
  frameCount: 1,
  frames: [{ file, line, column, functionName: 'test', generated: false, precision: 'source-location' }],
});

test('React registration refines filename-only source only from the same file', () => {
  const result = captureReactRegistrationSource({
    source: { file: 'components/NetworkApp.tsx' },
    stack: 'Error\n    at register (components/NetworkApp.tsx:321:17)',
    functionName: 'NetworkApp',
  });

  assert.equal(result.source.file, 'components/NetworkApp.tsx');
  assert.equal(result.source.line, 321);
  assert.equal(result.source.column, 17);
  assert.equal(result.provenance.kind, SourceProvenanceKind.COMPONENT_REGISTRATION);
});

test('React registration never borrows line/column from a different file', () => {
  const result = captureReactRegistrationSource({
    source: { file: 'components/NetworkApp.tsx' },
    stack: 'Error\n    at register (components/OtherPanel.tsx:44:9)',
    functionName: 'NetworkApp',
  });

  assert.equal(result.source.file, 'components/NetworkApp.tsx');
  assert.equal(result.source.line, null);
  assert.equal(result.source.column, null);
});

test('React invocation filtering skips Runtime Intelligence bundle frames', () => {
  const result = captureReactInvocationSource({
    stack: [
      'Error',
      '    at capture (http://localhost:3000/_next/static/chunks/runtime-intelligence.js:10:2)',
      '    at onClick (components/NetworkApp.tsx:188:7)',
    ].join('\n'),
  });

  assert.equal(result.source.file, 'components/NetworkApp.tsx');
  assert.equal(result.source.line, 188);
  assert.equal(result.source.column, 7);
  assert.equal(result.provenance.kind, SourceProvenanceKind.INVOCATION);
});

test('React Profiler inherits known boundary source without upgrading evidence semantics', () => {
  const store = new EvidenceStore({ maxEntries: 100, privacyPolicy: false });
  const adapter = new ReactAdapter({ store, profilingEnabled: true });
  const token = {};
  const boundarySource = source('components/NetworkApp.tsx', 300, 5);
  const boundaryProvenance = provenance('component-registration', 'components/NetworkApp.tsx', 300, 5);

  adapter.connect(token, {
    name: 'NetworkApp',
    source: boundarySource,
    sourceProvenance: boundaryProvenance,
  });
  const event = adapter.recordProfilerRender(token, { actualDuration: 12.5 });

  assert.equal(event.source.file, 'components/NetworkApp.tsx');
  assert.equal(event.source.line, 300);
  assert.equal(event.payload.sourceProvenance.kind, 'component-registration');
  assert.equal(event.evidence.level, EvidenceLevel.OBSERVATION);
  assert.equal(event.evidence.attribution, AttributionQuality.FRAMEWORK_REPORTED);
  assert.equal(event.correlation.causedByEventId ?? null, null);
});

test('update-budget diagnostic preserves upstream provenance but remains correlation', () => {
  const store = new EvidenceStore({ maxEntries: 100, privacyPolicy: false });
  const adapter = new ReactAdapter({ store, profilingEnabled: true });
  const monitor = new UpdateBudgetMonitor({
    store,
    budget: { countPerWindow: 1, windowMs: 1000 },
  }).start();
  const token = {};
  const boundarySource = source('components/NetworkApp.tsx', 300, 5);
  const boundaryProvenance = provenance('component-registration', 'components/NetworkApp.tsx', 300, 5);

  adapter.connect(token, {
    name: 'NetworkApp',
    source: boundarySource,
    sourceProvenance: boundaryProvenance,
  });
  adapter.recordProfilerRender(token, { actualDuration: 2 });
  adapter.recordProfilerRender(token, { actualDuration: 3 });

  const diagnostic = store.snapshot({ type: RuntimeEventType.DIAGNOSTIC })
    .find(event => event.payload?.budgetViolation === true);
  assert.ok(diagnostic);
  assert.equal(diagnostic.source.file, 'components/NetworkApp.tsx');
  assert.equal(diagnostic.payload.sourceProvenance.kind, 'component-registration');
  assert.equal(diagnostic.evidence.level, EvidenceLevel.CORRELATION);
  assert.equal(diagnostic.correlation.causedByEventId ?? null, null);
  monitor.stop();
});

test('resource lifetime diagnostic points to resource registration source', () => {
  const store = new EvidenceStore({ maxEntries: 100, privacyPolicy: false });
  const bridge = new RuntimePanelEvidenceBridge({ store, windowTarget: {} }).start();
  const adapter = new ReactAdapter({ store });
  const token = {};
  const boundarySource = source('components/NetworkApp.tsx', 300, 5);
  const registrationSource = source('hooks/useMembers.ts', 88, 13);
  const registrationProvenance = provenance('registration', 'hooks/useMembers.ts', 88, 13);

  adapter.connect(token, { name: 'NetworkApp', source: boundarySource });
  adapter.recordResourceAcquired(token, {
    resourceId: 'members-subscription',
    resourceType: 'subscription',
    source: registrationSource,
    sourceProvenance: registrationProvenance,
  });
  adapter.disconnect(token);

  const diagnostic = store.snapshot({ type: RuntimeEventType.DIAGNOSTIC })
    .find(event => event.payload?.resourceLifetimeViolation === true);
  assert.ok(diagnostic);
  assert.equal(diagnostic.source.file, 'hooks/useMembers.ts');
  assert.equal(diagnostic.source.line, 88);
  assert.equal(diagnostic.payload.sourceProvenance.kind, 'registration');
  assert.equal(diagnostic.evidence.level, EvidenceLevel.LIFETIME_VIOLATION);
  bridge.stop();
});

test('Pinpoint chooses issue-relevant React evidence rather than unrelated later owner evidence', () => {
  const update = {
    type: RuntimeEventType.UPDATE_COMPLETED,
    owner: { name: 'NetworkApp' },
    source: source('components/NetworkApp.tsx', 412, 9),
    evidence: { level: 'observation' },
    payload: {
      sourceProvenance: provenance('component-registration', 'components/NetworkApp.tsx', 412, 9),
    },
  };
  const unrelated = {
    type: RuntimeEventType.OWNER_CREATED,
    owner: { name: 'NetworkApp' },
    source: source('components/NetworkApp.tsx', 999, 1),
    evidence: { level: 'observation' },
    payload: {},
  };
  const issue = {
    issueType: 'slow-render',
    component: 'NetworkApp',
    filePath: '',
    details: 'Slow render',
    callStacks: [],
    evidenceLevel: 'observation',
  };

  const enriched = enrichPinpointIssueSource(issue, { snapshot: () => [update, unrelated] });
  assert.equal(enriched.sourceLocation.line, 412);
  assert.match(enriched.details, /Component boundary: components\/NetworkApp\.tsx:412:9/);
});

test('Opportunities labels component registration as a boundary, not a root cause', () => {
  const item = decorateRuntimeOpportunity({
    id: 'render-budget',
    kind: 'update-budget-opportunity',
    source: source('components/NetworkApp.tsx', 300, 5),
    evidence: { level: 'correlation' },
    payload: {
      updateCount: 10,
      windowMs: 100,
      countPerWindow: 5,
      sourceProvenance: provenance('component-registration', 'components/NetworkApp.tsx', 300, 5),
    },
  });

  assert.equal(item.sourceProvenanceLabel, 'Component boundary');
  assert.equal(item.sourceLabel, 'components/NetworkApp.tsx:300:5');
});
