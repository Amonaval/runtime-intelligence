import test from 'node:test';
import assert from 'node:assert/strict';
import { installVueRuntimeIntelligence } from '../../src/vue/installVueRuntimeIntelligence.js';

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

test('Vue integration wires lifecycle/error hooks and restores host error handler', () => {
  const calls = [];
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
    recordError(target, error, options) { calls.push(['error', target, error.message, options]); },
    disconnect(target, options) {
      calls.push(['disconnect', target, options]);
      managed.delete(target);
    },
  };
  const runtime = {
    adapter,
    store: {},
    starts: 0,
    stops: 0,
    start() { this.starts += 1; return this; },
    stop() { this.stops += 1; return this; },
  };

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
  app.config.errorHandler(new Error('synthetic'), child, 'render function');
  mixin.unmounted.call(child);

  assert.ok(calls.some(entry => entry[0] === 'linkParent'));
  assert.ok(calls.some(entry => entry[0] === 'updateStarted'));
  assert.ok(calls.some(entry => entry[0] === 'updateCompleted'));
  assert.ok(calls.some(entry => entry[0] === 'error'));
  assert.ok(calls.some(entry => entry[0] === 'disconnect'));
  assert.equal(forwarded, 1);

  assert.equal(controller.stop(), true);
  assert.equal(runtime.stops, 1);
  assert.equal(app.config.errorHandler, previousErrorHandler);
  assert.equal(controller.stop(), false);
});

test('Vue component filter fails closed when the filter throws', () => {
  const runtime = {
    adapter: {
      isManaged() { return false; },
      connect() { throw new Error('must not connect'); },
    },
    store: {},
    start() { return this; },
    stop() { return this; },
  };
  const app = { mixins: [], mixin(value) { this.mixins.push(value); }, config: {} };
  installVueRuntimeIntelligence(app, {
    runtime,
    componentFilter() { throw new Error('bad filter'); },
  });

  assert.doesNotThrow(() => app.mixins[0].beforeMount.call({ $options: { name: 'Ignored' } }));
});
