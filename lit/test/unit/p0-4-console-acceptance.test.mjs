import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntimeReport, buildRuntimeReportHtml } from '../../src/panel/runtime-panel-presentation.js';
import { shapeLegacyRuntimeReport } from '../../src/panel/legacy-report-privacy.js';
import { BrowserRuntimeSurface } from '../../src/integration/shared/browser-runtime-surface.js';
import { EvidenceStore } from '../../src/core/evidence-store.js';

test('console subscribers cannot recurse, buffer stays bounded and restart restores host state', async () => {
  const { LdsConsole } = await import('../../src/core/console.js?console-acceptance');
  const delivered = [];
  const console = {
    warn(...args) { delivered.push(['warn', ...args]); },
    error(...args) { delivered.push(['error', ...args]); },
    log() {},
  };
  const originalWarn = console.warn;
  const originalError = console.error;
  const hostBuffer = ['host'];
  const hostClear = () => {};
  const win = { document: {}, addEventListener() {}, console,
    __LDS_CONSOLE__: hostBuffer, __LDS_CONSOLE_CLEAR__: hostClear };
  let notifications = 0;
  const unsubscribe = LdsConsole.subscribe(() => {
    notifications += 1;
    console.error('observer log');
  });
  try {
    LdsConsole.attach(win);
    const buffer = win.__LDS_CONSOLE__;
    buffer.length = 0;
    console.warn('business log');
    assert.equal(notifications, 1);
    assert.deepEqual(delivered, [['error', 'observer log'], ['warn', 'business log']]);
    assert.equal(buffer.length, 1);
    assert.match(buffer[0].callStack, /p0-4-console-acceptance/);
    for (let i = 0; i < 205; i += 1) console.warn(`message ${i}`);
    assert.equal(buffer.length, 200);
    unsubscribe();
    LdsConsole.detach(win);
    assert.equal(console.warn, originalWarn);
    assert.equal(console.error, originalError);
    assert.equal(win.__LDS_CONSOLE__, hostBuffer);
    assert.equal(win.__LDS_CONSOLE_CLEAR__, hostClear);
    LdsConsole.attach(win);
    console.error('after restart');
    assert.equal(notifications, 206);
    LdsConsole.detach(win);
    assert.equal(console.warn, originalWarn);
    assert.equal(win.__LDS_CONSOLE__, hostBuffer);
  } finally { unsubscribe(); LdsConsole.detach(win); }
});

test('console teardown preserves a newer host patch and globals', async () => {
  const { LdsConsole } = await import('../../src/core/console.js?host-patch');
  const win = { document: {}, addEventListener() {}, console: { warn() {}, error() {}, log() {} } };
  LdsConsole.attach(win);
  const replacement = () => {};
  win.console.warn = replacement;
  win.__LDS_CONSOLE__ = ['new host buffer'];
  LdsConsole.detach(win);
  assert.equal(win.console.warn, replacement);
  assert.deepEqual(win.__LDS_CONSOLE__, ['new host buffer']);
});

test('console UREP rejects vendor-only stacks and removes subscription on restart', () => {
  const store = new EvidenceStore({ privacyPolicy: false });
  let listener;
  const consoleCapture = { attach() {}, detach() {}, subscribe(fn) {
    listener = fn;
    return () => { listener = null; };
  } };
  const win = { document: {}, addEventListener() {}, removeEventListener() {} };
  const surface = new BrowserRuntimeSurface({ store, windowTarget: win, consoleCapture,
    network: {}, vitals: {} });
  surface.start();
  listener({ level: 'error', message: 'vendor', callStack: 'Error\n at log (http://localhost/node_modules/react-dom/index.js:3:4)' });
  const event = store.snapshot().at(-1);
  assert.equal(event.source, null);
  assert.equal(event.evidence.level, 'observation');
  surface.stop();
  assert.equal(listener, null);
  surface.start();
  listener({ level: 'warn', message: 'business', callStack: 'Error\n at warnUser (D:/private/user/project/src/Feature.jsx:41:9)' });
  assert.equal(store.snapshot().length, 2);
  const attributed = store.snapshot().at(-1);
  assert.equal(attributed.source.file, 'src/Feature.jsx');
  assert.equal(attributed.evidence.level, 'attribution');
  surface.stop();
});

test('both legacy and normalized exports omit raw console/network stacks without losing UREP source', () => {
  const callStack = 'Error\n at warnUser (D:/private/user/project/src/Feature.jsx:41:9)';
  const baseReport = { console: [{ level: 'warn', message: 'stale', callStack }],
    network: [{ url: '/api', callStack }] };
  const event = { id: 'console-1', type: 'diagnostic', source: { file: 'src/Feature.jsx', line: 41, column: 9 },
    evidence: { level: 'attribution', attribution: 'source-attributed' },
    payload: { consoleMessage: true, stack: 'at warnUser (src/Feature.jsx:41:9)' } };
  const report = createRuntimeReport({ baseReport, store: { snapshot: () => [event] } });
  assert.equal(report.evidence[0].source.line, 41);
  assert.equal(report.legacyReport.console[0].message, 'stale');
  assert.doesNotMatch(JSON.stringify(report), /D:\/private|callStack/);
  assert.doesNotMatch(buildRuntimeReportHtml(report), /D:\/private|callStack/);
  assert.doesNotMatch(JSON.stringify(shapeLegacyRuntimeReport(baseReport)), /D:\/private|callStack/);
  assert.equal(baseReport.console[0].callStack, callStack);
});
