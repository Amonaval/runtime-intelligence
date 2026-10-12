# Runtime Intelligence

Framework-neutral runtime diagnostics for **React, Lit and Vue**, backed by one Universal Runtime Evidence Protocol (UREP), shared intelligence pipeline, source provenance, Opportunities, normalized reports and one canonical developer panel.

> Distribution status: **private / proprietary**. The package is intentionally `private: true` and `UNLICENSED`. Authorized evaluation is through private Git access or explicitly shared tarballs. Public registry publication is not part of the current baseline.

## What makes the product useful

Runtime Intelligence is designed to reduce the time from:

```text
"something is slow / leaking / failing"
```

to:

```text
relevant application evidence
→ source file : line : column when provable
→ provenance meaning
→ evidence chain / opportunity
→ action
```

Source precision is governed by evidence honesty. An invocation location, component boundary, registration point, correlation and confirmed causal origin are **not interchangeable**.

## Start here

For a complete blank-project / existing-project guide, including React, Lit, Vue, zero-touch adoption and the evidence-quality ladder, read:

[`docs/NEW-PROJECT-INTEGRATION-GUIDE.md`](docs/NEW-PROJECT-INTEGRATION-GUIDE.md)

### Install an authorized tarball

```bash
# runtime-intelligence repo
npm pack --ignore-scripts

# consumer app
npm install /absolute/path/to/runtime-intelligence-0.1.3.tgz
```

A controlled Git-SHA install remains supported for dogfood consumers.

## React — zero-touch application code

Only the application shell needs Runtime Intelligence. Application components can remain ordinary React.

```jsx
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';

const loaded = await loadRuntimeIntelligence({
  enabled: import.meta.env.DEV && localStorage.getItem('runtime-intelligence') === 'on',
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

At this level, network/error provenance can often resolve automatically to application code. Exact internal component source for an otherwise completely uninstrumented React render is **not invented** when React does not expose trustworthy source metadata.

## Vue 3 — application-level install

Install before `app.mount()`:

```js
import { createApp } from 'vue';
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';
import App from './App.vue';

const app = createApp(App);
const loaded = await loadRuntimeIntelligence({
  enabled: import.meta.env.DEV && localStorage.getItem('runtime-intelligence') === 'on',
  framework: 'vue',
  panel: true,
});

if (loaded.enabled) {
  const diagnostics = loaded.frameworkModule.installVueRuntimeIntelligence(app, {
    enabled: true,
    version: '3.x',
  });
  loaded.panelModule.mountRuntimeIntelligencePanel({ store: diagnostics.store });
}

app.mount('#app');
```

Vue lifecycle ownership/timing remains observation. Component file metadata can provide source attribution where Vue exposes it.

## Lit — supported programmatic activation

For new projects, prefer a shared application base class:

```js
import { LitElement } from 'lit';
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';

const loaded = await loadRuntimeIntelligence({
  enabled: import.meta.env.DEV && localStorage.getItem('runtime-intelligence') === 'on',
  framework: 'lit',
  panel: true,
});

let AppElement = LitElement;

if (loaded.enabled) {
  loaded.frameworkModule.configureLitRuntimeIntelligence({ enabled: true });
  AppElement = loaded.frameworkModule.LitDebugMixin(LitElement);

  const { evidenceStore } = await import('runtime-intelligence/core');
  loaded.panelModule.mountRuntimeIntelligencePanel({ store: evidenceStore });
}

export { AppElement };
```

`configureLitRuntimeIntelligence(...)` is the supported new-project activation path. `window.__LDS_*` remains a compatibility mechanism for older integrations and should not be the foundation of new code.

## Public package surfaces

```text
runtime-intelligence/loader    production-safe conditional loader
runtime-intelligence/core      UREP/shared intelligence core
runtime-intelligence/extension governed custom UREP producers
runtime-intelligence/react     React runtime/provider/hooks
runtime-intelligence/lit       Lit mixin + programmatic activation
runtime-intelligence/vue       Vue app/runtime integration
runtime-intelligence/panel     canonical panel + report APIs
runtime-intelligence/panel/lit direct panel element
```

Do not deep-import repository paths such as `runtime-intelligence/lit/src/...`.

## Source provenance

Pinpoint should tell you what a location means:

- **Invocation** — observed operation was invoked here.
- **Registration** — resource/effect/listener was registered here.
- **Error origin** — captured error stack resolves here.
- **Component boundary** — framework/instrumentation identifies this boundary here.
- **Correlated / related** — useful context, not causal proof.
- **Unknown** — exact source was not deterministically available.

A source line without provenance semantics is incomplete.

## Validation labs

```bash
# deterministic / instrumented React coverage
npm run lab:react:install
npm run lab:react

