# Runtime Intelligence — New Project Integration Guide

Use this guide when adding Runtime Intelligence to a new or existing **React, Lit, or Vue** application.

The adoption rule is simple:

1. **Start at the application shell.**
2. Reproduce a real problem.
3. Use automatic browser/framework evidence first.
4. Add strategic instrumentation only where it materially improves precision.
5. Never treat a nearby source location as proven causality.

Runtime Intelligence feeds all supported frameworks into the same UREP evidence store, shared intelligence pipeline, Opportunities model, reports, and canonical panel.

---

## 1. Install

Runtime Intelligence is currently private/proprietary. Use an authorized tarball or an explicitly authorized Git SHA.

### Recommended: packed artifact

From the Runtime Intelligence repository:

```bash
npm pack --ignore-scripts
```

Then in the consumer:

```bash
npm install /absolute/path/to/runtime-intelligence-0.1.3.tgz
```

A controlled Git-SHA install is also supported for dogfood environments.

Do not deep-import repository paths such as `runtime-intelligence/lit/src/...`.

---

## 2. Safe enablement

Diagnostics should be **off by default** and activated only by an application-owned development/authorization gate plus explicit opt-in.

Vite example:

```js
const runtimeIntelligenceEnabled =
  import.meta.env.DEV &&
  localStorage.getItem('runtime-intelligence') === 'on';
```

The conditional loader activates only for literal `true`:

```js
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';

const loaded = await loadRuntimeIntelligence({
  enabled: runtimeIntelligenceEnabled,
  framework: 'react', // react | lit | vue
  panel: true,
});
```

Runtime Intelligence does not add an upload endpoint or background telemetry transport. Network instrumentation observes host traffic while enabled.

---

# React

## 3. React Level 0 — zero-touch application code

Start here.

Your business components can remain completely ordinary React. Put Runtime Intelligence only in the application bootstrap/shell.

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

  const runtime = createReactIntelligenceRuntime({
    profilingEnabled: true,
  });

  const panel = mountRuntimeIntelligencePanel({
    store: runtime.store,
  });

  root.render(
    <RuntimeIntelligenceProvider
      runtime={runtime}
      name="AppRoot"
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

### What Level 0 can pinpoint automatically

When the browser provides a useful stack, Runtime Intelligence can retain application provenance for high-value browser/runtime observations such as:

- `fetch` / XHR invocation;
- network failure;
- unhandled rejection / browser error;
- sequential API calls with a common application origin;
- other evidence that already carries deterministic application frames.

A useful finding should look conceptually like:

```text
src/services/orders-api.ts:84:17
Provenance: Invocation
```

The location means **the observed operation originated there**. It is not automatically the business root cause.

### What React Level 0 cannot honestly promise

React's public Profiler callback reports render timing/phase; it does not provide the original definition line for every child component.

For a completely uninstrumented slow child, correct output may therefore be:

```text
Slow React render observed
Component source: source unavailable
```

Runtime Intelligence must prefer `source unavailable` over a guessed React/framework/bundler frame.

The hostile benchmark `examples/react-uninstrumented-lab` exists specifically to test this boundary.

---

## 4. React Level 1 — strategic component boundaries

If Level 0 identifies a suspicious area but not the exact component boundary, add instrumentation only to a few high-value surfaces.

### HOC

```jsx
import { withRuntimeIntelligence } from 'runtime-intelligence/react';
import OrdersGrid from './OrdersGrid.jsx';

export default withRuntimeIntelligence(OrdersGrid, {
  name: 'OrdersGrid',
});
```

The HOC captures **component-boundary registration provenance** when the application registration stack exposes a trustworthy source.

That means:

```text
Component boundary: OrdersGrid.tsx:42
```

not:

```text
This line definitely caused every render.
```

### Explicit profiler boundary

```jsx
import { RuntimeIntelligenceProfiler } from 'runtime-intelligence/react';

<RuntimeIntelligenceProfiler name="Checkout">
  <Checkout />
</RuntimeIntelligenceProfiler>
```

Use Level 1 for a few strategically important subtrees, not every component.

---

## 5. React Level 2 — exact state/effect/resource provenance

Use Runtime Intelligence-aware hooks only when you need exact operation-level evidence.

```jsx
import {
  useRuntimeTrackedState,
  useRuntimeEffect,
  useRuntimeResource,
} from 'runtime-intelligence/react';

const [query, setQuery] = useRuntimeTrackedState('', {
  key: 'query',
});

useRuntimeEffect(() => {
  // effect body
}, [query], {
  id: 'search-effect',
});

useRuntimeResource(
  'orders-subscription',
  'subscription',
  { active: true },
);
```

These APIs can capture invocation/registration provenance because application code is actually on the stack.

They still do **not** automatically upgrade attribution/correlation to confirmed causality.

---

## 6. React / Next.js

Keep Runtime Intelligence in a **client-only** boundary.

Do not evaluate browser enablement, access `localStorage`, or mount the panel during SSR.

A practical Next.js pattern is a small `'use client'` diagnostics shell that initializes Runtime Intelligence after the client mounts and wraps the application subtree.

Start at Level 0. Add Level 1 boundaries only after real findings show where extra render ownership would materially help.

---

# Vue 3

## 7. Vue Level 0 — install once before mount

Vue supports broad application-level lifecycle observation without editing each component.

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

let diagnostics = null;
let panel = null;

if (loaded.enabled) {
  diagnostics =
    loaded.frameworkModule.installVueRuntimeIntelligence(app, {
      enabled: true,
      version: app.version,
    });

  panel =
    loaded.panelModule.mountRuntimeIntelligencePanel({
      store: diagnostics.store,
    });
}

app.mount('#app');

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    panel?.destroy();
    diagnostics?.stop();
  });
}
```

Install Runtime Intelligence **before `app.mount()`**.

No application component needs a Runtime Intelligence import for this Level 0 integration.

### Vue evidence semantics

Runtime Intelligence may observe:

- component mount/unmount;
- `beforeUpdate → updated` lifecycle timing;
- component errors;
- parent/owner hierarchy;
- browser/network evidence.

Vue build metadata such as `__file` can provide component source attribution when available.

These remain distinct claims:

```text
component lifecycle observed      ≠ root cause
parent/owner relationship         ≠ causal relationship
update timing observed            ≠ reactive dependency proven
component source available        ≠ that line caused the defect
```

### Optional filtering

For very large applications, reduce noise only after observing actual volume:

```js
loaded.frameworkModule.installVueRuntimeIntelligence(app, {
  enabled: true,
  componentFilter(component) {
    return component?.$?.type?.name !== 'TinyIcon';
  },
});
```

An application-specific `sourceResolver` may be supplied only when it maps trustworthy project metadata. Do not invent source paths when metadata is absent.

---

# Lit

## 8. Lit Level 0/1 — public programmatic activation + shared base

For new projects, use the public programmatic activation API. Do **not** build new integration code around `window.__LDS_*`; those globals remain compatibility-only.

Make the diagnostics decision before instrumented custom elements connect.

```js
import { LitElement } from 'lit';
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';

