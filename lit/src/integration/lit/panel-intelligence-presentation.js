function _verificationOutcome(model) {
    return model?.verification?.outcome || null;
}

function _summaryText(model) {
    if (!model) return 'Runtime Intelligence ready — no captured incident.';
    const root = model.rootCause?.rootLabel || 'unresolved root';
    const strength = model.rootCause?.strength || 'correlated';
    const verification = _verificationOutcome(model);
    return `Runtime Intelligence: ${root} · ${strength}${verification ? ` · verification ${verification}` : ''}`;
}

function _inject(panel, target) {
    const doc = target?.document;
    if (!doc || !panel?.shadowRoot) return;
    const content = panel.shadowRoot.querySelector('.tab-content');
    if (!content) return;

    let banner = panel.shadowRoot.querySelector('#lds-runtime-intelligence-banner');
    if (!banner) {
        banner = doc.createElement('div');
        banner.id = 'lds-runtime-intelligence-banner';
        banner.style.cssText = [
            'border:1px solid #45475a',
            'border-left:3px solid #89b4fa',
            'border-radius:5px',
            'padding:7px 9px',
            'margin-bottom:10px',
            'background:#181825',
            'color:#cdd6f4',
            'font-size:10px',
            'line-height:1.4',
        ].join(';');
        content.prepend(banner);
    }
    banner.textContent = _summaryText(target.__LDS_INTELLIGENCE__);
}

function _injectAll(target) {
    const panels = target?.document?.querySelectorAll?.('lds-debug-panel') || [];
    for (const panel of panels) _inject(panel, target);
}

function _patchPanelClass(target) {
    const Panel = target?.customElements?.get?.('lds-debug-panel');
    if (!Panel || Panel.prototype.__ldsIntelligencePresentationPatched) return !!Panel;

    const proto = Panel.prototype;
    const originalUpdated = proto.updated;
    proto.updated = function (...args) {
        const result = originalUpdated?.apply(this, args);
        _inject(this, target);
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
 * Transitional presentation bridge: it augments the existing LDS panel rather
 * than creating a second investigation UI. The canonical panel source remains
 * independently importable and byte-compatible with the mature baseline.
 */
function installLitIntelligencePanelPresentation({ target = typeof window !== 'undefined' ? window : null } = {}) {
    if (!target?.customElements) return false;
    if (target.__LDS_INTELLIGENCE_PANEL_BRIDGE_INSTALLED__) {
        _patchPanelClass(target);
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
