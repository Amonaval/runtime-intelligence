# Runtime Intelligence — Developer Guide

This is the practical **new project → first useful signal → targeted instrumentation → full diagnostic workflow** guide for React, Vue and Lit.

The product rule is simple:

> Start with the smallest integration that can answer your question. Add instrumentation only when the current evidence cannot answer it honestly.

Runtime Intelligence is not an error-monitoring SaaS, profiler replacement or causal-inference engine. It is a local/runtime diagnostic layer that combines browser/framework evidence, source provenance, shared intelligence, a canonical panel, reports and before/after verification.

---

# 1. When to use it

Use Runtime Intelligence when a real application has a problem such as:

- an unexplained runtime error;
- a render/update storm;
- repeated slow renders;
- sequential network calls;
- resource lifetime problems;
- oversized rendering/virtualization opportunities;
- hard-to-connect symptoms spread across framework, browser and network evidence;
- a fix that you want to verify against the same workflow.

Do **not** add it merely because the application exists. Normal browser DevTools, framework DevTools and ordinary tests remain the cheaper tools for simple defects.

---

# 2. Install

Runtime Intelligence is currently private/proprietary.

From this repository:

```bash
npm pack --ignore-scripts
```

In the consumer project:

```bash
npm install /absolute/path/to/runtime-intelligence-0.1.3.tgz
```

Or use an explicitly authorized Git SHA.

Do not deep-import repository files. Use only documented package surfaces:

```text
runtime-intelligence/loader
runtime-intelligence/core
runtime-intelligence/react
runtime-intelligence/vue
runtime-intelligence/lit
runtime-intelligence/panel
runtime-intelligence/extension
```

---

# 3. Safe enablement — always start here

Diagnostics are off by default.

A typical Vite gate:

```js
const enabled =
  import.meta.env.DEV &&
  localStorage.getItem('runtime-intelligence') === 'on';
```

Enable locally:

```js
localStorage.setItem('runtime-intelligence', 'on');
location.reload();
```

Disable:

```js
localStorage.removeItem('runtime-intelligence');
location.reload();
```

No background telemetry/upload transport is added by Runtime Intelligence. Export remains local/user-triggered unless the host application adds transport explicitly.

---

# 4. The adoption ladder

## Level 0 — minimal integration

Goal: **get useful browser/framework evidence without changing business components.**

Use this first.

Typical value:

- browser errors / unhandled rejections;
- fetch/XHR invocation provenance;
- network failures;
- broad framework ownership/timing;
- normalized findings and Opportunities;
- JSON/HTML report export.

## Level 1 — targeted ownership

Goal: **identify the component/subtree involved.**

Add only a few boundaries where Level 0 is insufficient.

Examples:

- React HOC / `RuntimeIntelligenceProfiler`;
- Lit shared instrumented base class;
- Vue already has broad app-level lifecycle ownership, optionally filtered.

## Level 2 — exact operation provenance

Goal: **answer a specific question that ownership alone cannot answer.**

Examples:

- React tracked state/effect/resource APIs;
- Lit property/resource tooling where justified;
- a small application-specific UREP extension when the framework cannot expose the domain event.

## Level 3 — governed extension

Goal: **domain-specific evidence**, not arbitrary event dumping.

Use `runtime-intelligence/extension` only when the new evidence is truly application/domain-specific. Confirmed causality remains explicitly gated.

---

# 5. React — minimal to full

## React minimal integration

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';
import App from './App.jsx';

const root = createRoot(document.getElementById('root'));
const enabled = import.meta.env.DEV
  && localStorage.getItem('runtime-intelligence') === 'on';

const loaded = await loadRuntimeIntelligence({
  enabled,
  framework: 'react',
  panel: true,
});

if (!loaded.enabled) {
  root.render(<App />);
} else {
  const {
    createReactIntelligenceRuntime,
    RuntimeIntelligenceProvider,
  } = loaded.frameworkModule;
  const { mountRuntimeIntelligencePanel } = loaded.panelModule;

  const runtime = createReactIntelligenceRuntime({ profilingEnabled: true });
  const panel = mountRuntimeIntelligencePanel({ store: runtime.store });

  root.render(
    <RuntimeIntelligenceProvider runtime={runtime} name="AppRoot" profileRoot={true}>
      <App />
    </RuntimeIntelligenceProvider>,
  );

  import.meta.hot?.dispose(() => {
    panel.destroy();
    runtime.stop();
  });
}
```

What this can often prove automatically:

- fetch/XHR invocation location when the browser stack exposes application frames;
- error origin;
- root/boundary render timing;
- network/runtime correlations.

What it cannot honestly promise at Level 0:

- exact source definition for every uninstrumented React child;
- exact state/effect cause of every render;
- business root cause from temporal proximity alone.

## React targeted ownership

```jsx
import { withRuntimeIntelligence } from 'runtime-intelligence/react';

