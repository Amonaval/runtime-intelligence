import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;
const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'runtime-intelligence-onboarding-'));
const packDir = path.join(tempRoot, 'pack');
const consumerDir = path.join(tempRoot, 'consumer');

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

try {
  run(node, ['-e', `require('fs').mkdirSync(${JSON.stringify(packDir)}, { recursive: true }); require('fs').mkdirSync(${JSON.stringify(consumerDir)}, { recursive: true });`], root);

  const packed = JSON.parse(run(npm, [
    'pack',
    '--json',
    '--ignore-scripts',
    '--pack-destination',
    packDir,
  ], root));

  const filename = packed?.[0]?.filename;
  if (!filename) throw new Error('npm pack did not return a tarball filename.');
  const tarball = path.join(packDir, filename);

  writeFileSync(path.join(consumerDir, 'package.json'), JSON.stringify({
    name: 'runtime-intelligence-onboarding-smoke',
    private: true,
    type: 'module',
  }, null, 2));

  run(npm, [
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--package-lock=false',
    tarball,
    'react@18',
    'lit@3',
  ], consumerDir);

  const smokeFile = path.join(consumerDir, 'smoke.mjs');
  writeFileSync(smokeFile, `
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';
import * as core from 'runtime-intelligence/core';
import * as react from 'runtime-intelligence/react';
import * as lit from 'runtime-intelligence/lit';

if (typeof core.EvidenceStore !== 'function') throw new Error('core export missing EvidenceStore');
if (typeof react.createReactIntelligenceRuntime !== 'function') throw new Error('react runtime export missing');
if (typeof lit.LitDebugMixin !== 'function') throw new Error('lit mixin export missing');

const disabled = await loadRuntimeIntelligence({ enabled: false, framework: 'react', panel: true });
if (disabled.enabled !== false || disabled.frameworkModule !== null || disabled.panelModule !== null) {
  throw new Error('disabled loader contract failed');
}

const reactLoaded = await loadRuntimeIntelligence({ enabled: true, framework: 'react' });
if (!reactLoaded.enabled || typeof reactLoaded.frameworkModule?.createReactIntelligenceRuntime !== 'function') {
  throw new Error('React dynamic loader path failed');
}

const litLoaded = await loadRuntimeIntelligence({ enabled: true, framework: 'lit' });
if (!litLoaded.enabled || typeof litLoaded.frameworkModule?.LitDebugMixin !== 'function') {
  throw new Error('Lit dynamic loader path failed');
}

console.log('consumer smoke passed');
`);

  const output = run(node, [smokeFile], consumerDir).trim();
  if (!output.includes('consumer smoke passed')) {
    throw new Error(`Unexpected consumer smoke output: ${output}`);
  }

  const consumerPackage = JSON.parse(readFileSync(path.join(consumerDir, 'node_modules/runtime-intelligence/package.json'), 'utf8'));
  if (consumerPackage.private !== true) throw new Error('Packed package unexpectedly lost private guard.');
  if (!consumerPackage.exports?.['./loader']) throw new Error('Packed package is missing ./loader export.');

  console.log(`Runtime Intelligence onboarding validation passed using ${filename}.`);
  console.log('Verified installed public imports: /loader, /core, /react, /lit.');
  console.log('Verified default-off loader plus React/Lit dynamic loading from the packed artifact.');
} catch (error) {
  const stderr = error?.stderr?.toString?.().trim();
  console.error(`Runtime Intelligence onboarding validation failed: ${stderr || error.message}`);
  process.exitCode = 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
