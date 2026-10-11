import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { runNpm } from './lib/npm-runner.mjs';

// Tests exact versions from an actual packed artifact, not peer-range assumptions.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(path.join(tmpdir(), 'ri-r8-matrix-'));
const receipt = { schemaVersion: 1, checkedAt: new Date().toISOString(), scope: 'Exact-version packed-artifact build and optional Chromium lifecycle smoke; no full framework range or browser matrix claim', rows: [] };
function run(args, cwd) {
  try {
    return runNpm(args, { cwd, timeout: 180000, env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' } });
  } catch (error) {
    throw new Error(`npm ${args[0]} failed: ${(error.stderr?.toString() || error.stdout?.toString() || error.message || '').slice(-2500)}`);
  }
}
let browser = null;
let chromiumFactory = null;
let browserOptions = null;
const browserRequested = !!process.env.RI_CHROMIUM_EXECUTABLE;
try {
  const packed = JSON.parse(run(['pack', '--json', '--ignore-scripts', '--pack-destination', work], root));
  const archive = path.join(work, packed[0].filename);
  const coreDir = path.join(work, 'without-framework-peers');
  mkdirSync(coreDir);
  writeFileSync(path.join(coreDir, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: { 'runtime-intelligence': `file:${archive}` } }));
  run(['install', '--ignore-scripts', '--omit=peer', '--no-audit', '--no-fund'], coreDir);
  assert.equal(existsSync(path.join(coreDir, 'node_modules', 'react')), false);
  assert.equal(existsSync(path.join(coreDir, 'node_modules', 'vue')), false);
  writeFileSync(path.join(coreDir, 'isolation.mjs'), `import assert from 'node:assert/strict'; import { loadRuntimeIntelligence } from 'runtime-intelligence/loader'; import { EvidenceStore } from 'runtime-intelligence/core'; import { LitAdapter } from 'runtime-intelligence/lit'; assert.equal((await loadRuntimeIntelligence({enabled:false,framework:'react'})).enabled,false); assert.equal(new EvidenceStore().size(),0); assert.equal(new LitAdapter().framework,'lit');`);
  const isolated = spawnSync(process.execPath, ['isolation.mjs'], { cwd: coreDir, encoding: 'utf8', timeout: 30000 });
  assert.equal(isolated.status, 0, isolated.stderr || isolated.error?.message);
  receipt.peerIsolation = { result: 'PASS', missingPeers: ['react', 'vue'], imported: ['loader (disabled)', 'core', 'lit'] };
  if (browserRequested) {
    const modulePath = process.env.RI_PLAYWRIGHT_MODULE;
    if (!modulePath) throw new Error('RI_PLAYWRIGHT_MODULE must name the Playwright module when RI_CHROMIUM_EXECUTABLE is set.');
    const imported = await import(pathToFileURL(modulePath).href);
    chromiumFactory = imported.chromium || imported.default?.chromium;
    browserOptions = { executablePath: process.env.RI_CHROMIUM_EXECUTABLE, headless: true, args: JSON.parse(process.env.RI_CHROMIUM_ARGS || '["--no-sandbox"]') };
  }
  for (const versions of [{ react: '18.3.1', vue: '3.3.13', lit: '3.0.2' }, { react: '19.0.0', vue: '3.5.13', lit: '3.3.3' }]) {
    const row = { requested: versions, installed: {}, build: 'NOT EXECUTED', disabledBundle: 'NOT EXECUTED', browser: 'NOT EXECUTED' };
    receipt.rows.push(row);
    const dir = path.join(work, `react-${versions.react}`);
    mkdirSync(dir);
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: { 'runtime-intelligence': `file:${archive}`, react: versions.react, 'react-dom': versions.react, vue: versions.vue, lit: versions.lit, vite: '5.4.21' } }));
    run(['install', '--ignore-scripts', '--no-audit', '--no-fund'], dir);
    for (const dependency of ['react', 'react-dom', 'vue', 'lit', 'vite', 'runtime-intelligence']) row.installed[dependency] = JSON.parse(readFileSync(path.join(dir, 'node_modules', dependency, 'package.json'), 'utf8')).version;
    for (const dependency of ['react', 'vue', 'lit']) assert.equal(row.installed[dependency], versions[dependency]);
    for (const mode of ['smoke', 'disabled']) {
      copyFileSync(path.join(root, 'scripts', 'fixtures', `r8-${mode}.js`), path.join(dir, `${mode}.js`));
      writeFileSync(path.join(dir, `${mode}.html`), `<div id="react"></div><div id="vue"></div><div id="lit"></div><script type="module" src="/${mode}.js"></script>`);
    }
    writeFileSync(path.join(dir, 'vite.config.js'), `import { defineConfig } from 'vite'; export default defineConfig({build:{target:'esnext',manifest:true,rollupOptions:{input:{smoke:'smoke.html',disabled:'disabled.html'}}}});`);
    run(['exec', '--', 'vite', 'build'], dir);
    row.build = 'PASS';
    const dist = path.join(dir, 'dist');
    const manifest = JSON.parse(readFileSync(path.join(dist, '.vite', 'manifest.json'), 'utf8'));
    const disabledEntry = manifest['disabled.html'];
    assert.ok(disabledEntry?.file);
    const visited = new Set();
    function inspectStatic(key) {
      if (visited.has(key)) return;
      visited.add(key);
      const entry = manifest[key];
      assert.ok(entry);
      const code = readFileSync(path.join(dist, entry.file), 'utf8');
      assert.doesNotMatch(code, /__LDS_|class EvidenceStore|lds-debug-panel|installVueRuntimeIntelligence/, `Disabled static bundle contains runtime implementation: ${entry.file}`);
      for (const dependency of entry.imports || []) inspectStatic(dependency);
    }
    inspectStatic('disabled.html');
    row.disabledBundle = 'PASS';
    row.disabledStaticChunks = visited.size;
    if (!chromiumFactory) continue;
    browser = await chromiumFactory.launch(browserOptions);
    const server = createServer((req, res) => {
      const file = path.join(dist, new URL(req.url, 'http://localhost').pathname);
      if (!file.startsWith(dist + path.sep) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
      res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
      res.end(readFileSync(file));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    const context = await browser.newContext();
    let devServer = null;
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => { window.r8Original = { fetch: window.fetch, warn: console.warn, error: console.error, open: XMLHttpRequest.prototype.open, send: XMLHttpRequest.prototype.send }; });
      await page.goto(`${url}/disabled.html`);
      await page.waitForFunction(() => window.r8DisabledResult);
      assert.deepEqual(await page.evaluate(() => ({ enabled: window.r8DisabledResult.enabled, globals: Object.keys(window).filter(key => key.startsWith('__LDS_')), unchanged: window.fetch === window.r8Original.fetch && console.warn === window.r8Original.warn && console.error === window.r8Original.error && XMLHttpRequest.prototype.open === window.r8Original.open && XMLHttpRequest.prototype.send === window.r8Original.send })), { enabled: false, globals: [], unchanged: true });
      const vite = await import(pathToFileURL(path.join(dir, 'node_modules/vite/dist/node/index.js')).href);
      devServer = await vite.createServer({ root: dir, server: { host: '127.0.0.1', port: 0 } });
      await devServer.listen();
      const devUrl = `http://127.0.0.1:${devServer.httpServer.address().port}`;
      await page.goto(`${devUrl}/smoke.html`);
      await page.locator('#react-update').waitFor();
      for (const framework of ['react', 'vue', 'lit']) {
        await page.locator(`#${framework}-update`).click();
        await page.locator(`#${framework}-update`).filter({ hasText: '1' }).waitFor();
      }
      const before = await page.evaluate(() => window.r8Snapshot());
      row.evidence = {};
      for (const framework of ['react', 'vue', 'lit']) {
        const events = before.filter(event => event.framework.name === framework);
        assert.ok(events.some(event => event.type === 'owner.created'), `${framework} owner lifecycle absent`);
        assert.ok(events.some(event => event.type === 'component.update.completed'), `${framework} update absent`);
        row.evidence[framework] = { events: events.length, created: events.filter(event => event.type === 'owner.created').length };
      }
      const report = await page.evaluate(() => window.r8Export());
      const exported = JSON.stringify(report);
      assert.equal(report.schemaVersion, 'runtime-intelligence-report/1');
      assert.ok(report.evidence.length > 0);
      assert.ok(report.exportPrivacy.enforced);
      assert.match(exported, /https:\/\/example\.test\/plain/);
      assert.doesNotMatch(exported, /private-matrix-secret|raw-stack-must-not-export|\"callStack\"/);
      row.exportPrivacy = 'PASS (export-only URL and raw-stack canaries)';
      await page.evaluate(() => window.r8Unmount());
      await page.waitForFunction(() => ['react', 'vue', 'lit'].every(name => window.r8Snapshot().some(event => event.framework.name === name && event.type === 'owner.destroyed')));
      assert.deepEqual(errors, []);
      row.browser = 'PASS';
      row.browserModes = { lifecycle: 'Vite development (React Profiler development API)', disabled: 'Vite production build' };
    } finally {
      // Single-process packaged Chromium can exit when its first context closes.
      // Each matrix row owns a fresh browser process and an independent app.
      await context.close().catch(() => {});
      await browser?.close(); browser = null;
      await devServer?.close();
      await new Promise(resolve => server.close(resolve));
    }
  }
} catch (error) {
  receipt.error = error.message;
  process.exitCode = 1;
} finally {
  await browser?.close();
  const receiptPath = path.resolve(process.env.RI_MATRIX_RECEIPT || `${work}.json`);
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  const keepWork = process.env.RI_KEEP_MATRIX_WORK === '1';
  if (!keepWork) rmSync(work, { recursive: true, force: true });
  console.log(JSON.stringify({ ...receipt, receiptPath, ...(keepWork ? { workDirectory: work } : {}) }, null, 2));
}
