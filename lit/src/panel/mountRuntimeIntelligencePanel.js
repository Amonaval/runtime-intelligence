import './LdsDebugPanel.js';
import { bridgeRuntimeEvidenceToPanel } from './runtime-evidence-bridge.js';

/**
 * Mount the canonical mature Runtime Intelligence panel.
 *
 * The panel remains a LitElement internally, but consumers (including React)
 * interact only with this framework-neutral mount contract and UREP store.
 */
function mountRuntimeIntelligencePanel({
  store,
  documentTarget = typeof document !== 'undefined' ? document : null,
  windowTarget = typeof window !== 'undefined' ? window : null,
  collapsed = true,
} = {}) {
  if (!store || typeof store.snapshot !== 'function' || typeof store.subscribe !== 'function') {
    throw new TypeError('mountRuntimeIntelligencePanel requires an EvidenceStore-compatible store.');
  }
  if (!documentTarget?.createElement || !documentTarget.body || !windowTarget) {
    return Object.freeze({ element: null, bridge: null, refresh() {}, setCollapsed() {}, destroy() {} });
  }

  const bridge = bridgeRuntimeEvidenceToPanel({ store, windowTarget });
  const element = documentTarget.createElement('lds-debug-panel');
  element.setAttribute('data-runtime-intelligence-panel', 'canonical');
  documentTarget.body.appendChild(element);

  if (!collapsed) {
    element._open = true;
    element._refresh?.();
    element.requestUpdate?.();
  }

  return Object.freeze({
    element,
    bridge,
    refresh() {
      element._refresh?.();
      element.requestUpdate?.();
    },
    setCollapsed(next) {
      element._open = !next;
      if (!next) element._refresh?.();
      element.requestUpdate?.();
    },
    destroy() {
      bridge.stop();
      element.remove();
    },
  });
}

export { mountRuntimeIntelligencePanel };
