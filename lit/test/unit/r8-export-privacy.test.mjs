import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceStore } from '../../src/core/evidence-store.js';
import { sanitizeForExport, createPrivacyPolicy, PrivacyAction } from '../../src/core/enterprise-privacy.js';
import { createRuntimeReport, buildRuntimeReportHtml } from '../../src/panel/runtime-panel-presentation.js';
import { shapeLegacyRuntimeReport } from '../../src/panel/legacy-report-privacy.js';

test('prose URL masking terminates for plain URLs and explicit KEEP policy', () => {
  assert.equal(sanitizeForExport({ message: 'At https://app.example/View.js' }).message, 'At https://app.example/View.js');
  const keep = createPrivacyPolicy({ urlQuery: PrivacyAction.KEEP });
  assert.equal(sanitizeForExport({ message: 'At https://app.example/View.js?mode=debug' }, keep).message, 'At https://app.example/View.js?mode=debug');
});

test('all canonical/legacy JSON and HTML export branches scrub secrets without mutating inputs', () => {
  const secret = 'super-secret-fixture';
  const base = { sessionId: secret, console: [{ message: `User user@example.com Bearer ${secret} at https://api.example/items?token=${secret}`, callStack: '/Users/private/path' }], network: [{ fullUrl: `https://api.example/items?token=${secret}`, headers: { Authorization: secret }, requestBody: { password: secret }, callStack: '/home/private/path' }] };
  const original = JSON.stringify(base);
  const rawStore = { snapshot: () => [{ id: 'e1', type: 'error', framework: { name: 'react' }, correlation: { traceId: secret }, source: { file: 'src/View.jsx', line: 10 }, payload: { message: `Bearer ${secret}`, token: secret } }] };
  const report = createRuntimeReport({ baseReport: base, store: rawStore, note: 'user@example.com', windowTarget: { __LDS_INTELLIGENCE__: { secret }, __LDS_INTELLIGENCE_PIPELINE__: { exportCapsule: () => ({ password: secret }) } } });
  for (const result of [JSON.stringify(report), buildRuntimeReportHtml(report), JSON.stringify(shapeLegacyRuntimeReport(base))]) {
    assert(!result.includes(secret)); assert(!result.includes('user@example.com')); assert(!result.includes('/Users/private')); assert(!result.includes('/home/private'));
  }
  assert.equal(report.evidence[0].source.file, 'src/View.jsx');
  assert.equal(report.evidence[0].source.line, 10);
  assert.equal(Object.isFrozen(report.evidence), true);
  assert.equal(Object.isFrozen(report.evidence[0].source), true);
  assert.equal(report.exportPrivacy.enforced, true);
  assert(report.exportPrivacy.redacted > 0);
  assert.equal(JSON.stringify(base), original);
});

test('default bounded store exports all 1000 events and larger inputs disclose truncation', () => {
  const store = new EvidenceStore();
  for (let i = 0; i < 1000; i++) store.emit({ type: 'interaction', payload: { kind: 'click' } });
  const report = createRuntimeReport({ store });
  assert.equal(report.evidence.length, 1000);
  assert.equal(report.summary.evidenceCount, 1000);
  const larger = createRuntimeReport({ store: { snapshot: () => [...store.snapshot(), ...store.snapshot()] } });
  assert.equal(larger.evidence.length, 1000);
  assert.equal(larger.summary.evidenceCount, 2000);
  assert(larger.exportPrivacy.truncated > 0);
});

test('standalone HTML renderer scrubs input and escapes count fields', () => {
  const attack = '<img src=x onerror=alert(1)>';
  const html = buildRuntimeReportHtml({ framework: 'react', note: 'Bearer secret-fixture', summary: { evidenceCount: attack }, normalizedFindings: [{ occurrenceCount: attack, message: attack }], legacyReport: { password: 'secret-fixture' } });
  assert(!html.includes('secret-fixture'));
  assert(!html.includes(attack));
  assert(html.includes('&lt;img'));
});
