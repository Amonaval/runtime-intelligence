/**
 * AciPlugin — wires Syndigo ACI dispatch into LdsEventTracer.
 *
 * ACI (ui-platform-aci) is Syndigo's Redux-based action bus.
 * This plugin patches el.aci.dispatch so every dispatched action
 * is recorded in __LDS_EVENTS_TIMELINE__ / __LDS_EVENTS_FREQ__.
 *
 * Usage — call from element connectedCallback AFTER ACI is initialised:
 *   import { attachToElement } from 'runtime-intelligence/custom/ui-platform';
 *   connectedCallback() {
 *     super.connectedCallback();
 *     attachToElement(this);
 *   }
 *
 * Do NOT import from the deep file path — use the package subpath above.
 */

import { LdsEventTracer } from '../../src/core/event-tracer.js';

let _patchInstalled = false;

function attachToElement(el) {
    if (!el || !el.aci || typeof el.aci.dispatch !== 'function') return;
    if (el.__ldsAciPatched) return;
    el.__ldsAciPatched = true;

    const tag = el.tagName?.toLowerCase() || 'unknown';
    const aciObj = el.aci;
    const origDispatch = aciObj.dispatch.bind(aciObj);

    aciObj.dispatch = function (action) {
        const name = (action && (action.name || action.type)) || 'unknown';
        LdsEventTracer.recordEvent(name, action && action.detail, tag);
        return origDispatch(action);
    };
}

function installGlobalAciPatch(globalAci) {
    if (_patchInstalled) return;
    if (!globalAci || typeof globalAci.dispatch !== 'function') return;
    _patchInstalled = true;

    LdsEventTracer.patchDispatch(function (wrapFn) {
        const origDispatch = globalAci.dispatch.bind(globalAci);
        globalAci.dispatch = wrapFn(origDispatch);
    });
}

export { attachToElement, installGlobalAciPatch };
