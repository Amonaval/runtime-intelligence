import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  RuntimeIntelligenceProfiler,
  RuntimeIntelligenceProvider,
  useRuntimeEffect,
  useRuntimeIntelligence,
  useRuntimeOwner,
  useRuntimeTrackedState,
} from 'runtime-intelligence/react';
import { EvidenceStore } from 'runtime-intelligence/core';
import { mountRuntimeIntelligencePanel } from 'runtime-intelligence/panel';
import { injectFullCoveragePack } from './injected-scenarios.js';
import './styles.css';

const store = new EvidenceStore({ maxEntries: 6000, privacyPolicy: false });
const SOURCE = 'examples/react-fault-lab/src/main.jsx';

function burn(ms) {
  const start = performance.now();
  while (performance.now() - start < ms) {
    Math.sqrt(Math.random() * 100000);
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clickFault(id) {
  const element = document.querySelector(`[data-fault-action="${id}"]`);
  if (!element) throw new Error(`Fault Lab action not found: ${id}`);
  element.click();
}

function PanelMount() {
  const context = useRuntimeIntelligence();
  useEffect(() => {
    if (!context?.store) return undefined;
    const panel = mountRuntimeIntelligencePanel({ store: context.store, collapsed: false });
    window.__FAULT_LAB_PANEL__ = panel;
    return () => {
      if (window.__FAULT_LAB_PANEL__ === panel) delete window.__FAULT_LAB_PANEL__;
      panel.destroy();
    };
  }, [context?.store]);
  return null;
}

function Scenario({ name, source = SOURCE, title, kind = 'behavioral', description, children }) {
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
  return <button data-fault-action="slow-render" onClick={() => setSlow(true)}>Trigger ~620 ms React render</button>;
}

function RenderStormScenario() {
  const [value, setValue] = useRuntimeTrackedState(0, { key: 'stormTick', source: SOURCE });
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
  return <button data-fault-action="render-storm" onClick={run}>Run 8 updates / ~80 ms (value {value})</button>;
}

function EffectLoopScenario() {
  const [enabled, setEnabled] = useState(false);
  const [tick, setTick] = useRuntimeTrackedState(0, { key: 'effectLoopTick', source: SOURCE });
  useRuntimeEffect(() => {
    if (!enabled || tick >= 7) return undefined;
    setTick(value => value + 1);
    return undefined;
  }, [enabled, tick], { id: 'bounded-effect-loop', source: SOURCE });

  const run = () => {
    setTick(0);
    setEnabled(false);
    queueMicrotask(() => setEnabled(true));
  };
  return <button data-fault-action="effect-loop" onClick={run}>Run bounded effect/state feedback loop ({tick})</button>;
}

function BrowserErrorScenario() {
  return (
    <button data-fault-action="browser-error" onClick={() => Promise.reject(new Error('Fault Lab unhandled rejection'))}>
      Trigger unhandled rejection
    </button>
  );
}

function ConsoleNoiseScenario() {
  const run = () => {
    console.warn('Fault Lab warning: repeated runtime warning');
    console.error('Fault Lab console error: validation signal');
    console.warn('Fault Lab warning: repeated runtime warning');
  };
  return <button data-fault-action="console-noise" onClick={run}>Emit console warnings + error</button>;
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
      <button data-fault-action="slow-api" onClick={runSlow}>Slow API &gt;2s</button>
      <button data-fault-action="http-503" onClick={runError}>HTTP 503</button>
      <button data-fault-action="sequential-api" onClick={runSequential}>3 sequential APIs</button>
      <button data-fault-action="worker-candidate" onClick={runWorkerCandidate}>Large response + 180 ms task</button>
      <span className="inline-status">{status}</span>
    </>
  );
}

function XhrScenario() {
  const [status, setStatus] = useState('idle');
  const run = () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/fault-lab/error');
    xhr.addEventListener('loadend', () => setStatus(`XHR status ${xhr.status}`));
    xhr.send();
  };
  return (
    <>
      <button data-fault-action="xhr-error" onClick={run}>XHR 503 failure</button>
      <span className="inline-status">{status}</span>
    </>
  );
}

function DuplicateDomScenario() {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <button data-fault-action="dom-duplication" onClick={() => setVisible(v => !v)}>{visible ? 'Remove' : 'Create'} 4 duplicate dialogs</button>
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
      <button data-fault-action="virtualization" onClick={() => setVisible(v => !v)}>{visible ? 'Remove' : 'Render'} 120 unvirtualized rows</button>
      {visible && (
        <div className="fault-stage long-list">
          {Array.from({ length: 120 }, (_, i) => <div className="lab-row" key={i}>Row {i + 1}</div>)}
        </div>
      )}
    </>
  );
}

