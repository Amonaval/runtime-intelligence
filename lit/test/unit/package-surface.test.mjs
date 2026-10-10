import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('root consumer package exposes independent product surfaces', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.exports['./core'], './lit/src/core/index.js');
  assert.equal(pkg.exports['./react'], './lit/src/react/index.js');
  assert.equal(pkg.exports['./lit'], './lit/src/lit/index.js');
  assert.equal(pkg.exports['./panel'], './lit/src/panel/index.js');
});

test('core and react entry points do not import Lit', () => {
  const core = read('lit/src/core/index.js');
  const react = read('lit/src/react/index.js');
  assert.doesNotMatch(core, /from ['\"]lit(?:\/|['\"])/);
  assert.doesNotMatch(react, /from ['\"]lit(?:\/|['\"])/);
});

test('framework peers are optional at repository consumer boundary', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.peerDependenciesMeta.react.optional, true);
  assert.equal(pkg.peerDependenciesMeta.lit.optional, true);
});
