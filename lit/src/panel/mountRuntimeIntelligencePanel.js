import { buildRuntimeIntelligencePanelModel } from './runtime-panel-model.js';

function _el(doc, tag, text = null) {
  const node = doc.createElement(tag);
  if (text != null) node.textContent = String(text);
  return node;
}

function _formatConfidence(value) {
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : '—';
}

function _formatMs(value) {
  return Number.isFinite(value) ? `${Math.round(value * 100) / 100}ms` : '—';
}

function _badge(doc, text, tone = '') {
  const node = _el(doc, 'span', text);
  node.className = `badge${tone ? ` ${tone}` : ''}`;
  return node;
}

function mountRuntimeIntelligencePanel({
  store,
  adapter = null,
  title = 'Runtime Intelligence',
  collapsed = true,
  documentTarget = typeof document !== 'undefined' ? document : null,
} = {}) {
  if (!store || typeof store.snapshot !== 'function' || typeof store.subscribe !== 'function') {
    throw new TypeError('mountRuntimeIntelligencePanel requires an EvidenceStore-compatible store.');
  }
  if (!documentTarget?.createElement || !documentTarget.body) {
    return Object.freeze({ element: null, render() {}, setCollapsed() {}, destroy() {} });
  }

  const host = documentTarget.createElement('div');
  host.setAttribute('data-runtime-intelligence-panel', '');
  const root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  const style = _el(documentTarget, 'style');
  style.textContent = `
    :host{all:initial}.ri{position:fixed;right:18px;bottom:18px;z-index:2147483646;font:13px/1.45 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#e5e7eb}
    button{font:inherit;color:inherit;background:#111827;border:1px solid #374151;border-radius:10px;padding:8px 11px;cursor:pointer}.launcher{border-radius:999px;box-shadow:0 10px 30px #0007;font-weight:650}
    .panel{width:min(560px,calc(100vw - 28px));max-height:min(78vh,760px);overflow:auto;background:linear-gradient(180deg,#0b1220 0%,#0a0f1a 100%);border:1px solid #263244;border-radius:16px;box-shadow:0 22px 70px #000b;margin-bottom:10px}
    .head{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:15px 16px;border-bottom:1px solid #1f2937;position:sticky;top:0;background:#0b1220f2;backdrop-filter:blur(8px);z-index:2}
    .title{font-weight:750;font-size:14px;letter-spacing:-.01em}.sub{color:#94a3b8;font-size:11px;margin-top:2px}.body{padding:14px 16px 16px}
    .summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:14px}.summary-card{background:#101826;border:1px solid #202b3b;border-radius:12px;padding:10px}.summary-card .n{font-size:19px;font-weight:750}.summary-card .label{color:#94a3b8;font-size:11px}
    .section{margin-top:16px}.section:first-of-type{margin-top:0}.section h3{font:700 11px/1.3 ui-sans-serif,system-ui;margin:0 0 8px;color:#cbd5e1;text-transform:uppercase;letter-spacing:.08em}.section-note{color:#94a3b8;font-size:11px;margin:-2px 0 8px}
    .finding{background:#101826;border:1px solid #243044;border-radius:12px;padding:11px 12px;margin-top:8px}.finding:first-of-type{margin-top:0}.finding-title{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;font-weight:700}.finding p{margin:6px 0 0;color:#cbd5e1}.inspect{margin-top:7px;color:#93c5fd}.meta{color:#94a3b8;font-size:10.5px;margin-top:5px}.source{color:#93c5fd;overflow-wrap:anywhere}.badge{display:inline-flex;align-items:center;border:1px solid #334155;border-radius:999px;padding:2px 7px;color:#cbd5e1;font-size:10px;white-space:nowrap}.badge.warn{color:#fde68a;border-color:#66521c;background:#2f260b}.badge.info{color:#bfdbfe;border-color:#28466f;background:#10213b}
    .metric{background:#101826;border:1px solid #243044;border-radius:12px;padding:11px 12px;margin-top:8px}.metric-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}.metric strong{overflow:hidden;text-overflow:ellipsis}.metric .big{font-weight:750}.metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:8px}.mini{background:#0b1220;border:1px solid #1f2937;border-radius:8px;padding:7px}.mini b{display:block;font-size:12px}.mini span{display:block;color:#94a3b8;font-size:9.5px;margin-top:1px}
    details{margin-top:16px;border-top:1px solid #1f2937;padding-top:12px}summary{cursor:pointer;color:#94a3b8;font-weight:650;list-style:none}summary::-webkit-details-marker{display:none}.tech{padding-top:10px}.tech-row{padding:7px 0;border-top:1px solid #172033}.tech-row:first-child{border-top:0}.tech-title{font-weight:600}.caps{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 10px;color:#cbd5e1;font-size:11px}.empty{color:#64748b;padding:10px 0}.hidden{display:none}
  `;
  root.appendChild(style);

  const shell = _el(documentTarget, 'div');
  shell.className = 'ri';
  const panel = _el(documentTarget, 'div');
  panel.className = 'panel';
  const toggle = _el(documentTarget, 'button', title);
  toggle.className = 'launcher';
  toggle.type = 'button';
  shell.append(panel, toggle);
  root.appendChild(shell);
  documentTarget.body.appendChild(host);

  let isCollapsed = !!collapsed;

  function render() {
    const model = buildRuntimeIntelligencePanelModel({ store, adapter });
    panel.replaceChildren();

    const head = _el(documentTarget, 'div');
    head.className = 'head';
    const heading = _el(documentTarget, 'div');
    const headingTitle = _el(documentTarget, 'div', title);
    headingTitle.className = 'title';
    const frameworkName = model.framework?.framework || model.framework?.name || 'framework-neutral';
    const headingSub = _el(documentTarget, 'div', `${frameworkName} · live developer findings`);
    headingSub.className = 'sub';
    heading.append(headingTitle, headingSub);
    const close = _el(documentTarget, 'button', 'Hide');
    close.type = 'button';
    close.addEventListener('click', () => setCollapsed(true));
    head.append(heading, close);

    const body = _el(documentTarget, 'div');
    body.className = 'body';

    const summary = _el(documentTarget, 'div');
    summary.className = 'summary';
    const cards = [
      [model.opportunitySummaries.length, 'Findings'],
      [model.renderActivity.displayBoundaries.length, 'Render areas'],
      [model.eventCount, 'Evidence'],
    ];
    for (const [value, label] of cards) {
      const card = _el(documentTarget, 'div'); card.className = 'summary-card';
      const n = _el(documentTarget, 'div', value); n.className = 'n';
      const l = _el(documentTarget, 'div', label); l.className = 'label';
      card.append(n, l); summary.appendChild(card);
    }
    body.appendChild(summary);

    const findings = _el(documentTarget, 'div'); findings.className = 'section';
    findings.appendChild(_el(documentTarget, 'h3', 'Top findings'));
    if (!model.opportunitySummaries.length) {
      const empty = _el(documentTarget, 'div', 'No optimization findings yet. Use the app normally and this view will update from collected evidence.');
      empty.className = 'empty'; findings.appendChild(empty);
    }
    for (const item of model.opportunitySummaries) {
      const card = _el(documentTarget, 'div'); card.className = 'finding';
      const top = _el(documentTarget, 'div'); top.className = 'finding-title';
      top.append(_el(documentTarget, 'span', item.label), _badge(documentTarget, item.count > 1 ? `${item.count}× seen` : 'observed', 'warn'));
      card.appendChild(top);
      card.appendChild(_el(documentTarget, 'p', item.why));
      const inspect = _el(documentTarget, 'div', `Inspect: ${item.inspect}`); inspect.className = 'inspect'; card.appendChild(inspect);
      const meta = _el(documentTarget, 'div', `${item.evidenceLevel || 'evidence'} · ${item.attribution || 'unknown attribution'} · confidence ${_formatConfidence(item.confidence)}`); meta.className = 'meta'; card.appendChild(meta);
      if (item.source) { const source = _el(documentTarget, 'div', item.source); source.className = 'meta source'; card.appendChild(source); }
      findings.appendChild(card);
    }
    body.appendChild(findings);

    if (model.renderActivity.totalCommits > 0) {
      const section = _el(documentTarget, 'div'); section.className = 'section';
      section.appendChild(_el(documentTarget, 'h3', 'Render hotspots'));
      const noteText = model.renderActivity.hiddenOverlapCount > 0
        ? `${model.renderActivity.hiddenOverlapCount} near-identical nested boundary hidden to avoid double-counting noise. Timings rank observed render work; they do not identify cause.`
        : 'Timings rank observed render work within each boundary; they do not identify cause.';
      const note = _el(documentTarget, 'div', noteText); note.className = 'section-note'; section.appendChild(note);
      for (const item of model.renderActivity.displayBoundaries) {
        const row = _el(documentTarget, 'div'); row.className = 'metric';
        const metricHead = _el(documentTarget, 'div'); metricHead.className = 'metric-head';
        metricHead.append(_el(documentTarget, 'strong', item.name), _badge(documentTarget, `${item.commits} commits`, 'info'));
        row.appendChild(metricHead);
        const grid = _el(documentTarget, 'div'); grid.className = 'metric-grid';
        for (const [value, label] of [[_formatMs(item.avgDurationMs), 'Average'], [_formatMs(item.maxDurationMs), 'Slowest'], [_formatMs(item.totalDurationMs), 'Recorded total']]) {
          const mini = _el(documentTarget, 'div'); mini.className = 'mini';
          mini.append(_el(documentTarget, 'b', value), _el(documentTarget, 'span', label)); grid.appendChild(mini);
        }
        row.appendChild(grid);
        const detail = _el(documentTarget, 'div', `${item.mountCommits} mount · ${item.updateCommits} updates`); detail.className = 'meta'; row.appendChild(detail);
        if (item.source) { const source = _el(documentTarget, 'div', item.source); source.className = 'meta source'; row.appendChild(source); }
        section.appendChild(row);
      }
      body.appendChild(section);
    }

    const details = _el(documentTarget, 'details');
    const detailsSummary = _el(documentTarget, 'summary', `Technical evidence · ${model.eventCount} events`);
    details.appendChild(detailsSummary);
    const tech = _el(documentTarget, 'div'); tech.className = 'tech';

    if (model.recentSignals.length) {
      const evidenceTitle = _el(documentTarget, 'h3', 'Recent signals');
      tech.appendChild(evidenceTitle);
      for (const event of model.recentSignals) {
        const row = _el(documentTarget, 'div'); row.className = 'tech-row';
        const titleRow = _el(documentTarget, 'div'); titleRow.className = 'tech-title';
        titleRow.append(_el(documentTarget, 'span', event.label));
        if (event.occurrences > 1) titleRow.append(' ', _badge(documentTarget, `${event.occurrences}×`));
        row.appendChild(titleRow);
        const meta = _el(documentTarget, 'div', `${event.type} · ${event.evidenceLevel || 'evidence'} · ${event.attribution || 'unknown'} · confidence ${_formatConfidence(event.confidence)}`); meta.className = 'meta'; row.appendChild(meta);
        if (event.source) { const source = _el(documentTarget, 'div', event.source); source.className = 'meta source'; row.appendChild(source); }
        tech.appendChild(row);
      }
    }

    const capabilities = model.framework?.capabilities || null;
    if (capabilities) {
      const capabilityTitle = _el(documentTarget, 'h3', 'Adapter coverage');
      capabilityTitle.style.marginTop = '14px';
      tech.appendChild(capabilityTitle);
      const caps = _el(documentTarget, 'div'); caps.className = 'caps';
      for (const [key, value] of Object.entries(capabilities)) caps.append(_el(documentTarget, 'span', key), _el(documentTarget, 'span', value));
      tech.appendChild(caps);
    }

    details.appendChild(tech);
    body.appendChild(details);

    panel.append(head, body);
    panel.classList.toggle('hidden', isCollapsed);
    toggle.classList.toggle('hidden', !isCollapsed);
  }

  function setCollapsed(next) {
    isCollapsed = !!next;
    panel.classList.toggle('hidden', isCollapsed);
    toggle.classList.toggle('hidden', !isCollapsed);
  }

  toggle.addEventListener('click', () => setCollapsed(false));
  const unsubscribe = store.subscribe(() => render());
  render();

  return Object.freeze({
    element: host,
    render,
    setCollapsed,
    destroy() {
      unsubscribe?.();
      host.remove();
    },
  });
}

export { mountRuntimeIntelligencePanel };
