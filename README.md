# Runtime Intelligence

Framework-neutral runtime diagnostics for React, Lit and Vue, backed by one Universal Runtime Evidence Protocol (UREP), shared intelligence pipeline, and one canonical developer panel.

> Current distribution status: **private/proprietary**. The package is intentionally `private: true` and `UNLICENSED`. Authorized evaluation/distribution is through private Git access or explicitly shared tarballs. Public registry publication is not part of the current baseline.

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
npm install /absolute/path/to/runtime-intelligence-0.1.1.tgz
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
root.render(<RuntimeIntelligenceProvider runtime={runtime}><App /></RuntimeIntelligenceProvider>);
// panel.destroy(); runtime.stop(); // HMR/tests
```

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
    version: '3.x',
  });
  panel = diagnostics.panelModule.mountRuntimeIntelligencePanel({
    store: runtimeIntelligence.store,
  });
}

app.mount('#app');
// panel?.destroy(); runtimeIntelligence?.stop(); // HMR/tests
```

Vue `beforeUpdate` → `updated` timing is recorded as an observed lifecycle window. Runtime Intelligence does not claim that Vue exposed the reactive dependency or update cause unless stronger evidence is added in the future.

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

Focused Vue validation is also represented by the unit tests under `lit/test/unit/vue-*.test.mjs`. The synthetic browser surface lives under `examples/vue-fault-lab`.

## Reports

The canonical panel supports local JSON and HTML export using `runtime-intelligence-report/1`; export remains user-triggered/local unless the consuming application explicitly adds transport.

## More detail

See [`docs/R7-VUE-ADAPTER-FAULT-LAB.md`](docs/R7-VUE-ADAPTER-FAULT-LAB.md), [`docs/R6.3-DEVELOPER-ONBOARDING.md`](docs/R6.3-DEVELOPER-ONBOARDING.md), [`docs/R6.4-PUBLIC-API-EXTENSION-CONTRACT.md`](docs/R6.4-PUBLIC-API-EXTENSION-CONTRACT.md), and [`docs/R6.5-DISTRIBUTION-LICENSE-IP.md`](docs/R6.5-DISTRIBUTION-LICENSE-IP.md). Current product status is tracked in [`docs/STATUS.md`](docs/STATUS.md).
