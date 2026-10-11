import { html } from 'lit';
import { createRuntimeReport } from './runtime-panel-presentation.js';
import { buildRuntimeOpportunitiesModel, CATEGORY_LABELS } from './runtime-opportunities-model.js';

const OPPORTUNITIES_TAB_KEY = 'opportunities';

function _currentReport(panel, store, windowTarget) {
  const active = panel._activeReport;
  if (active?.schemaVersion?.startsWith?.('runtime-intelligence-report/')) return active;
  return createRuntimeReport({
    baseReport: panel._getActiveReport?.() || {},
    store,
    windowTarget,
    framework: windowTarget?.__LDS_RUNTIME_FRAMEWORK__ || 'unknown',
    note: panel._reportNote || '',
  });
}

function _updateLiveModel(panel, store, windowTarget) {
  const report = _currentReport(panel, store, windowTarget);
  panel.__runtimeOpportunityModel = buildRuntimeOpportunitiesModel({
    opportunities: report.opportunities || [],
    filters: { category: 'all', origin: 'all', evidence: 'all' },
  });
  return panel.__runtimeOpportunityModel;
}

function _ensureTabButton(panel, documentTarget) {
  const root = panel?.shadowRoot;
  const tabs = root?.querySelector('.tabs');
  if (!tabs) return;

  let button = root.querySelector('#runtime-opportunities-tab');
  if (!button) {
    button = documentTarget.createElement('button');
    button.id = 'runtime-opportunities-tab';
    button.addEventListener('click', () => {
      if (typeof panel._setTab === 'function') panel._setTab(OPPORTUNITIES_TAB_KEY);
      else {
        panel._tab = OPPORTUNITIES_TAB_KEY;
        panel.requestUpdate?.();
      }
    });

    const intelligence = root.querySelector('#lds-intelligence-tab');
    if (intelligence?.nextSibling) tabs.insertBefore(button, intelligence.nextSibling);
    else if (intelligence) tabs.appendChild(button);
    else {
      const tabButtons = [...tabs.querySelectorAll('.tab')];
      if (tabButtons[1]) tabs.insertBefore(button, tabButtons[1]);
      else tabs.appendChild(button);
    }
  }

  const model = panel.__runtimeOpportunityModel;
  const count = model?.total || 0;
  button.className = `tab${panel._tab === OPPORTUNITIES_TAB_KEY ? ' active' : ''}`;
  button.textContent = count > 0 ? `⚡ Opportunities · ${count}` : '⚡ Opportunities';
  button.title = 'Actionable optimization and reliability opportunities detected by Runtime Intelligence';
}

function _select(label, value, options, onChange) {
  return html`
    <label style="display:flex;align-items:center;gap:5px;color:#6c7086;font-size:10px">
      ${label}
      <select class="filter-select" .value=${value} @change=${event => onChange(event.target.value)}>
        ${options.map(option => html`<option value=${option.value}>${option.label}</option>`)}
      </select>
    </label>
  `;
}

function _priorityColor(priority) {
  if (priority === 'high') return '#f38ba8';
  if (priority === 'medium') return '#f9e2af';
  return '#89b4fa';
}

function _evidenceColor(level) {
  if (level === 'causality-confirmed') return '#94e2d5';
  if (level === 'lifetime-violation') return '#f38ba8';
  if (level === 'attribution') return '#a6e3a1';
  if (level === 'correlation') return '#89b4fa';
  return '#9399b2';
}

function _frameLabel(frame) {
  if (!frame?.file) return '';
  const line = Number.isFinite(frame.line) ? `:${frame.line}` : '';
  const column = Number.isFinite(frame.column) ? `:${frame.column}` : '';
  const fn = frame.functionName ? `${frame.functionName} — ` : '';
  return `${fn}${frame.file}${line}${column}`;
}

function _navigate(panel, item) {
  const nav = item.navigation;
  if (!nav) return;
  if (nav.tab === 'pinpoint' && typeof panel._navToPinpoint === 'function') {
    panel._navToPinpoint(nav.pinpointType || null);
    return;
  }
  if (typeof panel._setTab === 'function') panel._setTab(nav.tab);
  else {
    panel._tab = nav.tab;
    panel.requestUpdate?.();
  }
}

