import React, { useState } from 'react';
import { hitFailingDependency } from '../services/orders-api.js';

export function FailureCenter() {
  const [status, setStatus] = useState('idle');

  async function requestFailure() {
    setStatus('requesting failing dependency…');
    try {
      await hitFailingDependency();
    } catch (error) {
      console.error('Checkout dependency failed', error);
      setStatus(`handled HTTP failure: ${error.status || 'unknown'}`);
    }
  }

  function rejectUnhandled() {
    Promise.reject(new Error('Uninstrumented checkout promise rejected'));
  }

  function emitNoise() {
    console.warn('Inventory is approaching stale-data threshold');
    console.warn('Inventory is approaching stale-data threshold');
    console.error('Synthetic business console error from uninstrumented component');
  }

  return (
    <section className="scenario-card" data-scenario="errors">
      <div className="scenario-badge should-source">Level 0 should pinpoint</div>
      <h2>Errors, rejection and console noise</h2>
      <p>No Runtime Intelligence hook or error boundary is used here.</p>
      <div className="button-row">
        <button onClick={requestFailure}>HTTP 503</button>
        <button onClick={rejectUnhandled}>Unhandled rejection</button>
        <button onClick={emitNoise}>Console burst</button>
      </div>
      <output>{status}</output>
    </section>
  );
}
