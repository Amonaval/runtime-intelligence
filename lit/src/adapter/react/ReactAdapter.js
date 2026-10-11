import { FrameworkAdapter } from '../FrameworkAdapter.js';
import {
  AttributionQuality,
  CapabilitySupport,
  EvidenceLevel,
  FrameworkCapability,
  RuntimeEventType,
  summarizeRuntimeValue,
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

function _finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
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

function _provenancePayload(sourceProvenance) {
  return sourceProvenance ? { sourceProvenance } : {};
}

class ReactAdapter extends FrameworkAdapter {
  #profilingEnabled;
  #correlationContext;
  #owners = new WeakMap();
  #physicalInstances = new WeakMap();
  #lifecycleGenerations = new WeakMap();
  #pendingRequests = new WeakMap();

  constructor(options = {}) {
    const profilingEnabled = options.profilingEnabled === true;
    super({
      ...options,
      framework: 'react',
      adapterVersion: '2.4',
      capabilities: {
        [FrameworkCapability.OWNER_LIFECYCLE]: CapabilitySupport.PARTIAL,
        [FrameworkCapability.UPDATE_LIFECYCLE]: CapabilitySupport.PARTIAL,
        [FrameworkCapability.UPDATE_CAUSE]: CapabilitySupport.UNSUPPORTED,
        [FrameworkCapability.STATE_CHANGE]: CapabilitySupport.PARTIAL,
        [FrameworkCapability.RENDER_TIMING]: profilingEnabled
          ? CapabilitySupport.FRAMEWORK_REPORTED
          : CapabilitySupport.PARTIAL,
        [FrameworkCapability.SOURCE_LOCATION]: CapabilitySupport.PARTIAL,
        [FrameworkCapability.REACTIVE_DEPENDENCY]: CapabilitySupport.UNSUPPORTED,
        [FrameworkCapability.RESOURCE_OWNERSHIP]: CapabilitySupport.PARTIAL,
        [FrameworkCapability.EFFECT_LIFECYCLE]: CapabilitySupport.PARTIAL,
        ...(options.capabilities || {}),
      },
    });
    this.#profilingEnabled = profilingEnabled;
    this.#correlationContext = options.correlationContext || null;
  }

  get profilingEnabled() {
    return this.#profilingEnabled;
  }

  isManaged(target) {
    return _isToken(target) && !!this.#owners.get(target)?.connected;
  }

  #interactionId() {
    return this.#correlationContext?.currentInteraction?.() || null;
  }

  #interactionCorrelation() {
    const interactionId = this.#interactionId();
    return interactionId ? { interactionId } : undefined;
  }

  connect(target, {
    name = 'react-component',
    source = null,
    sourceProvenance = null,
    parentId = null,
  } = {}) {
    if (!_isToken(target)) return null;

    const existing = this.#owners.get(target);
    if (existing?.connected) {
      if (!existing.parentId && parentId) existing.parentId = parentId;
      if (!existing.source && source) existing.source = source;
      if (!existing.sourceProvenance && sourceProvenance) {
        existing.sourceProvenance = sourceProvenance;
      }
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
      id: `react-${instanceId}-life-${lifecycleGeneration}`,
      instanceId,
      lifecycleGeneration,
      kind: 'component',
      name: String(name || 'react-component'),
      parentId,
      connected: true,
      source,
      sourceProvenance,
    };

    this.#owners.set(target, owner);
    this.#pendingRequests.delete(target);

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
        lifecycle: 'effect-mounted',
        instrumented: true,
        ..._provenancePayload(sourceProvenance),
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
        diagnostic: 'react.owner.parent-linked',
        parentOwnerId: parent.id,
        parentOwnerName: parent.name,
        ..._provenancePayload(owner.sourceProvenance),
      },
    });
    return owner;
  }

  disconnect(target, {
    source = null,
    sourceProvenance = null,
    reason = 'effect-cleanup',
  } = {}) {
    const owner = this.#owners.get(target);
    if (!owner?.connected) return null;

    owner.connected = false;
    this.#pendingRequests.delete(target);
    const effectiveSource = source || owner.source;
    const effectiveProvenance = sourceProvenance || owner.sourceProvenance || null;

    return this.emit(RuntimeEventType.OWNER_DESTROYED, {
      owner,
      source: effectiveSource,
      correlation: this.#interactionCorrelation(),
      evidence: {
        level: EvidenceLevel.OBSERVATION,
        attribution: AttributionQuality.FRAMEWORK_REPORTED,
        confidence: 0.95,
      },
      payload: {
        lifecycle: String(reason || 'effect-cleanup'),
        instrumented: true,
        ..._provenancePayload(effectiveProvenance),
      },
    });
  }

  ownerOf(target) {
    return this.#owners.get(target) || null;
  }

  recordUpdateRequested(target, {
    source = null,
    sourceProvenance = null,
    reason = 'instrumented-update',
    stateKey = null,
    oldValue = undefined,
    newValue = undefined,
    interactionId = null,
  } = {}) {
    const owner = this.#owners.get(target);
    if (!owner?.connected) return null;

    const activeInteractionId = interactionId || this.#interactionId();
    const event = this.emit(RuntimeEventType.UPDATE_REQUESTED, {
      owner,
      source,
      correlation: activeInteractionId ? { interactionId: activeInteractionId } : undefined,
      evidence: _instrumentedEvidence(source),
      payload: {
        reason: String(reason || 'instrumented-update'),
        stateKey: stateKey == null ? null : String(stateKey),
        oldValue: stateKey == null ? undefined : summarizeRuntimeValue(oldValue),
        newValue: stateKey == null ? undefined : summarizeRuntimeValue(newValue),
        sameReference: stateKey == null || oldValue === undefined || newValue === undefined
          ? null
          : Object.is(oldValue, newValue),
        instrumented: true,
        ..._provenancePayload(sourceProvenance),
      },
    });

    const pending = this.#pendingRequests.get(target) || [];
    pending.push(event.id);
    while (pending.length > 20) pending.shift();
    this.#pendingRequests.set(target, pending);
    return event;
  }

  recordStateChange(target, key, oldValue, newValue, {
    source = null,
    sourceProvenance = null,
  } = {}) {
    const owner = this.#owners.get(target);
    if (!owner?.connected || key == null) return null;

    return this.emit(RuntimeEventType.STATE_CHANGED, {
      owner,
      source,
      correlation: this.#interactionCorrelation(),
      evidence: _instrumentedEvidence(source),
      payload: {
        property: String(key),
        oldValue: summarizeRuntimeValue(oldValue),
        newValue: summarizeRuntimeValue(newValue),
        sameReference: Object.is(oldValue, newValue),
        instrumented: true,
        ..._provenancePayload(sourceProvenance),
      },
    });
  }

  recordProfilerRender(target, {
    id = null,
    phase = 'update',
    actualDuration = null,
    baseDuration = null,
    startTime = null,
    commitTime = null,
    source = null,
    sourceProvenance = null,
  } = {}) {
    const owner = this.#owners.get(target);
    if (!owner?.connected) return null;

    const pendingRequestEventIds = [...(this.#pendingRequests.get(target) || [])];
    const interactionId = this.#interactionId();
    const correlation = {
      ...(pendingRequestEventIds.length === 1
        ? { parentEventId: pendingRequestEventIds[0] }
        : {}),
      ...(interactionId ? { interactionId } : {}),
    };
    const effectiveSource = source || owner.source || null;
    const effectiveProvenance = sourceProvenance || owner.sourceProvenance || null;

    const event = this.emit(RuntimeEventType.UPDATE_COMPLETED, {
      owner,
      source: effectiveSource,
      correlation: Object.keys(correlation).length ? correlation : undefined,
      evidence: {
        level: EvidenceLevel.OBSERVATION,
        attribution: AttributionQuality.FRAMEWORK_REPORTED,
        confidence: 1,
      },
      payload: {
        profilerId: id == null ? null : String(id),
        phase: String(phase || 'update'),
        actualDurationMs: _finiteOrNull(actualDuration),
        baseDurationMs: _finiteOrNull(baseDuration),
        startTime: _finiteOrNull(startTime),
        commitTime: _finiteOrNull(commitTime),
        pendingRequestCount: pendingRequestEventIds.length,
        pendingRequestEventIds,
        profilingEnabled: this.#profilingEnabled,
        ..._provenancePayload(effectiveProvenance),
      },
    });

    this.#pendingRequests.delete(target);
    return event;
  }

  createProfilerCallback(target, {
    source = null,
    sourceProvenance = null,
  } = {}) {
    let lifecycle = this.#owners.get(target) || null;
    return (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
      try {
        lifecycle ||= this.#owners.get(target) || null;
        if (!lifecycle?.connected || this.#owners.get(target) !== lifecycle) return null;
        return this.recordProfilerRender(target, {
          id,
          phase,
          actualDuration,
          baseDuration,
          startTime,
          commitTime,
          source,
          sourceProvenance,
        });
      } catch {
        return null;
      }
    };
  }

  recordEffectStarted(target, effectId, {
    source = null,
    sourceProvenance = null,
    kind = 'effect',
  } = {}) {
    const owner = this.#owners.get(target);
    if (!owner?.connected) return null;
    return this.emit(RuntimeEventType.DIAGNOSTIC, {
      owner,
      source,
      correlation: this.#interactionCorrelation(),
      evidence: _instrumentedEvidence(source),
      payload: {
        diagnostic: 'react.effect.started',
        effectId: String(effectId),
        effectKind: String(kind || 'effect'),
        ..._provenancePayload(sourceProvenance),
      },
    });
  }

  recordEffectCleanup(target, effectId, {
    source = null,
    sourceProvenance = null,
    kind = 'effect',
  } = {}) {
    const owner = this.#owners.get(target);
    if (!owner) return null;
    return this.emit(RuntimeEventType.DIAGNOSTIC, {
      owner,
      source,
      correlation: this.#interactionCorrelation(),
      evidence: _instrumentedEvidence(source),
      payload: {
        diagnostic: 'react.effect.cleanup',
        effectId: String(effectId),
        effectKind: String(kind || 'effect'),
        ..._provenancePayload(sourceProvenance),
      },
    });
  }

  recordResourceAcquired(target, {
    resourceId,
    resourceType = 'unknown',
    source = null,
    sourceProvenance = null,
  } = {}) {
    const owner = this.#owners.get(target);
    if (!owner?.connected || !resourceId) return null;
    return this.emit(RuntimeEventType.RESOURCE_ACQUIRED, {
      owner,
      source,
      correlation: this.#interactionCorrelation(),
      evidence: _instrumentedEvidence(source, EvidenceLevel.ATTRIBUTION),
      payload: {
        resourceId: String(resourceId),
        resourceType: String(resourceType || 'unknown'),
        instrumented: true,
        ..._provenancePayload(sourceProvenance),
      },
    });
  }

  recordResourceReleased(target, {
    resourceId,
    resourceType = 'unknown',
    source = null,
    sourceProvenance = null,
  } = {}) {
    const owner = this.#owners.get(target);
    if (!owner || !resourceId) return null;
    return this.emit(RuntimeEventType.RESOURCE_RELEASED, {
      owner,
      source,
      correlation: this.#interactionCorrelation(),
      evidence: _instrumentedEvidence(source),
      payload: {
        resourceId: String(resourceId),
        resourceType: String(resourceType || 'unknown'),
        instrumented: true,
        ..._provenancePayload(sourceProvenance),
      },
    });
  }

  createEffectBridge(target, effectId, {
    source = null,
    sourceProvenance = null,
    kind = 'effect',
  } = {}) {
    let lifecycle = this.#owners.get(target) || null;
    const current = () => {
      lifecycle ||= this.#owners.get(target) || null;
      return lifecycle && this.#owners.get(target) === lifecycle;
    };
    return Object.freeze({
      start: () => current() ? this.recordEffectStarted(target, effectId, {
        source,
        sourceProvenance,
        kind,
      }) : null,
      cleanup: () => current() ? this.recordEffectCleanup(target, effectId, {
        source,
        sourceProvenance,
        kind,
      }) : null,
    });
  }

  createCapabilityResolver() {
    return (framework, capability) => framework === 'react'
      ? this.capability(capability)
      : CapabilitySupport.UNSUPPORTED;
  }

  diagnosticsSnapshot(target) {
    const owner = this.#owners.get(target);
    const pending = this.#pendingRequests.get(target) || [];
    return Object.freeze({
      ownerId: owner?.id || null,
      parentId: owner?.parentId || null,
      connected: !!owner?.connected,
      lifecycleGeneration: owner?.lifecycleGeneration ?? null,
      pendingUpdateRequests: pending.length,
      capturedAt: _now(),
    });
  }
}

const reactAdapter = new ReactAdapter();

export { ReactAdapter, reactAdapter };
