import {
  AttributionQuality,
  EvidenceLevel,
  RuntimeEventType,
} from '../core/evidence-protocol.js';

function _safeWindow(candidate) {
  return candidate && typeof candidate === 'object' ? candidate : null;
}
function _ownerName(event) {
  return event?.owner?.name || event?.owner?.id || '(runtime)';
}
function _ownerKey(event) {
  return event?.owner?.id || _ownerName(event);
}
function _sourceFile(event) {
  return event?.source?.file || null;
}
function _ensureObject(target, key) {
  if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
    target[key] = {};
  }
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
  if (!perf[name]) {
    perf[name] = { count: 0, totalMs: 0, maxMs: 0, minMs: Infinity, samples: [] };
  }
  return perf[name];
}
function _memoryBucket(memory, name) {
  if (!memory[name]) memory[name] = { mounted: 0, unmounted: 0, gcCount: 0 };
  return memory[name];
}
function _summary(value) {
  return value?.summary ?? value?.type ?? 'unknown';
}

class RuntimePanelEvidenceBridge {
  #store;
  #windowTarget;
  #unsubscribe = null;
  #processed = new Set();
  #startedAt = null;
  #sourceByOwner = new Map();
  #previousTagResolver = null;
  #resourcesByOwner = new Map();
  #stateHistory = new Map();
  #lastThrashAt = new Map();

  constructor({ store, windowTarget = typeof window !== 'undefined' ? window : null } = {}) {
    if (!store || typeof store.snapshot !== 'function' || typeof store.subscribe !== 'function') {
      throw new TypeError('RuntimePanelEvidenceBridge requires an EvidenceStore-compatible store.');
    }
    this.#store = store;
    this.#windowTarget = _safeWindow(windowTarget);
  }

  get started() {
    return !!this.#unsubscribe;
  }

