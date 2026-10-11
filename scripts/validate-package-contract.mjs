import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const failures = [];

const requiredExports = [
  './core',
  './react',
  './lit',
  './panel',
  './panel/lit',
  './package.json',
];

const forbiddenPackedPrefixes = [
  'lit/custom/',
  'lit/test/',
  'examples/',
  'docs/',
];

function exportTarget(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return value.import || value.default || null;
  return null;
}

if (pkg.name !== 'runtime-intelligence') failures.push('Unexpected package name.');
if (pkg.type !== 'module') failures.push('Package must remain ESM.');
if (pkg.private !== true) failures.push('Package must remain private until distribution/license strategy is explicitly approved.');

for (const subpath of requiredExports) {
  if (!pkg.exports?.[subpath]) {
    failures.push(`Missing public export ${subpath}.`);
    continue;
  }

  const target = exportTarget(pkg.exports[subpath]);
  if (!target) {
    failures.push(`Export ${subpath} has no import/default target.`);
    continue;
  }

  if (target !== './package.json') {
    const absolute = path.join(root, target.replace(/^\.\//, ''));
    if (!existsSync(absolute)) failures.push(`Export ${subpath} points to missing file ${target}.`);
  }
}

const packageFiles = Array.isArray(pkg.files) ? pkg.files : [];
if (!packageFiles.includes('lit/src')) failures.push('Published allowlist must include lit/src.');
if (packageFiles.some((entry) => entry === 'lit/custom' || entry.startsWith('lit/custom/'))) {
  failures.push('Syndigo-specific lit/custom must not ship in the generic package.');
}

let packedFiles = [];
try {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const raw = execFileSync(npm, ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const pack = JSON.parse(raw);
  packedFiles = (pack?.[0]?.files || []).map((entry) => entry.path);
} catch (error) {
  failures.push(`npm pack --dry-run failed: ${error?.stderr?.toString?.().trim() || error.message}`);
}

for (const subpath of requiredExports) {
  const target = exportTarget(pkg.exports?.[subpath]);
  if (!target || target === './package.json') continue;
  const packedTarget = target.replace(/^\.\//, '');
  if (packedFiles.length && !packedFiles.includes(packedTarget)) {
    failures.push(`Pack output is missing exported file ${packedTarget}.`);
  }
}

for (const prefix of forbiddenPackedPrefixes) {
  if (packedFiles.some((file) => file.startsWith(prefix))) {
    failures.push(`Pack output unexpectedly contains ${prefix}.`);
  }
}

if (failures.length) {
  console.error(`Runtime Intelligence package contract failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Runtime Intelligence package contract passed (${packedFiles.length} packed files checked).`);
console.log('Public surfaces: runtime-intelligence/core, /react, /lit, /panel, /panel/lit.');
console.log('Publish safety: package remains private; app-specific lit/custom is excluded.');
