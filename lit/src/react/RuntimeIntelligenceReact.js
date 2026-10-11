import {
  Profiler,
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { evidenceStore } from '../core/evidence-store.js';
import {
  AttributionQuality,
  EvidenceLevel,
  RuntimeEventType,
} from '../core/evidence-protocol.js';
import { SourceProvenanceKind } from '../core/source-provenance.js';
import { ReactIntelligenceRuntime } from './ReactIntelligenceRuntime.js';
import {
  applicationStackFromReactProvenance,
  captureReactInvocationSource,
  captureReactRegistrationSource,
  captureReactStack,
} from './react-source-provenance.js';

const RuntimeIntelligenceContext = createContext(null);
const RuntimeIntelligenceOwnerContext = createContext(null);

function _profilerCallback(
  adapter,
  token,
  name,
  source = null,
  sourceProvenance = null,
  parentToken = null,
) {
  return (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    try {
      if (!adapter.isManaged(token)) {
        adapter.connect(token, { name, source, sourceProvenance });
      }
      if (parentToken) adapter.linkParent?.(token, parentToken);
      adapter.recordProfilerRender(token, {
        id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
        source,
        sourceProvenance,
      });
    } catch { /* diagnostics must never break React */ }
  };
}

function RuntimeIntelligenceProvider({
  children,
  name = 'react-root',
  source = null,
  enabled = true,
  profilingEnabled = true,
  profileRoot = true,
  runtime: externalRuntime = null,
  store = evidenceStore,
}) {
  const ownsRuntime = externalRuntime == null;
  const runtimeRef = useRef(externalRuntime || null);

  // Production-safe disabled path: do not construct the runtime merely because
  // the provider component exists. Creation is explicit and lazy on enable.
  if (enabled && !runtimeRef.current) {
    runtimeRef.current = new ReactIntelligenceRuntime({
      store,
      profilingEnabled,
    });
  }

  const runtime = runtimeRef.current;
  const activeRuntime = enabled ? runtime : null;
  const tokenRef = useRef({});
  const token = tokenRef.current;

  useEffect(() => {
    if (!enabled || !runtime) return undefined;
    runtime.start();
    if (!runtime.adapter.isManaged(token)) {
      runtime.adapter.connect(token, { name, source });
    }
    return () => {
      try { runtime.adapter.disconnect(token, { source }); } catch {}
      if (ownsRuntime) runtime.stop();
    };
  }, [enabled, name, source, ownsRuntime, runtime, token]);

  const onRender = useMemo(
    () => activeRuntime
      ? _profilerCallback(activeRuntime.adapter, token, name, source)
      : null,
    [activeRuntime, token, name, source],
  );
  const value = useMemo(
    () => Object.freeze({
      runtime: activeRuntime,
      adapter: activeRuntime?.adapter || null,
      store: activeRuntime?.store || store,
      enabled: !!activeRuntime,
    }),
    [activeRuntime, store],
  );
  const ownerValue = useMemo(
    () => activeRuntime
      ? Object.freeze({
        runtime: activeRuntime,
        adapter: activeRuntime.adapter,
        token,
        name,
        source,
        sourceProvenance: null,
      })
      : null,
    [activeRuntime, token, name, source],
  );

  const ownedChildren = activeRuntime && profileRoot && onRender
    ? createElement(Profiler, { id: name, onRender }, children)
    : children;

  return createElement(
    RuntimeIntelligenceContext.Provider,
    { value },
    activeRuntime
      ? createElement(
        RuntimeIntelligenceOwnerContext.Provider,
        { value: ownerValue },
        ownedChildren,
      )
      : children,
  );
}

function RuntimeIntelligenceProfiler({
  children,
  name,
  source = null,
  sourceProvenance = null,
  enabled = true,
}) {
  const context = useContext(RuntimeIntelligenceContext);
  const parentOwner = useContext(RuntimeIntelligenceOwnerContext);
  const tokenRef = useRef({});
  const token = tokenRef.current;
  const runtime = context?.runtime || null;

  useEffect(() => {
    if (!enabled || !runtime) return undefined;
    if (!runtime.adapter.isManaged(token)) {
      runtime.adapter.connect(token, { name, source, sourceProvenance });
    }
    if (parentOwner?.token) runtime.adapter.linkParent?.(token, parentOwner.token);
    return () => {
      try { runtime.adapter.disconnect(token, { source, sourceProvenance }); } catch {}
    };
  }, [enabled, runtime, token, name, source, sourceProvenance, parentOwner]);

  const onRender = useMemo(
    () => runtime
      ? _profilerCallback(
        runtime.adapter,
        token,
        name,
        source,
        sourceProvenance,
        parentOwner?.token || null,
      )
      : null,
    [runtime, token, name, source, sourceProvenance, parentOwner],
  );
  const ownerValue = useMemo(
    () => runtime
      ? Object.freeze({
        runtime,
        adapter: runtime.adapter,
        token,
        name,
        source,
        sourceProvenance,
      })
      : null,
    [runtime, token, name, source, sourceProvenance],
  );

  if (!enabled || !runtime || !onRender) return children;
  return createElement(
    RuntimeIntelligenceOwnerContext.Provider,
    { value: ownerValue },
    createElement(Profiler, { id: name, onRender }, children),
  );
}

function withRuntimeIntelligence(Component, {
  name = null,
  source = null,
  enabled = true,
} = {}) {
  const boundaryName = name
    || Component?.displayName
    || Component?.name
    || 'ReactComponent';
  const registration = captureReactRegistrationSource({
    source,
    stack: captureReactStack(),
    functionName: boundaryName,
    kind: SourceProvenanceKind.COMPONENT_REGISTRATION,
    basis: 'react-hoc-registration-stack',
  });
  const boundarySource = registration.source || source;

  function RuntimeInstrumentedComponent(props) {
    return createElement(
      RuntimeIntelligenceProfiler,
      {
        name: boundaryName,
        source: boundarySource,
        sourceProvenance: registration.provenance,
        enabled,
      },
      createElement(Component, props),
    );
  }

  RuntimeInstrumentedComponent.displayName = `RuntimeIntelligence(${boundaryName})`;
  return RuntimeInstrumentedComponent;
}

function useRuntimeIntelligence() {
  return useContext(RuntimeIntelligenceContext);
}

function useRuntimeOwner() {
  return useContext(RuntimeIntelligenceOwnerContext);
}

function useRuntimeEffect(effect, deps, {
  id = 'effect',
  source = null,
  kind = 'effect',
} = {}) {
  const owner = useRuntimeOwner();
  const registrationRef = useRef(undefined);
  if (registrationRef.current === undefined) {
    registrationRef.current = captureReactRegistrationSource({
      source,
      stack: captureReactStack(),
      kind: SourceProvenanceKind.REGISTRATION,
      basis: 'react-effect-registration-stack',
    });
  }
  const registration = registrationRef.current;
  const effectiveSource = registration.source || source || owner?.source || null;
  const effectiveProvenance = registration.provenance || null;

  useEffect(() => {
    if (!owner?.runtime) return effect();

    try {
      owner.adapter.recordEffectStarted(owner.token, id, {
        source: effectiveSource,
        sourceProvenance: effectiveProvenance,
        kind,
      });
    } catch {}

    let cleanup;
    try {
      cleanup = effect();
    } catch (error) {
      try {
        const captured = captureReactInvocationSource({
          source,
          stack: error?.stack || null,
          kind: SourceProvenanceKind.ERROR_ORIGIN,
          basis: 'react-effect-error-stack',
        });
        const errorSource = captured.source || effectiveSource;
        owner.runtime.store.emit({
          type: RuntimeEventType.ERROR,
          framework: { name: 'react' },
          owner: owner.adapter.ownerOf?.(owner.token),
          source: errorSource,
          correlation: owner.runtime.correlationContext?.correlation?.(),
          evidence: captured.source ? {
            level: EvidenceLevel.ATTRIBUTION,
            attribution: AttributionQuality.SOURCE_ATTRIBUTED,
            confidence: 0.95,
          } : undefined,
          payload: {
            phase: 'effect',
            message: error?.message || String(error),
            stack: applicationStackFromReactProvenance(captured.provenance)
              || error?.stack
              || null,
            ...(captured.provenance
              ? { sourceProvenance: captured.provenance }
              : {}),
          },
        });
      } catch {}
      throw error;
    }

    return () => {
      try {
        if (typeof cleanup === 'function') cleanup();
      } finally {
        try {
          owner.adapter.recordEffectCleanup(owner.token, id, {
            source: effectiveSource,
            sourceProvenance: effectiveProvenance,
            kind,
          });
        } catch {}
      }
    };
  }, deps);
}

function useRuntimeResource(resourceId, resourceType = 'unknown', {
  active = true,
  source = null,
} = {}) {
  const owner = useRuntimeOwner();
  const registrationRef = useRef(undefined);
  if (registrationRef.current === undefined) {
    registrationRef.current = captureReactRegistrationSource({
      source,
      stack: captureReactStack(),
      kind: SourceProvenanceKind.REGISTRATION,
      basis: 'react-resource-registration-stack',
    });
  }
  const registration = registrationRef.current;
  const effectiveSource = registration.source || source || owner?.source || null;
  const effectiveProvenance = registration.provenance || null;

  useEffect(() => {
    if (!active || !owner?.runtime || !resourceId) return undefined;
    try {
      owner.adapter.recordResourceAcquired(owner.token, {
        resourceId,
        resourceType,
        source: effectiveSource,
        sourceProvenance: effectiveProvenance,
      });
    } catch {}
    return () => {
      try {
        owner.adapter.recordResourceReleased(owner.token, {
          resourceId,
          resourceType,
          source: effectiveSource,
          sourceProvenance: effectiveProvenance,
        });
      } catch {}
    };
  }, [active, owner, resourceId, resourceType, effectiveSource, effectiveProvenance]);
}

function useRuntimeTrackedState(initialValue, {
  key = 'state',
  source = null,
} = {}) {
  const owner = useRuntimeOwner();
  const [state, setState] = useState(initialValue);
  const committedRef = useRef(state);
  const mountedRef = useRef(false);
  const lastUpdateRef = useRef(null);
  const registrationRef = useRef(undefined);

  if (registrationRef.current === undefined) {
    registrationRef.current = captureReactRegistrationSource({
      source,
      stack: captureReactStack(),
      kind: SourceProvenanceKind.REGISTRATION,
      basis: 'react-state-registration-stack',
    });
  }
  const registration = registrationRef.current;

  const setTrackedState = useCallback(action => {
    const captured = captureReactInvocationSource({
      source,
      stack: captureReactStack(),
      kind: SourceProvenanceKind.INVOCATION,
      basis: 'react-state-update-stack',
    });
    const effectiveSource = captured.source
      || registration.source
      || source
      || owner?.source
      || null;
    const effectiveProvenance = captured.provenance
      || registration.provenance
      || null;
    lastUpdateRef.current = {
      source: effectiveSource,
      provenance: effectiveProvenance,
    };

    try {
      owner?.adapter?.recordUpdateRequested(owner.token, {
        reason: 'tracked-state-set',
        stateKey: key,
        oldValue: committedRef.current,
        newValue: typeof action === 'function' ? undefined : action,
        source: effectiveSource,
        sourceProvenance: effectiveProvenance,
      });
    } catch {}
    setState(action);
  }, [owner, key, source, registration]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      committedRef.current = state;
      return;
    }
    const previous = committedRef.current;
    committedRef.current = state;
    const lastUpdate = lastUpdateRef.current;
    lastUpdateRef.current = null;
    try {
      owner?.adapter?.recordStateChange(
        owner.token,
        key,
        previous,
        state,
        {
          source: lastUpdate?.source
            || registration.source
            || source
            || owner?.source
            || null,
          sourceProvenance: lastUpdate?.provenance
            || registration.provenance
            || null,
        },
      );
    } catch {}
  }, [state, owner, key, source, registration]);

  return [state, setTrackedState];
}

export {
  RuntimeIntelligenceContext,
  RuntimeIntelligenceOwnerContext,
  RuntimeIntelligenceProvider,
  RuntimeIntelligenceProfiler,
  withRuntimeIntelligence,
  useRuntimeIntelligence,
  useRuntimeOwner,
  useRuntimeEffect,
  useRuntimeResource,
  useRuntimeTrackedState,
};
