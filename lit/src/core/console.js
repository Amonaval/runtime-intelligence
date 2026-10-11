/**
 * LdsConsole — captures console.error and console.warn into a bounded ring buffer.
 *
 * Importing this module is inert. attach() owns the global console patch and
 * detach() releases it when the last diagnostics consumer stops.
 */

const _MAX = 200;
const _log = [];
let _patched = false;
let _clients = 0;
let _windowTarget = null;
let _consoleTarget = null;
let _origError = null;
let _origWarn = null;
let _patchedError = null;
let _patchedWarn = null;
let _clearFn = null;

function _push(level, args) {
    const entry = {
        level,
        message: args.map(a => (typeof a === 'string' ? a : _safe(a))).join(' '),
        ts: new Date().toISOString(),
    };
    _log.push(entry);
    if (_log.length > _MAX) _log.shift();
}

function _safe(val) {
    try {
        return JSON.stringify(val);
    } catch (_) {
        return String(val);
    }
}

function _resolveWindowTarget(candidate) {
    if (candidate?.document && typeof candidate.addEventListener === 'function') return candidate;
    return typeof window !== 'undefined' ? window : null;
}

function attach(target = null) {
    const win = _resolveWindowTarget(target);
    const consoleTarget = win?.console || globalThis.console;
    if (!consoleTarget?.error || !consoleTarget?.warn) return false;

    _clients += 1;
    if (_patched) return true;

    _patched = true;
    _windowTarget = win;
    _consoleTarget = consoleTarget;
    _origError = consoleTarget.error;
    _origWarn = consoleTarget.warn;
    const origLog = consoleTarget.log || (() => {});

    _patchedError = (...args) => {
        _push('error', args);
        _origError.apply(consoleTarget, args);
    };
    _patchedWarn = (...args) => {
        _push('warn', args);
        _origWarn.apply(consoleTarget, args);
    };

    consoleTarget.error = _patchedError;
    consoleTarget.warn = _patchedWarn;

    if (win) {
        win.__LDS_CONSOLE__ = _log;
        _clearFn = function () {
            _log.length = 0;
            origLog.call(consoleTarget, '%c[LdsConsole] Buffer cleared', 'color:#89b4fa;font-weight:bold;');
        };
        win.__LDS_CONSOLE_CLEAR__ = _clearFn;
    }

    origLog.call(consoleTarget, '%c[LdsConsole] Active — capturing console.error and console.warn', 'color:#89b4fa;font-weight:bold;');
    return true;
}

function detach(_target = null) {
    if (_clients > 0) _clients -= 1;
    if (!_patched || _clients > 0) return;

    if (_consoleTarget?.error === _patchedError && _origError) _consoleTarget.error = _origError;
    if (_consoleTarget?.warn === _patchedWarn && _origWarn) _consoleTarget.warn = _origWarn;

    if (_windowTarget?.__LDS_CONSOLE__ === _log) {
        try { delete _windowTarget.__LDS_CONSOLE__; } catch { _windowTarget.__LDS_CONSOLE__ = undefined; }
    }
    if (_windowTarget?.__LDS_CONSOLE_CLEAR__ === _clearFn) {
        try { delete _windowTarget.__LDS_CONSOLE_CLEAR__; } catch { _windowTarget.__LDS_CONSOLE_CLEAR__ = undefined; }
    }

    _patched = false;
    _windowTarget = null;
    _consoleTarget = null;
    _origError = null;
    _origWarn = null;
    _patchedError = null;
    _patchedWarn = null;
    _clearFn = null;
}

export const LdsConsole = { attach, detach };
