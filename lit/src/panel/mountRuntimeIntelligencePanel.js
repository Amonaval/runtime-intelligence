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
    :host{all:initial}.ri{position:fixed;right:16px;bottom:16px;z-index:2147483646;font:12px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;color:#eef2ff}
    button{font:inherit;color:inherit;background:#111827;border:1px solid #374151;border-radius:999px;padding:8px 12px;cursor:pointer;box-shadow:0 6px 24px #0006}
    .panel{width:min(480px,calc(100vw - 32px));max-height:min(72vh,680px);overflow:auto;background:#0b1020;border:1px solid #334155;border-radius:12px;box-shadow:0 14px 44px #0009;margin-bottom:8px}
    .head{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 14px;border-bottom:1px solid #1f2937;position:sticky;top:0;background:#0b1020}
    .title{font-weight:700;font-size:13px}.sub,.note{color:#94a3b8;font-size:11px}.body{padding:12px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}.card{background:#111827;border:1px solid #1f2937;border-radius:8px;padding:8px}.n{font-size:18px;font-weight:700}.label{color:#94a3b8}
    .section{margin-top:12px}.section h3{font:600 11px/1.3 ui-sans-serif,system-ui;margin:0 0 6px;color:#cbd5e1;text-transform:uppercase;letter-spacing:.05em}.row{padding:7px 0;border-top:1px solid #1f2937}.row:first-child{border-top:0}.meta{color:#94a3b8;font-size:10px;margin-top:2px}.opp{color:#fde68a}.empty{color:#64748b;padding:10px 0}.cap{display:flex;justify-content:space-between;gap:8px;padding:3px 0;color:#cbd5e1}.metric{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.metric strong{overflow:hidden;text-overflow:ellipsis}.source{color:#93c5fd;overflow-wrap:anywhere}.hidden{display:none}
  `;
  root.appendChild(style);

  const shell = _el(documentTarget, 'div');
  shell.className = 'ri';
  const panel = _el(documentTarget, 'div');
  panel.className = 'panel';
  const toggle = _el(documentTarget, 'button', title);
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
    const headingSub = _el(documentTarget, 'div', `${frameworkName} · live evidence`);
    headingSub.className = 'sub';
    heading.append(headingTitle, headingSub);
    const close = _el(documentTarget, 'button', 'Hide');
    close.type = 'button';
    close.addEventListener('click', () => setCollapsed(true));
    head.append(heading, close);

    const body = _el(documentTarget, 'div');
    body.className = 'body';
    const cards = _el(documentTarget, 'div');
    cards.className = 'cards';
    for (const [value, label] of [[model.eventCount, 'Events'], [model.diagnosticCount, 'Diagnostics'], [model.opportunityCount, 'Opportunities']]) {
      const card = _el(documentTarget, 'div'); card.className = 'card';
      const n = _el(documentTarget, 'div', value); n.className = 'n';
      const l = _el(documentTarget, 'div', label); l.className = 'label';
      card.append(n, l); cards.appendChild(card);
    }
    body.appendChild(cards);

    if (model.renderActivity.totalCommits > 0) {
      const section = _el(documentTarget, 'div'); section.className = 'section';
      section.appendChild(_el(documentTarget, 'h3', 'Render activity'));
      const note = _el(documentTarget, 'div', `${model.renderActivity.totalCommits} profiler commits across ${model.renderActivity.boundaries.length} shown boundaries. ${model.renderActivity.interpretation}`);
      note.className = 'note';
      section.appendChild(note);
      for (const item of model.renderActivity.boundaries) {
        const row = _el(documentTarget, 'div'); row.className = 'row';
        const metric = _el(documentTarget, 'div'); metric.className = 'metric';
        const name = _el(documentTarget, 'strong', item.name);
        const total = _el(documentTarget, 'span', _formatMs(item.totalDurationMs));
        metric.append(name, total);
        row.appendChild(metric);
        const details = _el(documentTarget, 'div', `${item.commits} commits · avg ${_formatMs(item.avgDurationMs)} · max ${_formatMs(item.maxDurationMs)} · mounts ${item.mountCommits} · updates ${item.updateCommits}`);
        details.className = 'meta'; row.appendChild(details);
        if (item.source) { const source = _el(documentTarget, 'div', item.source); source.className = 'meta source'; row.appendChild(source); }
        section.appendChild(row);
      }
      body.appendChild(section);
    }

    const capabilities = model.framework?.capabilities || null;
    if (capabilities) {
      const section = _el(documentTarget, 'div'); section.className = 'section';
      section.appendChild(_el(documentTarget, 'h3', 'Capabilities'));
      for (const [key, value] of Object.entries(capabilities)) {
        const row = _el(documentTarget, 'div'); row.className = 'cap';
        row.append(_el(documentTarget, 'span', key), _el(documentTarget, 'span', value));
        section.appendChild(row);
      }
      body.appendChild(section);
    }

    const recentSection = _el(documentTarget, 'div'); recentSection.className = 'section';
    recentSection.appendChild(_el(documentTarget, 'h3', 'Recent evidence'));
    if (!model.recent.length) recentSection.appendChild(_el(documentTarget, 'div', 'No runtime evidence yet.'));
    for (const event of model.recent) {
      const row = _el(documentTarget, 'div'); row.className = `row${event.opportunity ? ' opp' : ''}`;
      row.appendChild(_el(documentTarget, 'div', event.label));
      const metaParts = [event.type, event.owner || 'unowned', event.evidenceLevel || 'evidence', event.attribution || 'unknown attribution', `confidence ${_formatConfidence(event.confidence)}`];
      const meta = _el(documentTarget, 'div', metaParts.join(' · '));
      meta.className = 'meta'; row.appendChild(meta);
      if (event.source) { const source = _el(documentTarget, 'div', event.source); source.className = 'meta source'; row.appendChild(source); }
      recentSection.appendChild(row);
    }
    body.appendChild(recentSection);
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