function _renderOpportunityCard(panel, item) {
  const priorityColor = _priorityColor(item.priority);
  const evidenceColor = _evidenceColor(item.evidenceLevel);
  return html`
    <div style="background:#181825;border:1px solid #313244;border-left:3px solid ${priorityColor};border-radius:7px;padding:10px 12px;margin-bottom:8px">
      <div style="display:flex;gap:8px;align-items:flex-start">
        <span style="font-size:16px;line-height:1.2">${item.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <strong style="color:#cdd6f4;font-size:12px">${item.label}</strong>
            <span style="font-size:9px;padding:2px 6px;border-radius:999px;border:1px solid ${priorityColor};color:${priorityColor}">${item.priority}</span>
            <span style="font-size:9px;padding:2px 6px;border-radius:999px;border:1px solid ${evidenceColor};color:${evidenceColor}">${item.evidenceLevel}</span>
            <span style="font-size:9px;padding:2px 6px;border-radius:999px;border:1px solid ${item.origin === 'synthetic' ? '#cba6f7' : '#458588'};color:${item.origin === 'synthetic' ? '#cba6f7' : '#a6e3a1'}">${item.origin}</span>
            ${(item.occurrenceCount || 1) > 1 ? html`<span style="font-size:9px;color:#6c7086">×${item.occurrenceCount}</span>` : ''}
          </div>
          <div style="color:#bac2de;font-size:11px;margin-top:5px;line-height:1.45">${item.summary}</div>
          ${item.owner?.name ? html`<div style="color:#89b4fa;font-size:10px;margin-top:5px">${item.owner.name}</div>` : ''}
          ${item.sourceLabel ? html`
            <div style="margin-top:7px;padding:6px 8px;border:1px solid #2f4f3a;border-radius:5px;background:#0d1a12">
              <div style="color:#a6e3a1;font-size:11px;font-weight:600;overflow-wrap:anywhere">📍 ${item.sourceLabel}</div>
              ${item.sourceProvenanceLabel ? html`<div style="color:#7f9f86;font-size:9px;margin-top:2px">${item.sourceProvenanceLabel}${item.sourceProvenance?.precision ? ` · ${item.sourceProvenance.precision}` : ''}</div>` : ''}
              ${item.applicationFrames?.length > 1 ? html`
                <details style="margin-top:4px;color:#9399b2;font-size:9px">
                  <summary style="cursor:pointer">Application stack · ${item.applicationFrames.length} frames</summary>
                  <div style="margin-top:4px;line-height:1.5;overflow-wrap:anywhere">
                    ${item.applicationFrames.map(frame => html`<div>${_frameLabel(frame)}</div>`)}
                  </div>
                </details>
              ` : ''}
            </div>
          ` : html`<div style="color:#585b70;font-size:10px;margin-top:2px">Runtime/browser observation — no reliable source attribution</div>`}
        </div>
      </div>

      ${item.recommendation ? html`
        <div style="margin-top:8px;padding:7px 9px;background:#0d1f0d;border-left:2px solid #a6e3a1;border-radius:4px;color:#a6e3a1;font-size:10px;line-height:1.45">
          ${item.recommendation}
        </div>
      ` : ''}

      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">
        <span style="color:#6c7086;font-size:9px;text-transform:uppercase;letter-spacing:.04em">${item.categoryLabel}</span>
        ${item.navigation ? html`
          <button class="header-btn accent" style="font-size:10px;padding:3px 8px" @click=${() => _navigate(panel, item)}>${item.navigation.label} →</button>
        ` : ''}
      </div>
    </div>
  `;
}

