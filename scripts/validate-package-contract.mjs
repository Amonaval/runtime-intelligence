import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runNpm } from './lib/npm-runner.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const failures = [];

const requiredExports = [
  './loader', './core', './extension', './react', './lit', './vue', './panel', './panel/lit', './package.json',
];
const forbiddenPackedPrefixes = ['lit/custom/', 'lit/test/', 'examples/', 'docs/'];

function exportTargets(value) {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object') return [];
  return [...new Set([value.import, value.default, value.types].filter(Boolean))];
}

function importTarget(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return value.import || value.default || null;
  return null;
}

if (pkg.name !== 'runtime-intelligence') failures.push('Unexpected package name.');
if (pkg.type !== 'module') failures.push('Package must remain ESM.');
if (pkg.private !== true) failures.push('Package must remain private under the R6.5 distribution policy.');

for (const subpath of requiredExports) {
  const value = pkg.exports?.[subpath];
  if (!value) { failures.push(`Missing public export ${subpath}.`); continue; }
  const targets = exportTargets(value);
  if (!targets.length) { failures.push(`Export ${subpath} has no runtime/default/types target.`); continue; }
  for (const target of targets) {
    if (target === './package.json') continue;
    const absolute = path.join(root, target.replace(/^\.\//, ''));
    if (!existsSync(absolute)) failures.push(`Export ${subpath} points to missing file ${target}.`);
  }
}

const loaderTarget = importTarget(pkg.exports?.['./loader']);
if (loaderTarget) {
  const loaderSource = readFileSync(path.join(root, loaderTarget.replace(/^\.\//, '')), 'utf8');
  if (/^\s*import\s.+from\s/m.test(loaderSource) || /^\s*import\s*['"]/m.test(loaderSource)) failures.push('The /loader entry must not statically import Runtime Intelligence modules.');
  if (!loaderSource.includes('import(')) failures.push('The /loader entry must preserve an explicit dynamic-import boundary.');
}

const packageFiles = Array.isArray(pkg.files) ? pkg.files : [];
if (!packageFiles.includes('lit/src')) failures.push('Published allowlist must include lit/src.');
if (packageFiles.some((entry) => entry === 'lit/custom' || entry.startsWith('lit/custom/'))) failures.push('Syndigo-specific lit/custom must not ship in the generic package.');

let packedFiles = [];
try {
  const raw = runNpm(['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root });
  const pack = JSON.parse(raw);
  packedFiles = (pack?.[0]?.files || []).map((entry) => entry.path);
} catch (error) {
  failures.push(`npm pack --dry-run failed: ${error?.stderr?.toString?.().trim() || error.message}`);
}

for (const subpath of requiredExports) {
  for (const target of exportTargets(pkg.exports?.[subpath])) {
    if (!target || target === './package.json') continue;
    const packedTarget = target.replace(/^\.\//, '');
    if (packedFiles.length && !packedFiles.includes(packedTarget)) failures.push(`Pack output is missing exported file ${packedTarget}.`);
  }
}
for (const prefix of forbiddenPackedPrefixes) {
  if (packedFiles.some((file) => file.startsWith(prefix))) failures.push(`Pack output unexpectedly contains ${prefix}.`);
}

if (failures.length) {
  console.error(`Runtime Intelligence package contract failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`Runtime Intelligence package contract passed (${packedFiles.length} packed files checked).`);
console.log('Public surfaces: runtime-intelligence/loader, /core, /extension, /react, /lit, /vue, /panel, /panel/lit.');
console.log('Conditional-loading boundary: /loader has no static Runtime Intelligence imports.');
console.log('Publish safety: package remains private under R6.5; app-specific lit/custom is excluded.');
