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
  assert.equal(pkg.exports['./core'].import, './lit/src/core/index.js');
  assert.equal(pkg.exports['./react'].import, './lit/src/react/index.js');
  assert.equal(pkg.exports['./lit'].import, './lit/src/lit/index.js');
  assert.equal(pkg.exports['./panel'].import, './lit/src/panel/index.js');
});

test('core and react entry points do not directly import Lit UI runtime', () => {
  assert.doesNotMatch(read('lit/src/core/index.js'), /from ['\"]lit(?:\/|['\"])/);
  assert.doesNotMatch(read('lit/src/react/index.js'), /from ['\"]lit(?:\/|['\"])/);
});

test('canonical panel owns Lit internally while React remains an optional peer', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies.lit, '^3.3.1');
  assert.equal(pkg.peerDependenciesMeta.react.optional, true);
  assert.equal(pkg.peerDependencies?.lit, undefined);
});

test('parallel lightweight panel architecture is absent', () => {
  assert.equal(
    fs.existsSync(path.join(repoRoot, 'lit/src/panel/runtime-panel-model.js')),
    false,
  );
  const panelIndex = read('lit/src/panel/index.js');
  assert.match(panelIndex, /LdsDebugPanel/);
  assert.match(panelIndex, /mountRuntimeIntelligencePanel/);
});
