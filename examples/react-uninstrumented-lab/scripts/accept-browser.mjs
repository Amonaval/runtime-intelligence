import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Optional validation tooling; never shipped in the product's packed files.
// npm install --no-save playwright in this lab, then npx playwright install chromium.
const { chromium } = await import(process.env.RI_PLAYWRIGHT_MODULE || 'playwright');
const lab = fileURLToPath(new URL('..', import.meta.url));
const output = path.resolve(process.argv[2] || '.browser-acceptance');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--strictPort', '--port', '4181'], { cwd: lab });
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Vite startup timeout')), 15000);
    server.stdout.on('data', data => {
      if (data.toString().includes('Local:')) { clearTimeout(timer); resolve(); }
    });
    server.once('error', reject);
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Vite exited: ${code}`)); });
    server.stderr.on('data', data => process.stderr.write(data));
  });
  browser = await chromium.launch({
    headless: true,
    ...(process.env.RI_CHROMIUM_EXECUTABLE ? { executablePath: process.env.RI_CHROMIUM_EXECUTABLE } : {}),
    ...(process.env.RI_CHROMIUM_ARGS ? { args: JSON.parse(process.env.RI_CHROMIUM_ARGS) } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(10000);
  const consoleOutput = [];
  page.on('console', message => consoleOutput.push({ type: message.type(), text: message.text() }));
  await page.goto('http://127.0.0.1:4181');
  await page.waitForFunction(() => !!window.__UNINSTRUMENTED_LAB_PANEL__);
  await page.evaluate(() => window.__UNINSTRUMENTED_LAB_PANEL__.setCollapsed(true));
  const click = name => page.getByRole('button', { name, exact: true }).click();
  const report = () => page.evaluate(() => window.__UNINSTRUMENTED_LAB_PANEL__.createReport());
  const reactPackage = JSON.parse(await readFile(path.join(lab, 'node_modules/react/package.json'), 'utf8'));
  const receipt = { browser: browser.version(), framework: `React ${reactPackage.version}`, checkedAt: new Date().toISOString(), scenarios: [], checks: {} };
  await click('HTTP 503');
  await page.waitForFunction(() => document.querySelector('[data-scenario="errors"] output')?.textContent.includes('handled HTTP failure: 503'));
  await click('Unhandled rejection');
  await click('Console burst');
  await page.waitForTimeout(150);
  const first = await report();
  const messages = first.diagnostics.filter(event => event.payload.consoleMessage);
  assert.equal(messages.length, 4, 'StrictMode must not duplicate console subscriptions');
  for (const event of messages) {
    assert.equal(event.source.file, 'src/app/components/FailureCenter.jsx');
    assert.ok(event.source.line > 0 && event.source.column > 0);
    assert.ok(['requestFailure', 'emitNoise'].includes(event.source.functionName));
    assert.equal(event.evidence.level, 'attribution');
    assert.equal(event.evidence.attribution, 'source-attributed');
    assert.equal(event.payload.sourceProvenance.basis, 'console-call-stack');
    assert.equal(event.payload.sourceProvenance.kind, 'invocation');
    // Vite/esbuild executes transformed JSX: these are module coordinates, not original JSX lines.
    assert.equal(event.payload.sourceProvenance.precision, 'module-location');
  }
  assert.ok(messages.some(event => event.payload.level === 'warn'));
  assert.ok(messages.some(event => event.payload.level === 'error'));
  assert.ok(consoleOutput.some(message => message.type === 'warning' && message.text.includes('Inventory')));
  assert.ok(consoleOutput.some(message => message.type === 'error' && message.text.includes('Checkout dependency failed')));
  const rejection = first.evidence.find(event => event.type === 'error' && event.payload.phase === 'unhandledrejection');
  assert.equal(rejection.source.functionName, 'rejectUnhandled');
  assert.equal(rejection.source.file, 'src/app/components/FailureCenter.jsx');
  const failure = first.evidence.find(event => event.type === 'network.completed' && event.payload.status === 503);
  assert.equal(failure.source.file, 'src/app/services/orders-api.js');
  receipt.consoleSources = messages.map(event => ({ level: event.payload.level, source: event.source, provenance: event.payload.sourceProvenance }));
  receipt.scenarios.push({ scenario: 'HTTP failure', category: 'A', source: failure.source },
    { scenario: 'Unhandled rejection', category: 'A', source: rejection.source },
    { scenario: 'Console noise', category: 'A', source: messages.at(-1).source });
  await click('Open order workspace');
  await page.waitForFunction(() => document.querySelector('[data-scenario="api-waterfall"] output')?.textContent.includes('loaded'));
  const waterfall = (await report()).evidence.filter(event => event.type === 'network.completed' && /\/(order|customer|pricing)/.test(event.payload.path));
  assert.equal(waterfall.length, 3);
  assert.ok(waterfall.every(event => event.source?.file === 'src/app/services/orders-api.js'));
  receipt.scenarios.push({ scenario: 'Sequential API waterfall', category: 'A', sources: waterfall.map(event => event.source) });
  await page.getByRole('textbox', { name: 'Catalog search' }).fill('Product');
  await page.waitForTimeout(150);
  await click('Render 900 rows');
  await page.waitForTimeout(600);
  await click('Run render storm');
  await page.waitForFunction(() => document.querySelector('[data-scenario="render-storm"] output')?.textContent.includes('14'));
  await click('Generate heavy report');
  await page.waitForFunction(() => document.querySelector('[data-scenario="worker-candidate"] output')?.textContent.includes('processed 1600'));
  await page.waitForTimeout(300);
  const performanceReport = await report();
  const renders = performanceReport.evidence.filter(event => event.type === 'component.update.completed');
  assert.ok(renders.some(event => event.payload.actualDurationMs > 60));
  assert.ok(renders.every(event => event.source === null && event.evidence.level === 'observation'));
  const virtualization = performanceReport.opportunities.filter(event => event.kind === 'virtualization-opportunity');
  const workers = performanceReport.opportunities.filter(event => event.kind === 'worker-opportunity');
  assert.ok(virtualization.length > 0);
  assert.ok(workers.length > 0);
  receipt.scenarios.push({ scenario: 'Slow child render', category: 'B', rootProfilerSource: null },
    { scenario: 'Render storm', category: 'B', rootProfilerSource: null },
    { scenario: 'Oversized list', category: 'B', source: virtualization[0].source },
    { scenario: 'Heavy main-thread report', category: 'B', source: workers[0].source });
  await click('Run stale-result race');
  await page.waitForFunction(() => document.querySelector('[data-scenario="async-race"] output')?.textContent.includes('older-slow-result'));
  await click('Mount leaky child');
  await click('Unmount leaky child');
  const final = await report();
  assert.ok(!final.diagnostics.some(event => event.payload.resourceLifetimeViolation));
  receipt.scenarios.push({ scenario: 'Resource leak ownership', category: 'C', reason: 'No resource registration or child ownership evidence' },
    { scenario: 'Stale async business race', category: 'C', reason: 'Requests are observable; state-write ordering and business intent are not' });
  receipt.performance = { renderCount: renders.length, maxRootActualDurationMs: Math.max(...renders.map(event => event.payload.actualDurationMs)), opportunityKinds: [...new Set(performanceReport.opportunities.map(event => event.kind))] };
  // R9: exercise visible developer guidance against real, uninstrumented faults.
  const sourceLimited = final.normalizedFindings.find(item => item.kind === 'slow-render' && !item.source);
  assert.equal(sourceLimited.developerGuidance.adoptionLevel, 1);
  assert.match(sourceLimited.developerGuidance.whatNext, /RuntimeIntelligenceProfiler/);
  const attributed = final.normalizedFindings.find(item => item.kind === 'runtime-error' && item.source);
  assert.match(attributed.developerGuidance.whySource, /error stack/);
  await page.evaluate(() => {
    const panel = window.__UNINSTRUMENTED_LAB_PANEL__;
    panel.setCollapsed(false);
    panel.element._setTab('pinpoint');
  });
  const panelElement = page.locator('lds-debug-panel');
  await panelElement.locator('.issue-header').first().click();
  await panelElement.locator('.finding-guidance').first().waitFor();
  assert.match(await panelElement.locator('.finding-guidance').first().innerText(), /Why this source\?/);
  assert.match(await panelElement.locator('.finding-guidance').first().innerText(), /What next\?/);
  await page.evaluate(() => window.__UNINSTRUMENTED_LAB_PANEL__.element._setTab('opportunities'));
  const guidance = panelElement.locator('details.finding-guidance').first();
  await guidance.locator('summary').click();
  assert.match(await guidance.innerText(), /Adoption level/);
  assert.match(await guidance.innerText(), /do not by themselves prove/);
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: path.join(output, 'r9-guidance.png') });
  receipt.r9Adoption = { pinpointGuidanceVisible: true, opportunitiesGuidanceVisible: true, rootOnlyRenderRecommendsLevel1: true, errorOriginExplained: true };
  await page.evaluate(() => window.__UNINSTRUMENTED_LAB_PANEL__.setCollapsed(true));
  receipt.reactDevMetadata = await page.evaluate(() => {
    const host = document.querySelector('.result-row');
    const key = Object.keys(host).find(key => key.startsWith('__reactFiber$'));
    const chain = [];
    for (let fiber = host[key], count = 0; fiber && count < 30; fiber = fiber.return, count += 1) {
      const name = fiber.type?.displayName || fiber.type?.name;
      if (name) chain.push({ name, debugSource: fiber._debugSource || null, actualDuration: fiber.actualDuration ?? null });
    }
    return chain;
  });
  await page.evaluate(root => { window.__RI_REPO_ROOT__ = root; }, path.resolve(lab, '../..'));
  const lifecycle = await page.evaluate(async () => {
    const runtime = window.__UNINSTRUMENTED_LAB_RUNTIME__;
    const store = window.__UNINSTRUMENTED_LAB_STORE__;
    const count = () => store.snapshot().filter(event => event.payload.consoleMessage).length;
    const before = count();
    runtime.stop();
    const originalWarn = console.warn;
    const originalError = console.error;
    console.warn('stopped runtime');
    if (count() !== before) throw new Error('Console subscriber survived stop');
    const hostBuffer = ['host buffer'];
    const hostClear = () => {};
    window.__LDS_CONSOLE__ = hostBuffer;
    window.__LDS_CONSOLE_CLEAR__ = hostClear;
    runtime.start(); runtime.start();
    console.warn('restart acceptance');
    if (count() !== before + 1) throw new Error('Duplicate restart subscriber');
    for (let i = 0; i < 205; i += 1) console.warn(`bounded-${i}`);
    if (window.__LDS_CONSOLE__.length !== 200) throw new Error('Unbounded console buffer');
    const { LdsConsole } = await import('/@fs' + window.__RI_REPO_ROOT__ + '/lit/src/core/console.js');
    let notifications = 0;
    const unsubscribe = LdsConsole.subscribe(() => { notifications += 1; console.error('subscriber logging'); });
    console.warn('recursion acceptance'); unsubscribe();
    if (notifications !== 1) throw new Error('Recursive subscriber');
    runtime.stop();
    if (console.warn !== originalWarn || console.error !== originalError) throw new Error('Console patch not restored');
    if (window.__LDS_CONSOLE__ !== hostBuffer || window.__LDS_CONSOLE_CLEAR__ !== hostClear) throw new Error('Host state not restored');
    delete window.__LDS_CONSOLE__; delete window.__LDS_CONSOLE_CLEAR__;
    return { restartSingleEmission: true, subscribersRemoved: true, bufferBound: 200, recursionGuard: true, originalMethodsRestored: true, hostStateRestored: true };
  });
  receipt.checks = lifecycle;
  // Export after restart as well as retaining the earlier hostile scenario snapshot.
  await page.evaluate(() => window.__UNINSTRUMENTED_LAB_PANEL__.setCollapsed(true));
  await page.evaluate(() => window.__UNINSTRUMENTED_LAB_RUNTIME__.start());
  await page.evaluate(() => window.__LDS_CONSOLE__.push({
    level: 'warn', message: 'raw-stack export privacy fixture', ts: new Date().toISOString(),
    callStack: 'Error\n at fixture (D:/private-user/project/src/Feature.jsx:41:9)\n at fixture (/Users/private-user/project/src/Feature.jsx:41:9)',
  }));
  const download = page.waitForEvent('download');
  await page.evaluate(() => window.__UNINSTRUMENTED_LAB_PANEL__.downloadJson());
  const exported = await download;
  await mkdir(output, { recursive: true });
  const exportPath = path.join(output, 'console-export.json');
  await exported.saveAs(exportPath);
  const exportText = await readFile(exportPath, 'utf8');
  const exportedReport = JSON.parse(exportText);
  assert.doesNotMatch(exportText, /D:\/private-user|\/Users\/private-user/);
  assert.ok(exportedReport.diagnostics.some(event => event.payload.consoleMessage && event.source?.file === 'src/app/components/FailureCenter.jsx'));
  assert.ok((exportedReport.legacyReport.console || []).every(entry => !('callStack' in entry)));
  assert.ok((exportedReport.legacyReport.network || []).every(entry => !('callStack' in entry)));
  receipt.checks.exportRawStacksOmitted = true;
  receipt.checks.urepSourceRetained = true;
  const htmlDownload = page.waitForEvent('download');
  await page.evaluate(() => window.__UNINSTRUMENTED_LAB_PANEL__.downloadHtml());
  const exportedHtml = await htmlDownload;
  const htmlPath = path.join(output, 'console-export.html');
  await exportedHtml.saveAs(htmlPath);
  const htmlText = await readFile(htmlPath, 'utf8');
  assert.doesNotMatch(htmlText, /D:\/private-user|\/Users\/private-user/);
  assert.match(htmlText, /console-call-stack/);
  assert.match(htmlText, /Why this source\?/);
  assert.match(htmlText, /What next\?/);
  assert.ok(exportedReport.normalizedFindings.every(item => item.developerGuidance?.whySource && item.developerGuidance?.whatNext));
  receipt.r9Adoption.jsonGuidanceRetained = true;
  receipt.r9Adoption.htmlGuidanceRetained = true;
  receipt.checks.exportHtmlRawStacksOmitted = true;
  await writeFile(path.join(output, 'hostile-report.json'), JSON.stringify(final, null, 2));
  await writeFile(path.join(output, 'acceptance.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await browser?.close();
  server.kill();
}
