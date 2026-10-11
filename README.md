# Runtime Intelligence

Framework-neutral runtime diagnostics for React, Lit and Vue, backed by one Universal Runtime Evidence Protocol (UREP), shared intelligence pipeline, and one canonical developer panel.

> Current distribution status: **private/proprietary**. The package is intentionally `private: true` and `UNLICENSED`. Authorized evaluation/distribution is through private Git access or explicitly shared tarballs. Public registry publication is not part of the current baseline.

## Start here

For a completely new React, Lit or Vue project, use [`docs/NEW-PROJECT-INTEGRATION-GUIDE.md`](docs/NEW-PROJECT-INTEGRATION-GUIDE.md). It explains the Level 0 → Level 1 → Level 2 adoption model, source/evidence expectations, privacy/production gating and framework-specific setup.

For the hardest React adoption case, use [`examples/react-uninstrumented-lab`](examples/react-uninstrumented-lab): its business components are deliberately forbidden from importing or calling Runtime Intelligence.

## 5-minute start

### 1. Install

For development from this repository:

```bash
npm install
npm run package:validate
npm run api:validate
npm run distribution:validate
npm run onboarding:validate
```

For an authorized consumer app, the reproducible pre-registry path is a tarball:

```bash
# in runtime-intelligence
npm pack --ignore-scripts

# in the consumer app
npm install /absolute/path/to/runtime-intelligence-0.1.2.tgz
```

Git-SHA installation remains supported for controlled dogfood consumers. Neither repository access nor possession of a tarball grants redistribution rights; see `LICENSE.md`.

### 2. Production-safe React bootstrap

```js
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';

const diagnostics = await loadRuntimeIntelligence({
  enabled: import.meta.env.DEV && localStorage.getItem('runtime-intelligence') === 'on',
  framework: 'react',
  panel: true,
});
```

Only literal `true` activates loading. When enabled:

```js
const { createReactIntelligenceRuntime, RuntimeIntelligenceProvider } = diagnostics.frameworkModule;
const { mountRuntimeIntelligencePanel } = diagnostics.panelModule;
const runtime = createReactIntelligenceRuntime({ profilingEnabled: true });
const panel = mountRuntimeIntelligencePanel({ store: runtime.store });
root.render(
  <RuntimeIntelligenceProvider runtime={runtime} profileRoot={true}>
    <App />
  </RuntimeIntelligenceProvider>,
);
// panel.destroy(); runtime.stop(); // HMR/tests
```

At this Level 0 boundary, business components can remain completely unaware of Runtime Intelligence. Browser/network/error evidence and root-tree render timing are still available; exact child render source is not guaranteed without stronger evidence.

### 3. Lit bootstrap

```js
import { LitElement } from 'lit';
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';

const diagnostics = await loadRuntimeIntelligence({
  enabled: import.meta.env.DEV && localStorage.getItem('runtime-intelligence') === 'on',
  framework: 'lit',
});
const RuntimeBase = diagnostics.enabled ? diagnostics.frameworkModule.LitDebugMixin(LitElement) : LitElement;
customElements.define('my-app', class extends RuntimeBase {});
```

For strict Lit conditional loading, make the diagnostics decision before defining the instrumented custom element. See the new-project guide for the canonical panel/store wiring and shared-base-class adoption pattern.

### 4. Vue bootstrap

Install the Vue integration before `app.mount()` so lifecycle ownership is observable from the first mount:

```js
import { createApp } from 'vue';
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';
import App from './App.vue';

const app = createApp(App);
const diagnostics = await loadRuntimeIntelligence({
  enabled: import.meta.env.DEV && localStorage.getItem('runtime-intelligence') === 'on',
  framework: 'vue',
  panel: true,
});

let runtimeIntelligence = null;
let panel = null;

if (diagnostics.enabled) {
  runtimeIntelligence = diagnostics.frameworkModule.installVueRuntimeIntelligence(app, {
    enabled: true,
    version: app.version,
  });
  panel = diagnostics.panelModule.mountRuntimeIntelligencePanel({
    store: runtimeIntelligence.store,
  });
}

app.mount('#app');
// panel?.destroy(); runtimeIntelligence?.stop(); // HMR/tests
```

Vue `beforeUpdate` → `updated` timing is recorded as an observed lifecycle window. Runtime Intelligence does not claim that Vue exposed the reactive dependency or update cause unless stronger evidence is added in the future.

The direct Vue installer is also default-off. Pass literal `enabled: true` only inside an application-owned authorization/debug gate, or after `/loader` has already returned `enabled: true`.

