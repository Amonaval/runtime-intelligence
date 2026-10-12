import { css, html } from 'lit';
import { AppElement, runtime } from './runtime-intelligence.js';

function busyWait(ms) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    Math.sqrt(Math.random() * 9999);
  }
}

class LitFaultLab extends AppElement {
  static properties = {
    counter: { type: Number },
    slowRender: { type: Boolean },
    rows: { type: Number },
    leakCount: { type: Number },
    errorFixed: { type: Boolean },
    status: { type: String },
    verificationState: { state: true },
  };

  static styles = css`
    :host { display:block; min-height:100vh; padding:24px; box-sizing:border-box; background:#0f172a; color:#e2e8f0; font:14px Inter,system-ui,sans-serif; }
    h1 { margin:0 0 6px; color:#93c5fd; } h2 { color:#c4b5fd; font-size:16px; margin:0 0 10px; }
    p { color:#94a3b8; line-height:1.5; } code { color:#86efac; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:12px; margin-top:18px; }
    .card { background:#111827; border:1px solid #334155; border-radius:10px; padding:14px; }
    button { border:1px solid #475569; background:#1e293b; color:#e2e8f0; border-radius:7px; padding:8px 10px; margin:4px 4px 4px 0; cursor:pointer; }
    button:hover { border-color:#60a5fa; } button.primary { background:#1d4ed8; border-color:#3b82f6; }
    label { display:flex; align-items:center; gap:8px; margin:8px 0; color:#cbd5e1; }
    .status { margin-top:16px; padding:10px 12px; border-radius:8px; background:#172033; color:#bae6fd; }
    .rows { max-height:220px; overflow:auto; border:1px solid #334155; margin-top:8px; }
    .row { padding:3px 8px; border-bottom:1px solid #1e293b; }
    .verify { border-color:#0f766e; background:#0f2f2d; }
    .warning { border-color:#92400e; background:#2b1d0e; }
  `;

  constructor() {
    super();
    this.counter = 0;
    this.slowRender = false;
    this.rows = 0;
    this.leakCount = 0;
    this.errorFixed = false;
    this.status = runtime.enabled ? 'Runtime Intelligence enabled. Trigger one fault and inspect the panel.' : 'Runtime Intelligence is off.';
    this.verificationState = null;
    this._verificationSession = null;
  }

  _enableDiagnostics() {
    localStorage.setItem('runtime-intelligence', 'on');
    location.reload();
  }

  _disableDiagnostics() {
    localStorage.removeItem('runtime-intelligence');
    location.reload();
  }

  _runtimeError() {
    if (this.errorFixed) {
      this.status = 'Fixed-mode workflow completed without throwing the intentional error.';
      return;
    }
    this.status = 'Intentional async runtime error queued.';
    queueMicrotask(() => {
      throw new Error('Lit Fault Lab intentional runtime error');
    });
  }

  async _sequentialRequests() {
    this.status = 'Running three intentionally sequential requests…';
    for (let step = 1; step <= 3; step += 1) {
      await fetch(`/api/slow?step=${step}`).then(response => response.json());
    }
    this.status = 'Sequential request workflow complete. Inspect Network / Opportunities.';
  }

  async _networkFailure() {
    this.status = 'Triggering intentional HTTP 503…';
    await fetch('/api/fail').catch(() => {});
    this.status = 'HTTP failure complete. Inspect source provenance and evidence level.';
  }

  _slowRender() {
    this.slowRender = true;
    this.counter += 1;
    this.requestUpdate();
    this.status = 'Next render intentionally burns ~170ms on the main thread.';
    setTimeout(() => { this.slowRender = false; }, 0);
  }

  _renderStorm() {
    this.status = 'Generating a short burst of repeated Lit updates…';
    let count = 0;
    const timer = setInterval(() => {
      this.counter += 1;
      count += 1;
      if (count >= 40) {
        clearInterval(timer);
        this.status = 'Update burst complete. Inspect Perf / Opportunities.';
      }
    }, 8);
  }

  _toggleLargeList() {
    this.rows = this.rows ? 0 : 1600;
    this.status = this.rows
      ? 'Rendered 1,600 rows without virtualization.'
      : 'Large list removed.';
  }

