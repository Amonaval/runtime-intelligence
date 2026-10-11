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

Keep only the tiny default-off loader in always-loaded code:

```js
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';

const diagnostics = await loadRuntimeIntelligence({
  enabled: import.meta.env.DEV && localStorage.getItem('runtime-intelligence') === 'on',
  framework: 'react',
  panel: true,
});
```

Only literal `true` activates loading. When disabled, React/runtime/panel modules are not imported through this boundary.

When enabled:

```js
const { createReactIntelligenceRuntime, RuntimeIntelligenceProvider } = diagnostics.frameworkModule;
const { mountRuntimeIntelligencePanel } = diagnostics.panelModule;

const runtime = createReactIntelligenceRuntime({ profilingEnabled: true });
const panel = mountRuntimeIntelligencePanel({ store: runtime.store });

root.render(
  <RuntimeIntelligenceProvider runtime={runtime}>
    <App />
  </RuntimeIntelligenceProvider>,
);

// optional teardown for HMR/tests
// panel.destroy();
// runtime.stop();
```

### 3. Lit bootstrap

For strict production bundle isolation, load Runtime Intelligence before defining instrumented custom elements:

```js
import { LitElement } from 'lit';
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';

const diagnostics = await loadRuntimeIntelligence({
  enabled: import.meta.env.DEV && localStorage.getItem('runtime-intelligence') === 'on',
  framework: 'lit',
  panel: false,
});

const RuntimeBase = diagnostics.enabled
  ? diagnostics.frameworkModule.LitDebugMixin(LitElement)
  : LitElement;

customElements.define('my-app', class extends RuntimeBase {
  // normal Lit component
});
```

If an app prefers a static `LitDebugMixin` import for simpler wiring, R6.2 still gates runtime work while disabled, but that code remains part of the application bundle. Use `/loader` when bundle isolation matters.

## Enablement rules

Recommended production rule: diagnostics are **off by default** and require both a non-production/developer condition and an explicit local/user opt-in.

Good:

```js
const enabled = import.meta.env.DEV && debugToggle === true;
```

Avoid enabling from an untrusted query string or remote value without an application-owned authorization gate.

Runtime Intelligence does not upload telemetry or make network requests on initialization. Its network collector observes host traffic only.

## Public package surfaces

```text
runtime-intelligence/loader   production-safe conditional loader
runtime-intelligence/core     UREP/shared core
runtime-intelligence/react    React adapter/provider/runtime
runtime-intelligence/lit      Lit adapter/mixin/runtime integration
runtime-intelligence/panel    canonical panel mount/report APIs
runtime-intelligence/panel/lit direct mature Lit panel element
```

## Validation

```bash
npm run package:validate
npm run production:validate
npm run onboarding:validate
npm test
```

`onboarding:validate` packs the current package, installs that tarball into a temporary consumer project with React/Lit, and smoke-imports the documented public entry points. It validates the artifact consumers actually receive rather than relying only on source-tree imports.

## Reports

The canonical panel supports local JSON and HTML export. Reports use the normalized `runtime-intelligence-report/1` model and remain user-triggered/local unless a consuming application explicitly adds its own transport.

## More detail

See [`docs/R6.3-DEVELOPER-ONBOARDING.md`](docs/R6.3-DEVELOPER-ONBOARDING.md) for React/Lit recipes, troubleshooting, installation modes, report workflow, and release checks. Current product status is tracked in [`docs/STATUS.md`](docs/STATUS.md).
