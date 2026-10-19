# Runtime Intelligence — Generic Lit and React Full Usage Guide

This guide covers installing/linking Runtime Intelligence into a generic application, enabling it safely, instrumenting Lit or React, mounting the canonical panel, exporting reports, and validating that evidence is actually being collected.

Runtime Intelligence is production-safe by default: nothing should activate unless the host explicitly enables it.

## 1. Local development link

From the Runtime Intelligence repository root:

```bash
cd <path>/runtime-intelligence
npm install
npm link
```

From the consumer application:

```bash
cd <path>/your-app
npm unlink runtime-intelligence
npm link runtime-intelligence
npm ls runtime-intelligence
```

Use framework-specific package subpaths rather than importing the package root.

## 2. Supported package surfaces

Common surfaces:

```js
runtime-intelligence/core
runtime-intelligence/lit
runtime-intelligence/react
runtime-intelligence/vue
runtime-intelligence/panel
runtime-intelligence/loader/lit
runtime-intelligence/loader/react
runtime-intelligence/loader/vue
```

`runtime-intelligence/custom/ui-platform` is an isolated Syndigo/UI Platform compatibility plugin. Generic applications should not import it.

---

# Lit setup

## 3. Enable Lit Runtime Intelligence before components connect

Preferred programmatic activation:

```js
import {
  configureLitRuntimeIntelligence,
} from 'runtime-intelligence/lit';

const runtimeDiagnostics = configureLitRuntimeIntelligence({
  enabled: true,
  tools: true,
});
```

`tools: true` enables the complete Lit tool set.

For selective activation:

```js
configureLitRuntimeIntelligence({
  enabled: true,
  tools: {
    intelligence: true,
    memory: true,
    errorBoundary: true,
    perf: true,
    network: true,
    vitals: true,
    resourceTracker: true,
  },
});
```

Legacy/debug-only browser activation also works:

```js
window.__LDS_DEBUG__ = true;
```

For new applications, prefer the programmatic API.

## 4. Instrument Lit components

### Direct base class

```js
import { LitElement } from 'lit';
import { LitDebugMixin } from 'runtime-intelligence/lit';

class ProductGrid extends LitDebugMixin(LitElement) {
  // normal Lit component
}
```

### Shared application base class

This is usually preferable in a large codebase:

```js
import { LitElement } from 'lit';
import { LitDebugMixin } from 'runtime-intelligence/lit';

export class AppElement extends LitDebugMixin(LitElement) {}
```

Then:

```js
class ProductGrid extends AppElement {}
class ProductCard extends AppElement {}
```

Instrumenting the common base avoids repeated wiring and gives consistent lifecycle evidence.

### Existing mixin framework

The object passed to `LitDebugMixin(...)` must be a real constructor/class, not a mixin-builder object.

Correct pattern:

```js
LitDebugMixin(MyMixinManager(superclass).with(FeatureMixin))
```

## 5. What Lit instrumentation captures

Depending on enabled tools and browser support, Lit Runtime Intelligence can collect or derive:

- owner/component lifecycle evidence
- update requested/started/completed evidence
- update duration/performance observations
- memory/mount/unmount observations
- runtime errors
- browser network activity
- slow network and sequential API opportunities
- vitals and long tasks
- DOM duplication opportunities
- missing virtualization opportunities
- expensive paint observations
- worker/off-main-thread opportunities
- idle scheduling opportunities
- resource lifetime violations when ownership is explicitly tracked
- evidence graph/root-cause grouping without inventing unsupported causality

## 6. Stop Lit instrumentation

Keep the returned configuration handle:

```js
const runtimeDiagnostics = configureLitRuntimeIntelligence({
  enabled: true,
  tools: true,
});

runtimeDiagnostics.stop();
```

---

# React setup

## 7. Install React Runtime Intelligence at the application root

```jsx
import {
  RuntimeIntelligenceProvider,
} from 'runtime-intelligence/react';

root.render(
  <RuntimeIntelligenceProvider
    enabled={true}
    name="application-root"
  >
    <App />
  </RuntimeIntelligenceProvider>
);
```

The provider lazily creates and starts the React runtime only when `enabled` is true.

For production, drive `enabled` from an explicit diagnostics/dev configuration rather than hard-coding true.

## 8. Add component-level React ownership/profiling

The root provider profiles the root boundary. Add explicit boundaries where component-level ownership matters.

### Profiler component

```jsx
import {
  RuntimeIntelligenceProfiler,
} from 'runtime-intelligence/react';

function SearchPage() {
  return (
    <RuntimeIntelligenceProfiler name="SearchPage">
      <ActualSearchPage />
    </RuntimeIntelligenceProfiler>
  );
}
```

### HOC