  _leakListener() {
    const retained = new Array(5000).fill(`leak-${this.leakCount}`);
    window.addEventListener('resize', () => retained.length, { passive: true });
    this.leakCount += 1;
    this.status = `Added intentional unremoved resize listener #${this.leakCount}. Detection depends on the active ownership/resource evidence available to the Lit path.`;
  }

  _startErrorVerification() {
    const report = runtime.panel?.createReport?.();
    const finding = report?.normalizedFindings?.find(item => item.kind === 'runtime-error');
    if (!finding) {
      this.status = 'No runtime-error finding yet. Trigger Intentional Error once, then start verification.';
      return;
    }
    this._verificationSession = runtime.panel.startFindingVerification(finding, {
      intervention: {
        id: 'lit-fault-lab-error-fix',
        description: 'toggle the demo into fixed error mode',
        applied: true,
      },
    });
    this.verificationState = this._verificationSession.getState();
    this.status = 'Verification session started. Keep Fixed mode OFF, run the error workflow again, then Capture baseline.';
  }

  _captureBaseline() {
    if (!this._verificationSession) return;
    this.verificationState = this._verificationSession.captureBaseline();
    this.status = 'Baseline captured. Turn Fixed mode ON, run the same error workflow, then Capture replay.';
  }

  _captureReplay() {
    if (!this._verificationSession) return;
    this.verificationState = this._verificationSession.captureReplay();
    this.status = `${this.verificationState.headline}. ${this.verificationState.evidenceNote}`;
  }

  render() {
    if (this.slowRender) busyWait(170);

    if (!runtime.enabled) {
      return html`
        <h1>Runtime Intelligence — Lit Fault Lab</h1>
        <div class="card warning">
          <h2>Diagnostics are off by default</h2>
          <p>This lab follows the product safety contract. Enable diagnostics explicitly, then the page reloads with the canonical panel.</p>
          <button class="primary" @click=${this._enableDiagnostics}>Enable Runtime Intelligence</button>
        </div>
      `;
    }

    return html`
      <h1>Runtime Intelligence — Lit Fault Lab</h1>
      <p>Real Lit custom elements, one shared instrumented base, deliberate faults, and the same UREP/panel/report path used by React and Vue.</p>
      <button @click=${this._disableDiagnostics}>Disable diagnostics</button>

      <div class="grid">
        <section class="card">
          <h2>Reliability / source</h2>
          <label><input type="checkbox" .checked=${this.errorFixed} @change=${event => { this.errorFixed = event.target.checked; }}> Fixed error mode</label>
          <button @click=${this._runtimeError}>Intentional Error</button>
          <button @click=${this._networkFailure}>HTTP 503</button>
          <p>Use these to inspect error/network source provenance without treating the source as automatic root-cause proof.</p>
        </section>

        <section class="card">
          <h2>Performance</h2>
          <button @click=${this._slowRender}>Slow Render</button>
          <button @click=${this._renderStorm}>Update Storm</button>
          <button @click=${this._toggleLargeList}>${this.rows ? 'Remove' : 'Render'} 1,600 Rows</button>
          <p>Counter: ${this.counter}. These scenarios exercise update timing, budget pressure and rendering opportunities.</p>
        </section>

        <section class="card">
          <h2>Network / resource</h2>
          <button @click=${this._sequentialRequests}>Sequential Requests</button>
          <button @click=${this._leakListener}>Leak Resize Listener</button>
          <p>Intentional retained listeners: ${this.leakCount}. The lab also demonstrates honest limits when exact ownership cannot be proven.</p>
        </section>

        <section class="card verify">
          <h2>Finding → Verify Fix</h2>
          <button class="primary" @click=${this._startErrorVerification}>Start from latest error finding</button>
          <button @click=${this._captureBaseline}>Capture baseline</button>
          <button @click=${this._captureReplay}>Capture replay</button>
          <p>${this.verificationState
            ? `${this.verificationState.status} · ${this.verificationState.verification?.evidenceLevel || 'measurement only'}`
            : 'Trigger an error first, then start a verification session.'}</p>
        </section>
      </div>

      ${this.rows ? html`
        <div class="rows">
          ${Array.from({ length: this.rows }, (_, index) => html`<div class="row">Row ${index + 1}</div>`)}
        </div>
      ` : ''}

      <div class="status">${this.status}</div>
    `;
  }
}

customElements.define('lit-fault-lab', LitFaultLab);