# P0.3 hostile zero-touch React project
npm run lab:react:hostile:install
npm run lab:react:hostile:validate
npm run lab:react:hostile

# Vue coverage
npm run lab:vue:install
npm run lab:vue
```

`examples/react-uninstrumented-lab` is deliberately different from the React Fault Lab: application components contain no Runtime Intelligence imports, source annotations, HOCs, runtime hooks, or synthetic UREP injection. It exists to expose what the product can and cannot discover automatically.

## Safe enablement

Diagnostics should remain off by default and require an application-owned development/authorization gate plus explicit opt-in. The loader activates only for literal `true`.

Runtime Intelligence does not add telemetry, upload endpoints, beacons, or surprise startup network calls. Report export remains local/user-triggered unless a consumer explicitly adds transport.

## Custom extensions

```js
import { createRuntimeExtension } from 'runtime-intelligence/extension';

const extension = createRuntimeExtension({
  id: 'acme.router',
  version: '1.0.0',
  store: runtime.store,
  framework: 'react',
});

extension.diagnostic('cache-miss', { route: '/orders' });
```

Confirmed causality is blocked by default and requires the stronger extension/evidence contract.

## Release validation

```bash
npm run package:validate
npm run api:validate
npm run distribution:validate
npm run production:validate
npm run onboarding:validate
npm test
```

`npm run validate:release` aggregates the release checks.

The P0.3 zero-touch contract has an additional static gate:

```bash
npm run lab:react:hostile:validate
```

## Product status

Current work prioritizes **developer value and source precision over adding more framework adapters**. Angular and broader framework expansion remain blocked until the P0 source-pinpoint value proposition is mature.

See [`docs/STATUS.md`](docs/STATUS.md), [`docs/ROADMAP.md`](docs/ROADMAP.md), and [`docs/P0-SOURCE-PINPOINT-PROVENANCE.md`](docs/P0-SOURCE-PINPOINT-PROVENANCE.md).

## R8 hardening validation

Run `npm run validate:release`, `npm run overhead:validate` and `npm run compatibility:validate`. The compatibility validator tests two exact packed-artifact framework rows; enable its browser checks with RI_PLAYWRIGHT_MODULE and RI_CHROMIUM_EXECUTABLE. Without browser configuration those checks remain NOT EXECUTED. See [R8-HARDENING.md](docs/R8-HARDENING.md) for tested versions, receipts, reproduction and explicit coverage limits. Canonical and legacy reports now include exportPrivacy audit metadata and scrub every exported branch.

## Finding to fix

Expand a Pinpoint finding or an Opportunities card to read **Why this source? / What next?**. The explanation preserves source/evidence limits and suggests the smallest useful adoption step. The same guidance appears in normalized JSON and HTML reports. Installed packages include the integration guide and adoption ladder under `node_modules/runtime-intelligence/docs/`.

R9 adoption/product experience is complete; see [R9-ADOPTION.md](https://github.com/Amonaval/runtime-intelligence/blob/main/docs/R9-ADOPTION.md) for validation and scope.

## Verification is not causality

`verifyFix(...)` can confirm that a configured target improved after an explicitly applied intervention on a distinct replay of the same workflow. That ordinary result remains correlation-level evidence: temporal before/after improvement alone is **not** causal proof.

A causal upgrade requires an existing valid UREP event that already carries `causality-confirmed` evidence plus `causedByEventId`. The verifier consumes that stronger governed evidence; it does not infer causality from chronology.

See [R9.1-VERIFICATION-CAUSALITY-HARDENING.md](docs/R9.1-VERIFICATION-CAUSALITY-HARDENING.md).

## Diagnostic before / after

R9.2 adds a simple framework-neutral workflow over the same EvidenceStore:

```text
capture baseline
→ apply intended fix
→ replay the same workflow
→ improved / unchanged / regressed / inconclusive
```

Use `createDiagnosticBeforeAfterSession(...)` from `runtime-intelligence/panel`, or call `panel.startBeforeAfter(...)` on the canonical panel mount. The active session is included in normalized JSON and rendered in HTML reports.

An `improved` result means the configured verification target was met. It remains correlation-level unless separate governed `causality-confirmed` UREP evidence exists.

See [R9.2-DIAGNOSTIC-BEFORE-AFTER.md](docs/R9.2-DIAGNOSTIC-BEFORE-AFTER.md).
