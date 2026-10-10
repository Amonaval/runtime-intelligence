import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  RuntimeIntelligenceProfiler,
  RuntimeIntelligenceProvider,
  useRuntimeIntelligence,
  useRuntimeOwner,
  useRuntimeTrackedState,
} from 'runtime-intelligence/react';
import { EvidenceStore } from 'runtime-intelligence/core';
import { mountRuntimeIntelligencePanel } from 'runtime-intelligence/panel';
import { injectFullCoveragePack } from './injected-scenarios.js';
import './styles.css';

const store = new EvidenceStore({ maxEntries: 3000, privacyPolicy: false });

function burn(ms) {
  const start = performance.now();
  while (performance.now() - start < ms) {
    Math.sqrt(Math.random() * 100000);
  }
}

function PanelMount() {
  const context = useRuntimeIntelligence();
  useEffect(() => {
    if (!context?.store) return undefined;
    const panel = mountRuntimeIntelligencePanel({ store: context.store, collapsed: false });
    return () => panel.destroy();
  }, [context?.store]);
  return null;
}

function Scenario({ name, source, title, kind = 'behavioral', description, children }) {
  return (
    <RuntimeIntelligenceProfiler name={name} source={source}>
      <article className="scenario-card">
        <div className="scenario-heading">
          <div>
            <span className={`kind ${kind}`}>{kind}</span>
            <h3>{title}</h3>
          </div>
        </div>
        <p>{description}</p>
        <div className="scenario-actions">{children}</div>
      </article>
    </RuntimeIntelligenceProfiler>
  );
}

function SlowRenderScenario() {
  const [slow, setSlow] = useState(false);
  if (slow) burn(620);
  useEffect(() => {
    if (slow) setSlow(false);
  }, [slow]);
  return <button onClick={() => setSlow(true)}>Trigger ~620 ms React render</button>;
}

function RenderStormScenario() {
  const [value, setValue] = useRuntimeTrackedState(0, {
    key: 'stormTick',
    source: 'examples/react-fault-lab/src/main.jsx',
  });
  const timer = useRef(null);
  const run = () => {
    let count = 0;
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      count += 1;
      setValue(v => v + 1);
      if (count >= 8) clearInterval(timer.current);
    }, 10);
  };
  useEffect(() => () => clearInterval(timer.current), []);
  return <button onClick={run}>Run 8 updates / ~80 ms (value {value})</button>;
}

function BrowserErrorScenario() {
  return (
    <button onClick={() => Promise.reject(new Error('Fault Lab unhandled rejection'))}>
      Trigger unhandled rejection
    </button>
  );
}

function NetworkScenario() {
  const [status, setStatus] = useState('idle');
  const runSlow = async () => {
    setStatus('slow request running…');
    await fetch('/api/fault-lab/slow?ms=2200');
    setStatus('slow request complete');
  };
  const runError = async () => {
    setStatus('error request running…');
    await fetch('/api/fault-lab/error');
    setStatus('503 captured');
  };
  const runSequential = async () => {
    setStatus('sequential requests running…');
    for (let i = 0; i < 3; i += 1) {
      await fetch(`/api/fault-lab/fast?ms=90&i=${i}`);
    }
    setStatus('3 sequential requests complete');
  };
  const runWorkerCandidate = async () => {
    setStatus('large response + long task running…');
    const response = await fetch('/api/fault-lab/large');
    await response.text();
    burn(180);
    setStatus('large response + long task complete');
  };
  return (
    <>
      <button onClick={runSlow}>Slow API &gt;2s</button>
      <button onClick={runError}>HTTP 503</button>
      <button onClick={runSequential}>3 sequential APIs</button>
      <button onClick={runWorkerCandidate}>Large response + 180 ms task</button>
      <span className="inline-status">{status}</span>
    </>
  );
}

function DuplicateDomScenario() {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <button onClick={() => setVisible(v => !v)}>{visible ? 'Remove' : 'Create'} 4 duplicate dialogs</button>
      {visible && (
        <div className="fault-stage compact-stage">
          {[0, 1, 2, 3].map(i => (
            <div role="dialog" className="fake-dialog" key={i}>Duplicate modal body</div>
          ))}
        </div>
      )}
    </>
  );
}

function VirtualizationScenario() {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <button onClick={() => setVisible(v => !v)}>{visible ? 'Remove' : 'Render'} 120 unvirtualized rows</button>
      {visible && (
        <div className="fault-stage long-list">
          {Array.from({ length: 120 }, (_, i) => <div className="lab-row" key={i}>Row {i + 1}</div>)}
        </div>
      )}
    </>
  );
}

function LeakyResourceChild() {
  const owner = useRuntimeOwner();
  useEffect(() => {
    if (!owner?.adapter) return undefined;
    const resourceId = `fault-lab-interval-${Date.now()}`;
    owner.adapter.recordResourceAcquired(owner.token, {
      resourceId,
      resourceType: 'interval',
      source: 'examples/react-fault-lab/src/main.jsx',
    });
    const timer = setInterval(() => {}, 10000);
    return () => {
      clearInterval(timer);
      // Deliberately omit recordResourceReleased. The real timer is still cleared,
      // so the lab proves lifetime diagnostics without leaving a runaway resource.
    };
  }, [owner]);
  return <div className="fault-stage compact-stage">Tracked resource is currently mounted.</div>;
}