const enabled =
  import.meta.env.DEV &&
  localStorage.getItem('runtime-intelligence') === 'on';

const loaded = await loadRuntimeIntelligence({
  enabled,
  framework: 'lit',
  panel: true,
});

let panel = null;
let activation = null;
let AppElement = LitElement;

if (loaded.enabled) {
  activation =
    loaded.frameworkModule.configureLitRuntimeIntelligence({
      enabled: true,
    });

  AppElement =
    loaded.frameworkModule.LitDebugMixin(LitElement);

  const { evidenceStore } =
    await import('runtime-intelligence/core');

  panel =
    loaded.panelModule.mountRuntimeIntelligencePanel({
      store: evidenceStore,
    });
}

export { AppElement, activation, panel };
```

Application elements can then extend the shared base normally:

```js
import { html } from 'lit';
import { AppElement } from './app-element.js';

export class OrdersGrid extends AppElement {
  render() {
    return html`<h2>Orders</h2>`;
  }
}
```

This avoids editing every Lit component with Runtime Intelligence-specific imports when your application already has—or can introduce—a shared base class.

### Selective Lit tools

You can activate only selected tools:

```js
const activation =
  loaded.frameworkModule.configureLitRuntimeIntelligence({
    enabled: true,
    tools: {
      intelligence: true,
      network: true,
      perf: true,
      vitals: true,
    },
  });
