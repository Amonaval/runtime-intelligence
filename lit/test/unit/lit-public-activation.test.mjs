import test from 'node:test';
import assert from 'node:assert/strict';

const gateUrl = new URL('../../src/core/gate.js', import.meta.url);
const configUrl = new URL('../../src/lit/configureLitRuntimeIntelligence.js', import.meta.url);

function withWindow(fakeWindow, callback) {
  const previous = globalThis.window;
  globalThis.window = fakeWindow;
  return Promise.resolve(callback()).finally(() => {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  });
}

test('programmatic Lit activation is default-off and supports selective tools', { concurrency: false }, async () => {
  await withWindow({}, async () => {
    const gate = await import(`${gateUrl.href}?p03=${Date.now()}`);
    // Import config without cache-busting so it shares its gate instance with its
    // own imports, then observe through a fresh public config/gate pair below.
    assert.equal(gate._runtimeEnabled(), false);
  });

  await withWindow({}, async () => {
    const config = await import(`${configUrl.href}?p03=${Date.now()}`);
    const sharedGate = await import('../../src/core/gate.js');
    const disabled = config.configureLitRuntimeIntelligence({ enabled: false });
    assert.equal(disabled.enabled, false);
    assert.equal(sharedGate._runtimeEnabled(), false);

    const active = config.configureLitRuntimeIntelligence({
      enabled: true,
      tools: { intelligence: true, network: true, perf: false },
    });
    assert.equal(active.enabled, true);
    assert.equal(sharedGate._runtimeEnabled(), true);
    assert.equal(sharedGate._toolEnabled('intelligence'), true);
    assert.equal(sharedGate._toolEnabled('network'), true);
    assert.equal(sharedGate._toolEnabled('perf'), false);
    assert.equal(active.stop(), true);
    assert.equal(active.stop(), false);
    assert.equal(sharedGate._runtimeEnabled(), false);
  });
});

test('programmatic Lit activation overrides legacy globals while active, then restores compatibility fallback', { concurrency: false }, async () => {
  await withWindow({ __LDS_DEBUG__: { perf: true } }, async () => {
    const config = await import('../../src/lit/configureLitRuntimeIntelligence.js');
    const gate = await import('../../src/core/gate.js');

    assert.equal(gate._toolEnabled('perf'), true);
    const active = config.configureLitRuntimeIntelligence({
      enabled: true,
      tools: { network: true },
    });
    assert.equal(gate._toolEnabled('network'), true);
    assert.equal(gate._toolEnabled('perf'), false);

    active.stop();
    assert.equal(gate._toolEnabled('network'), false);
    assert.equal(gate._toolEnabled('perf'), true);
  });
});

test('legacy Lit flags still ignore inherited values and honor explicit own flags', { concurrency: false }, async () => {
  const inherited = { __LDS_NETWORK_ENABLED__: true, __LDS_DEBUG__: { perf: true } };
  const fakeWindow = Object.create(inherited);
  await withWindow(fakeWindow, async () => {
    const gate = await import('../../src/core/gate.js');
    assert.equal(gate._runtimeEnabled(), false);
    fakeWindow.__LDS_NETWORK_ENABLED__ = true;
    assert.equal(gate._toolEnabled('network'), true);
    delete fakeWindow.__LDS_NETWORK_ENABLED__;
    fakeWindow.__LDS_DEBUG__ = { perf: true };
    assert.equal(gate._toolEnabled('perf'), true);
  });
});

test('a stale Lit activation controller cannot disable a newer activation', { concurrency: false }, async () => {
  await withWindow({}, async () => {
    const config = await import('../../src/lit/configureLitRuntimeIntelligence.js');
    const gate = await import('../../src/core/gate.js');
    const first = config.configureLitRuntimeIntelligence({ enabled: true, tools: { perf: true } });
    const second = config.configureLitRuntimeIntelligence({ enabled: true, tools: { network: true } });
    assert.equal(gate._toolEnabled('network'), true);
    assert.equal(gate._toolEnabled('perf'), false);
    assert.equal(first.stop(), false);
    assert.equal(gate._toolEnabled('network'), true);
    assert.equal(second.stop(), true);
    assert.equal(gate._runtimeEnabled(), false);
  });
});
