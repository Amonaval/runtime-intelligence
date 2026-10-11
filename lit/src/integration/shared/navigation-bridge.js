/** Framework-neutral browser navigation tracker. */
import { EvidenceLevel, AttributionQuality, RuntimeEventType } from '../../core/evidence-protocol.js';
import { ownBrowserProperty } from './owned-browser-properties.js';
import { maskUrlQuery } from '../../core/enterprise-privacy.js';

const DEFAULT_ORPHAN_CHECK_DELAY_MS = 5000;
function _sanitizeUrl(href) {
  try { return maskUrlQuery(typeof href === 'string' ? href : String(href)); }
  catch { return '[url-sanitize-error]'; }
}

class NavigationBridge {
  #store; #win; #orphanCheckDelayMs; #active = false; #pushLease = null; #replaceLease = null; #orphanTimer = null; #generation = 0;
  #popstateListener = null; #survivedCounts = new Map(); #totalOrphansEmitted = 0;
  constructor({ store, windowTarget = typeof window !== 'undefined' ? window : null, orphanCheckDelayMs = DEFAULT_ORPHAN_CHECK_DELAY_MS } = {}) {
    if (!store || typeof store.emit !== 'function' || typeof store.snapshot !== 'function') throw new TypeError('NavigationBridge requires an EvidenceStore-compatible store.');
    this.#store = store; this.#win = windowTarget;
    this.#orphanCheckDelayMs = Number.isFinite(orphanCheckDelayMs) && orphanCheckDelayMs >= 0 ? orphanCheckDelayMs : DEFAULT_ORPHAN_CHECK_DELAY_MS;
  }
  start() {
    if (this.#active || !this.#win?.history) return this;
    this.#active = true;
    const history = this.#win.history;
    const generation = ++this.#generation;
    const pushState = history.pushState;
    const replaceState = history.replaceState;
    if (typeof pushState === 'function') this.#pushLease = ownBrowserProperty(history, 'pushState', (...args) => {
      const result = pushState.apply(history, args);
      if (this.#active && generation === this.#generation) this.#onNavigation('pushState');
      return result;
    });
    if (typeof replaceState === 'function') this.#replaceLease = ownBrowserProperty(history, 'replaceState', (...args) => {
      const result = replaceState.apply(history, args);
      if (this.#active && generation === this.#generation) this.#onNavigation('replaceState');
      return result;
    });
    this.#popstateListener = () => this.#onNavigation('popstate');
    this.#win.addEventListener?.('popstate', this.#popstateListener);
    return this;
  }
  stop() {
    if (!this.#active) return this;
    this.#active = false;
    this.#generation += 1;
    this.#pushLease?.release(); this.#replaceLease?.release();
    this.#pushLease = null; this.#replaceLease = null;
    clearTimeout(this.#orphanTimer); this.#orphanTimer = null;
    this.#survivedCounts.clear();
    if (this.#popstateListener) this.#win?.removeEventListener?.('popstate', this.#popstateListener);
    this.#popstateListener = null;
    return this;
  }
  orphanCount() { return this.#totalOrphansEmitted; }
  #onNavigation(type) {
    if (!this.#active) return;
    const navTimestamp = Date.now();
    const url = _sanitizeUrl(this.#win?.location?.href ?? '');
    try {
      this.#store.emit({ type: RuntimeEventType.NAVIGATION, owner: null,
        evidence: { level: EvidenceLevel.OBSERVATION, attribution: AttributionQuality.DETERMINISTIC, confidence: 1 },
        payload: { url, navigationType: type, timestamp: navTimestamp } });
    } catch {}
    if (this.#orphanCheckDelayMs === 0) this.#checkOrphans(navTimestamp);
    else {
      clearTimeout(this.#orphanTimer);
      const generation = this.#generation;
      this.#orphanTimer = setTimeout(() => {
        this.#orphanTimer = null;
        if (this.#active && generation === this.#generation) this.#checkOrphans(navTimestamp);
      }, this.#orphanCheckDelayMs);
    }
  }
  #checkOrphans(navTimestamp) {
    if (!this.#active) return;
    const created = this.#store.snapshot({ type: RuntimeEventType.OWNER_CREATED });
    const destroyedIds = new Set(this.#store.snapshot({ type: RuntimeEventType.OWNER_DESTROYED }).map(e => e.owner?.id).filter(Boolean));
    for (const ev of created) {
      const ownerId = ev.owner?.id;
      if (!ownerId || (ev.timestamp ?? 0) > navTimestamp) continue;
      if (destroyedIds.has(ownerId)) { this.#survivedCounts.delete(ownerId); continue; }
      const survived = (this.#survivedCounts.get(ownerId) ?? 0) + 1;
      if (!this.#survivedCounts.has(ownerId) && this.#survivedCounts.size >= 1000) this.#survivedCounts.delete(this.#survivedCounts.keys().next().value);
      this.#survivedCounts.set(ownerId, survived); this.#totalOrphansEmitted += 1;
      try {
        this.#store.emit({ type: RuntimeEventType.DIAGNOSTIC, owner: ev.owner, source: ev.source,
          evidence: { level: EvidenceLevel.CORRELATION, attribution: AttributionQuality.TEMPORAL_INFERENCE, confidence: 0.6 },
          payload: { orphanSuspect: true, ownerId, tag: ev.owner?.name ?? ownerId, survivedNavigationCount: survived } });
      } catch {}
    }
  }
}
export { NavigationBridge };
