import {
  Profiler,
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { evidenceStore } from '../core/evidence-store.js';
import { ReactIntelligenceRuntime } from './ReactIntelligenceRuntime.js';

const RuntimeIntelligenceContext = createContext(null);

function _profilerCallback(adapter, token, name, source = null) {
  return (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    try {
      if (!adapter.isManaged(token)) adapter.connect(token, { name, source });
      adapter.recordProfilerRender(token, {
        id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
        source,
      });
    } catch { /* diagnostics must never break React */ }
  };
}

function RuntimeIntelligenceProvider({
  children,
  name = 'react-root',
  enabled = true,
  profilingEnabled = true,
  runtime: externalRuntime = null,
  store = evidenceStore,
}) {
  const ownsRuntime = externalRuntime == null;
  const runtimeRef = useRef(null);
  if (!runtimeRef.current) {
    runtimeRef.current = externalRuntime || new ReactIntelligenceRuntime({ store, profilingEnabled });
  }
  const runtime = runtimeRef.current;
  const tokenRef = useRef({});
  const token = tokenRef.current;

  useEffect(() => {
    if (!enabled) return undefined;
    runtime.start();
    if (!runtime.adapter.isManaged(token)) runtime.adapter.connect(token, { name });
    return () => {
      try { runtime.adapter.disconnect(token); } catch { /* noop */ }
      if (ownsRuntime) runtime.stop();
    };
  }, [enabled, name, ownsRuntime, runtime, token]);

  const onRender = useMemo(
    () => _profilerCallback(runtime.adapter, token, name),
    [runtime, token, name],
  );
  const value = useMemo(() => Object.freeze({ runtime, adapter: runtime.adapter, store: runtime.store, enabled }), [runtime, enabled]);

  if (!enabled) return createElement(RuntimeIntelligenceContext.Provider, { value }, children);
  return createElement(
    RuntimeIntelligenceContext.Provider,
    { value },
    createElement(Profiler, { id: name, onRender }, children),
  );
}

function RuntimeIntelligenceProfiler({ children, name, source = null, enabled = true }) {
  const context = useContext(RuntimeIntelligenceContext);
  const tokenRef = useRef({});
  const token = tokenRef.current;
  const runtime = context?.runtime || null;

  useEffect(() => {
    if (!enabled || !runtime) return undefined;
    if (!runtime.adapter.isManaged(token)) runtime.adapter.connect(token, { name, source });
    return () => {
      try { runtime.adapter.disconnect(token, { source }); } catch { /* noop */ }
    };
  }, [enabled, runtime, token, name, source]);

  const onRender = useMemo(
    () => runtime ? _profilerCallback(runtime.adapter, token, name, source) : null,
    [runtime, token, name, source],
  );

  if (!enabled || !runtime || !onRender) return children;
  return createElement(Profiler, { id: name, onRender }, children);
}

function useRuntimeIntelligence() {
  return useContext(RuntimeIntelligenceContext);
}

export {
  RuntimeIntelligenceContext,
  RuntimeIntelligenceProvider,
  RuntimeIntelligenceProfiler,
  useRuntimeIntelligence,
};
