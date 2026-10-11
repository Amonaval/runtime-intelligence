import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const businessRoot = path.join(root, 'src', 'app');
const diagnosticsFile = path.join(root, 'src', 'diagnostics', 'RuntimeIntelligenceRoot.jsx');
const mainFile = path.join(root, 'src', 'main.jsx');
const failures = [];

function walk(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(absolute));
    else if (/\.(?:js|jsx|mjs|ts|tsx)$/.test(entry.name)) output.push(absolute);
  }
  return output;
}

const businessFiles = walk(businessRoot);
for (const file of businessFiles) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const source = fs.readFileSync(file, 'utf8');
  const forbidden = [
    'runtime-intelligence',
    'RuntimeIntelligenceProvider',
    'RuntimeIntelligenceProfiler',
    'withRuntimeIntelligence',
    'useRuntimeIntelligence',
    'useRuntimeTrackedState',
    'useRuntimeEffect',
    'useRuntimeResource',
    'sourceProvenance',
  ];
  for (const token of forbidden) {
    if (source.includes(token)) failures.push(`${relative} must remain uninstrumented; found ${token}`);
  }
  const importsReactProfiler = /import\s*\{[^}]*\bProfiler\b[^}]*\}\s*from\s*['\"]react['\"]/.test(source);
  const rendersReactProfiler = /<\s*Profiler(?:\s|>)/.test(source);
  if (importsReactProfiler || rendersReactProfiler) {
    failures.push(`${relative} must not add React Profiler manually`);
  }
}

const diagnostics = fs.readFileSync(diagnosticsFile, 'utf8');
const main = fs.readFileSync(mainFile, 'utf8');
if (!diagnostics.includes("from 'runtime-intelligence/react'")) failures.push('Diagnostics root must own the React integration import');
if (!diagnostics.includes("from 'runtime-intelligence/panel'")) failures.push('Diagnostics root must mount the canonical panel');
if (!diagnostics.includes('profileRoot={true}')) failures.push('Diagnostics root must exercise root-only profiling');
if (/\bsource\s*=/.test(diagnostics)) failures.push('Diagnostics root must not supply manual source metadata in the hostile lab');
if (!main.includes("./diagnostics/RuntimeIntelligenceRoot.jsx")) failures.push('main.jsx must isolate diagnostics behind RuntimeIntelligenceRoot');
if (!main.includes("./app/App.jsx")) failures.push('main.jsx must render the uninstrumented business app');
if (businessFiles.length < 7) failures.push('Hostile lab must keep multiple independent business source files for provenance validation');

if (failures.length) {
  console.error('Uninstrumented React lab contract failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log(`Uninstrumented React lab contract passed. ${businessFiles.length} business source files contain no Runtime Intelligence instrumentation.`);
