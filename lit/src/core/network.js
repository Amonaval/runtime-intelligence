/**
 * LdsNetwork — intercepts window.fetch and XMLHttpRequest while diagnostics are active.
 * Page-level tool: call LdsNetwork.init() once and pair it with detach() when the
 * owning runtime can be stopped.
 *
 * Network entries expose explicit startedAt/endedAt wall-clock timestamps so
 * higher-level analyzers never have to reconstruct request timing from a
 * completion timestamp plus duration.
 */

const SLOW_MS     = 2000;
const LARGE_KB    = 512;
const MAX_ENTRIES = 200;

const _log = [];
const _subscribers = new Set();
let _initialized = false;
let _clients = 0;
let _decoder = null;
let _windowTarget = null;
let _xhrPrototype = null;
let _origFetch = null;
let _patchedFetch = null;
let _origOpen = null;
let _patchedOpen = null;
let _origSend = null;
let _patchedSend = null;

function registerDecoder(fn) {
    _decoder = fn;
}

function subscribe(fn) {
    if (typeof fn !== 'function') throw new TypeError('LdsNetwork.subscribe requires a function');
    _subscribers.add(fn);
    return () => _subscribers.delete(fn);
}

function _push(entry) {
    _log.push(entry);
    if (_log.length > MAX_ENTRIES) _log.shift();
    for (const subscriber of _subscribers) {
        try { subscriber(entry); } catch { /* diagnostics must never break network runtime */ }
    }
}

function _shortUrl(raw, win) {
    try {
        const base = win?.location?.href || 'http://runtime-intelligence.invalid/';
        const u  = new URL(String(raw), base);
        const qs = u.search.length > 60 ? u.search.slice(0, 60) + '…' : u.search;
        return u.pathname + qs;
    } catch {
        return String(raw).slice(0, 100);
    }
}

function _resolveDecoded(rawUrl, body) {
    if (!_decoder) return null;
    try { return _decoder(rawUrl, body); } catch (_) { return null; }
}

function _now(win) {
    try { return win?.performance?.now?.() ?? performance.now(); } catch { return Date.now(); }
}

function init() {
    if (typeof window === 'undefined') return false;
    _clients += 1;
    if (_initialized) return true;

    const win = window;
    _initialized = true;
    _windowTarget = win;
    win.__LDS_NETWORK_LOG__ = _log;

    if (typeof win.fetch === 'function') {
        _origFetch = win.fetch;
        _patchedFetch = function (...args) {
            const rawUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
            const method = (args[1]?.method || 'GET').toUpperCase();
            const body   = typeof args[1]?.body === 'string' ? args[1].body : null;
            const t0     = _now(win);
            const startedAt = Date.now();
            const callStack = (win.__LDS_DEBUG__ || win.__LDS_FALCOR_VIEW__ || win.__LDS_INTELLIGENCE_ENABLED__)
                ? new Error().stack : undefined;

            return _origFetch.apply(this, args).then(
                response => {
                    const ms = Math.round(_now(win) - t0);
                    const endedAt = Date.now();
                    const kb = Math.round(parseInt(response.headers.get('content-length') || '0', 10) / 1024);
                    _push({
                        url:            _shortUrl(rawUrl, win),
                        fullUrl:        String(rawUrl),
                        method,
                        status:         response.status,
                        durationMs:     ms,
                        responseSizeKB: kb || null,
                        startedAt,
                        endedAt,
                        ts:             new Date(endedAt).toISOString(),
                        isError:        response.status >= 400,
                        isSlow:         ms > SLOW_MS,
                        isLarge:        kb > LARGE_KB,
                        type:           'fetch',
                        decoded:        _resolveDecoded(rawUrl, body),
                        callStack,
                    });
                    return response;
                },
                err => {
                    const endedAt = Date.now();
                    _push({
                        url:            _shortUrl(rawUrl, win),
                        fullUrl:        String(rawUrl),
                        method,
                        status:         0,
                        durationMs:     Math.round(_now(win) - t0),
                        responseSizeKB: null,
                        startedAt,
                        endedAt,
                        ts:             new Date(endedAt).toISOString(),
                        isError:        true,
                        isSlow:         false,
                        isLarge:        false,
                        type:           'fetch',
                        decoded:        _resolveDecoded(rawUrl, body),
                        error:          err?.message || 'Network error',
                        callStack,
                    });
                    throw err;
                }
            );
        };
        win.fetch = _patchedFetch;
    }

    const Xhr = win.XMLHttpRequest;
    if (Xhr?.prototype?.open && Xhr?.prototype?.send) {
        _xhrPrototype = Xhr.prototype;
        _origOpen = _xhrPrototype.open;
        _origSend = _xhrPrototype.send;

        _patchedOpen = function (method, url, ...rest) {
            this.__lds_method = method;
            this.__lds_url    = url;
            return _origOpen.apply(this, [method, url, ...rest]);
        };
        _patchedSend = function (...args) {
            this.__lds_body = typeof args[0] === 'string' ? args[0] : null;
            const t0 = _now(win);
            const startedAt = Date.now();
            const callStack = (win.__LDS_DEBUG__ || win.__LDS_FALCOR_VIEW__ || win.__LDS_INTELLIGENCE_ENABLED__)
                ? new Error().stack : undefined;
            this.addEventListener('loadend', () => {
                const ms = Math.round(_now(win) - t0);
                const endedAt = Date.now();
                const kb = Math.round(parseInt(this.getResponseHeader?.('content-length') || '0', 10) / 1024);
                _push({
                    url:            _shortUrl(this.__lds_url || '', win),
                    fullUrl:        String(this.__lds_url || ''),
                    method:         (this.__lds_method || 'GET').toUpperCase(),
                    status:         this.status,
                    durationMs:     ms,
                    responseSizeKB: kb || null,
                    startedAt,
                    endedAt,
                    ts:             new Date(endedAt).toISOString(),
                    isError:        this.status === 0 || this.status >= 400,
                    isSlow:         ms > SLOW_MS,
                    isLarge:        kb > LARGE_KB,
                    type:           'xhr',
                    decoded:        _resolveDecoded(this.__lds_url || '', this.__lds_body),
                    callStack,
                });
            });
            return _origSend.apply(this, args);
        };

        _xhrPrototype.open = _patchedOpen;
        _xhrPrototype.send = _patchedSend;
    }

    return true;
}

function detach() {
    if (_clients > 0) _clients -= 1;
    if (!_initialized || _clients > 0) return;

    if (_windowTarget && _patchedFetch && _windowTarget.fetch === _patchedFetch) {
        _windowTarget.fetch = _origFetch;
    }
    if (_xhrPrototype && _patchedOpen && _xhrPrototype.open === _patchedOpen) {
        _xhrPrototype.open = _origOpen;
    }
    if (_xhrPrototype && _patchedSend && _xhrPrototype.send === _patchedSend) {
        _xhrPrototype.send = _origSend;
    }
    if (_windowTarget?.__LDS_NETWORK_LOG__ === _log) {
        try { delete _windowTarget.__LDS_NETWORK_LOG__; } catch { _windowTarget.__LDS_NETWORK_LOG__ = undefined; }
    }

    _initialized = false;
    _windowTarget = null;
    _xhrPrototype = null;
    _origFetch = null;
    _patchedFetch = null;
    _origOpen = null;
    _patchedOpen = null;
    _origSend = null;
    _patchedSend = null;
}

const LdsNetwork = { init, detach, registerDecoder, subscribe };
export { LdsNetwork };