Use `/loader` when production bundle isolation matters.

## Enablement rules

Diagnostics should be **off by default** and require both an application-owned development/authorization condition and explicit opt-in. Runtime Intelligence does not upload telemetry or initiate network requests on startup; its network collector observes host traffic only.

## Public package surfaces

```text
runtime-intelligence/loader    production-safe conditional loader
runtime-intelligence/core      UREP/shared core
runtime-intelligence/extension governed custom UREP evidence producers
runtime-intelligence/react     React adapter/provider/runtime
runtime-intelligence/lit       Lit adapter/mixin/runtime integration
runtime-intelligence/vue       Vue adapter/runtime/app integration
runtime-intelligence/panel     canonical panel mount/report APIs
runtime-intelligence/panel/lit direct mature Lit panel element
```

Do not import deep paths such as `runtime-intelligence/lit/src/...`. Do not build consumer integrations around `window.__LDS_*`; those globals are internal compatibility bridges, not supported public APIs.

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

Diagnostics are automatically namespaced (`acme.router.cache-miss`) and tagged with extension/API/UREP version metadata. Confirmed causality is blocked by default and requires an explicit stronger contract.

## API stability

The public API contract remains version `0.1`. R7 deliberately adds the compatible `runtime-intelligence/vue` subpath and updates the checked API baseline. `npm run api:validate` freezes the supported package subpaths and named exports.

- pre-1.0 breaking supported-API changes require a new minor line;
- after 1.0, breaking changes require a major version;
- UREP and extension compatibility are same-major;
- deep imports and `window.__LDS_*` globals are unsupported.

## Distribution and IP boundary

R6.5 adopts a private/proprietary browser-package model.

- **Package name:** keep `runtime-intelligence` as the stable internal package-contract name. Do not rename merely to choose a registry scope.
- **Registry:** none is configured. If a private registry is adopted later, choose its namespace/registry deliberately without changing product architecture.
- **License:** proprietary / `UNLICENSED`; see `LICENSE.md`.
- **Current delivery:** authorized private Git SHA or authorized tarball.
- **Obfuscation:** optional friction only; never treated as IP protection.
- **Service boundary:** intelligence that genuinely must remain secret belongs behind an opt-in backend/service. The browser package must remain useful locally and must not start making surprise network calls.

Historical distributions or separate agreements may have different rights; R6.5 does not rewrite history or attempt to revoke rights already granted.

## Validation

```bash
npm run package:validate
npm run api:validate
npm run distribution:validate
npm run production:validate
npm run onboarding:validate
npm test
```

`npm run validate:release` aggregates all release checks. `distribution:validate` enforces the private/proprietary posture and checks that the packed artifact carries the license notice.

Focused framework validation is also represented by the unit tests under `lit/test/unit/`. Synthetic browser surfaces live under `examples/react-fault-lab` and `examples/vue-fault-lab`.

For the P0.3 zero-touch React benchmark:

```bash
npm run lab:react:hostile:install
npm run lab:react:hostile:validate
npm run lab:react:hostile
```

The hostile-lab guard intentionally fails if business code starts importing Runtime Intelligence, adding Runtime Intelligence hooks/HOCs/profilers, adding React `Profiler`, or supplying provenance manually.

## Reports

The canonical panel supports local JSON and HTML export using `runtime-intelligence-report/1`; export remains user-triggered/local unless the consuming application explicitly adds transport.

## More detail

Start with [`docs/NEW-PROJECT-INTEGRATION-GUIDE.md`](docs/NEW-PROJECT-INTEGRATION-GUIDE.md) and [`docs/P0-SOURCE-PINPOINT-PROVENANCE.md`](docs/P0-SOURCE-PINPOINT-PROVENANCE.md). Historical/productization detail is in [`docs/R7-VUE-ADAPTER-FAULT-LAB.md`](docs/R7-VUE-ADAPTER-FAULT-LAB.md), [`docs/R6.3-DEVELOPER-ONBOARDING.md`](docs/R6.3-DEVELOPER-ONBOARDING.md), [`docs/R6.4-PUBLIC-API-EXTENSION-CONTRACT.md`](docs/R6.4-PUBLIC-API-EXTENSION-CONTRACT.md), and [`docs/R6.5-DISTRIBUTION-LICENSE-IP.md`](docs/R6.5-DISTRIBUTION-LICENSE-IP.md). Current product status is tracked in [`docs/STATUS.md`](docs/STATUS.md).
