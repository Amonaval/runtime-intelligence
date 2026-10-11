import './LdsDebugPanel.js';
import { bridgeRuntimeEvidenceToPanel } from './runtime-evidence-bridge.js';
import { installRuntimeOpportunitiesPanel } from './opportunities-panel-presentation.js';
import {
  createRuntimeReport,
  downloadRuntimeReport,
  downloadRuntimeReports,
  enhanceRuntimeIssueForFramework,
} from './runtime-panel-presentation.js';

function _frameworkFromStore(store) {
  try {
    const event = store.snapshot().find(item => {
      const name = item?.framework?.name;
      return name && !['browser', 'runtime', 'unknown', 'fault-lab-injected'].includes(name);
    });
    return event?.framework?.name || null;
  } catch {
    return null;
  }
}

/**
 * Mount the canonical mature Runtime Intelligence panel.
 *
 * The panel remains a LitElement internally, but consumers (including React,
 * Vue and future adapters) interact only with this framework-neutral mount
 * contract and UREP store.
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
    return Object.freeze({
      element: null,
      bridge: null,
      refresh() {},
      setCollapsed() {},
      createReport() { return createRuntimeReport({ store, windowTarget }); },
      downloadJson() { return null; },
      downloadHtml() { return null; },
      downloadBoth() { return { json: null, html: null }; },
      destroy() {},
    });
  }

  const bridge = bridgeRuntimeEvidenceToPanel({ store, windowTarget });
  const bridgeSourceResolver = typeof windowTarget.__LDS_TAG_TO_FILE__ === 'function'
    ? windowTarget.__LDS_TAG_TO_FILE__
    : null;
  if (bridgeSourceResolver) {
    windowTarget.__LDS_TAG_TO_FILE__ = tag => {
      const resolved = bridgeSourceResolver(tag);
      const syntheticFallback = `src/components/${tag}/${tag}.js`;
      return resolved === syntheticFallback || resolved === 'src/components//.js'
        ? ''
        : resolved;
    };
  }
  const element = documentTarget.createElement('lds-debug-panel');
  element.setAttribute('data-runtime-intelligence-panel', 'canonical');
  documentTarget.body.appendChild(element);

  const opportunitiesPresentation = installRuntimeOpportunitiesPanel({
    panel: element,
    store,
    windowTarget,
    documentTarget,
  });

  const resolveFramework = () => windowTarget.__LDS_RUNTIME_FRAMEWORK__
    || _frameworkFromStore(store)
    || 'unknown';
  const originalRenderIssueCard = typeof element._renderIssueCard === 'function'
    ? element._renderIssueCard.bind(element)
    : null;
  if (originalRenderIssueCard) {
    element._renderIssueCard = issue => originalRenderIssueCard(
      enhanceRuntimeIssueForFramework(issue, { framework: resolveFramework() }),
    );
  }

  const createReport = (note = '') => {
    try { element._refresh?.(); } catch {}
    return createRuntimeReport({
      baseReport: element._getActiveReport?.() || {},
      store,
      windowTarget,
      framework: resolveFramework(),
      note: note || element._reportNote || '',
    });
  };

  const downloadJson = () => downloadRuntimeReport({
    report: createReport(),
    format: 'json',
    documentTarget,
  });
  const downloadHtml = () => downloadRuntimeReport({
    report: createReport(),
    format: 'html',
    documentTarget,
  });
  const downloadBoth = () => downloadRuntimeReports({
    report: createReport(),
    documentTarget,
  });

  element._download = downloadJson;
  element._downloadHtml = downloadHtml;

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
    createReport,
    downloadJson,
    downloadHtml,
    downloadBoth,
    destroy() {
      opportunitiesPresentation.destroy?.();
      bridge.stop();
      element.remove();
    },
  });
}

export { mountRuntimeIntelligencePanel };
