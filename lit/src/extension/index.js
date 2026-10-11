import {
  AttributionQuality,
  EvidenceLevel,
  RuntimeEventType,
  SCHEMA_VERSION as UREP_SCHEMA_VERSION,
} from '../core/evidence-protocol.js';

const RUNTIME_EXTENSION_API_VERSION = '1.0';

const _eventTypes = new Set(Object.values(RuntimeEventType));

function _major(version) {
  const match = String(version || '').match(/^(\d+)/);
  return match ? Number(match[1]) : null;
}

function _normalizeId(id) {
  const value = String(id || '').trim();
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(value)) {
    throw new TypeError('Runtime extension id must use letters, numbers, dot, underscore or hyphen.');
  }
  return value;
}

function _normalizeFramework(framework, extensionId) {
  if (typeof framework === 'string') {
    return Object.freeze({ name: framework || 'extension', version: null, adapterVersion: null });
  }
  const value = framework && typeof framework === 'object' ? framework : {};
  return Object.freeze({
    name: String(value.name || `extension:${extensionId}`),
    version: value.version == null ? null : String(value.version),
    adapterVersion: value.adapterVersion == null ? null : String(value.adapterVersion),
  });
}

function isRuntimeExtensionCompatible({
  extensionApiVersion = RUNTIME_EXTENSION_API_VERSION,
  urepSchemaVersion = UREP_SCHEMA_VERSION,
} = {}) {
  return _major(extensionApiVersion) === _major(RUNTIME_EXTENSION_API_VERSION)
    && _major(urepSchemaVersion) === _major(UREP_SCHEMA_VERSION);
}

function assertRuntimeExtensionCompatibility(manifest = {}) {
  if (!isRuntimeExtensionCompatible(manifest)) {
    throw new RangeError(
      `Incompatible Runtime Intelligence extension contract: extension API ${manifest.extensionApiVersion || 'unknown'}, UREP ${manifest.urepSchemaVersion || 'unknown'}.`,
    );
  }
  return true;
}

function _ensureStore(store) {
  if (!store
    || typeof store.emit !== 'function'
    || typeof store.snapshot !== 'function'
    || typeof store.subscribe !== 'function') {
    throw new TypeError('createRuntimeExtension requires an EvidenceStore-compatible store.');
  }
  return store;
}

function _namespacedDiagnostic(extensionId, name) {
  const value = String(name || '').trim();
  if (!value) throw new TypeError('Runtime extension diagnostic name is required.');
  return value.startsWith(`${extensionId}.`) ? value : `${extensionId}.${value}`;
}

function createRuntimeExtension({
  id,
  version = '0.0.0',
  store,
  framework = null,
  extensionApiVersion = RUNTIME_EXTENSION_API_VERSION,
  urepSchemaVersion = UREP_SCHEMA_VERSION,
  allowConfirmedCausality = false,
} = {}) {
  const extensionId = _normalizeId(id);
  const extensionStore = _ensureStore(store);
  const manifest = Object.freeze({
    id: extensionId,
    version: String(version || '0.0.0'),
    extensionApiVersion: String(extensionApiVersion),
    urepSchemaVersion: String(urepSchemaVersion),
  });
  assertRuntimeExtensionCompatibility(manifest);
  const frameworkDescriptor = _normalizeFramework(framework, extensionId);

  function emit(input = {}) {
    if (!input || typeof input !== 'object' || !_eventTypes.has(input.type)) {
      throw new TypeError(`Unknown runtime extension event type: ${input?.type}`);
    }

    const correlation = input.correlation && typeof input.correlation === 'object'
      ? { ...input.correlation }
      : {};
    const requestedLevel = input.evidence?.level || EvidenceLevel.OBSERVATION;
    const hasCausalReference = !!correlation.causedByEventId;

    if (requestedLevel === EvidenceLevel.CAUSALITY_CONFIRMED || hasCausalReference) {
      if (!allowConfirmedCausality
        || requestedLevel !== EvidenceLevel.CAUSALITY_CONFIRMED
        || !hasCausalReference) {
        throw new TypeError(
          'Confirmed causality requires allowConfirmedCausality:true, evidence.level=causality-confirmed, and causedByEventId.',
        );
      }
    }

    const payload = {
      ...(input.payload && typeof input.payload === 'object' ? input.payload : {}),
      extension: manifest,
    };
    if (input.type === RuntimeEventType.DIAGNOSTIC && payload.diagnostic) {
      payload.diagnostic = _namespacedDiagnostic(extensionId, payload.diagnostic);
    }

    return extensionStore.emit({
      ...input,
      framework: frameworkDescriptor,
      correlation,
      evidence: {
        level: EvidenceLevel.OBSERVATION,
        attribution: AttributionQuality.UNKNOWN,
        confidence: null,
        ...(input.evidence || {}),
      },
      payload,
    });
  }

  function diagnostic(name, payload = {}, options = {}) {
    return emit({
      ...options,
      type: RuntimeEventType.DIAGNOSTIC,
      payload: {
        ...(payload && typeof payload === 'object' ? payload : {}),
        diagnostic: _namespacedDiagnostic(extensionId, name),
      },
    });
  }

  function snapshot(filter = {}) {
    return extensionStore.snapshot(filter).filter(event => event?.payload?.extension?.id === extensionId);
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') throw new TypeError('Runtime extension subscribe requires a function.');
    return extensionStore.subscribe(event => {
      if (event?.payload?.extension?.id === extensionId) fn(event);
    });
  }

  function describe() {
    return Object.freeze({
      manifest,
      framework: frameworkDescriptor,
      allowConfirmedCausality: allowConfirmedCausality === true,
    });
  }

  return Object.freeze({
    manifest,
    emit,
    diagnostic,
    snapshot,
    subscribe,
    describe,
  });
}

export {
  RUNTIME_EXTENSION_API_VERSION,
  UREP_SCHEMA_VERSION,
  assertRuntimeExtensionCompatibility,
  createRuntimeExtension,
  isRuntimeExtensionCompatible,
};
