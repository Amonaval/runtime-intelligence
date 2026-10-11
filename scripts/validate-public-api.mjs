import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const baseline = JSON.parse(readFileSync(path.join(root, 'scripts/public-api-baseline.json'), 'utf8'));
const failures = [];

function exportTarget(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return value.import || value.default || null;
  return null;
}

function collectNamedExports(source) {
  const names = new Set();
  const blockRe = /export\s*\{([\s\S]*?)\}\s*(?:from\s*['"][^'"]+['"])?\s*;/g;
  for (const match of source.matchAll(blockRe)) {
    const clean = match[1]
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    for (const rawPart of clean.split(',')) {
      const part = rawPart.trim();
      if (!part) continue;
      const alias = part.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
      names.add(alias ? alias[2] : part);
    }
  }
  const directRe = /export\s+(?:async\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of source.matchAll(directRe)) names.add(match[1]);
  return [...names].sort();
}

const expectedSubpaths = [...Object.keys(baseline.surfaces), './package.json'].sort();
const actualSubpaths = Object.keys(pkg.exports || {}).sort();
if (JSON.stringify(actualSubpaths) !== JSON.stringify(expectedSubpaths)) {
  failures.push(`Public package subpaths changed.\nExpected: ${expectedSubpaths.join(', ')}\nActual:   ${actualSubpaths.join(', ')}`);
}

for (const [subpath, expectedNames] of Object.entries(baseline.surfaces)) {
  const target = exportTarget(pkg.exports?.[subpath]);
  if (!target) {
    failures.push(`Missing import target for ${subpath}.`);
    continue;
  }
  const source = readFileSync(path.join(root, target.replace(/^\.\//, '')), 'utf8');
  const actualNames = collectNamedExports(source);
  const expected = [...expectedNames].sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(expected)) {
    failures.push(`${subpath} named exports changed.\nExpected: ${expected.join(', ')}\nActual:   ${actualNames.join(', ')}`);
  }
}

const apiContractSource = readFileSync(path.join(root, 'lit/src/core/api-contract.js'), 'utf8');
const versionMatch = apiContractSource.match(/RUNTIME_INTELLIGENCE_API_VERSION\s*=\s*['"]([^'"]+)['"]/);
if (!versionMatch || versionMatch[1] !== baseline.apiVersion) {
  failures.push(`API version mismatch. Baseline=${baseline.apiVersion}, runtime=${versionMatch?.[1] || 'missing'}.`);
}

if (failures.length) {
  console.error(`Runtime Intelligence public API contract failed:\n- ${failures.join('\n- ')}`);
  console.error('If the API change is intentional, update the baseline and compatibility documentation in the same reviewed mission.');
  process.exit(1);
}

console.log(`Runtime Intelligence public API contract passed (${baseline.contractVersion}, API ${baseline.apiVersion}).`);
console.log(`Validated ${Object.keys(baseline.surfaces).length} public subpaths and their named exports.`);
console.log('Deep imports and window.__LDS_* globals are not part of the supported public API.');
