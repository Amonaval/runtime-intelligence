/**
 * LitDebugMixin — drop-in debug mixin for any LitElement base class.
 *
 * v2 also emits Universal Runtime Evidence Protocol events through LitAdapter.
 * Existing LDS tools remain available while the generic evidence migration continues.
 */

import { _toolEnabled }      from './core/gate.js';
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

let _pageToolsInited = false;

function _initPageTools() {
    if (_pageToolsInited) return;
    _pageToolsInited = true;
    if (_toolEnabled('vitals'))  LdsVitals.init();
    if (_toolEnabled('network')) LdsNetwork.init();
}

const LitDebugMixin = superclass => class extends superclass {
    connectedCallback() {
        super.connectedCallback?.();
        litAdapter.connect(this);
        _initPageTools();

        LdsMemory.attach(this);
        LdsErrorBoundary.attach(this);
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

        // Detach in reverse attach order so nested method wrappers are restored safely.
        // Memory is detached last because other tools may remove listeners/resources
        // during cleanup; those releases must be observed before lifetime checks run.
        LdsConsole.detach(this);
        LdsSlowApiMonitor.detach(this);
        LdsEventTracer.detach(this);
        LdsCycleDetector.detach(this);
        LdsInspector.detach(this);
        LdsPropAudit.detach(this);
        LdsPerfMonitor.detach(this);
        LdsErrorBoundary.detach(this);
        LdsMemory.detach(this);

        // The owner is considered dead only after framework + diagnostic cleanup.
        litAdapter.disconnect(this);
    }

    requestUpdate(name, oldValue, options) {
        litAdapter.recordUpdateRequested(this, name, oldValue);
        return super.requestUpdate?.(name, oldValue, options);
    }

    performUpdate(...args) {
        litAdapter.recordUpdateStarted(this);
        try {
            const result = super.performUpdate?.(...args);
            if (result && typeof result.then === 'function') {
                return result.finally(() => litAdapter.recordUpdateCompleted(this));
            }
            litAdapter.recordUpdateCompleted(this);
            return result;
        } catch (error) {
            litAdapter.recordUpdateCompleted(this);
            throw error;
        }
    }
};

export { LitDebugMixin };
