# Runtime Intelligence — New Project Integration Guide

Use this guide when adding Runtime Intelligence to a new React, Lit, or Vue application.

The goal is not to instrument every component on day one. Start with the smallest safe integration, reproduce real problems, and deepen instrumentation only where stronger ownership or source attribution is worth the extra code.

## 1. Adoption model

Runtime Intelligence has three practical adoption levels.

| Level | Goal | Application changes | Best for |
| --- | --- | --- | --- |
| **Level 0 — Observe** | Get browser/runtime evidence and the canonical panel with minimal code | one application/bootstrap boundary | first adoption, unfamiliar codebases, network/errors/vitals, broad performance triage |
| **Level 1 — Attribute** | Add trustworthy framework/component ownership and better source precision | strategic framework boundaries or a shared base | slow/render-heavy screens, component ownership, repeated updates |
| **Level 2 — Explain** | Capture explicit state/effect/resource semantics where the app can prove them | targeted hooks/extensions only | hard resource leaks, state-update provenance, domain-specific evidence |

Do not jump directly to Level 2. More instrumentation is not automatically better evidence.

### Evidence rule

A source location means **where the observed operation originated or was registered**. It does not automatically mean root cause.

Examples:

- a `fetch()` call stack can prove an invocation source;
- a React Profiler measurement proves render timing, not which state change caused it;
- a Vue lifecycle update proves that a component updated, not which reactive dependency caused it;
- a Lit update can be attributed to an element and observed property/update request, but causal strength still depends on the evidence available;
- a resource leak should not name a component owner unless ownership was actually observed/registered.

If Runtime Intelligence cannot prove a file or cause, `source unavailable` / correlation / observation is better than a confident guess.

---

## 2. Install the package

Runtime Intelligence is currently private/proprietary and is not assumed to be available from a public npm registry.

### Recommended: packed artifact

From the Runtime Intelligence repository:

```bash
npm pack --ignore-scripts
```

Then from the application:

```bash
npm install /absolute/path/to/runtime-intelligence-0.1.2.tgz
```

### Controlled dogfood: exact Git SHA

For a controlled internal validation baseline, pin an exact commit rather than a moving branch:

```bash
npm install --no-save --package-lock=false github:Amonaval/runtime-intelligence#<EXACT_SHA>
```

For reproducible application dependencies, prefer your organization's approved package/artifact workflow once one is established.

---

## 3. Safe activation pattern

Runtime Intelligence should normally be **off by default** and activated by an application-owned development/debug decision.

For Vite-style applications:

```js
const runtimeIntelligenceEnabled =
  import.meta.env.DEV &&
  localStorage.getItem('runtime-intelligence') === 'on';
```

The loader intentionally accepts only literal `true` as enabled.

```js
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';
```

Do not treat a public query-string parameter alone as authorization for diagnostics in a production environment.

For controlled production-like diagnosis, combine an application-owned authorization/feature flag with an explicit session/user toggle.

---

# React

## 4. React Level 0 — one root boundary, zero business-component changes

This is the recommended first integration for a new React application.

Your existing application components do **not** need Runtime Intelligence imports, HOCs, hooks, `Profiler` wrappers, or manual source metadata.

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';
import App from './App.jsx';

const root = createRoot(document.getElementById('root'));

