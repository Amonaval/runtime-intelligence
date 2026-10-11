import test from 'node:test';
import assert from 'node:assert/strict';
import { installVueRuntimeIntelligence } from '../../src/vue/installVueRuntimeIntelligence.js';

function createMockRuntime(calls = []) {
  const managed = new WeakSet();
  const owners = new WeakMap();
  const adapter = {
    isManaged(target) { return managed.has(target); },
    connect(target, options) {
      managed.add(target);
      const owner = { id: `owner-${calls.length + 1}`, connected: true, ...options };
      owners.set(target, owner);
      calls.push(['connect', target, options]);
      return owner;
    },
    ownerOf(target) { return owners.get(target) || null; },
    linkParent(target, parent) { calls.push(['linkParent', target, parent]); },
    recordUpdateStarted(target, options) { calls.push(['updateStarted', target, options]); },
    recordUpdateCompleted(target, options) { calls.push(['updateCompleted', target, options]); },
    recordError(target, error, options) { calls.push(['error', target, error?.message || String(error), options]); },
    disconnect(target, options) {
      calls.push(['disconnect', target, options]);
      managed.delete(target);
    },
  };
  return {
    adapter,
    store: {},
    starts: 0,
    stops: 0,
    start() { this.starts += 1; return this; },
    stop() { this.stops += 1; return this; },
  };
}

test('Vue integration is default-off when enabled is omitted', () => {
  const app = {
    mixins: [],
    mixin(value) { this.mixins.push(value); },
    config: {},
  };

  const controller = installVueRuntimeIntelligence(app);
  assert.equal(controller.enabled, false);
  assert.equal(controller.runtime, null);
  assert.equal(app.mixins.length, 0);
  assert.equal(app.config.errorHandler, undefined);
});

test('disabled Vue integration installs no mixin, runtime, or error handler', () => {
  const app = {
    mixins: [],
    mixin(value) { this.mixins.push(value); },
    config: {},
  };

  const controller = installVueRuntimeIntelligence(app, { enabled: false });
  assert.equal(controller.enabled, false);
  assert.equal(controller.runtime, null);
  assert.equal(app.mixins.length, 0);
  assert.equal(app.config.errorHandler, undefined);
});

test('Vue integration wires lifecycle/error hooks and preserves external runtime ownership', async () => {
  const calls = [];
  const runtime = createMockRuntime(calls);

  let forwarded = 0;
  const previousErrorHandler = () => { forwarded += 1; };
  const app = {
    mixins: [],
    mixin(value) { this.mixins.push(value); },
    config: { errorHandler: previousErrorHandler },
  };

  const controller = installVueRuntimeIntelligence(app, {
    enabled: true,
    runtime,
    sourceResolver: proxy => proxy.$options?.__file ? { file: proxy.$options.__file } : null,
  });

  assert.equal(controller.enabled, true);
  assert.equal(runtime.starts, 1);
  assert.equal(app.mixins.length, 1);

  const mixin = app.mixins[0];
  const parent = { $options: { name: 'Parent', __file: '/src/Parent.vue' }, $parent: null };
  const child = { $options: { name: 'Child', __file: '/src/Child.vue' }, $parent: parent };

  mixin.beforeMount.call(parent);
  mixin.beforeMount.call(child);
  mixin.mounted.call(child);
  mixin.beforeUpdate.call(child);
  mixin.updated.call(child);
  const error = new Error('synthetic');
  mixin.errorCaptured.call(parent, error, child, 'render function');
  app.config.errorHandler(error, child, 'render function');
  mixin.unmounted.call(child);

  assert.ok(calls.some(entry => entry[0] === 'linkParent'));
  assert.ok(calls.some(entry => entry[0] === 'updateStarted'));
  assert.ok(calls.some(entry => entry[0] === 'updateCompleted'));
  assert.equal(calls.filter(entry => entry[0] === 'error').length, 1);
  assert.ok(calls.some(entry => entry[0] === 'disconnect'));
  assert.equal(forwarded, 1);

  assert.equal(controller.stop(), true);
  assert.equal(runtime.stops, 0);
  assert.equal(app.config.errorHandler, previousErrorHandler);
  assert.equal(controller.stop(), false);
  await Promise.resolve();
});

test('Vue integration leaves the framework default error behavior intact when host has no handler', () => {
  const calls = [];
  const runtime = createMockRuntime(calls);
  const app = {
    mixins: [],
    mixin(value) { this.mixins.push(value); },
    config: {},
  };

  const controller = installVueRuntimeIntelligence(app, { enabled: true, runtime });
  assert.equal(app.config.errorHandler, undefined);

  const mixin = app.mixins[0];
  const parent = { $options: { name: 'Parent' }, $parent: null };
  const child = { $options: { name: 'Child' }, $parent: parent };
  mixin.beforeMount.call(parent);
  mixin.beforeMount.call(child);
  assert.equal(mixin.errorCaptured.call(parent, new Error('synthetic'), child, 'render function'), undefined);
  assert.equal(calls.filter(entry => entry[0] === 'error').length, 1);
  controller.stop();
});

test('Vue installer disconnects managed owners when diagnostics stop', () => {
  const calls = [];
  const runtime = createMockRuntime(calls);
  const app = { mixins: [], mixin(value) { this.mixins.push(value); }, config: {} };
  const controller = installVueRuntimeIntelligence(app, { enabled: true, runtime });
  const child = { $options: { name: 'Child' }, $parent: null };
  app.mixins[0].beforeMount.call(child);

  controller.stop();
  const disconnect = calls.find(entry => entry[0] === 'disconnect');
  assert.equal(disconnect?.[2]?.reason, 'runtime-stop');
});

test('Vue app unmount cleanup waits until component unmount hooks can emit ownership teardown', async () => {
  const calls = [];
  const runtime = createMockRuntime(calls);
  let appCleanup = null;
  const app = {
    mixins: [],
    mixin(value) { this.mixins.push(value); },
    config: {},
    onUnmount(fn) { appCleanup = fn; },
  };
  const controller = installVueRuntimeIntelligence(app, { enabled: true, runtime });
  const child = { $options: { name: 'Child' }, $parent: null };
  const mixin = app.mixins[0];
  mixin.beforeMount.call(child);

  appCleanup();
  mixin.unmounted.call(child);
  assert.ok(calls.some(entry => entry[0] === 'disconnect' && entry[2]?.reason === 'unmounted'));
  await Promise.resolve();
  assert.equal(controller.stop(), false);
  assert.equal(runtime.stops, 0);
});

test('owned Vue runtime stops with its integration controller', () => {
  const app = { mixins: [], mixin(value) { this.mixins.push(value); }, config: {} };
  const controller = installVueRuntimeIntelligence(app, {
    enabled: true,
    windowTarget: null,
  });
  assert.equal(controller.runtime?.started, true);
  assert.equal(controller.stop(), true);
  assert.equal(controller.runtime?.started, false);
});

test('Vue component filter fails closed when the filter throws', () => {
  const runtime = createMockRuntime([]);
  const app = { mixins: [], mixin(value) { this.mixins.push(value); }, config: {} };
  installVueRuntimeIntelligence(app, {
    enabled: true,
    runtime,
    componentFilter() { throw new Error('bad filter'); },
  });

  assert.doesNotThrow(() => app.mixins[0].beforeMount.call({ $options: { name: 'Ignored' } }));
});
