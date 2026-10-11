/**
 * LitDebugMixin — drop-in debug mixin for any LitElement base class.
 *
 * The mixin is production-safe when diagnostics are disabled: it does not
 * connect the UREP adapter or attach collectors until an explicit Runtime
 * Intelligence flag is active before the element connects.
 */

import { _runtimeEnabled, _toolEnabled } from './core/gate.js';
import { LdsMemory }         from './core/memory.js';
import { LdsPerfMonitor }    from './core/perf.js';
import { LdsErrorBoundary }  from './core/error-boundary.js';
import { LdsPropAudit }      from './core/prop-audit.js';
import { LdsInspector }      from './core/inspector.js';
import { LdsCycleDetector }  from './core/cycle-detector.js';
import { LdsEventTracer }    from './core/event-tracer.js';
import { LdsSlowApiMonitor } from './core/slow-api.js';
import { LdsConsole }        from './core/console.js';
import { LdsVitals }         from './core/vitals.js';
import { LdsNetwork }        from './core/network.js';
import { litAdapter }        from './adapter/lit/LitAdapter.js';
import { getLitIntelligencePipeline } from './integration/lit/LitIntelligencePipeline.js';
import { installLegacyNetworkEvidenceBridge } from './integration/lit/network-evidence-bridge.js';

// Page-level tools are initialized once per enabled page session.
let _pageToolsInited = false;
let _networkBridgeCleanup = null;
let _networkAcquired = false;
let _vitalsAcquired = false;
const _activeElements = new Set();
const _detachRuntime = Symbol('runtime-intelligence-detach');
const _runtimeActive = Symbol('runtime-intelligence-active');

function _initPageTools() {
    if (_pageToolsInited) return;
    _pageToolsInited = true;
    const intelligenceEnabled = _toolEnabled('intelligence');
    const networkEnabled = _toolEnabled('network');
    if (intelligenceEnabled) getLitIntelligencePipeline().start();
    if (intelligenceEnabled && networkEnabled) _networkBridgeCleanup = installLegacyNetworkEvidenceBridge();
    if (_toolEnabled('vitals')) _vitalsAcquired = LdsVitals.init() !== false;
    if (networkEnabled) _networkAcquired = LdsNetwork.init() !== false;
}

function stopLitPageTools() {
    if (!_pageToolsInited) return false;
    for (const element of [..._activeElements]) element[_detachRuntime]();
    _networkBridgeCleanup?.();
    _networkBridgeCleanup = null;
    getLitIntelligencePipeline().stop();
    if (_networkAcquired) LdsNetwork.detach();
    if (_vitalsAcquired) LdsVitals.detach();
    _networkAcquired = false;
    _vitalsAcquired = false;
    _pageToolsInited = false;
    return true;
}

const LitDebugMixin = superclass => class extends superclass {
    connectedCallback() {
        super.connectedCallback?.();

        this[_runtimeActive] = _runtimeEnabled();
        if (!this[_runtimeActive]) return;

        // Start opt-in intelligence recording before the first UREP owner event.
        _initPageTools();
        litAdapter.connect(this);
        _activeElements.add(this);

        // Baseline diagnostics used by the mature panel while runtime is enabled.
        LdsMemory.attach(this);
        LdsErrorBoundary.attach(this);

        // Selectively enabled tools.
        if (_toolEnabled('perf'))          LdsPerfMonitor.attach(this);
        if (_toolEnabled('propAudit'))     LdsPropAudit.attach(this);
        if (_toolEnabled('inspector'))     LdsInspector.attach(this);
        if (_toolEnabled('cycleDetector')) LdsCycleDetector.attach(this);
        if (_toolEnabled('eventTracer'))   LdsEventTracer.attach(this);
        if (_toolEnabled('slowApi'))       LdsSlowApiMonitor.attach(this);
        if (_toolEnabled('console'))       LdsConsole.attach(this);
    }

    disconnectedCallback() {
        super.disconnectedCallback?.();
        this[_detachRuntime]();
    }

    [_detachRuntime]() {
        if (!this[_runtimeActive]) return;

        // Detach in reverse attach order so diagnostic-owned resources are
        // cleaned up before the memory/resource lifetime check runs.
        LdsConsole.detach(this);
        LdsSlowApiMonitor.detach(this);
        LdsEventTracer.detach(this);
        LdsCycleDetector.detach(this);
        LdsInspector.detach(this);
        LdsPropAudit.detach(this);
        LdsPerfMonitor.detach(this);
        LdsErrorBoundary.detach(this);
        LdsMemory.detach(this);

        // The UREP owner is considered dead only after diagnostic cleanup.
        litAdapter.disconnect(this);
        this[_runtimeActive] = false;
        _activeElements.delete(this);
    }

    requestUpdate(name, oldValue, options) {
        if (this[_runtimeActive]) litAdapter.recordUpdateRequested(this, name, oldValue);
        return super.requestUpdate?.(name, oldValue, options);
    }

    performUpdate(...args) {
        if (!this[_runtimeActive]) return super.performUpdate?.(...args);

        const owner = litAdapter.ownerOf(this);
        const complete = () => {
            if (this[_runtimeActive] && owner?.connected && litAdapter.ownerOf(this) === owner) litAdapter.recordUpdateCompleted(this);
        };
        litAdapter.recordUpdateStarted(this);
        try {
            const result = super.performUpdate?.(...args);
            if (result && typeof result.then === 'function') {
                return result.finally(complete);
            }
            complete();
            return result;
        } catch (error) {
            complete();
            throw error;
        }
    }
};

export { LitDebugMixin, stopLitPageTools };