const enabled =
  import.meta.env.DEV &&
  localStorage.getItem('runtime-intelligence') === 'on';

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
  const panel = mountRuntimeIntelligencePanel({
    store: runtime.store,
    collapsed: true,
  });

  root.render(
    <RuntimeIntelligenceProvider
      runtime={runtime}
      name="Application.Root"
      profileRoot={true}
    >
      <App />
    </RuntimeIntelligenceProvider>,
  );

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      panel.destroy();
      runtime.stop();
    });
  }
}
```

### What React Level 0 can see well

Without modifying business components, the shared browser/runtime surface can still collect evidence such as:

- `fetch` / XHR requests and application invocation stacks when the browser exposes them;
- HTTP failures and slow/sequential request patterns;
- uncaught browser errors and unhandled rejection stacks;
- console signals;
- browser interactions and timing correlation;
- web-vital/runtime/browser evidence;
- DOM/virtualization/paint/worker/idle opportunities from shared advisers;
- root-tree React Profiler timing.

### What React Level 0 must not pretend to know

A single root Profiler does **not** prove the exact child component that caused a slow commit or the state/Hook that triggered it.

The React documentation describes `<Profiler>` as measuring rendering performance of a tree and its commits. Treat that timing as observation. Do not convert it into `UPDATE_CAUSE` without stronger evidence.

The repository includes `examples/react-uninstrumented-lab` specifically to validate this zero-touch contract against complex problematic components.

## 5. React Level 1 — strategic component boundaries

Add boundaries only around components/screens where component ownership materially improves diagnosis.

```jsx
import { withRuntimeIntelligence } from 'runtime-intelligence/react';
import { OrdersPage } from './OrdersPage.jsx';

export default withRuntimeIntelligence(OrdersPage, {
  name: 'OrdersPage',
});
```

P0.2 captures the registration source when the runtime/browser stack proves it. Prefer that over manually maintaining `source="..."` strings.

Use strategic boundaries for:

- large route/page components;
- expensive tables/editors;
- frequently updated dashboards;
- areas where Level 0 shows root render pressure but not enough component precision.

Do not wrap every leaf component by default.

## 6. React Level 2 — targeted semantic hooks

Use Runtime Intelligence hooks only when you need explicit semantics that plain React cannot expose externally.

```jsx
import {
  useRuntimeTrackedState,
  useRuntimeEffect,
  useRuntimeResource,
} from 'runtime-intelligence/react';
```

Typical reasons:

- `useRuntimeTrackedState` — record the application invocation that requested a tracked state update;
- `useRuntimeEffect` — associate an effect with registration/error/cleanup evidence;
- `useRuntimeResource` — declare explicit resource ownership/lifetime.

These are targeted diagnostic tools, not replacements for React's normal hooks across the whole application.

## 7. React source expectations

| Evidence | Level 0 | Level 1/2 |
| --- | --- | --- |
| network invocation | often exact application file/line when stack exposes it | same |
| browser error/rejection | often exact error-origin frame | same |
| root render duration | yes | yes |
| exact slow child component | not guaranteed | stronger with strategic boundary |
| exact state setter invocation | not from plain `useState` | `useRuntimeTrackedState` can capture it |
| resource ownership | do not infer from plain effect | explicit resource/effect integration can prove it |

React private/dev/Fiber metadata may later improve best-effort source attribution, but private framework fields are not a stable public causal contract and must stay guarded/fallback-only.

---

# Lit

## 8. Lit Level 0 — instrument the root/base element

Lit integration uses `LitDebugMixin` because Lit lifecycle/update evidence belongs on the custom-element class.

For strict conditional loading, make the decision **before** defining the instrumented custom element.

```js
import { LitElement, html } from 'lit';

const enabled =
  import.meta.env.DEV &&
  localStorage.getItem('runtime-intelligence') === 'on';

let RuntimeBase = LitElement;
let panel = null;
let pipeline = null;

if (enabled) {
  // LitDebugMixin checks the Runtime Intelligence runtime flags when elements connect.
  window.__LDS_DEBUG__ = true;

  const [litRuntime, core, panelApi] = await Promise.all([
    import('runtime-intelligence/lit'),
    import('runtime-intelligence/core'),
    import('runtime-intelligence/panel'),
  ]);

  RuntimeBase = litRuntime.LitDebugMixin(LitElement);
  pipeline = litRuntime.getLitIntelligencePipeline();
  panel = panelApi.mountRuntimeIntelligencePanel({
    store: core.evidenceStore,
    collapsed: true,
  });
}

class MyApp extends RuntimeBase {
  render() {
    return html`<h1>Hello</h1>`;
  }
}

