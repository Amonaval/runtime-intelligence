import { RuntimeEventType } from '../core/evidence-protocol.js';

function _safeWindow(candidate) {
  return candidate && typeof candidate === 'object' ? candidate : null;
}
function _ownerName(event) { return event?.owner?.name || event?.owner?.id || '(runtime)'; }
function _sourceFile(event) { return event?.source?.file || null; }
function _ensureObject(target, key) {
  if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
  return target[key];
}
function _ensureArray(target, key) {
  if (!Array.isArray(target[key])) target[key] = [];
  return target[key];
}
function _boundedPush(list, value, limit = 200) {
  list.push(value);
  if (list.length > limit) list.splice(0, list.length - limit);
}
function _perfBucket(perf, name) {
  if (!perf[name]) perf[name] = { count: 0, totalMs: 0, maxMs: 0, minMs: Infinity, samples: [] };
  return perf[name];
}
function _memoryBucket(memory, name) {
  if (!memory[name]) memory[name] = { mounted: 0, unmounted: 0, gcCount: 0 };
  return memory[name];
}

class RuntimePanelEvidenceBridge {
  #store;
  #windowTarget;
  #unsubscribe = null;
  #processed = new Set();
  #startedAt = null;
  #sourceByOwner = new Map();
  #previousTagResolver = null;

