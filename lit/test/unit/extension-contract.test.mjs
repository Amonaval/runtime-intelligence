import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RUNTIME_EXTENSION_API_VERSION,
  UREP_SCHEMA_VERSION,
  createRuntimeExtension,
  isRuntimeExtensionCompatible,
} from '../../src/extension/index.js';
import { EvidenceLevel, RuntimeEventType } from '../../src/core/evidence-protocol.js';

function createStore() {
  const events = [];
  const subscribers = new Set();
  return {
    emit(input) { events.push(input); for (const fn of subscribers) fn(input); return input; },
    snapshot(filter = {}) { return events.filter(event => !filter.type || event.type === filter.type); },
    subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
  };
}

test('extension metadata and diagnostics are namespaced', () => {
  const store = createStore();
  const ext = createRuntimeExtension({ id: 'acme.router', version: '2.3.4', store, framework: 'react' });
  const event = ext.diagnostic('cache-miss', { route: '/orders' });
  assert.equal(event.type, RuntimeEventType.DIAGNOSTIC);
  assert.equal(event.framework.name, 'react');
  assert.equal(event.payload.diagnostic, 'acme.router.cache-miss');
  assert.equal(event.payload.extension.id, 'acme.router');
  assert.equal(event.payload.extension.version, '2.3.4');
  assert.equal(ext.snapshot().length, 1);
});

test('extension subscriptions receive only owned evidence', () => {
  const store = createStore();
  const ext = createRuntimeExtension({ id: 'acme.one', store });
  let count = 0;
  const stop = ext.subscribe(() => { count += 1; });
  ext.diagnostic('ready');
  store.emit({ type: RuntimeEventType.DIAGNOSTIC, payload: { extension: { id: 'other' } } });
  stop();
  ext.diagnostic('after-stop');
  assert.equal(count, 1);
});

test('confirmed causality is blocked by default', () => {
  const ext = createRuntimeExtension({ id: 'acme.safe', store: createStore() });
  assert.throws(() => ext.emit({
    type: RuntimeEventType.STATE_CHANGED,
    correlation: { causedByEventId: 'evt-1' },
    evidence: { level: EvidenceLevel.CAUSALITY_CONFIRMED },
  }), /Confirmed causality/);
});

test('confirmed causality requires all explicit contract pieces', () => {
  const ext = createRuntimeExtension({ id: 'acme.causal', store: createStore(), allowConfirmedCausality: true });
  assert.throws(() => ext.emit({
    type: RuntimeEventType.STATE_CHANGED,
    evidence: { level: EvidenceLevel.CAUSALITY_CONFIRMED },
  }), /Confirmed causality/);
  const event = ext.emit({
    type: RuntimeEventType.STATE_CHANGED,
    correlation: { causedByEventId: 'evt-1' },
    evidence: { level: EvidenceLevel.CAUSALITY_CONFIRMED },
  });
  assert.equal(event.correlation.causedByEventId, 'evt-1');
});

test('extension compatibility follows same-major contract', () => {
  assert.equal(isRuntimeExtensionCompatible({ extensionApiVersion: RUNTIME_EXTENSION_API_VERSION, urepSchemaVersion: UREP_SCHEMA_VERSION }), true);
  assert.equal(isRuntimeExtensionCompatible({ extensionApiVersion: '2.0', urepSchemaVersion: UREP_SCHEMA_VERSION }), false);
  assert.equal(isRuntimeExtensionCompatible({ extensionApiVersion: RUNTIME_EXTENSION_API_VERSION, urepSchemaVersion: '2.0' }), false);
});