customElements.define('my-app', MyApp);
```

This gives root-element lifecycle/update evidence plus the page/runtime tools started by the Lit integration.

If diagnostics can be torn down during HMR/tests, call:

```js
panel?.destroy();
pipeline?.stop();
```

### Why the mixin is the correct Lit boundary

Lit elements are standard custom elements and expose `connectedCallback()` / `disconnectedCallback()` plus the reactive update lifecycle. Runtime Intelligence's mixin preserves `super` lifecycle calls while observing connection and updates.

## 9. Lit Level 1 — shared base class or strategic elements

If your application already has a shared Lit base class, this is the highest-leverage integration:

```js
import { LitElement } from 'lit';
import { LitDebugMixin } from 'runtime-intelligence/lit';

export class ApplicationElement extends LitDebugMixin(LitElement) {}
```

Then application components extend `ApplicationElement` as they normally would.

If there is no shared base, apply the mixin only to strategic elements first. Do not rewrite an entire mature component tree merely to maximize instrumentation count.

## 10. Lit selective tools

`window.__LDS_DEBUG__ = true` enables the full debug set for a trusted diagnostic session. Selective application-owned flags are also supported, for example:

```js
window.__LDS_DEBUG__ = {
  intelligence: true,
  perf: true,
  network: true,
  vitals: true,
};
```

Set these before the instrumented element connects.

## 11. Lit source expectations

| Evidence | Expectation |
| --- | --- |
| element lifecycle/update | strong owner attribution when the element uses the mixin |
| property/update request | framework evidence can identify observed update activity |
| network/browser evidence | shared runtime evidence remains available |
| resource lifetime | only claim ownership when resource tracking actually proves it |
| root cause | remains evidence-strength dependent; an attributed update is not automatically causality |

---

# Vue 3

## 12. Vue Level 0 — install once before `app.mount()`

Vue's application-level integration can observe component lifecycle/update/error evidence without editing each component.

```js
import { createApp } from 'vue';
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';
import App from './App.vue';

const app = createApp(App);

const enabled =
  import.meta.env.DEV &&
  localStorage.getItem('runtime-intelligence') === 'on';

const loaded = await loadRuntimeIntelligence({
  enabled,
  framework: 'vue',
  panel: true,
});

let controller = null;
let panel = null;

if (loaded.enabled) {
  const { installVueRuntimeIntelligence } = loaded.frameworkModule;
  const { mountRuntimeIntelligencePanel } = loaded.panelModule;

  controller = installVueRuntimeIntelligence(app, {
    enabled: true,
    version: app.version,
  });

  panel = mountRuntimeIntelligencePanel({
    store: controller.store,
    collapsed: true,
  });
}

app.mount('#app');

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    panel?.destroy();
    controller?.stop();
  });
}
```

Install Runtime Intelligence before `app.mount()`. Vue's public application API expects application configuration/plugin-style setup before mounting, and Runtime Intelligence installs its lifecycle/error mixin at that boundary.

## 13. Vue component source attribution

The current Vue adapter can use component metadata such as `__file` when Vue/build tooling exposes it. You can optionally supply a `sourceResolver` for a project-specific trustworthy source mapping:

```js
controller = installVueRuntimeIntelligence(app, {
  enabled: true,
  version: app.version,
  sourceResolver(component) {
    return component?.$?.type?.__file
      ? { file: component.$.type.__file }
      : null;
  },
});
```

Do not invent a path when metadata is absent.

## 14. Vue filtering for large applications

Use `componentFilter` when app-wide lifecycle volume is unnecessarily high:

```js
installVueRuntimeIntelligence(app, {
  enabled: true,
  version: app.version,
  componentFilter(component) {
    return component?.$?.type?.name !== 'TinyIcon';
  },
});
```

Start broad first. Filter only after measuring noise/overhead.

## 15. Vue evidence expectations

| Evidence | Expectation |
| --- | --- |
| component mount/unmount | deterministic lifecycle observation |
| component update duration/activity | observation attributed to component when metadata exists |
| component error | error evidence with component/source where available |
| reactive dependency cause | **not** generically claimed |
| parent/owner relation | structural, not causal |
| network/browser evidence | shared framework-neutral runtime surface |

---

# Shared developer workflow

## 16. First 10 minutes after integration

Use the same workflow in React, Lit, and Vue:

1. Start with Level 0/minimum integration.
2. Open the app with Runtime Intelligence explicitly enabled.
3. Reproduce **one real user-visible problem**.
4. Open the canonical panel.
5. Start with **Pinpoint**, **Intelligence**, and **Opportunities** rather than raw event volume.
6. Check the evidence level and provenance wording.
7. If a file/line is shown, open it and verify it is the relevant invocation/registration/observed component—not merely a nearby file.
8. If attribution stops at a root/framework boundary, decide whether one strategic Level 1 boundary would materially improve the diagnosis.
9. Export JSON + HTML when you need a reproducible before/after artifact.
10. After a fix, replay the same workflow and verify the signal changed as expected.

## 17. Source precision checklist

For every source shown by Pinpoint, ask:

- Is this an application file rather than Runtime Intelligence / framework / bundler / `node_modules`?
- Is the line/column actually present in the browser/framework metadata, or was it inferred?
- Is the provenance labeled correctly: invocation, registration, error origin, component boundary, common origin, etc.?
- Does the wording avoid calling an observation a root cause?
- If the exact source is not provable, does the tool say so instead of falling back to a plausible-looking path?

## 18. Panel and reports

Use the same canonical panel across frameworks:

```js
import { mountRuntimeIntelligencePanel } from 'runtime-intelligence/panel';

