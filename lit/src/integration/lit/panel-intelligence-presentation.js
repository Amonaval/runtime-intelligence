const _observedPanels = new WeakSet();

function _text(doc, tag, value, style = '') {
    const el = doc.createElement(tag);
    el.textContent = value || '';
    if (style) el.style.cssText = style;
    return el;
}

function _row(doc, label, value) {
    if (!value) return null;
    const row = doc.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:88px 1fr;gap:8px;margin-top:6px;';
    row.appendChild(_text(doc, 'div', label, 'color:#a6adc8;font-weight:600;'));
    row.appendChild(_text(doc, 'div', value, 'color:#cdd6f4;'));
    return row;
}

function _masterFlag(target) {
    if (target?.__LDS_DEBUG__ !== undefined) return target.__LDS_DEBUG__;
    return target?.__LDS_APP_CONFIG__?.debugEnabled ?? false;
}

function _toolEnabled(target, key) {
    const standalone = {
        intelligence: '__LDS_INTELLIGENCE_ENABLED__',
        perf: '__LDS_PERF_ENABLED__',
        network: '__LDS_NETWORK_ENABLED__',
    }[key];
    if (standalone && target?.[standalone]) return true;
    const master = _masterFlag(target);
    if (master === true) return true;
    return !!(master && typeof master === 'object' && master[key]);
}

function _toolBadges(doc, target) {
    const wrap = doc.createElement('div');
    wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;';
    const items = [
        ['Intelligence', _toolEnabled(target, 'intelligence') || !!target?.__LDS_INTELLIGENCE_PIPELINE__, null],
        ['Perf', _toolEnabled(target, 'perf'), Object.keys(target?.__LDS_PERF__ || {}).length],
        ['Network', _toolEnabled(target, 'network'), (target?.__LDS_NETWORK_LOG__ || []).length],
    ];
    for (const [label, enabled, count] of items) {
        const suffix = enabled && Number.isFinite(count) && count > 0 ? ` · ${count}` : '';
        const badge = _text(doc, 'span', `${label} ${enabled ? 'ON' : 'OFF'}${suffix}`);
        badge.style.cssText = [
            'font-size:9px',
            'padding:2px 6px',
            'border-radius:999px',
            `border:1px solid ${enabled ? '#458588' : '#585b70'}`,
            `color:${enabled ? '#a6e3a1' : '#a6adc8'}`,
            'white-space:nowrap',
        ].join(';');
        wrap.appendChild(badge);
    }
    return wrap;
}

function _mountPoint(panel) {
    const root = panel?.shadowRoot;
    if (!root) return null;
    return root.querySelector('.tab-content')
        || root.querySelector('.panel-content')
        || root.querySelector('.content')
        || root.querySelector('main')
        || root;
}

function _render(panel, target) {
    const doc = target?.document;
    const root = panel?.shadowRoot;
    const mount = _mountPoint(panel);
    if (!doc || !root || !mount) return;

    let card = root.querySelector('#lds-runtime-intelligence-banner');
    if (!card) {
        card = doc.createElement('section');
        card.id = 'lds-runtime-intelligence-banner';
        card.style.cssText = [
            'border:1px solid #45475a',
            'border-left:3px solid #89b4fa',
            'border-radius:7px',
            'padding:10px 12px',
            'margin:0 0 10px',
            'background:#181825',
            'color:#cdd6f4',
            'font-size:11px',
            'line-height:1.45',
            'box-sizing:border-box',
        ].join(';');
    }
    if (card.parentNode !== mount) mount.prepend(card);

    card.replaceChildren();
    const model = target.__LDS_INTELLIGENCE__;

    const heading = doc.createElement('div');
    heading.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
    heading.appendChild(_text(doc, 'strong', model?.headline || 'Runtime Intelligence', 'font-size:12px;color:#89b4fa;'));
    heading.appendChild(_text(
        doc,
        'span',
        !model ? 'STARTING' : model.status === 'ready' ? 'READY' : (model.confidence || 'FOUND'),
        'font-size:9px;padding:2px 6px;border:1px solid #45475a;border-radius:999px;color:#bac2de;white-space:nowrap;',
    ));
    card.appendChild(heading);
    card.appendChild(_toolBadges(doc, target));

    if (!model) {
        card.appendChild(_text(doc, 'div', 'Starting Runtime Intelligence…', 'margin-top:7px;color:#a6adc8;'));
        return;
    }

    if (model.status === 'ready') {
        card.appendChild(_text(doc, 'div', model.explanation, 'margin-top:7px;color:#bac2de;'));
        const action = _row(doc, 'How to use', model.nextAction);
        if (action) card.appendChild(action);
        if (_toolEnabled(target, 'perf') && !Object.keys(target.__LDS_PERF__ || {}).length) {
            card.appendChild(_text(doc, 'div', 'Perf is enabled but has no samples yet. Navigate/remount components or exercise the screen.', 'margin-top:7px;color:#f9e2af;'));
        }
        return;
    }

    for (const [label, value] of [
        ['Problem', model.problem],
        ['Likely cause', model.likelyCause],
        ['Where', model.source],
        ['Impact', Array.isArray(model.impact) ? model.impact.join(' · ') : null],
        ['Do next', model.nextAction],
        ['Verified', model.verification?.outcome || null],
    ]) {
        const row = _row(doc, label, value);
        if (row) card.appendChild(row);
    }

    const technical = model.technicalEvidence;
    if (technical?.available) {
        const details = doc.createElement('details');
        details.style.cssText = 'margin-top:8px;border-top:1px solid #313244;padding-top:7px;color:#a6adc8;';
        const summary = doc.createElement('summary');
        summary.textContent = `Technical evidence (${technical.eventCount || 0} signals)`;
        summary.style.cssText = 'cursor:pointer;user-select:none;color:#89b4fa;';
        details.appendChild(summary);
        details.appendChild(_text(
            doc,
            'div',
            'Full privacy-filtered evidence is available through window.__LDS_INTELLIGENCE_PIPELINE__.exportCapsule() for deep debugging or AI handoff.',
            'margin-top:6px;color:#a6adc8;',
        ));
        card.appendChild(details);
    }
}