function ResourceLifetimeScenario() {
  const [mounted, setMounted] = useState(false);
  return (
    <>
      <button onClick={() => setMounted(v => !v)}>{mounted ? 'Unmount leaked owner' : 'Mount tracked resource'}</button>
      {mounted && (
        <RuntimeIntelligenceProfiler
          name="FaultLab.LeakyResource"
          source="examples/react-fault-lab/src/main.jsx"
        >
          <LeakyResourceChild />
        </RuntimeIntelligenceProfiler>
      )}
    </>
  );
}

function InjectedCoverageScenario() {
  const context = useRuntimeIntelligence();
  const [last, setLast] = useState(null);
  return (
    <>
      <button
        className="injected-button"
        onClick={() => setLast(injectFullCoveragePack(context.store))}
      >
        Inject deterministic full-coverage pack
      </button>
      {last && <span className="inline-status">Expected: {last.expected.join(' · ')}</span>}
    </>
  );
}

function LiveEvidenceSummary() {
  const context = useRuntimeIntelligence();
  const [events, setEvents] = useState(() => context?.store?.snapshot?.() || []);
  useEffect(() => {
    if (!context?.store) return undefined;
    setEvents(context.store.snapshot());
    return context.store.subscribe(() => setEvents(context.store.snapshot()));
  }, [context?.store]);

  const counts = useMemo(() => {
    const map = new Map();
    for (const event of events) map.set(event.type, (map.get(event.type) || 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [events]);

  const clear = () => {
    context.store.clear();
    setEvents([]);
  };

  return (
    <section className="evidence-summary">
      <div>
        <strong>{events.length}</strong> UREP events
        <span className="summary-detail">{counts.map(([type, count]) => `${type}:${count}`).join(' · ') || 'none yet'}</span>
      </div>
      <button className="secondary" onClick={clear}>Clear evidence</button>
    </section>
  );
}

function App() {
  return (
    <main>
      <header className="hero">
        <div>
          <span className="eyebrow">Runtime Intelligence validation harness</span>
          <h1>React Fault Lab</h1>
          <p>
            Deliberate faults live only in this example app. Behavioral scenarios test real React/browser
            detection. Injected scenarios test deterministic panel/intelligence coverage and are labeled as synthetic.
          </p>
        </div>
      </header>

      <LiveEvidenceSummary />

      <section className="section-heading">
        <h2>Behavioral faults</h2>
        <p>These create actual runtime behavior and should be detected by adapters/collectors.</p>
      </section>
      <div className="scenario-grid">
        <Scenario name="FaultLab.SlowRender" source="examples/react-fault-lab/src/main.jsx" title="Slow React render" description="Profiler-observed render over both the 100 ms Intelligence threshold and 500 ms mature slow-render threshold.">
          <SlowRenderScenario />
        </Scenario>
        <Scenario name="FaultLab.RenderStorm" source="examples/react-fault-lab/src/main.jsx" title="Render storm + state thrash" description="Eight tracked state updates inside ~100 ms should exercise update-budget and render-reason/thrash logic.">
          <RenderStormScenario />
        </Scenario>
        <Scenario name="FaultLab.BrowserError" source="examples/react-fault-lab/src/main.jsx" title="Unhandled browser rejection" description="Tests browser error capture without crashing the React tree.">
          <BrowserErrorScenario />
        </Scenario>
        <Scenario name="FaultLab.Network" source="examples/react-fault-lab/src/main.jsx" title="Network intelligence" description="Slow, failed, sequential and large-response calls exercise Network, Slow API, sequential-call and worker-opportunity paths.">
          <NetworkScenario />
        </Scenario>
        <Scenario name="FaultLab.DomDuplication" source="examples/react-fault-lab/src/main.jsx" title="Duplicate singleton DOM" description="Four dialog-role elements should be flagged as a likely duplicated singleton pattern.">
          <DuplicateDomScenario />
        </Scenario>
        <Scenario name="FaultLab.Virtualization" source="examples/react-fault-lab/src/main.jsx" title="Missing virtualization" description="120 sibling rows create a high off-screen ratio and should trigger the virtualization adviser.">
          <VirtualizationScenario />
        </Scenario>
        <Scenario name="FaultLab.ResourceLifetime" source="examples/react-fault-lab/src/main.jsx" title="Resource lifetime violation" description="Acquires a tracked resource and deliberately omits the release evidence before owner destruction; the actual timer is safely cleared.">
          <ResourceLifetimeScenario />
        </Scenario>
      </div>

      <section className="section-heading synthetic-heading">
        <h2>Deterministic evidence injection</h2>
        <p>Use this to verify every mature panel path even when a browser cannot naturally reproduce a rare signal.</p>
      </section>
      <div className="scenario-grid">
        <Scenario name="FaultLab.Injected" source="examples/react-fault-lab/src/injected-scenarios.js" title="Full panel coverage pack" kind="injected" description="Synthetic UREP only. It must never be confused with a detected application defect.">
          <InjectedCoverageScenario />
        </Scenario>
      </div>

      <footer>
        Open the mature Runtime Intelligence panel and compare Summary → Intelligence → Pinpoint → Perf → Network → Errors → Events → Slow API → Memory.
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RuntimeIntelligenceProvider
      store={store}
      name="FaultLab.Root"
      source="examples/react-fault-lab/src/main.jsx"
      profilingEnabled
      profileRoot={false}
    >
      <PanelMount />
      <App />
    </RuntimeIntelligenceProvider>
  </React.StrictMode>,
);
