import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isVueRuntimeIntelligenceEnabled,
  loadVueRuntimeIntelligence,
} from '../../src/loader/vue.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');

test('Vue-specific loader stays off unless enabled is literal true', async () => {
  assert.equal(isVueRuntimeIntelligenceEnabled(true), true);
  assert.equal(isVueRuntimeIntelligenceEnabled(1), false);
  assert.equal(isVueRuntimeIntelligenceEnabled('true'), false);

  const result = await loadVueRuntimeIntelligence({ enabled: false, panel: true });
  assert.deepEqual(result, {
    enabled: false,
    framework: null,
    frameworkModule: null,
    panelModule: null,
  });
});

test('Vue-specific loader has no React or Lit framework dependency edge', () => {
  const source = fs.readFileSync(path.join(root, 'lit/src/loader/vue.js'), 'utf8');
  assert.match(source, /import\('\.\.\/vue\/index\.js'\)/);
  assert.match(source, /import\('\.\.\/panel\/index\.js'\)/);
  assert.doesNotMatch(source, /react\/index\.js/);
  assert.doesNotMatch(source, /\.\.\/lit\/index\.js/);
});