```jsx
import {
  withRuntimeIntelligence,
} from 'runtime-intelligence/react';

export default withRuntimeIntelligence(ProductGrid, {
  name: 'ProductGrid',
});
```

### Runtime-aware hooks

The React package also exposes:

```js
useRuntimeIntelligence
useRuntimeOwner
useRuntimeEffect
useRuntimeResource
useRuntimeTrackedState
```

Use these when the application wants explicit evidence about state/effect/resource ownership. Do not manufacture causal relationships that the framework cannot actually report.

---

# Canonical panel

## 9. Mount one canonical panel for Lit or React

The panel is framework-neutral and consumes the shared evidence store.

```js
import { evidenceStore } from 'runtime-intelligence/core';
import { mountRuntimeIntelligencePanel } from 'runtime-intelligence/panel';

const runtimePanel = mountRuntimeIntelligencePanel({
  store: evidenceStore,
  collapsed: true,
});
```

Mount it once after `document.body` exists.

Useful operations:

```js
runtimePanel.setCollapsed(false);
runtimePanel.refresh();

const report = runtimePanel.createReport('checkout slowdown reproduction');
runtimePanel.downloadJson();
runtimePanel.downloadHtml();
runtimePanel.downloadBoth();

runtimePanel.destroy();
```

Do not mount a separate panel per component.

## 10. Dynamic loading / production boundary

For applications that do not want diagnostics code eagerly loaded, use the framework-specific loader.

### Lit

```js
import {
  loadLitRuntimeIntelligence,
} from 'runtime-intelligence/loader/lit';

const loaded = await loadLitRuntimeIntelligence({
  enabled: shouldEnableDiagnostics,
  panel: true,
});
```

### React

```js
import {
  loadReactRuntimeIntelligence,
} from 'runtime-intelligence/loader/react';

const loaded = await loadReactRuntimeIntelligence({
  enabled: shouldEnableDiagnostics,
  panel: true,
});
```

Use framework-specific loaders so a Lit-only build does not resolve React peers and vice versa.

---

# Validation and investigation workflow

## 11. Verify collection before trusting the report

For Lit legacy/browser diagnostics, useful checks include:

```js
window.__LDS_NETWORK_LOG__
window.__LDS_PERF__
window.__LDS_MEMORY__
window.__LDS_ERRORS__
window.__LDS_VITALS__
window.__LDS_INTELLIGENCE__
```

For framework-neutral evidence, inspect the shared store during development:

```js
import { evidenceStore } from 'runtime-intelligence/core';

console.log(evidenceStore.snapshot());
```

## 12. Recommended performance-test procedure

1. Enable Runtime Intelligence before the target runtime/component tree starts.
2. Reload to begin from a clean scenario.
3. Mount/open the canonical panel.
4. Reproduce exactly one known slow workflow.
5. Inspect evidence, findings and opportunities.
6. Export JSON + HTML.
7. Apply one fix.
8. Reload and reproduce the same workflow.
9. Compare before/after evidence rather than relying on subjective feel.

## 13. Evidence interpretation rules

Runtime Intelligence deliberately distinguishes:

- observation
- correlation
- attribution
- lifetime violation
- confirmed causality where the framework/runtime can actually support it

Temporal proximity alone is not proof of causality. Framework hierarchy is structural, not automatically causal. Missing framework capabilities should remain unsupported/partial rather than being guessed.

## 14. Common troubleshooting

### Package root cannot be resolved

Import a documented subpath:

```js
import { LitDebugMixin } from 'runtime-intelligence/lit';
```

not:

```js
import { LitDebugMixin } from 'runtime-intelligence';
```

### Nothing is captured

Instrumentation was probably enabled too late. Enable/configure Runtime Intelligence before components mount/connect and before the network workflow begins.

### Panel is empty but components are instrumented

Make sure the panel uses the same singleton `evidenceStore` exported by `runtime-intelligence/core`.

### React shows only root-level information

Add `RuntimeIntelligenceProfiler`, the HOC, or runtime hooks to meaningful component boundaries. The tool should not pretend to know component ownership that was never instrumented.

### Generic Lit app has no Falcor tab data

Falcor decoding is product-specific. Generic apps get network evidence, not Syndigo Falcor semantics. Only UI Platform should import `runtime-intelligence/custom/ui-platform`.

## 15. Production guidance

- default diagnostics OFF
- enable explicitly for local/dev/support investigations
- prefer framework-specific loaders for optional loading
- avoid product-specific plugins in generic applications
- export/sanitize evidence according to the host application's privacy policy
- stop/destroy diagnostics handles when a long-lived host dynamically disables the tooling

The intended operating loop is: **evidence -> diagnosis/opportunity -> fix -> repeat the same workflow -> verify improvement**.
