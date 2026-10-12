import { LitElement } from 'lit';
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';

const enabled = import.meta.env.DEV
  && localStorage.getItem('runtime-intelligence') === 'on';

const loaded = await loadRuntimeIntelligence({
  enabled,
  framework: 'lit',
  panel: true,
});

let AppElement = LitElement;
let activation = null;
let panel = null;
let store = null;

if (loaded.enabled) {
  activation = loaded.frameworkModule.configureLitRuntimeIntelligence({
    enabled: true,
    tools: true,
  });
  AppElement = loaded.frameworkModule.LitDebugMixin(LitElement);
  ({ evidenceStore: store } = await import('runtime-intelligence/core'));
  panel = loaded.panelModule.mountRuntimeIntelligencePanel({
    store,
    collapsed: false,
  });
}

const runtime = Object.freeze({
  enabled: loaded.enabled,
  panel,
  store,
  activation,
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    panel?.destroy();
    activation?.stop();
  });
}

export { AppElement, runtime };