function _renderOpportunitiesTab(panel, { store, windowTarget }) {
  const report = _currentReport(panel, store, windowTarget);
  const filters = panel.__runtimeOpportunityFilters || { category: 'all', origin: 'all', evidence: 'all' };
  const model = buildRuntimeOpportunitiesModel({ opportunities: report.opportunities || [], filters });
  panel.__runtimeOpportunityModel = model;
  panel.__runtimeOpportunityDirty = false;

  const updateFilter = (key, value) => {
    panel.__runtimeOpportunityFilters = { ...filters, [key]: value };
    panel.requestUpdate?.();
  };

  const categoryOptions = [
    { value: 'all', label: `All (${model.total})` },
    ...Object.entries(CATEGORY_LABELS)
      .filter(([key]) => key !== 'other' || model.categoryCounts.other)
      .map(([key, label]) => ({ value: key, label: `${label} (${model.categoryCounts[key] || 0})` })),
  ];
  const evidenceOptions = [
    { value: 'all', label: 'All evidence' },
    ...model.evidenceLevels.map(level => ({ value: level, label: level })),
  ];

  return html`
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <div class="stat-chip"><div class="num">${model.total}</div><div class="lbl">Unique</div></div>
      <div class="stat-chip"><div class="num" style="color:#a6e3a1">${model.observed}</div><div class="lbl">Observed</div></div>
      ${model.synthetic ? html`<div class="stat-chip"><div class="num" style="color:#cba6f7">${model.synthetic}</div><div class="lbl">Synthetic</div></div>` : ''}
      <div class="stat-chip"><div class="num" style="color:#f38ba8">${model.high}</div><div class="lbl">High</div></div>
      <div class="stat-chip"><div class="num" style="color:#f9e2af">${model.medium}</div><div class="lbl">Medium</div></div>
    </div>

    <div style="background:#181825;border:1px solid #313244;border-radius:6px;padding:8px 10px;margin-bottom:10px;color:#6c7086;font-size:10px;line-height:1.45">
      Opportunities are actionable optimization or reliability signals. Evidence strength is preserved: observation/correlation does not imply causality. Source labels describe where an operation was observed or attributed; they do not by themselves prove root cause. Synthetic entries exist only in validation labs and are clearly marked.
    </div>

    <div class="filter-bar" style="gap:8px;align-items:center">
      ${_select('Category', filters.category, categoryOptions, value => updateFilter('category', value))}
      ${_select('Origin', filters.origin, [
        { value: 'all', label: 'All origins' },
        { value: 'observed', label: `Observed (${model.observed})` },
        { value: 'synthetic', label: `Synthetic (${model.synthetic})` },
      ], value => updateFilter('origin', value))}
      ${_select('Evidence', filters.evidence, evidenceOptions, value => updateFilter('evidence', value))}
    </div>

    ${model.items.length
      ? model.items.map(item => _renderOpportunityCard(panel, item))
      : html`<p class="empty">No opportunities match the current filters.</p>`}
  `;
}

function installRuntimeOpportunitiesPanel({
  panel,
  store,
  windowTarget = typeof window !== 'undefined' ? window : null,
  documentTarget = typeof document !== 'undefined' ? document : null,
} = {}) {
  if (!panel || !store || !windowTarget || !documentTarget) return Object.freeze({ destroy() {} });
  if (panel.__runtimeOpportunitiesInstalled) return panel.__runtimeOpportunitiesInstalled;

  panel.__runtimeOpportunityFilters = { category: 'all', origin: 'all', evidence: 'all' };
  panel.__runtimeOpportunityDirty = false;
  _updateLiveModel(panel, store, windowTarget);

  const originalRenderContent = panel._renderContent;
  panel._renderContent = function (...args) {
    if (this._tab === OPPORTUNITIES_TAB_KEY) {
      return html`<div class="tab-content">${_renderOpportunitiesTab(this, { store, windowTarget })}</div>`;
    }
    return originalRenderContent?.apply(this, args);
  };

  const originalUpdated = panel.updated;
  panel.updated = function (...args) {
    const result = originalUpdated?.apply(this, args);
    if (this.__runtimeOpportunityDirty) {
      _updateLiveModel(this, store, windowTarget);
      this.__runtimeOpportunityDirty = false;
    }
    _ensureTabButton(this, documentTarget);
    return result;
  };

  const unsubscribe = store.subscribe?.(() => {
    panel.__runtimeOpportunityDirty = true;
    if (panel._open) panel.requestUpdate?.();
  });

  const api = Object.freeze({
    destroy() {
      unsubscribe?.();
      panel._renderContent = originalRenderContent;
      panel.updated = originalUpdated;
      panel.shadowRoot?.querySelector('#runtime-opportunities-tab')?.remove?.();
      delete panel.__runtimeOpportunitiesInstalled;
      delete panel.__runtimeOpportunityFilters;
      delete panel.__runtimeOpportunityModel;
      delete panel.__runtimeOpportunityDirty;
    },
  });
  panel.__runtimeOpportunitiesInstalled = api;
  panel.requestUpdate?.();
  return api;
}

export { OPPORTUNITIES_TAB_KEY, installRuntimeOpportunitiesPanel };