export default withRuntimeIntelligence(OrdersGrid, {
  name: 'OrdersGrid',
});
```

or:

```jsx
<RuntimeIntelligenceProfiler name="Checkout">
  <Checkout />
</RuntimeIntelligenceProfiler>
```

Use a handful of meaningful boundaries, not blanket wrapping.

## React full targeted provenance

```jsx
import {
  useRuntimeTrackedState,
  useRuntimeEffect,
  useRuntimeResource,
} from 'runtime-intelligence/react';

const [query, setQuery] = useRuntimeTrackedState('', { key: 'query' });

useRuntimeEffect(() => {
  // effect body
}, [query], { id: 'search-effect' });

useRuntimeResource('orders-subscription', 'subscription', { active: true });
```

Use these only after a concrete unknown justifies the extra code.

---

# 6. Vue 3 — minimal to full

## Vue minimal/full application integration

Vue can observe useful lifecycle ownership at the app boundary, so the normal path is already relatively broad.

```js
import { createApp } from 'vue';
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';
import App from './App.vue';

const app = createApp(App);
const enabled = import.meta.env.DEV
  && localStorage.getItem('runtime-intelligence') === 'on';

const loaded = await loadRuntimeIntelligence({
  enabled,
  framework: 'vue',
  panel: true,
});

let diagnostics = null;
let panel = null;

if (loaded.enabled) {
  diagnostics = loaded.frameworkModule.installVueRuntimeIntelligence(app, {
    enabled: true,
    version: app.version,
  });
  panel = loaded.panelModule.mountRuntimeIntelligencePanel({
    store: diagnostics.store,
  });
}

app.mount('#app');

import.meta.hot?.dispose(() => {
  panel?.destroy();
  diagnostics?.stop();
});
```

Install before `app.mount()`.

Typical Vue evidence:

- mount/unmount lifecycle;
- update timing;
- parent/owner hierarchy;
- Vue error handler evidence;
- browser/network evidence;
- `__file`-style component source metadata when actually available.

For very large apps, filter only after real evidence volume shows the need:

```js
installVueRuntimeIntelligence(app, {
  enabled: true,
  componentFilter(component) {
    return component?.$?.type?.name !== 'TinyIcon';
  },
});
```

Do not invent source paths for components that do not expose them.

For domain-specific Vue behavior that the adapter cannot observe, prefer one small governed extension rather than modifying every component.

---

# 7. Lit — minimal to full

## Lit minimal programmatic activation

Make the decision before instrumented custom elements connect.

```js
import { LitElement } from 'lit';
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';

const enabled = import.meta.env.DEV
  && localStorage.getItem('runtime-intelligence') === 'on';

const loaded = await loadRuntimeIntelligence({
  enabled,
  framework: 'lit',
  panel: true,
});

let AppElement = LitElement;
let activation = null;
let panel = null;

if (loaded.enabled) {
  activation = loaded.frameworkModule.configureLitRuntimeIntelligence({
    enabled: true,
  });
  AppElement = loaded.frameworkModule.LitDebugMixin(LitElement);

  const { evidenceStore } = await import('runtime-intelligence/core');
  panel = loaded.panelModule.mountRuntimeIntelligencePanel({
    store: evidenceStore,
  });
}

export { AppElement };

import.meta.hot?.dispose(() => {
  panel?.destroy();
  activation?.stop();
});
```

Then application elements use the shared base:

```js
import { html } from 'lit';
import { AppElement } from './runtime-intelligence.js';

class OrdersGrid extends AppElement {
  render() {
    return html`<h2>Orders</h2>`;
  }
}
```

If a mature application already has a common base class, instrument that base once. If hundreds of elements extend `LitElement` directly, migrate the highest-value families incrementally; do not prototype-patch Lit globally.

## Lit selective/full activation

```js
configureLitRuntimeIntelligence({
  enabled: true,
  tools: {
    intelligence: true,
    network: true,
    perf: true,
    vitals: true,
  },
});
```

The Lit path is still governed by the same evidence rule: lifecycle/update observation is not automatic business causality.

---

# 8. First useful diagnostic session

For any framework:

1. start with Level 0/minimal integration;
2. enable diagnostics explicitly;
3. reproduce one real user-visible problem;
4. open **Pinpoint**, **Opportunities**, **Intelligence** and the relevant raw tab;
5. read the evidence level and provenance meaning;
6. ask whether the shown source is genuinely application code and what the provenance label means;
7. only if still necessary, add one targeted Level 1/2 boundary;
8. export JSON/HTML when you need a portable artifact.

The important question is not “did the panel show a line?” It is “what exactly does the product know about this line?”

---

# 9. Finding → Verify Fix (R9.3)

R9.3 connects supported findings to the before/after workflow without pretending every finding has an obvious metric.

```js
import {
  createFindingVerificationPlan,
} from 'runtime-intelligence/panel';

const report = panel.createReport();
const finding = report.normalizedFindings.find(item => item.kind === 'runtime-error');
const plan = createFindingVerificationPlan(finding);

