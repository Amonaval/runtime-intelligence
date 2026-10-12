import './LdsDebugPanel.js';
import { createDiagnosticBeforeAfterSession } from './diagnostic-before-after.js';
import { installDiagnosticBeforeAfterPanel } from './diagnostic-before-after-panel.js';
import { createFindingVerificationSession } from './finding-verification-bridge.js';
import { enrichPinpointIssueSource } from './pinpoint-source-enrichment.js';
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

  let activeBeforeAfter = null;
  let element = null;
  const startBeforeAfter = options => {
    activeBeforeAfter = createDiagnosticBeforeAfterSession({ ...(options || {}), store });
    element?.requestUpdate?.();
    return activeBeforeAfter;
  };
  const startFindingVerification = (finding, options = {}) => {
    activeBeforeAfter = createFindingVerificationSession({ finding, store, ...(options || {}) });
    if (element) {
      if (typeof element._setTab === 'function') element._setTab('before-after');
      else element._tab = 'before-after';
      element.requestUpdate?.();
    }
    return activeBeforeAfter;
  };
  const getBeforeAfterSession = () => activeBeforeAfter;
  const getBeforeAfterState = () => activeBeforeAfter?.getState?.() || null;

  if (!documentTarget?.createElement || !documentTarget.body || !windowTarget) {
    return Object.freeze({
      element: null,
      bridge: null,
      refresh() {},
      setCollapsed() {},
      startBeforeAfter,
      startFindingVerification,
      getBeforeAfterState,
      createReport() {
        return createRuntimeReport({
          store,
          windowTarget,
          diagnosticBeforeAfter: getBeforeAfterState(),
        });
      },
      downloadJson() { return null; },
      downloadHtml() { return null; },
      downloadBoth() { return { json: null, html: null }; },
      destroy() { activeBeforeAfter = null; },
    });
  }

  const bridge = bridgeRuntimeEvidenceToPanel({ store, windowTarget, syntheticFallback: false });
  element = documentTarget.createElement('lds-debug-panel');
  element.setAttribute('data-runtime-intelligence-panel', 'canonical');
  documentTarget.body.appendChild(element);

  const opportunitiesPresentation = installRuntimeOpportunitiesPanel({
    panel: element,
    store,
    windowTarget,
    documentTarget,
  });
  const beforeAfterPresentation = installDiagnosticBeforeAfterPanel({
    panel: element,
    getSession: getBeforeAfterSession,
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
      enhanceRuntimeIssueForFramework(
        enrichPinpointIssueSource(issue, store),
        { framework: resolveFramework() },
      ),
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
      diagnosticBeforeAfter: getBeforeAfterState(),
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
    startBeforeAfter,
    startFindingVerification,
    getBeforeAfterState,
    createReport,
    downloadJson,
    downloadHtml,
    downloadBoth,
    destroy() {
      activeBeforeAfter = null;
      beforeAfterPresentation.destroy?.();
      opportunitiesPresentation.destroy?.();
      bridge.stop();
      element.remove();
    },
  });
}

export { mountRuntimeIntelligencePanel };
