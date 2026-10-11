/**
 * LdsVitals — Core Web Vitals + Long Task detector.
 * Page-level tool: call LdsVitals.init() once and pair it with detach() when the
 * owning runtime can be stopped.
 */

const _vitals = {
    lcp: null,
    cls: { value: 0, entries: [] },
    inp: null,
    longTasks: [],
};

let _initialized = false;
let _clients = 0;
let _windowTarget = null;
let _observers = [];

function _observe(Observer, callback, options) {
    try {
        const observer = new Observer(callback);
        observer.observe(options);
        _observers.push(observer);
        return true;
    } catch {
        return false;
    }
}

function init() {
    if (typeof window === 'undefined') return false;
    _clients += 1;
    if (_initialized) return true;

    const win = window;
    _initialized = true;
    _windowTarget = win;
    win.__LDS_VITALS__ = _vitals;

    const Observer = win.PerformanceObserver || globalThis.PerformanceObserver;
    if (typeof Observer === 'undefined') return true;

    _observe(Observer, list => {
        const last = list.getEntries().at(-1);
        if (!last) return;
        _vitals.lcp = {
            valueMs: Math.round(last.startTime),
            element: last.element?.tagName?.toLowerCase() || 'unknown',
            url:     last.url || null,
            ts:      new Date().toISOString(),
        };
    }, { type: 'largest-contentful-paint', buffered: true });

    _observe(Observer, list => {
        for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
                _vitals.cls.value += entry.value;
                _vitals.cls.entries.push({
                    value:   +entry.value.toFixed(4),
                    sources: (entry.sources || [])
                        .map(s => s.node?.tagName?.toLowerCase())
                        .filter(Boolean),
                    ts: new Date().toISOString(),
                });
                if (_vitals.cls.entries.length > 20) _vitals.cls.entries.shift();
            }
        }
    }, { type: 'layout-shift', buffered: true });

    const inpObserved = _observe(Observer, list => {
        for (const entry of list.getEntries()) {
            const ms = Math.round(entry.duration || entry.processingStart - entry.startTime || 0);
            if (!_vitals.inp || ms > _vitals.inp.valueMs) {
                _vitals.inp = { valueMs: ms, eventType: entry.name, ts: new Date().toISOString() };
            }
        }
    }, { type: 'event', buffered: true, durationThreshold: 40 });

    if (!inpObserved) {
        _observe(Observer, list => {
            const e = list.getEntries()[0];
            if (!e) return;
            _vitals.inp = {
                valueMs: Math.round(e.processingStart - e.startTime),
                eventType: e.name,
                ts: new Date().toISOString(),
            };
        }, { type: 'first-input', buffered: true });
    }

    _observe(Observer, list => {
        for (const entry of list.getEntries()) {
            const origin = win.performance?.timeOrigin ?? globalThis.performance?.timeOrigin ?? Date.now();
            _vitals.longTasks.push({
                durationMs: Math.round(entry.duration),
                ts: new Date(origin + entry.startTime).toISOString(),
            });
            if (_vitals.longTasks.length > 100) _vitals.longTasks.shift();
        }
    }, { type: 'longtask', buffered: true });

    return true;
}

function detach() {
    if (_clients > 0) _clients -= 1;
    if (!_initialized || _clients > 0) return;

    for (const observer of _observers) {
        try { observer.disconnect?.(); } catch {}
    }
    _observers = [];

    if (_windowTarget?.__LDS_VITALS__ === _vitals) {
        try { delete _windowTarget.__LDS_VITALS__; } catch { _windowTarget.__LDS_VITALS__ = undefined; }
    }

    _initialized = false;
    _windowTarget = null;
}

const LdsVitals = { init, detach };
export { LdsVitals };
