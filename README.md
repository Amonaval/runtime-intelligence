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
→ replay / verification
```

Source precision is governed by evidence honesty. An invocation location, component boundary, registration point, correlation and confirmed causal origin are **not interchangeable**.

## Start here

For the practical new-project path from **minimal integration → targeted instrumentation → full usage → fault labs**, read:

[`docs/DEVELOPER-GUIDE.md`](docs/DEVELOPER-GUIDE.md)

For the more detailed framework/source-provenance reference, also see:

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
runtime-intelligence/panel     canonical panel + report/verification APIs
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

## Validation / example labs

```bash
# deterministic / instrumented React coverage
npm run lab:react:install
npm run lab:react

# hostile zero-touch React project
npm run lab:react:hostile:install
npm run lab:react:hostile:validate
npm run lab:react:hostile

# Vue coverage
npm run lab:vue:install
npm run lab:vue

# Lit full-scale example / R9.3 verification walkthrough
npm run lab:lit:install
npm run lab:lit
```

`examples/react-uninstrumented-lab` deliberately forbids Runtime Intelligence imports inside business components so it exposes the true Level-0 boundary.

`examples/lit-fault-lab` is the runnable Lit full-scale example. It uses public programmatic activation, one shared `LitDebugMixin(LitElement)` base, real browser/Lit faults, and an end-to-end Finding → Verify Fix flow.

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

## Finding to fix

Expand a Pinpoint finding or an Opportunities card to read **Why this source? / What next?**. The explanation preserves source/evidence limits and suggests the smallest useful adoption step.

R9.3 adds a further bridge for supported Pinpoint findings: **Verify fix →**. Only findings with a defensible default metric receive the action. The public equivalents are:

```js
import {
  createFindingVerificationPlan,
  createFindingVerificationSession,
} from 'runtime-intelligence/panel';
```

The canonical mount also exposes `panel.startFindingVerification(finding, options)`.

## Verification is not causality

`verifyFix(...)` can confirm that a configured target improved after an explicitly applied intervention on a distinct replay of the same workflow. That ordinary result remains correlation-level evidence: temporal before/after improvement alone is **not** causal proof.

A causal upgrade requires an existing valid UREP event that already carries `causality-confirmed` evidence plus `causedByEventId`. The verifier consumes that stronger governed evidence; it does not infer causality from chronology.

See [R9.1-VERIFICATION-CAUSALITY-HARDENING.md](docs/R9.1-VERIFICATION-CAUSALITY-HARDENING.md).

## Diagnostic before / after

The canonical workflow is:

```text
start session
→ reproduce baseline workflow
→ capture baseline
→ apply intended fix
→ replay the same workflow
→ capture replay
→ improved / unchanged / regressed / inconclusive
```

R9.3 hardens this flow with sequence-window isolation so cumulative historical EvidenceStore events do not contaminate baseline/replay metrics.

An `improved` result means the configured verification target was met. It remains correlation-level unless separate governed `causality-confirmed` UREP evidence exists.

See [R9.2-DIAGNOSTIC-BEFORE-AFTER.md](docs/R9.2-DIAGNOSTIC-BEFORE-AFTER.md) and [R9.3-FINDING-VERIFY-FIX-BRIDGE.md](docs/R9.3-FINDING-VERIFY-FIX-BRIDGE.md).

## Product status / strategic review

Current work prioritizes **developer value and source precision over adding more framework adapters**. Angular remains deferred.

The adversarial review is intentionally conditional: Runtime Intelligence is worth using for difficult multi-signal runtime incidents only when it gets the developer to a trustworthy source/action faster than native tools. It is not needed for ordinary bugs.

See:

- [`docs/STATUS.md`](docs/STATUS.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/STRATEGIC-REVIEW-R9.3.md`](docs/STRATEGIC-REVIEW-R9.3.md)
