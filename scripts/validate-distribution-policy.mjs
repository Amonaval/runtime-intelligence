import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runNpm } from './lib/npm-runner.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const failures = [];

function requireFile(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!existsSync(absolute)) { failures.push(`Missing distribution policy file: ${relativePath}.`); return ''; }
  return readFileSync(absolute, 'utf8');
}

if (pkg.private !== true) failures.push('R6.5 requires private:true; registry publication must be an explicit future decision.');
if (pkg.license !== 'UNLICENSED') failures.push('R6.5 proprietary baseline requires package license=UNLICENSED.');
if (pkg.publishConfig?.access === 'public') failures.push('Public npm access is forbidden by the R6.5 distribution policy.');
if (pkg.publishConfig?.registry) failures.push('Do not hard-code a registry until an authorized private registry/namespace is selected.');
for (const scriptName of ['prepublish', 'prepublishOnly', 'publish', 'postpublish']) {
  if (pkg.scripts?.[scriptName]) failures.push(`Package must not define an automatic ${scriptName} script while publication is disabled.`);
}

const license = requireFile('LICENSE.md');
if (license && (!/proprietary/i.test(license) || !/all rights reserved/i.test(license))) failures.push('LICENSE.md must preserve the proprietary/all-rights-reserved notice.');
const policy = requireFile('docs/R6.5-DISTRIBUTION-LICENSE-IP.md');
if (policy && (!/authorized private Git/i.test(policy) || !/service boundary/i.test(policy))) failures.push('R6.5 policy must document private distribution and the optional service boundary.');
const readme = requireFile('README.md');
if (readme && !/private\s*\/\s*proprietary/i.test(readme)) failures.push('README must clearly state the private/proprietary distribution posture.');

let packedFiles = [];
try {
  const raw = runNpm(['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root });
  packedFiles = (JSON.parse(raw)?.[0]?.files || []).map((entry) => entry.path);
} catch (error) {
  failures.push(`npm pack --dry-run failed: ${error?.stderr?.toString?.().trim() || error.message}`);
}

if (packedFiles.length && !packedFiles.includes('LICENSE.md')) failures.push('Packed artifact must contain LICENSE.md.');
if (packedFiles.length && !packedFiles.includes('README.md')) failures.push('Packed artifact must contain README.md.');

if (failures.length) {
  console.error(`Runtime Intelligence distribution policy failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Runtime Intelligence R6.5 distribution policy passed.');
console.log('Distribution posture: private/proprietary; no public registry publication.');
console.log('Current channels: authorized private Git access and authorized tarball delivery.');
console.log('IP boundary: browser package is inspectable; secrets belong behind an optional service boundary.');
