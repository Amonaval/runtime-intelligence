import React, { useState } from 'react';
import { loadSearchResult } from '../services/orders-api.js';

export function AsyncRace() {
  const [result, setResult] = useState('none');

  function runRace() {
    setResult('waiting…');
    loadSearchResult('older-slow-result', 620).then(() => setResult('older-slow-result'));
    loadSearchResult('newer-fast-result', 80).then(() => setResult('newer-fast-result'));
  }

  return (
    <section className="scenario-card" data-scenario="async-race">
      <div className="scenario-badge evidence-only">Network evidence, logic cause unknown</div>
      <h2>Stale async race</h2>
      <p>The newer response wins first, then an older slower request incorrectly overwrites the UI.</p>
      <button onClick={runRace}>Run stale-result race</button>
      <output>visible result: {result}</output>
    </section>
  );
}
