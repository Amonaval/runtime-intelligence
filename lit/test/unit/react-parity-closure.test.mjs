import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('React parity path stays one product, one panel, shared intelligence', () => {
  const react = read('lit/src/react/RuntimeIntelligenceReact.js');
  const runtime = read('lit/src/react/ReactIntelligenceRuntime.js');
  const panel = read('lit/src/panel/index.js');

  assert.match(react, /withRuntimeIntelligence/);
  assert.match(react, /profileRoot/);
  assert.match(runtime, /RuntimeIntelligencePipeline/);
  assert.match(runtime, /BrowserRuntimeSurface/);
  assert.match(panel, /LdsDebugPanel/);
  assert.doesNotMatch(panel, /runtime-panel-model/);
});

test('React adapter preserves unsupported causal semantics', () => {
  const adapter = read('lit/src/adapter/react/ReactAdapter.js');
  assert.match(adapter, /UPDATE_CAUSE\]: CapabilitySupport\.UNSUPPORTED/);
  assert.match(adapter, /REACTIVE_DEPENDENCY\]: CapabilitySupport\.UNSUPPORTED/);
  assert.doesNotMatch(adapter, /causedByEventId:/);
});
