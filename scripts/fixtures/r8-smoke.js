import { createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createApp, h } from 'vue';
import { LitElement, html } from 'lit';
import { RuntimeIntelligenceProvider } from 'runtime-intelligence/react';
import { installVueRuntimeIntelligence } from 'runtime-intelligence/vue';
import { LitDebugMixin, configureLitRuntimeIntelligence } from 'runtime-intelligence/lit';
import { evidenceStore } from 'runtime-intelligence/core';

const reactRoot = createRoot(document.getElementById('react'));
function ReactProbe() {
  const [count, setCount] = useState(0);
  return createElement('button', { id: 'react-update', onClick: () => setCount(count + 1) }, `React ${count}`);
}
reactRoot.render(createElement(RuntimeIntelligenceProvider, {
  name: 'R8ReactProbe', source: { file: 'r8-smoke.js', functionName: 'ReactProbe' },
}, createElement(ReactProbe)));
const vueApp = createApp({
  name: 'R8VueProbe', data: () => ({ count: 0 }),
  render() { return h('button', { id: 'vue-update', onClick: () => this.count++ }, `Vue ${this.count}`); },
});
const vueController = installVueRuntimeIntelligence(vueApp, {
  enabled: true, sourceResolver: () => ({ file: 'r8-smoke.js', functionName: 'VueProbe' }),
});
vueApp.mount('#vue');
const litController = configureLitRuntimeIntelligence({ enabled: true });
class R8LitProbe extends LitDebugMixin(LitElement) {
  static properties = { count: { type: Number } };
  constructor() { super(); this.count = 0; }
  render() { return html`<button id="lit-update" @click=${() => this.count++}>Lit ${this.count}</button>`; }
}
customElements.define('r8-lit-probe', R8LitProbe);
const litElement = document.createElement('r8-lit-probe');
document.getElementById('lit').append(litElement);
window.r8Snapshot = () => evidenceStore.snapshot();
window.r8Unmount = () => {
  reactRoot.unmount(); vueApp.unmount(); vueController.stop(); litElement.remove(); litController.stop();
};
// Export-only canaries: do not create runtime errors, network calls or console faults.
import { createRuntimeReport } from 'runtime-intelligence/panel';
window.r8Export = () => createRuntimeReport({
  store: evidenceStore, windowTarget: window,
  baseReport: { console: [{ message: 'GET https://example.test/plain and https://example.test/api?token=private-matrix-secret', callStack: 'raw-stack-must-not-export' }], network: [{ fullUrl: 'https://example.test/api?token=private-matrix-secret', callStack: 'raw-stack-must-not-export' }] },
});
