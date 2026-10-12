import { html } from 'lit';

const BEFORE_AFTER_TAB_KEY = 'before-after';

function _ensureTabButton(panel, documentTarget, getSession) {
  const root = panel?.shadowRoot;
  const tabs = root?.querySelector('.tabs');
  if (!tabs) return;

  let button = root.querySelector('#runtime-before-after-tab');
  if (!button) {
    button = documentTarget.createElement('button');
    button.id = 'runtime-before-after-tab';
    button.addEventListener('click', () => {
      if (typeof panel._setTab === 'function') panel._setTab(BEFORE_AFTER_TAB_KEY);
      else {
        panel._tab = BEFORE_AFTER_TAB_KEY;
        panel.requestUpdate?.();
      }
    });
    tabs.appendChild(button);
  }

  const status = getSession()?.getState?.()?.status || null;
  button.className = `tab${panel._tab === BEFORE_AFTER_TAB_KEY ? ' active' : ''}`;
  button.textContent = status ? `↔ Before/After · ${status}` : '↔ Before/After';
  button.title = 'Capture a diagnostic baseline, apply a fix, replay the same workflow and compare the configured target';
}

function _statusColor(status) {
  if (status === 'improved') return '#a6e3a1';
  if (status === 'regressed') return '#f38ba8';
  if (status === 'unchanged') return '#f9e2af';
  if (status === 'inconclusive') return '#fab387';
  return '#89b4fa';
}

function _renderState(panel, session) {
  const state = session.getState();
  const metric = state.comparison?.metric || null;
  const verification = state.verification || null;
  const color = _statusColor(state.status);

  const captureBaseline = () => {
    session.captureBaseline();
    panel.requestUpdate?.();
  };
  const captureReplay = () => {
    session.captureReplay();
    panel.requestUpdate?.();
  };
  const reset = () => {
    session.reset();
    panel.requestUpdate?.();
  };

  return html`
    <div style="background:#181825;border:1px solid #313244;border-left:3px solid ${color};border-radius:7px;padding:12px">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:wrap">
        <div>
          <strong style="color:#cdd6f4;font-size:13px">${state.headline}</strong>
          <div style="color:${color};font-size:10px;margin-top:4px;text-transform:uppercase;letter-spacing:.04em">${state.status}</div>
        </div>
        <div style="color:#9399b2;font-size:10px">${state.workflowId}</div>
      </div>

      <div style="margin-top:10px;padding:8px;background:#11111b;border-radius:5px;color:#bac2de;font-size:10px;line-height:1.55">
        <div><strong>Target:</strong> ${state.target?.metricId || 'n/a'} · ${state.target?.direction || 'n/a'}</div>
        ${metric ? html`<div><strong>Before → after:</strong> ${metric.before} → ${metric.after}</div>` : ''}
        ${verification ? html`
          <div><strong>Evidence:</strong> ${verification.evidenceLevel || 'unknown'}</div>
          <div><strong>Causality:</strong> ${verification.causalityConfirmed ? 'confirmed by separate governed evidence' : 'not confirmed'}</div>
        ` : ''}
      </div>

      <div style="margin-top:10px;color:#bac2de;font-size:10px;line-height:1.5">
        <strong>What next?</strong> ${state.nextAction}
      </div>
      <div style="margin-top:6px;color:#6c7086;font-size:9px;line-height:1.45">
        ${state.evidenceNote}
      </div>

      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px">
        ${state.status === 'awaiting-baseline' ? html`
          <button class="header-btn accent" @click=${captureBaseline}>Capture baseline</button>
        ` : ''}
        ${state.status === 'awaiting-replay' ? html`
          <button class="header-btn accent" @click=${captureReplay}>Capture replay</button>
        ` : ''}
        ${!['awaiting-baseline', 'awaiting-replay'].includes(state.status) ? html`
          <button class="header-btn accent" @click=${captureBaseline}>Start new baseline</button>
        ` : ''}
        <button class="header-btn" @click=${reset}>Reset</button>
      </div>
    </div>

    <div style="margin-top:10px;color:#6c7086;font-size:10px;line-height:1.5">
      Before/after verification measures whether the configured target changed on a replay. Improvement is not automatically causal proof. Supply governed causal evidence programmatically only when that stronger claim is independently justified.
    </div>
  `;
}

function _renderBeforeAfterTab(panel, getSession) {
  const session = getSession();
  if (!session) {
    return html`
      <div style="background:#181825;border:1px solid #313244;border-radius:7px;padding:12px;color:#bac2de;font-size:10px;line-height:1.55">
        <strong style="color:#cdd6f4;font-size:12px">Start a diagnostic comparison</strong>
        <p>Choose an explicit workflow and target metric in application/dev tooling, then Runtime Intelligence can guide the capture here without guessing what “better” means.</p>
        <pre style="white-space:pre-wrap;overflow:auto">panel.startBeforeAfter({
  workflowId: 'save-product',
  target: { metricId: 'count:error', direction: 'decrease' },
  intervention: { id: 'fix-1', applied: true }
});</pre>
        <p>The tab will then offer <strong>Capture baseline</strong> and <strong>Capture replay</strong>.</p>
      </div>
    `;
  }
  return _renderState(panel, session);
}

function installDiagnosticBeforeAfterPanel({
  panel,
  getSession,
  documentTarget = typeof document !== 'undefined' ? document : null,
} = {}) {
  if (!panel || typeof getSession !== 'function' || !documentTarget) return Object.freeze({ destroy() {} });
  if (panel.__runtimeBeforeAfterInstalled) return panel.__runtimeBeforeAfterInstalled;

  const originalRenderContent = panel._renderContent;
  panel._renderContent = function (...args) {
    if (this._tab === BEFORE_AFTER_TAB_KEY) {
      return html`<div class="tab-content">${_renderBeforeAfterTab(this, getSession)}</div>`;
    }
    return originalRenderContent?.apply(this, args);
  };

  const originalUpdated = panel.updated;
  panel.updated = function (...args) {
    const result = originalUpdated?.apply(this, args);
    _ensureTabButton(this, documentTarget, getSession);
    return result;
  };

  const api = Object.freeze({
    destroy() {
      panel._renderContent = originalRenderContent;
      panel.updated = originalUpdated;
      panel.shadowRoot?.querySelector('#runtime-before-after-tab')?.remove?.();
      delete panel.__runtimeBeforeAfterInstalled;
    },
  });

  panel.__runtimeBeforeAfterInstalled = api;
  panel.requestUpdate?.();
  return api;
}

export { BEFORE_AFTER_TAB_KEY, installDiagnosticBeforeAfterPanel };
