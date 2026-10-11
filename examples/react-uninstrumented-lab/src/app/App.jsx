import React from 'react';
import { AsyncRace } from './components/AsyncRace.jsx';
import { FailureCenter } from './components/FailureCenter.jsx';
import { HeavyReport } from './components/HeavyReport.jsx';
import { LeakyWorkspace } from './components/LeakyWorkspace.jsx';
import { OrderWaterfall } from './components/OrderWaterfall.jsx';
import { RenderStorm } from './components/RenderStorm.jsx';
import { SearchWorkbench } from './components/SearchWorkbench.jsx';

const contract = [
  ['Sequential API waterfall', 'Should identify application invocation source from the fetch call stack.'],
  ['Unhandled rejection / HTTP failure', 'Should retain application error or network source where the browser stack proves it.'],
  ['Slow render / render storm', 'Must detect root render pressure without pretending it knows the exact child source.'],
  ['Resource leak', 'Must not fabricate ownership when the component never registered resource ownership.'],
  ['Async race', 'Should show the network chronology; business-level race causality remains unproven.'],
];

export function App() {
  return (
    <main className="app-shell">
      <header className="hero">
        <span className="eyebrow">P0.3 hostile validation</span>
        <h1>Completely uninstrumented React business components</h1>
        <p>
          Runtime Intelligence is wired once at the application boundary. Every component below is ordinary React code with no
          Runtime Intelligence imports, HOCs, hooks, Profiler wrappers, or manual source metadata.
        </p>
      </header>

      <section className="contract-panel">
        <h2>Evidence-honesty contract</h2>
        <ul>
          {contract.map(([title, detail]) => <li key={title}><strong>{title}:</strong> {detail}</li>)}
        </ul>
      </section>

      <div className="scenario-grid">
        <OrderWaterfall />
        <FailureCenter />
        <SearchWorkbench />
        <RenderStorm />
        <LeakyWorkspace />
        <AsyncRace />
        <HeavyReport />
      </div>

      <footer>
        Refresh the page after the leak scenario. This app intentionally contains defects and is not a production example.
      </footer>
    </main>
  );
}
