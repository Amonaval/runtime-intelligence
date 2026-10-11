import { FrameworkAdapter } from '../FrameworkAdapter.js';
import {
  AttributionQuality,
  CapabilitySupport,
  EvidenceLevel,
  FrameworkCapability,
  RuntimeEventType,
} from '../../core/evidence-protocol.js';

// IDs must remain unique when multiple adapter instances share one store.
let _instanceSequence = 0;

function _now() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function _isToken(value) {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

function _sourceAttribution(source) {
  return source ? AttributionQuality.SOURCE_ATTRIBUTED : AttributionQuality.UNKNOWN;
}

function _instrumentedEvidence(source, level = EvidenceLevel.OBSERVATION) {
  return {
    level,
    attribution: _sourceAttribution(source),
    confidence: source ? 0.9 : 0.7,
  };
}

/**
 * VueAdapter — Vue 3 evidence producer for UREP.
 *
 * Vue lifecycle hooks can report that an update happened, but they do not
 * identify the reactive dependency that caused it. Keep UPDATE_CAUSE and
 * REACTIVE_DEPENDENCY unsupported unless a future Vue API can prove them.
 */
class VueAdapter extends FrameworkAdapter {
  #correlationContext;
  #owners = new WeakMap();
  #physicalInstances = new WeakMap();
  #lifecycleGenerations = new WeakMap();
  #updateStarts = new WeakMap();

  constructor(options = {}) {
    super({
      ...options,
      framework: 'vue',
      adapterVersion: '2.0',
      capabilities: {
        [FrameworkCapability.OWNER_LIFECYCLE]: CapabilitySupport.FRAMEWORK_REPORTED,
        [FrameworkCapability.UPDATE_LIFECYCLE]: CapabilitySupport.FRAMEWORK_REPORTED,
        [FrameworkCapability.UPDATE_CAUSE]: CapabilitySupport.UNSUPPORTED,
        [FrameworkCapability.STATE_CHANGE]: CapabilitySupport.UNSUPPORTED,
        [FrameworkCapability.RENDER_TIMING]: CapabilitySupport.PARTIAL,
        [FrameworkCapability.SOURCE_LOCATION]: CapabilitySupport.PARTIAL,
        [FrameworkCapability.REACTIVE_DEPENDENCY]: CapabilitySupport.UNSUPPORTED,
        [FrameworkCapability.RESOURCE_OWNERSHIP]: CapabilitySupport.PARTIAL,
        [FrameworkCapability.EFFECT_LIFECYCLE]: CapabilitySupport.UNSUPPORTED,
        ...(options.capabilities || {}),
      },
    });
    this.#correlationContext = options.correlationContext || null;
  }

  isManaged(target) {
    return _isToken(target) && !!this.#owners.get(target)?.connected;
  }

  #interactionId() {
    return this.#correlationContext?.currentInteraction?.() || null;
  }

  #interactionCorrelation(interactionId = this.#interactionId()) {
    return interactionId ? { interactionId } : undefined;
  }

  connect(target, {
    name = 'vue-component',
    source = null,
    parentId = null,
  } = {}) {
    if (!_isToken(target)) return null;

    const existing = this.#owners.get(target);
    if (existing?.connected) {
      if (!existing.parentId && parentId) existing.parentId = parentId;
      if (!existing.source && source) existing.source = source;
      return existing;
    }

    let instanceId = this.#physicalInstances.get(target);
    if (!instanceId) {
      instanceId = ++_instanceSequence;
      this.#physicalInstances.set(target, instanceId);
    }

    const lifecycleGeneration = (this.#lifecycleGenerations.get(target) || 0) + 1;
    this.#lifecycleGenerations.set(target, lifecycleGeneration);

    const owner = {
      id: `vue-${instanceId}-life-${lifecycleGeneration}`,
      instanceId,
      lifecycleGeneration,
      kind: 'component',
      name: String(name || 'vue-component'),
      parentId,
      connected: true,
      source,
    };

    this.#owners.set(target, owner);
    this.#updateStarts.delete(target);

    this.emit(RuntimeEventType.OWNER_CREATED, {
      owner,
      source,
      correlation: this.#interactionCorrelation(),
      evidence: {
        level: EvidenceLevel.OBSERVATION,
        attribution: AttributionQuality.FRAMEWORK_REPORTED,
        confidence: 0.95,
      },
      payload: {
        lifecycle: 'before-mount',
        instrumented: true,
      },
    });

    return owner;
  }

  linkParent(target, parentTarget) {
    const owner = this.#owners.get(target);
    const parent = this.#owners.get(parentTarget);
    if (!owner?.connected || !parent?.connected || owner.parentId === parent.id) {
      return owner || null;
    }

    owner.parentId = parent.id;
    this.emit(RuntimeEventType.DIAGNOSTIC, {
      owner,
      source: owner.source,
      correlation: this.#interactionCorrelation(),
      evidence: _instrumentedEvidence(owner.source, EvidenceLevel.ATTRIBUTION),
      payload: {
        diagnostic: 'vue.owner.parent-linked',
        parentOwnerId: parent.id,
        parentOwnerName: parent.name,
        structuralOnly: true,
      },
    });
    return owner;
  }

  disconnect(target, { source = null, reason = 'unmounted' } = {}) {
    const owner = this.#owners.get(target);
    if (!owner?.connected) return null;

    owner.connected = false;
    this.#updateStarts.delete(target);

    return this.emit(RuntimeEventType.OWNER_DESTROYED, {
      owner,
      source: source || owner.source,
      correlation: this.#interactionCorrelation(),
      evidence: {
        level: EvidenceLevel.OBSERVATION,
        attribution: AttributionQuality.FRAMEWORK_REPORTED,
        confidence: 0.95,
      },
      payload: {
        lifecycle: String(reason || 'unmounted'),
        instrumented: true,
      },
    });
  }

  ownerOf(target) {
    return _isToken(target) ? (this.#owners.get(target) || null) : null;
  }

  recordUpdateStarted(target, { source = null } = {}) {
    const owner = this.#owners.get(target);
    if (!owner?.connected) return null;

    const interactionId = this.#interactionId();
    const event = this.emit(RuntimeEventType.UPDATE_STARTED, {
      owner,
      source: source || owner.source,
      correlation: this.#interactionCorrelation(interactionId),
      evidence: {
        level: EvidenceLevel.OBSERVATION,
        attribution: AttributionQuality.FRAMEWORK_REPORTED,
        confidence: 0.95,
      },
      payload: {
        phase: 'before-update',
        timingScope: 'vue-lifecycle-window',
        renderOnly: false,
      },
    });

    this.#updateStarts.set(target, {
      eventId: event.id,
      startedAt: _now(),
      interactionId,
    });
    return event;
  }

  recordUpdateCompleted(target, { source = null } = {}) {
    const owner = this.#owners.get(target);
    if (!owner?.connected) return null;

    const start = this.#updateStarts.get(target) || null;
    const durationMs = Number.isFinite(start?.startedAt)
      ? Math.max(0, _now() - start.startedAt)
      : null;
    const interactionId = start?.interactionId || this.#interactionId();
    const correlation = {
      ...(start?.eventId ? { parentEventId: start.eventId } : {}),
      ...(interactionId ? { interactionId } : {}),
    };

    const event = this.emit(RuntimeEventType.UPDATE_COMPLETED, {
      owner,
      source: source || owner.source,
      correlation: Object.keys(correlation).length ? correlation : undefined,
      evidence: {
        level: EvidenceLevel.OBSERVATION,
        attribution: AttributionQuality.FRAMEWORK_REPORTED,
        confidence: 0.95,
      },
      payload: {
        phase: 'updated',
        durationMs,
        timingScope: 'beforeUpdate-to-updated',
        renderOnly: false,
        frameworkReportedHooks: true,
      },
    });

    this.#updateStarts.delete(target);
    return event;
  }

  recordError(target, error, {
    source = null,
    phase = 'component',
    info = null,
  } = {}) {
    const owner = this.ownerOf(target);
    return this.emit(RuntimeEventType.ERROR, {
      owner: owner?.connected ? owner : null,
      source: source || owner?.source || null,
      correlation: this.#interactionCorrelation(),
      evidence: {
        level: EvidenceLevel.OBSERVATION,
        attribution: AttributionQuality.FRAMEWORK_REPORTED,
        confidence: 0.95,
      },
      payload: {
        phase: String(phase || 'component'),
        info: info == null ? null : String(info),
        message: error?.message || String(error),
        stack: error?.stack || null,
      },
    });
  }

  recordResourceAcquired(target, {
    resourceId,
    resourceType = 'unknown',
    source = null,
  } = {}) {
    const owner = this.#owners.get(target);
    if (!owner?.connected || !resourceId) return null;

    return this.emit(RuntimeEventType.RESOURCE_ACQUIRED, {
      owner,
      source: source || owner.source,
      correlation: this.#interactionCorrelation(),
      evidence: _instrumentedEvidence(source || owner.source, EvidenceLevel.ATTRIBUTION),
      payload: {
        resourceId: String(resourceId),
        resourceType: String(resourceType || 'unknown'),
        ownership: 'explicit',
        instrumented: true,
      },
    });
  }

  recordResourceReleased(target, {
    resourceId,
    resourceType = 'unknown',
    source = null,
  } = {}) {
    const owner = this.#owners.get(target);
    if (!owner || !resourceId) return null;

    return this.emit(RuntimeEventType.RESOURCE_RELEASED, {
      owner,
      source: source || owner.source,
      correlation: this.#interactionCorrelation(),
      evidence: _instrumentedEvidence(source || owner.source),
      payload: {
        resourceId: String(resourceId),
        resourceType: String(resourceType || 'unknown'),
        ownership: 'explicit',
        instrumented: true,
      },
    });
  }

  createCapabilityResolver() {
    return (framework, capability) => framework === 'vue'
      ? this.capability(capability)
      : CapabilitySupport.UNSUPPORTED;
  }

  diagnosticsSnapshot(target) {
    const owner = this.ownerOf(target);
    return Object.freeze({
      ownerId: owner?.id || null,
      parentId: owner?.parentId || null,
      connected: !!owner?.connected,
      lifecycleGeneration: owner?.lifecycleGeneration ?? null,
      updateInProgress: this.#updateStarts.has(target),
      capturedAt: _now(),
    });
  }
}

const vueAdapter = new VueAdapter();

export { VueAdapter, vueAdapter };