function LargeDomScenario() {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <button data-fault-action="large-dom" onClick={() => setVisible(v => !v)}>{visible ? 'Remove' : 'Create'} ~1800 extra DOM nodes</button>
      {visible && <div className="large-dom-stage">{Array.from({ length: 1800 }, (_, i) => <span key={i}>.</span>)}</div>}
    </>
  );
}

function ExpensiveCssScenario() {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <button data-fault-action="expensive-css" onClick={() => setVisible(v => !v)}>{visible ? 'Remove' : 'Create'} 20 heavy box shadows</button>
      {visible && (
        <div className="paint-grid">
          {Array.from({ length: 20 }, (_, i) => <div className="paint-card" key={i}>Paint {i + 1}</div>)}
        </div>
      )}
      <span className="inline-status">Behavioral paint scan may be periodic; injected coverage guarantees this finding immediately.</span>
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
      source: SOURCE,
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
      <button data-fault-action="resource-lifetime" onClick={() => setMounted(v => !v)}>{mounted ? 'Unmount leaked owner' : 'Mount tracked resource'}</button>
      {mounted && (
        <RuntimeIntelligenceProfiler name="FaultLab.LeakyResource" source={SOURCE}>
          <LeakyResourceChild />
        </RuntimeIntelligenceProfiler>
      )}
    </>
  );
}

function RetainedChild({ index }) {
  return <div className="retained-child">Retained child {index + 1}</div>;
}

function MountStormScenario() {
  const [count, setCount] = useState(0);
  const run = () => setCount(6);
  return (
    <>
      <button data-fault-action="mount-storm" onClick={run}>Mount 6 retained component owners</button>
      <div className="retained-grid">
        {Array.from({ length: count }, (_, i) => (
          <RuntimeIntelligenceProfiler key={i} name="FaultLab.RetainedChild" source={SOURCE}>
            <RetainedChild index={i} />
          </RuntimeIntelligenceProfiler>
        ))}
      </div>
    </>
  );
}

function InjectedCoverageScenario() {
  const context = useRuntimeIntelligence();
  const [last, setLast] = useState(null);
  return (
    <>
      <button
        data-fault-action="injected-pack"
        className="injected-button"
        onClick={() => setLast(injectFullCoveragePack(context.store))}
      >
        Inject deterministic full-coverage pack
      </button>
      {last && <span className="inline-status">Expected: {last.expected.join(' · ')}</span>}
    </>
  );
}

async function runAllFaults(store, { exportAfter = false, setStatus = () => {} } = {}) {
  setStatus('Starting all behavioral faults…');
  const immediate = [
    'slow-render',
    'render-storm',
    'effect-loop',
    'browser-error',
    'console-noise',
    'slow-api',
    'http-503',
    'sequential-api',
    'worker-candidate',
    'xhr-error',
    'dom-duplication',
    'virtualization',
    'large-dom',
    'expensive-css',
    'resource-lifetime',
    'mount-storm',
  ];
  for (const id of immediate) {
    try { clickFault(id); } catch (error) { console.warn(error.message); }
  }

  setStatus('Behavioral faults running; waiting for async/network/resource evidence…');
  await wait(450);
  try { clickFault('resource-lifetime'); } catch {}
  await wait(3200);

  setStatus('Injecting deterministic rare-signal coverage…');
  injectFullCoveragePack(store);
  await wait(900);

  window.__FAULT_LAB_PANEL__?.refresh?.();
  setStatus('All faults triggered. Reports are ready.');

  if (exportAfter) {
    const names = window.__FAULT_LAB_PANEL__?.downloadBoth?.();
    setStatus(`All faults complete. Export requested: ${names?.json || 'JSON'} + ${names?.html || 'HTML'}.`);
    return names;
  }
  return null;
}