  constructor({ store, windowTarget = typeof window !== 'undefined' ? window : null } = {}) {
    if (!store || typeof store.snapshot !== 'function' || typeof store.subscribe !== 'function') {
      throw new TypeError('RuntimePanelEvidenceBridge requires an EvidenceStore-compatible store.');
    }
    this.#store = store;
    this.#windowTarget = _safeWindow(windowTarget);
  }
  get started() { return !!this.#unsubscribe; }

  start() {
    if (this.#unsubscribe || !this.#windowTarget) return this;
    const w = this.#windowTarget;
    this.#startedAt = Date.now();
    _ensureObject(w, '__LDS_PERF__');
    _ensureArray(w, '__LDS_SLOW_RENDERS__');
    _ensureObject(w, '__LDS_MEMORY__');
    _ensureArray(w, '__LDS_EVENTS_TIMELINE__');
    _ensureObject(w, '__LDS_EVENTS_FREQ__');
    _ensureArray(w, '__LDS_ERRORS__');
    _ensureArray(w, '__LDS_RESOURCE_VIOLATIONS__');
    _ensureArray(w, '__LDS_SLOW_API_LOG__');
    w.__LDS_EVIDENCE_STORE__ = this.#store;
    w.__LDS_EVIDENCE__ = () => this.#store.snapshot();
    w.__LDS_RUNTIME_FRAMEWORK__ = 'react';
    this.#previousTagResolver = typeof w.__LDS_TAG_TO_FILE__ === 'function' ? w.__LDS_TAG_TO_FILE__ : null;
    w.__LDS_TAG_TO_FILE__ = tag => this.#sourceByOwner.get(tag) || this.#previousTagResolver?.(tag) || `src/components/${tag}/${tag}.js`;
    for (const event of this.#store.snapshot()) this.#consume(event);
    this.#unsubscribe = this.#store.subscribe(event => this.#consume(event));
    return this;
  }

  stop() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    const w = this.#windowTarget;
    if (w && w.__LDS_TAG_TO_FILE__) {
      if (this.#previousTagResolver) w.__LDS_TAG_TO_FILE__ = this.#previousTagResolver;
      else delete w.__LDS_TAG_TO_FILE__;
    }
    this.#previousTagResolver = null;
    return this;
  }

  #consume(event) {
    if (!event?.id || this.#processed.has(event.id) || !this.#windowTarget) return;
    this.#processed.add(event.id);
    const w = this.#windowTarget;
    const owner = _ownerName(event);
    const source = _sourceFile(event);
    if (source && owner) this.#sourceByOwner.set(owner, source);

    const timeline = _ensureArray(w, '__LDS_EVENTS_TIMELINE__');
    const elapsed = Number.isFinite(event.timestamp) && Number.isFinite(this.#startedAt) ? Math.max(0, event.timestamp - this.#startedAt) : null;
    _boundedPush(timeline, {
      seq: event.sequence,
      name: event.type,
      from: owner === '(runtime)' ? event.framework?.name || null : owner,
      elapsed,
      ts: event.timestamp,
      evidenceLevel: event.evidence?.level || 'observation',
      attribution: event.evidence?.attribution || 'unknown',
      source,
    }, 500);

    const freq = _ensureObject(w, '__LDS_EVENTS_FREQ__');
    if (!freq[event.type]) freq[event.type] = { count: 0, sources: [] };
    freq[event.type].count += 1;
    const freqSource = owner === '(runtime)' ? event.framework?.name : owner;
    if (freqSource && !freq[event.type].sources.includes(freqSource)) {
      freq[event.type].sources.push(freqSource);
      if (freq[event.type].sources.length > 12) freq[event.type].sources.shift();
    }

    switch (event.type) {
      case RuntimeEventType.OWNER_CREATED: {
        _memoryBucket(_ensureObject(w, '__LDS_MEMORY__'), owner).mounted += 1;
        break;
      }
      case RuntimeEventType.OWNER_DESTROYED: {
        _memoryBucket(_ensureObject(w, '__LDS_MEMORY__'), owner).unmounted += 1;
        break;
      }
      case RuntimeEventType.UPDATE_COMPLETED: {
        const duration = event.payload?.actualDurationMs;
        if (!Number.isFinite(duration)) break;
        const bucket = _perfBucket(_ensureObject(w, '__LDS_PERF__'), owner);
        bucket.count += 1;
        bucket.totalMs += duration;
        bucket.maxMs = Math.max(bucket.maxMs, duration);
        bucket.minMs = Math.min(bucket.minMs, duration);
        bucket.samples.push(Math.round(duration * 100) / 100);
        if (bucket.samples.length > 20) bucket.samples.shift();
        if (duration > 500) {
          _boundedPush(_ensureArray(w, '__LDS_SLOW_RENDERS__'), {
            tag: owner,
            ms: Math.round(duration),
            ts: new Date(event.timestamp).toISOString(),
            stack: source ? `at ${owner} (${source})` : null,
            evidenceLevel: event.evidence?.level || 'observation',
          }, 100);
        }
        break;
      }
      case RuntimeEventType.ERROR: {
        _boundedPush(_ensureArray(w, '__LDS_ERRORS__'), {
          tag: owner === '(runtime)' ? (event.framework?.name || 'browser') : owner,
          phase: event.payload?.phase || 'runtime',
          message: event.payload?.message || event.payload?.error || event.payload?.diagnostic || 'Runtime error',
          stack: event.payload?.stack || (source ? `at ${owner} (${source})` : null),
          ts: new Date(event.timestamp).toISOString(),
          evidenceLevel: event.evidence?.level || 'observation',
        }, 100);
        break;
      }
      case RuntimeEventType.NETWORK_COMPLETED: {
        const duration = event.payload?.durationMs;
        if (event.payload?.isSlow === true || (Number.isFinite(duration) && duration > 2000)) {
          _boundedPush(_ensureArray(w, '__LDS_SLOW_API_LOG__'), {
            ts: new Date(event.timestamp).toISOString(),
            ms: Math.round(duration || 0),
            method: event.payload?.method || 'GET',
            tag: event.owner?.name || null,
            operation: event.payload?.path || '(network)',
            status: event.payload?.status ?? null,
            evidenceLevel: event.evidence?.level || 'observation',
          }, 100);
        }
        break;
      }
      default:
        break;
    }
  }
}

function bridgeRuntimeEvidenceToPanel(options = {}) {
  return new RuntimePanelEvidenceBridge(options).start();
}
export { RuntimePanelEvidenceBridge, bridgeRuntimeEvidenceToPanel };
