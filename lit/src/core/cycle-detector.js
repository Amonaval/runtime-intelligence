/**
 * LdsCycleDetector — detects circular property-update chains between elements.
 */

if (typeof window !== 'undefined' && !window.__LDS_CYCLES__) {
    window.__LDS_CYCLES__ = [];
    window.__LDS_CYCLES_REPORT__ = function () {
        const c = window.__LDS_CYCLES__ || [];
        if (!c.length) {
            console.log('%c[LdsCycleDetector] No cycles detected', 'color:#a6e3a1;font-weight:bold;');
            return [];
        }
        console.log(`%c[LdsCycleDetector] ${c.length} cycle(s) detected`, 'color:#f38ba8;font-weight:bold;font-size:14px;');
        console.table(c.map(e => ({ path: e.path, count: e.count, first: e.ts.slice(11, 19) })));
        return c;
    };
}

const _updatingCounts = new Map();
const _updateGraph = new Map();

function _graphEdge(fromTag, toTag) {
    if (fromTag === toTag) return;
    if (!_updateGraph.has(fromTag)) _updateGraph.set(fromTag, new Set());
    _updateGraph.get(fromTag).add(toTag);
}

function _findCycle(start) {
    const visited = new Set();
    const path = [start];
    function dfs(node) {
        for (const next of (_updateGraph.get(node) || [])) {
            if (next === start) return [...path, start];
            if (!visited.has(next)) {
                visited.add(next);
                path.push(next);
                const found = dfs(next);
                if (found) return found;
                path.pop();
            }
        }
        return null;
    }
    return dfs(start);
}

function _patchMethod(el, name, wrapperFactory) {
    if (typeof el[name] !== 'function') return null;
    const patch = {
        hadOwn: Object.prototype.hasOwnProperty.call(el, name),
        original: el[name],
    };
    el[name] = wrapperFactory(patch.original);
    return patch;
}

function _restoreMethod(el, name, patch) {
    if (!patch) return;
    if (patch.hadOwn) el[name] = patch.original;
    else delete el[name];
}

function attach(el) {
    if (el.__ldsCyclePatched) return;
    el.__ldsCyclePatched = true;
    const tag = el.tagName.toLowerCase();

    const performUpdate = _patchMethod(el, 'performUpdate', original => function (...args) {
        _updatingCounts.set(tag, (_updatingCounts.get(tag) || 0) + 1);
        const finish = () => {
            const n = _updatingCounts.get(tag);
            if (n <= 1) _updatingCounts.delete(tag);
            else _updatingCounts.set(tag, n - 1);
        };
        try {
            const result = original.apply(this, args);
            if (result && typeof result.then === 'function') {
                return Promise.resolve(result).finally(finish);
            }
            finish();
            return result;
        } catch (error) {
            finish();
            throw error;
        }
    });

    const requestUpdate = _patchMethod(el, 'requestUpdate', original => function (...args) {
        const [name] = args;
        for (const [updatingTag] of _updatingCounts) {
            if (updatingTag === tag) continue;
            _graphEdge(updatingTag, tag);
            const cyclePath = _findCycle(tag);
            if (!cyclePath) continue;
            const pathStr = cyclePath.join(' → ');
            const cycles = typeof window !== 'undefined' ? window.__LDS_CYCLES__ : null;
            if (!cycles) continue;
            const existing = cycles.find(c => c.path === pathStr);
            if (existing) {
                existing.count++;
            } else {
                cycles.push({
                    path: pathStr,
                    count: 1,
                    prop: name != null ? String(name) : null,
                    ts: new Date().toISOString(),
                    stack: (new Error().stack || '').split('\n').slice(1, 7).join('\n'),
                });
                if (cycles.length > 100) cycles.shift();
            }
        }
        return original.apply(this, args);
    });

    el.__ldsCyclePatch = { performUpdate, requestUpdate };
}

function detach(el) {
    const patch = el.__ldsCyclePatch;
    if (patch) {
        _restoreMethod(el, 'requestUpdate', patch.requestUpdate);
        _restoreMethod(el, 'performUpdate', patch.performUpdate);
    }
    delete el.__ldsCyclePatch;
    delete el.__ldsCyclePatched;
    const tag = el.tagName?.toLowerCase();
    if (tag) _updatingCounts.delete(tag);
}

const LdsCycleDetector = { attach, detach };
export { LdsCycleDetector };