function LabControls() {
  const context = useRuntimeIntelligence();
  const [status, setStatus] = useState('Ready');
  const [running, setRunning] = useState(false);

  const run = async exportAfter => {
    if (running) return;
    setRunning(true);
    try {
      await runAllFaults(context.store, { exportAfter, setStatus });
    } finally {
      setRunning(false);
    }
  };

  const exportJson = () => {
    const name = window.__FAULT_LAB_PANEL__?.downloadJson?.();
    setStatus(name ? `Downloaded ${name}` : 'Panel/report export is not ready yet.');
  };
  const exportHtml = () => {
    const name = window.__FAULT_LAB_PANEL__?.downloadHtml?.();
    setStatus(name ? `Downloaded ${name}` : 'Panel/report export is not ready yet.');
  };

  return (
    <section className="lab-controls">
      <div>
        <strong>One-pass validation</strong>
        <div className="control-note">Run every supported behavioral fault, inject rare deterministic evidence, refresh the mature panel, then export the normalized report.</div>
      </div>
      <div className="control-actions">
        <button disabled={running} onClick={() => run(false)}>{running ? 'Running…' : 'Run all faults'}</button>
        <button className="primary" disabled={running} onClick={() => run(true)}>{running ? 'Running…' : 'Run all + export JSON + HTML'}</button>
        <button className="secondary" disabled={running} onClick={exportJson}>Export JSON</button>
        <button className="secondary" disabled={running} onClick={exportHtml}>Export HTML</button>
        <button className="ghost" disabled={running} onClick={() => location.reload()}>Reset lab</button>
      </div>
      <div className="control-status">{status}</div>
    </section>
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
            Deliberate faults live only in this example app. Behavioral scenarios test real React/browser detection.
            Injected scenarios test deterministic rare-signal coverage. Use the one-pass runner when you want to send
            the resulting JSON + HTML reports without checking each card manually.
          </p>
        </div>
      </header>

      <LabControls />
      <LiveEvidenceSummary />

      <section className="section-heading">
        <h2>Behavioral faults</h2>
        <p>These create actual runtime behavior and should be detected by adapters/collectors.</p>
      </section>
      <div className="scenario-grid">
        <Scenario name="FaultLab.SlowRender" title="Slow React render" description="Profiler-observed render over both the Intelligence and mature slow-render thresholds."><SlowRenderScenario /></Scenario>
        <Scenario name="FaultLab.RenderStorm" title="Render storm + state thrash" description="Eight tracked state updates inside ~100 ms exercise update-budget, render-reason and thrash logic."><RenderStormScenario /></Scenario>
        <Scenario name="FaultLab.EffectLoop" title="Bounded effect/state feedback loop" description="A safe seven-step effect loop exercises tracked state + effect lifecycle without leaving the app stuck."><EffectLoopScenario /></Scenario>
        <Scenario name="FaultLab.BrowserError" title="Unhandled browser rejection" description="Tests browser error capture without permanently crashing the React tree."><BrowserErrorScenario /></Scenario>
        <Scenario name="FaultLab.ConsoleNoise" title="Console warnings + error" description="Exercises page-level console capture and error/warning presentation."><ConsoleNoiseScenario /></Scenario>
        <Scenario name="FaultLab.Network" title="Fetch/network intelligence" description="Slow, failed, sequential and large-response calls exercise Network, Slow API and opportunity paths."><NetworkScenario /></Scenario>
        <Scenario name="FaultLab.XHR" title="XHR failure" description="Exercises the XMLHttpRequest interception path separately from fetch."><XhrScenario /></Scenario>
        <Scenario name="FaultLab.DomDuplication" title="Duplicate singleton DOM" description="Four dialog-role elements should be flagged as a likely duplicated singleton pattern."><DuplicateDomScenario /></Scenario>
        <Scenario name="FaultLab.Virtualization" title="Missing virtualization" description="120 sibling rows create a high off-screen ratio and should trigger the virtualization adviser."><VirtualizationScenario /></Scenario>
        <Scenario name="FaultLab.LargeDOM" title="Oversized DOM" description="Adds ~1800 nodes so mature health scoring and DOM guidance can be exercised."><LargeDomScenario /></Scenario>
        <Scenario name="FaultLab.ExpensiveCSS" title="Expensive paint pattern" description="Creates repeated box shadows for paint analysis; deterministic injection guarantees immediate coverage too."><ExpensiveCssScenario /></Scenario>
        <Scenario name="FaultLab.ResourceLifetime" title="Resource lifetime violation" description="Acquires a tracked resource and deliberately omits release evidence before owner destruction; the actual timer is safely cleared."><ResourceLifetimeScenario /></Scenario>
        <Scenario name="FaultLab.MountStorm" title="Retained owner/mount spike" description="Mounts six same-name component owners and leaves them active to exercise memory/mount-spike heuristics."><MountStormScenario /></Scenario>
      </div>

      <section className="section-heading synthetic-heading">
        <h2>Deterministic evidence injection</h2>
        <p>Use this to verify rare product paths even when a browser cannot naturally reproduce a signal on demand.</p>
      </section>
      <div className="scenario-grid">
        <Scenario name="FaultLab.Injected" source="examples/react-fault-lab/src/injected-scenarios.js" title="Full normalized coverage pack" kind="injected" description="Synthetic UREP only. It is explicitly labeled and must never be confused with a detected application defect.">
          <InjectedCoverageScenario />
        </Scenario>
      </div>

      <footer>
        Recommended fast path: <strong>Run all + export JSON + HTML</strong>, then send both files. The report now includes raw mature-panel data plus UREP evidence, diagnostics, normalized findings, opportunities, Intelligence and the evidence capsule.
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RuntimeIntelligenceProvider
      store={store}
      name="FaultLab.Root"
      source={SOURCE}
      profilingEnabled
      profileRoot={false}
    >
      <PanelMount />
      <App />
    </RuntimeIntelligenceProvider>
  </React.StrictMode>,
);
