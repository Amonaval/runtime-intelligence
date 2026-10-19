/**
 * SyndigoSlowApiPlugin — patches window.__dataObjectManager__ into LdsSlowApiMonitor.
 *
 * DataObjectManager is Syndigo's REST/Falcor data access singleton. Importing
 * runtime-intelligence/custom/ui-platform installs this plugin automatically.
 */

import { LdsSlowApiMonitor } from '../../src/core/slow-api.js';

const DOM_METHODS = ['get', 'post', 'rest', 'initiateRequest'];
let _installed = false;

function install(methods = DOM_METHODS) {
    if (_installed || typeof window === 'undefined') return;
    _tryInstall(methods, 0);
}

function _tryInstall(methods, attempts) {
    if (typeof window === 'undefined') return;
    const dom = window.__dataObjectManager__;
    if (dom && typeof dom === 'object') {
        LdsSlowApiMonitor.wrapObject(dom, methods);
        _installed = true;
        return;
    }
    if (attempts < 20) {
        setTimeout(() => _tryInstall(methods, attempts + 1), 500);
    }
}

export { install };
