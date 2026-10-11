import React, { useState } from 'react';
import { loadOrderWorkspace } from '../services/orders-api.js';

export function OrderWaterfall() {
  const [status, setStatus] = useState('idle');

  async function openOrder() {
    setStatus('loading order → customer → pricing…');
    try {
      const result = await loadOrderWorkspace('ORD-1042');
      setStatus(`loaded ${result.order.requestId || 'ORD-1042'}`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <section className="scenario-card" data-scenario="api-waterfall">
      <div className="scenario-badge should-source">Level 0 should pinpoint</div>
      <h2>Sequential API waterfall</h2>
      <p>Three dependent-looking requests are intentionally awaited one after another in a plain service module.</p>
      <button onClick={openOrder}>Open order workspace</button>
      <output>{status}</output>
    </section>
  );
}