function _observePanel(panel, target) {
    const root = panel?.shadowRoot;
    const Observer = target?.MutationObserver;
    if (!root || typeof Observer !== 'function' || _observedPanels.has(panel)) return;
    _observedPanels.add(panel);
    const observer = new Observer(() => {
        if (!root.querySelector('#lds-runtime-intelligence-banner')) {
            target.queueMicrotask?.(() => _render(panel, target));
        }
    });
    observer.observe(root, { childList: true, subtree: true });
}

function _attachPanel(panel, target) {
    if (!panel) return;
    _observePanel(panel, target);
    _render(panel, target);
}

function _injectAll(target) {
    const panels = target?.document?.querySelectorAll?.('lds-debug-panel') || [];
    for (const panel of panels) _attachPanel(panel, target);
}

function _patchPanelClass(target) {
    const Panel = target?.customElements?.get?.('lds-debug-panel');
    if (!Panel || Panel.prototype.__ldsIntelligencePresentationPatched) return !!Panel;

    const proto = Panel.prototype;
    const originalConnected = proto.connectedCallback;
    proto.connectedCallback = function (...args) {
        const result = originalConnected?.apply(this, args);
        Promise.resolve(this.updateComplete).finally(() => _attachPanel(this, target));
        return result;
    };

    const originalUpdated = proto.updated;
    proto.updated = function (...args) {
        const result = originalUpdated?.apply(this, args);
        _attachPanel(this, target);
        return result;
    };

    const originalCompleteReplay = proto._completeReplay;
    if (typeof originalCompleteReplay === 'function') {
        proto._completeReplay = function (...args) {
            const result = originalCompleteReplay.apply(this, args);
            const comparison = this._replayState?.comparison;
            if (this._replayState?.status === 'done' && comparison) {
                target.__LDS_INTELLIGENCE_PIPELINE__?.recordVerification?.({
                    source: 'panel-replay',
                    outcome: comparison.overallVerified ? 'confirmed' : 'not-confirmed',
                    confirmed: comparison.overallVerified === true,
                    metrics: comparison.metrics || [],
                    comparedAt: comparison.comparedAt || new Date().toISOString(),
                });
            }
            return result;
        };
    }

    Object.defineProperty(proto, '__ldsIntelligencePresentationPatched', {
        value: true,
        configurable: false,
        enumerable: false,
        writable: false,
    });
    _injectAll(target);
    return true;
}

/**
 * Compatibility presentation bridge. The mature panel source remains intact,
 * while Runtime Intelligence gets a resilient developer-facing card. The card
 * survives panel/tab rerenders and exposes current tool enablement at a glance.
 */
function installLitIntelligencePanelPresentation({ target = typeof window !== 'undefined' ? window : null } = {}) {
    if (!target?.customElements) return false;
    if (target.__LDS_INTELLIGENCE_PANEL_BRIDGE_INSTALLED__) {
        _patchPanelClass(target);
        _injectAll(target);
        return true;
    }
    target.__LDS_INTELLIGENCE_PANEL_BRIDGE_INSTALLED__ = true;

    target.addEventListener?.('lds-intelligence-updated', () => _injectAll(target));
    if (!_patchPanelClass(target) && typeof target.customElements.whenDefined === 'function') {
        target.customElements.whenDefined('lds-debug-panel')
            .then(() => _patchPanelClass(target))
            .catch(() => {});
    }
    return true;
}

export { installLitIntelligencePanelPresentation };