```

A selective programmatic configuration is authoritative while active; stale compatibility globals do not silently broaden it.

For HMR/tests:

```js
panel?.destroy();
activation?.stop();
```

A stale activation controller cannot disable a newer activation.

### Existing Lit projects

If most elements already extend a shared application base, instrument that base once.

If hundreds of elements directly extend `LitElement`, do not globally prototype-patch Lit. Migrate the highest-value component families to an instrumented shared base incrementally.

### Lit evidence semantics

The mixin can observe lifecycle/update boundaries and feed component ownership into UREP.

A property/update observation still does not automatically prove business causality.

---

# Evidence-quality ladder

## 9. Choose the cheapest level that answers the question

| Level | Integration cost | React | Vue | Lit | Typical source precision |
| --- | --- | --- | --- | --- | --- |
| **0 — shell/browser** | one bootstrap | provider + root profiler | app installer | activation + shared-base decision | browser/network/error source often exact; internal render source may remain unknown |
| **1 — framework ownership** | selected boundaries/base | HOC / Profiler | app mixin already broad | instrumented shared base | stronger component/boundary attribution |
| **2 — exact operations** | targeted code changes | tracked state/effect/resource hooks | app-specific extension only if justified | focused property/resource tooling where needed | invocation/registration attribution |
| **3 — governed extension** | plugin code | custom UREP extension | custom UREP extension | custom UREP extension | domain-specific evidence; causality still guarded |

Do not jump to Level 2 everywhere. The product is successful when Level 0 finds useful evidence and deeper instrumentation is added only where it converts a specific unknown into stronger provable attribution.

---

# How to read Pinpoint

## 10. Provenance labels matter

Treat the location and its meaning together.

- **Invocation** — the observed operation was invoked here.
- **Registration** — a resource/effect/listener was registered here.
- **Error origin** — captured error stack resolves here.
- **Component boundary** — framework/instrumentation identifies this component boundary here.
- **Common origin** — multiple observations share this application caller.
- **Correlated / related** — useful contextual location, not causal proof.
- **Unknown / source unavailable** — Runtime Intelligence could not prove an exact source.

A file/line without provenance meaning is incomplete.

---

# Developer workflow

## 11. First diagnostic session

1. Integrate only the framework's Level 0 path.
2. Enable Runtime Intelligence explicitly.
3. Reproduce one real user-visible issue.
4. Open **Pinpoint**, **Intelligence**, and **Opportunities**.
5. Check evidence level and provenance wording.
6. If a source is displayed, open the exact file/line.
7. Verify that it is genuinely relevant—not Runtime Intelligence, React/Vue/Lit internals, a bundler frame, or `node_modules`.
8. If the source remains unknown, decide whether one Level 1 boundary would answer the question.
9. Export JSON + HTML when you need a reproducible before/after artifact.
10. Re-run the same workflow after the fix.

---

## 12. Source precision checklist

For every source shown, ask:

- Is this an application file?
- Are line/column actually supported by the captured stack/framework metadata?
- Does the provenance label describe what the location means?
- Is correlation still labeled as correlation?
- Is a framework owner relationship still structural rather than causal?
- When exact attribution is not provable, does the UI show `source unavailable` instead of guessing?

---

# Troubleshooting

## 13. Panel loads but no evidence appears

Verify:

- the loader returned `enabled: true`;
- framework integration started before the relevant lifecycle;
- the panel and runtime use the same store;
- the framework-specific Level 0 setup is actually mounted/installed.

## 14. React shows network source but not child render source

This is possible and honest.

A browser `fetch` stack can provide an exact invocation line while React's root Profiler still cannot prove which uninstrumented child definition caused a slow commit.

Use one strategic Level 1 boundary if that question matters.

## 15. Lit loads but component evidence is absent

Verify:

- `configureLitRuntimeIntelligence({ enabled: true })` ran;
- it ran before the instrumented element connected;
- the element extends `LitDebugMixin(...)` directly or through the shared application base;
- the loader returned `enabled: true`.

Do not use internal `window.__LDS_*` globals as the new-project fix.

## 16. Vue component evidence is absent

Verify:

- `installVueRuntimeIntelligence(app, ...)` ran before `app.mount()`;
- `enabled` is literal `true`;
- `componentFilter` did not exclude the component.

## 17. Original TypeScript/JSX/Vue source is unavailable

Development stacks, framework file metadata, and source maps may provide original-source information depending on the environment.

Runtime Intelligence should never fabricate an exact original path merely to make Pinpoint look complete.

---

# Validation environments

## 18. Use each environment for what it proves

| Environment | Purpose |
| --- | --- |
| `examples/react-fault-lab` | deterministic React capability coverage with explicit instrumentation |
| `examples/react-uninstrumented-lab` | hostile zero-touch React value test; business components must remain uninstrumented |
| `examples/vue-fault-lab` | Vue adapter/canonical-panel validation |
| real consumer such as TrustWeave | real-world dogfood; never inject synthetic faults merely to make evidence look good |

Hostile React lab commands:

```bash
npm run lab:react:hostile:install
npm run lab:react:hostile:validate
npm run lab:react:hostile
```

The hostile lab is the correct place to judge whether automatic source pinpointing feels valuable without application-specific help.

---

# Adoption principle

A developer should be able to begin at Level 0 and get useful, honest evidence quickly.

Deeper instrumentation is justified only when it turns a concrete `unknown` or weak correlation into stronger, **provable** attribution.

Framework count is secondary. Developer time-to-relevant-code is the product value.