if (plan.supported) {
  const session = panel.startFindingVerification(finding, {
    intervention: {
      id: 'fix-save-error',
      description: 'guard stale save response',
      applied: true,
    },
  });

  // IMPORTANT: start the session BEFORE reproducing the baseline workflow.
  // Reproduce the problem now.
  session.captureBaseline();

  // Apply the fix, replay the same workflow, then:
  const result = session.captureReplay();
  console.log(result.status, result.verification?.evidenceLevel);
}
```

Automatically supported defaults are intentionally narrow:

- `runtime-error` → owner-scoped error count;
- `update-budget-opportunity` / `render-storm` → owner-scoped completed-update count;
- `slow-render` → average render duration only when that duration field is actually present in the finding.

Other findings return an explicit unsupported plan. Supply your own `workflowId`, `target` and optional metrics only if you can define a meaningful measurement yourself.

## Why the session must start before baseline reproduction

The EvidenceStore is cumulative. R9.3 hardens R9.2 so each session uses sequence windows:

```text
session starts
  ↓
baseline evidence window
  ↓ capture baseline
replay evidence window
  ↓ capture replay
compare
```

Historical events before session start and baseline events during replay are excluded from the corresponding workflow metrics.

## Verification is still not causality

A successful replay normally means:

```text
status: improved
verificationConfirmed: true
causalityConfirmed: false
evidenceLevel: correlation
```

That is a useful result: the configured target improved on the replay. It is not permission to claim the intervention was proven causal.

---

# 10. Reports

Use the panel mount:

```js
const report = panel.createReport('checkout investigation');
panel.downloadJson();
panel.downloadHtml();
```

Reports preserve:

- normalized findings;
- Opportunities;
- evidence levels/provenance;
- evidence capsule where available;
- active Before/After state;
- export privacy audit metadata.

Raw interception payload boundaries are not widened merely because the report is richer.

---

# 11. Full-scale examples / fault labs

The labs are acceptance/examples, not templates to copy wholesale into production.

## React Fault Lab

```bash
npm run lab:react:install
npm run lab:react
```

Open `http://127.0.0.1:4178`.

Architecture:

```text
React app
→ React Runtime Intelligence provider/profilers/hooks
→ UREP EvidenceStore
→ shared intelligence
→ canonical panel
→ JSON/HTML
```

It contains real behavioral faults plus clearly labeled synthetic rare-signal coverage. Use it to understand the full instrumented product surface.

For the harder “how much can I get without touching business components?” question, run the hostile lab:

```bash
npm run lab:react:hostile:install
npm run lab:react:hostile
```

That project deliberately forbids Runtime Intelligence imports inside business components.

## Vue Fault Lab

```bash
npm run lab:vue:install
npm run lab:vue
```

Architecture:

```text
Vue app-level installer before mount
→ lifecycle/error/browser evidence
→ UREP EvidenceStore
→ shared intelligence
→ canonical panel
```

The lab exercises expensive updates, controlled errors, repeated updates, resource acquisition/release/leak behavior and network proximity. It demonstrates the real Vue adapter boundary: update timing and structural ownership are observable; arbitrary reactive business causality is not automatically known.

## Lit Fault Lab

```bash
npm run lab:lit:install
npm run lab:lit
```

Open `http://127.0.0.1:4175` and explicitly enable diagnostics from the page.

Architecture:

```text
programmatic Lit activation
+ one shared LitDebugMixin(LitElement) base
→ real custom elements / browser faults
→ shared UREP EvidenceStore
→ canonical panel
→ Finding → Verify Fix / Before-After
→ JSON/HTML
```

The Lit lab includes runtime error, HTTP 503, sequential requests, slow render, update storm, a 1,600-row non-virtualized list, an intentional retained listener and an end-to-end R9.3 error-verification walkthrough.

Recommended end-to-end Lit walkthrough:

1. trigger **Intentional Error** once so a normalized error finding exists;
2. click **Start from latest error finding**;
3. with fixed mode off, trigger the error again;
4. click **Capture baseline**;
5. turn fixed mode on and run the same workflow;
6. click **Capture replay**;
7. inspect the **Before/After** tab and export the report.

---

# 12. New-project acceptance checklist

Before calling an integration successful, verify:

- diagnostics are off when the application gate is off;
- enabling diagnostics does not break normal rendering/navigation;
- the runtime and panel use the same EvidenceStore;
- one real network/error scenario produces useful evidence;
- source labels point to real application code or explicitly say unavailable;
- provenance labels describe what the source means;
- correlation/attribution are not presented as causality;
- teardown/HMR removes the runtime cleanly;
- JSON/HTML export works;
- one real fix can be replayed through Before/After with a meaningful target;
- unsupported findings do not receive invented verification metrics.

If those conditions are not true, adding more framework instrumentation is not the next step. Fix the product/integration boundary first.
