import React, { useEffect } from 'react';
import { EvidenceStore } from 'runtime-intelligence/core';
import {
  RuntimeIntelligenceProvider,
  createReactIntelligenceRuntime,
} from 'runtime-intelligence/react';
import { mountRuntimeIntelligencePanel } from 'runtime-intelligence/panel';

const store = new EvidenceStore({ maxEntries: 10000, privacyPolicy: false });
const runtime = createReactIntelligenceRuntime({
  store,
  profilingEnabled: true,
});

export function RuntimeIntelligenceRoot({ children }) {
  useEffect(() => {
    runtime.start();
    const panel = mountRuntimeIntelligencePanel({
      store,
      collapsed: false,
    });
    window.__UNINSTRUMENTED_LAB_RUNTIME__ = runtime;
    window.__UNINSTRUMENTED_LAB_STORE__ = store;
    window.__UNINSTRUMENTED_LAB_PANEL__ = panel;

    return () => {
      if (window.__UNINSTRUMENTED_LAB_PANEL__ === panel) delete window.__UNINSTRUMENTED_LAB_PANEL__;
      if (window.__UNINSTRUMENTED_LAB_RUNTIME__ === runtime) delete window.__UNINSTRUMENTED_LAB_RUNTIME__;
      if (window.__UNINSTRUMENTED_LAB_STORE__ === store) delete window.__UNINSTRUMENTED_LAB_STORE__;
      panel.destroy();
      runtime.stop();
    };
  }, []);

  return (
    <RuntimeIntelligenceProvider
      runtime={runtime}
      name="UninstrumentedHostileApp.Root"
      profileRoot={true}
    >
      {children}
    </RuntimeIntelligenceProvider>
  );
}
