# Runtime Intelligence

Framework-neutral runtime diagnostics for React and Lit, backed by one Universal Runtime Evidence Protocol (UREP), shared intelligence pipeline, and one canonical developer panel.

> Current distribution status: **private productization baseline**. The package contract is stable enough for local/Git/tarball evaluation, but public registry publishing and final licensing/distribution strategy are intentionally deferred to R6.5.

## 5-minute start

### 1. Install

For development from this repository:

```bash
npm install
npm run package:validate
npm run onboarding:validate
```

For a consumer app, the reproducible pre-registry path is a local tarball:

```bash
# in runtime-intelligence
npm pack --ignore-scripts

# in the consumer app
npm install /absolute/path/to/runtime-intelligence-0.1.0.tgz
```

Git-SHA installation remains supported for existing dogfood consumers, but tarball installation is the recommended R6.3 reproduction path because it validates the exact packed artifact rather than repository internals.

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

The R6 public API baseline is version `0.1`. `npm run api:validate` freezes the supported package subpaths and named exports.

- pre-1.0 breaking supported-API changes require a new minor line;
- after 1.0, breaking changes require a major version;
- UREP and extension compatibility are same-major;
- deep imports and `window.__LDS_*` globals are unsupported.

## Validation

```bash
npm run package:validate
npm run api:validate
npm run production:validate
npm run onboarding:validate
npm test
```

`onboarding:validate` validates the packed artifact consumers actually receive, including `/extension`.

## Reports

The canonical panel supports local JSON and HTML export using `runtime-intelligence-report/1`; export remains user-triggered/local unless the consuming application adds transport.

## More detail

See [`docs/R6.3-DEVELOPER-ONBOARDING.md`](docs/R6.3-DEVELOPER-ONBOARDING.md) for onboarding and [`docs/R6.4-PUBLIC-API-EXTENSION-CONTRACT.md`](docs/R6.4-PUBLIC-API-EXTENSION-CONTRACT.md) for API/extension rules. Current product status is tracked in [`docs/STATUS.md`](docs/STATUS.md).