const panel = mountRuntimeIntelligencePanel({
  store,
  collapsed: true,
});
```

Useful operations:

```js
panel.refresh();
panel.setCollapsed(false);
const report = panel.createReport('Reproduced after opening order 1042');
panel.downloadBoth();
panel.destroy();
```

Runtime Intelligence does not require an upload endpoint or background telemetry service. Reports are local/user-triggered unless the consuming application deliberately adds its own transport.

## 19. Production and privacy safety

Recommended defaults:

- diagnostics disabled in normal production sessions;
- no public unauthenticated toggle;
- enterprise-safe privacy policy remains enabled;
- do not use `privacyPolicy: false` except in synthetic/local test environments with non-sensitive data;
- conditionally load the framework/panel code when bundle isolation matters;
- always retain a teardown path for tests/HMR/temporary sessions.

## 20. Troubleshooting

### Panel loads but has no evidence

Check that the runtime/framework integration and the panel use the **same evidence store** and that the framework runtime is actually enabled before the relevant lifecycle begins.

### React only shows the root for a slow render

That is a valid Level 0 limitation. Add one strategic `withRuntimeIntelligence` boundary around the suspicious subtree before adding hooks everywhere.

### React shows a network source but not a render source

Those are different evidence mechanisms. A browser `fetch` stack can prove an invocation line even when React Profiler timing cannot prove the child component responsible for the commit.

### Lit component evidence is missing

Ensure the element class actually extends `LitDebugMixin(...)` (directly or through the shared application base), the debug flag was set before connection, and class definition happened after the conditional-loading decision.

### Vue component evidence is missing

Ensure `installVueRuntimeIntelligence(app, ...)` ran before `app.mount()`, `enabled` is literal `true`, and any `componentFilter` is not excluding the component.

### Exact original TypeScript/JSX/Vue source is missing

Runtime source precision depends on the stack/build metadata available in that environment. Development source maps and framework file metadata can help, but Runtime Intelligence should never fabricate a source path merely to make Pinpoint look complete.

---

# Validation projects in this repository

Use the labs for different purposes:

| Project | Purpose |
| --- | --- |
| `examples/react-fault-lab` | deterministic React feature coverage with explicit Runtime Intelligence instrumentation |
| `examples/react-uninstrumented-lab` | hostile zero-touch React adoption benchmark; business components must stay uninstrumented |
| `examples/vue-fault-lab` | Vue adapter + canonical panel validation |
| TrustWeave | real-world React dogfood; no synthetic faults |

The uninstrumented lab is especially important: it prevents us from proving source precision only in applications that were already modified to make source attribution easy.

## Release/adoption principle

A developer should be able to start at Level 0, get useful evidence quickly, and understand every limitation. Deeper instrumentation is successful only when it converts a specific unknown/correlation into stronger **provable** attribution—not merely more events.
