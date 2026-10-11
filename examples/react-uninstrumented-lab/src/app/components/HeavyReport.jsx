import React, { useState } from 'react';
import { loadReport } from '../services/orders-api.js';

function burn(ms) {
  const start = performance.now();
  while (performance.now() - start < ms) Math.sqrt(Math.random() * 999999);
}

export function HeavyReport() {
  const [status, setStatus] = useState('idle');

  async function generateReport() {
    setStatus('loading…');
    const report = await loadReport();
    const started = performance.now();
    const sorted = [...report.rows].sort((a, b) => a.label.localeCompare(b.label));
    burn(135);
    const duration = Math.round(performance.now() - started);
    setStatus(`processed ${sorted.length} rows on main thread in ~${duration} ms`);
  }

  return (
    <section className="scenario-card" data-scenario="worker-candidate">
      <div className="scenario-badge evidence-only">Shared adviser candidate</div>
      <h2>Large response + main-thread processing</h2>
      <p>A report fetch is followed by intentionally expensive synchronous work on the UI thread.</p>
      <button onClick={generateReport}>Generate heavy report</button>
      <output>{status}</output>
    </section>
  );
}
