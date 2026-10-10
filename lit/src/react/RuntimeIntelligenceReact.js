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
import { ReactIntelligenceRuntime } from './ReactIntelligenceRuntime.js';

const RuntimeIntelligenceContext = createContext(null);
const RuntimeIntelligenceOwnerContext = createContext(null);

function _profilerCallback(adapter, token, name, source = null, parentToken = null) {
  return (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    try {
      if (!adapter.isManaged(token)) adapter.connect(token, { name, source });
      if (parentToken) adapter.linkParent?.(token, parentToken);
      adapter.recordProfilerRender(token, { id, phase, actualDuration, baseDuration, startTime, commitTime, source });
    } catch { /* diagnostics must never break React */ }
  };
}

function RuntimeIntelligenceProvider({
  children,
  name = 'react-root',
  source = null,
  enabled = true,
  profilingEnabled = true,
  runtime: externalRuntime = null,
  store = evidenceStore,
}) {
  const ownsRuntime = externalRuntime == null;
  const runtimeRef = useRef(null);
  if (!runtimeRef.current) runtimeRef.current = externalRuntime || new ReactIntelligenceRuntime({ store, profilingEnabled });
  const runtime = runtimeRef.current;
  const tokenRef = useRef({});
  const token = tokenRef.current;

  useEffect(() => {
    if (!enabled) return undefined;
    runtime.start();
    if (!runtime.adapter.isManaged(token)) runtime.adapter.connect(token, { name, source });
    return () => {
      try { runtime.adapter.disconnect(token, { source }); } catch { /* noop */ }
      if (ownsRuntime) runtime.stop();
    };
  }, [enabled, name, source, ownsRuntime, runtime, token]);

  const onRender = useMemo(() => _profilerCallback(runtime.adapter, token, name, source), [runtime, token, name, source]);
  const value = useMemo(() => Object.freeze({ runtime, adapter: runtime.adapter, store: runtime.store, enabled }), [runtime, enabled]);
  const ownerValue = useMemo(() => Object.freeze({ runtime, adapter: runtime.adapter, token, name, source }), [runtime, token, name, source]);

  if (!enabled) return createElement(RuntimeIntelligenceContext.Provider, { value }, children);
  return createElement(
    RuntimeIntelligenceContext.Provider,
    { value },
    createElement(
      RuntimeIntelligenceOwnerContext.Provider,
      { value: ownerValue },
      createElement(Profiler, { id: name, onRender }, children),
    ),
  );
}

function RuntimeIntelligenceProfiler({ children, name, source = null, enabled = true }) {
  const context = useContext(RuntimeIntelligenceContext);
  const parentOwner = useContext(RuntimeIntelligenceOwnerContext);
  const tokenRef = useRef({});
  const token = tokenRef.current;
  const runtime = context?.runtime || null;

  useEffect(() => {
    if (!enabled || !runtime) return undefined;
    if (!runtime.adapter.isManaged(token)) runtime.adapter.connect(token, { name, source });
    if (parentOwner?.token) runtime.adapter.linkParent?.(token, parentOwner.token);
    return () => { try { runtime.adapter.disconnect(token, { source }); } catch { /* noop */ } };
  }, [enabled, runtime, token, name, source, parentOwner]);

  const onRender = useMemo(
    () => runtime ? _profilerCallback(runtime.adapter, token, name, source, parentOwner?.token || null) : null,
    [runtime, token, name, source, parentOwner],
  );
  const ownerValue = useMemo(
    () => runtime ? Object.freeze({ runtime, adapter: runtime.adapter, token, name, source }) : null,
    [runtime, token, name, source],
  );

  if (!enabled || !runtime || !onRender) return children;
  return createElement(
    RuntimeIntelligenceOwnerContext.Provider,
    { value: ownerValue },
    createElement(Profiler, { id: name, onRender }, children),
  );
}

function useRuntimeIntelligence() { return useContext(RuntimeIntelligenceContext); }
function useRuntimeOwner() { return useContext(RuntimeIntelligenceOwnerContext); }

function useRuntimeEffect(effect, deps, { id = 'effect', source = null, kind = 'effect' } = {}) {
  const owner = useRuntimeOwner();
  useEffect(() => {
    if (!owner?.runtime) return effect();
    try { owner.adapter.recordEffectStarted(owner.token, id, { source: source || owner.source, kind }); } catch { /* noop */ }
    let cleanup;
    try { cleanup = effect(); }
    catch (error) {
      try { owner.runtime.store.emit({ type: 'error', framework: { name: 'react' }, owner: owner.adapter.ownerOf?.(owner.token), source: source || owner.source, payload: { phase: 'effect', message: error?.message || String(error), stack: error?.stack || null } }); } catch { /* noop */ }
      throw error;
    }
    return () => {
      try { if (typeof cleanup === 'function') cleanup(); }
      finally { try { owner.adapter.recordEffectCleanup(owner.token, id, { source: source || owner.source, kind }); } catch { /* noop */ } }
    };
  }, deps);
}

function useRuntimeResource(resourceId, resourceType = 'unknown', { active = true, source = null } = {}) {
  const owner = useRuntimeOwner();
  useEffect(() => {
    if (!active || !owner?.runtime || !resourceId) return undefined;
    try { owner.adapter.recordResourceAcquired(owner.token, { resourceId, resourceType, source: source || owner.source }); } catch { /* noop */ }
    return () => { try { owner.adapter.recordResourceReleased(owner.token, { resourceId, resourceType, source: source || owner.source }); } catch { /* noop */ } };
  }, [active, owner, resourceId, resourceType, source]);
}

function useRuntimeTrackedState(initialValue, { key = 'state', source = null } = {}) {
  const owner = useRuntimeOwner();
  const [state, setState] = useState(initialValue);
  const committedRef = useRef(state);
  const mountedRef = useRef(false);

  const setTrackedState = useCallback(action => {
    try {
      owner?.adapter?.recordUpdateRequested(owner.token, {
        reason: 'tracked-state-set',
        stateKey: key,
        oldValue: committedRef.current,
        newValue: typeof action === 'function' ? undefined : action,
        source: source || owner.source,
      });
    } catch { /* noop */ }
    setState(action);
  }, [owner, key, source]);

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; committedRef.current = state; return; }
    const previous = committedRef.current;
    committedRef.current = state;
    try { owner?.adapter?.recordStateChange(owner.token, key, previous, state, { source: source || owner.source }); } catch { /* noop */ }
  }, [state, owner, key, source]);

  return [state, setTrackedState];
}

export {
  RuntimeIntelligenceContext,
  RuntimeIntelligenceOwnerContext,
  RuntimeIntelligenceProvider,
  RuntimeIntelligenceProfiler,
  useRuntimeIntelligence,
  useRuntimeOwner,
  useRuntimeEffect,
  useRuntimeResource,
  useRuntimeTrackedState,
};
