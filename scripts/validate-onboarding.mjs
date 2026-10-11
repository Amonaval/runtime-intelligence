import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runNpm } from './lib/npm-runner.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;
const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'runtime-intelligence-onboarding-'));
const packDir = path.join(tempRoot, 'pack');
const consumerDir = path.join(tempRoot, 'consumer');

function runNode(args, cwd) {
  return execFileSync(node, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

try {
  runNode(['-e', `require('fs').mkdirSync(${JSON.stringify(packDir)}, { recursive: true }); require('fs').mkdirSync(${JSON.stringify(consumerDir)}, { recursive: true });`], root);
  const packed = JSON.parse(runNpm(['pack', '--json', '--ignore-scripts', '--pack-destination', packDir], { cwd: root }));
  const filename = packed?.[0]?.filename;
  if (!filename) throw new Error('npm pack did not return a tarball filename.');
  const tarball = path.join(packDir, filename);

  writeFileSync(path.join(consumerDir, 'package.json'), JSON.stringify({ name: 'runtime-intelligence-onboarding-smoke', private: true, type: 'module' }, null, 2));
  runNpm(['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', tarball, 'react@18', 'lit@3'], { cwd: consumerDir });

  const smokeFile = path.join(consumerDir, 'smoke.mjs');
  writeFileSync(smokeFile, `
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';
import * as core from 'runtime-intelligence/core';
import { RUNTIME_EXTENSION_API_VERSION, createRuntimeExtension } from 'runtime-intelligence/extension';
import * as react from 'runtime-intelligence/react';
import * as lit from 'runtime-intelligence/lit';

if (typeof core.EvidenceStore !== 'function') throw new Error('core export missing EvidenceStore');
if (typeof core.getRuntimeIntelligenceApiContract !== 'function') throw new Error('core API contract export missing');
if (typeof createRuntimeExtension !== 'function') throw new Error('extension export missing createRuntimeExtension');
if (typeof react.createReactIntelligenceRuntime !== 'function') throw new Error('react runtime export missing');
if (typeof lit.LitDebugMixin !== 'function') throw new Error('lit mixin export missing');

const extensionStore = new core.EvidenceStore();
const extension = createRuntimeExtension({ id: 'onboarding.smoke', version: '1.0.0', store: extensionStore });
const extensionEvent = extension.diagnostic('ready', { ok: true });
if (extensionEvent.payload?.diagnostic !== 'onboarding.smoke.ready') throw new Error('extension diagnostic namespace contract failed');
if (extension.manifest.extensionApiVersion !== RUNTIME_EXTENSION_API_VERSION) throw new Error('extension API manifest mismatch');

const disabled = await loadRuntimeIntelligence({ enabled: false, framework: 'react', panel: true });
if (disabled.enabled !== false || disabled.frameworkModule !== null || disabled.panelModule !== null) throw new Error('disabled loader contract failed');
const reactLoaded = await loadRuntimeIntelligence({ enabled: true, framework: 'react' });
if (!reactLoaded.enabled || typeof reactLoaded.frameworkModule?.createReactIntelligenceRuntime !== 'function') throw new Error('React dynamic loader path failed');
const litLoaded = await loadRuntimeIntelligence({ enabled: true, framework: 'lit' });
if (!litLoaded.enabled || typeof litLoaded.frameworkModule?.LitDebugMixin !== 'function') throw new Error('Lit dynamic loader path failed');
console.log('consumer smoke passed');
`);

  const output = runNode([smokeFile], consumerDir).trim();
  if (!output.includes('consumer smoke passed')) throw new Error(`Unexpected consumer smoke output: ${output}`);
  const consumerPackage = JSON.parse(readFileSync(path.join(consumerDir, 'node_modules/runtime-intelligence/package.json'), 'utf8'));
  if (consumerPackage.private !== true) throw new Error('Packed package unexpectedly lost private guard.');
  if (!consumerPackage.exports?.['./loader']) throw new Error('Packed package is missing ./loader export.');
  if (!consumerPackage.exports?.['./extension']) throw new Error('Packed package is missing ./extension export.');

  console.log(`Runtime Intelligence onboarding validation passed using ${filename}.`);
  console.log('Verified installed public imports: /loader, /core, /extension, /react, /lit.');
  console.log('Verified extension contract plus default-off loader and React/Lit dynamic loading from the packed artifact.');
} catch (error) {
  const stderr = error?.stderr?.toString?.().trim();
  console.error(`Runtime Intelligence onboarding validation failed: ${stderr || error.message}`);
  process.exitCode = 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