  start() {
    if (this.#unsubscribe || !this.#windowTarget) return this;
    const win = this.#windowTarget;
    this.#startedAt = Date.now();

    _ensureObject(win, '__LDS_PERF__');
    _ensureArray(win, '__LDS_SLOW_RENDERS__');
    _ensureObject(win, '__LDS_MEMORY__');
    _ensureArray(win, '__LDS_EVENTS_TIMELINE__');
    _ensureObject(win, '__LDS_EVENTS_FREQ__');
    _ensureArray(win, '__LDS_ERRORS__');
    _ensureArray(win, '__LDS_RESOURCE_VIOLATIONS__');
    _ensureArray(win, '__LDS_SLOW_API_LOG__');
    _ensureObject(win, '__LDS_RENDER_REASONS__');
    _ensureArray(win, '__LDS_THRASH__');

    win.__LDS_EVIDENCE_STORE__ = this.#store;
    win.__LDS_EVIDENCE__ = () => this.#store.snapshot();
    win.__LDS_RUNTIME_FRAMEWORK__ = 'react';

    this.#previousTagResolver = typeof win.__LDS_TAG_TO_FILE__ === 'function'
      ? win.__LDS_TAG_TO_FILE__
      : null;
    win.__LDS_TAG_TO_FILE__ = tag => this.#sourceByOwner.get(tag)
      || this.#previousTagResolver?.(tag)
      || `src/components/${tag}/${tag}.js`;

    for (const event of this.#store.snapshot()) this.#consume(event);
    this.#unsubscribe = this.#store.subscribe(event => this.#consume(event));
    return this;
  }

  stop() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    const win = this.#windowTarget;
    if (win && win.__LDS_TAG_TO_FILE__) {
      if (this.#previousTagResolver) win.__LDS_TAG_TO_FILE__ = this.#previousTagResolver;
      else delete win.__LDS_TAG_TO_FILE__;
    }
    this.#previousTagResolver = null;
    return this;
  }

  #recordStateReason(event, ownerName) {
    const payload = event.payload || {};
    if (!payload.property) return;

    const reasons = _ensureObject(this.#windowTarget, '__LDS_RENDER_REASONS__');
    if (!Array.isArray(reasons[ownerName])) reasons[ownerName] = [];
    _boundedPush(reasons[ownerName], {
      prop: payload.property,
      oldSummary: _summary(payload.oldValue),
      newSummary: _summary(payload.newValue),
      sameRef: payload.sameReference === true,
      ts: new Date(event.timestamp).toISOString(),
      evidenceLevel: event.evidence?.level || 'observation',
    }, 40);

    const key = `${_ownerKey(event)}\u0000${payload.property}`;
    const now = event.timestamp;
    const history = (this.#stateHistory.get(key) || []).filter(ts => now - ts <= 1000);
    history.push(now);
    this.#stateHistory.set(key, history);

    const lastIncident = this.#lastThrashAt.get(key) || 0;
    if (history.length >= 6 && now - lastIncident > 1000) {
      this.#lastThrashAt.set(key, now);
      _boundedPush(_ensureArray(this.#windowTarget, '__LDS_THRASH__'), {
        tag: ownerName,
        prop: payload.property,
        count: history.length,
        windowMs: 1000,
        stack: _sourceFile(event)
          ? `at ${ownerName} (${_sourceFile(event)})`
          : null,
        evidenceLevel: 'correlation',
      }, 100);
    }
  }

  #trackResource(event, ownerName) {
    const key = _ownerKey(event);
    const resourceId = event.payload?.resourceId;
    if (!resourceId) return;

    let resources = this.#resourcesByOwner.get(key);
    if (!resources) {
      resources = new Map();
      this.#resourcesByOwner.set(key, resources);
    }

    if (event.type === RuntimeEventType.RESOURCE_ACQUIRED) {
      resources.set(resourceId, {
        eventType: event.payload?.resourceType || 'resource',
        target: resourceId,
        creationStack: _sourceFile(event)
          ? `at ${ownerName} (${_sourceFile(event)})`
          : null,
      });
    } else {
      resources.delete(resourceId);
      if (!resources.size) this.#resourcesByOwner.delete(key);
    }
  }

  #flushResourceViolation(event, ownerName) {
    const key = _ownerKey(event);
    const resources = this.#resourcesByOwner.get(key);
    if (!resources?.size) return;

    const outstanding = [...resources.values()];
    _boundedPush(_ensureArray(this.#windowTarget, '__LDS_RESOURCE_VIOLATIONS__'), {
      ownerTag: ownerName,
      ownerId: event.owner?.id || null,
      framework: 'react',
      resources: outstanding,
      ts: new Date(event.timestamp).toISOString(),
      evidenceLevel: 'lifetime-violation',
    }, 100);
    this.#resourcesByOwner.delete(key);

    try {
      this.#store.emit({
        type: RuntimeEventType.DIAGNOSTIC,
        framework: { name: 'react', adapterVersion: 'panel-evidence-bridge-1' },
        owner: event.owner,
        source: event.source,
        correlation: event.correlation,
        evidence: {
          level: EvidenceLevel.LIFETIME_VIOLATION,
          attribution: event.source
            ? AttributionQuality.SOURCE_ATTRIBUTED
            : AttributionQuality.DETERMINISTIC,
          confidence: 1,
        },
        payload: {
          diagnostic: 'react.resource-lifetime-violation',
          resourceLifetimeViolation: true,
          resourceCount: outstanding.length,
          resourceTypes: [...new Set(outstanding.map(item => item.eventType))],
        },
      });
    } catch {}
  }

  #consume(event) {
    if (!event?.id || this.#processed.has(event.id) || !this.#windowTarget) return;
    this.#processed.add(event.id);

    const win = this.#windowTarget;
    const ownerName = _ownerName(event);
    const source = _sourceFile(event);
    if (source && ownerName) this.#sourceByOwner.set(ownerName, source);

    const elapsed = Number.isFinite(event.timestamp) && Number.isFinite(this.#startedAt)
      ? Math.max(0, event.timestamp - this.#startedAt)
      : null;
    _boundedPush(_ensureArray(win, '__LDS_EVENTS_TIMELINE__'), {
      seq: event.sequence,
      name: event.type,
      from: ownerName === '(runtime)' ? event.framework?.name || null : ownerName,
      elapsed,
      ts: event.timestamp,
      evidenceLevel: event.evidence?.level || 'observation',
      attribution: event.evidence?.attribution || 'unknown',
      source,
    }, 500);

    const frequency = _ensureObject(win, '__LDS_EVENTS_FREQ__');
    if (!frequency[event.type]) frequency[event.type] = { count: 0, sources: [] };
    frequency[event.type].count += 1;
    const frequencySource = ownerName === '(runtime)' ? event.framework?.name : ownerName;
    if (frequencySource && !frequency[event.type].sources.includes(frequencySource)) {
      frequency[event.type].sources.push(frequencySource);
      if (frequency[event.type].sources.length > 12) frequency[event.type].sources.shift();
    }

    switch (event.type) {
      case RuntimeEventType.OWNER_CREATED:
        _memoryBucket(_ensureObject(win, '__LDS_MEMORY__'), ownerName).mounted += 1;
        break;
      case RuntimeEventType.OWNER_DESTROYED:
        _memoryBucket(_ensureObject(win, '__LDS_MEMORY__'), ownerName).unmounted += 1;
        this.#flushResourceViolation(event, ownerName);
        break;
      case RuntimeEventType.UPDATE_COMPLETED: {
        const duration = event.payload?.actualDurationMs;
        if (!Number.isFinite(duration)) break;
        const bucket = _perfBucket(_ensureObject(win, '__LDS_PERF__'), ownerName);
        bucket.count += 1;
        bucket.totalMs += duration;
        bucket.maxMs = Math.max(bucket.maxMs, duration);
        bucket.minMs = Math.min(bucket.minMs, duration);
        bucket.samples.push(Math.round(duration * 100) / 100);
        if (bucket.samples.length > 20) bucket.samples.shift();
        if (duration > 500) {
          _boundedPush(_ensureArray(win, '__LDS_SLOW_RENDERS__'), {
            tag: ownerName,
            ms: Math.round(duration),
            ts: new Date(event.timestamp).toISOString(),
            stack: source ? `at ${ownerName} (${source})` : null,
            evidenceLevel: event.evidence?.level || 'observation',
          }, 100);
        }
        break;
      }
      case RuntimeEventType.STATE_CHANGED:
        this.#recordStateReason(event, ownerName);
        break;
      case RuntimeEventType.RESOURCE_ACQUIRED:
      case RuntimeEventType.RESOURCE_RELEASED:
        this.#trackResource(event, ownerName);
        break;
      case RuntimeEventType.ERROR:
        _boundedPush(_ensureArray(win, '__LDS_ERRORS__'), {
          tag: ownerName === '(runtime)' ? event.framework?.name || 'browser' : ownerName,
          phase: event.payload?.phase || 'runtime',
          message: event.payload?.message || event.payload?.error || event.payload?.diagnostic || 'Runtime error',
          stack: event.payload?.stack || (source ? `at ${ownerName} (${source})` : null),
          ts: new Date(event.timestamp).toISOString(),
          evidenceLevel: event.evidence?.level || 'observation',
        }, 100);
        break;
      case RuntimeEventType.NETWORK_COMPLETED: {
        const duration = event.payload?.durationMs;
        if (event.payload?.isSlow === true || (Number.isFinite(duration) && duration > 2000)) {
          _boundedPush(_ensureArray(win, '__LDS_SLOW_API_LOG__'), {
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
