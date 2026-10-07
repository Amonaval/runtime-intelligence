# lit-debug-suite

Runtime diagnostics and Runtime Intelligence for Lit applications, with UI Platform/Syndigo integration.

## Package

The npm package lives in this `lit/` directory and is published/linked as:

```text
lit-debug-suite
```

Main exports:

```js
import { LitDebugMixin } from 'lit-debug-suite';
import 'lit-debug-suite/panel';
import 'lit-debug-suite/custom/ui-platform';
```

## Local development with npm link

From this repository:

```bash
cd runtime-intelligence/lit
npm install
npm run build
npm link
```

Then from `ui-platform`:

```bash
npm link lit-debug-suite
npm ls lit-debug-suite
```

`npm ls lit-debug-suite` should resolve to this local `runtime-intelligence/lit` package.

If another local copy is already linked, unlink it first from the consumer:

```bash
cd ui-platform
npm unlink lit-debug-suite
```

Then link this package again:

```bash
npm link lit-debug-suite
```

If needed, remove the old global link from the old toolkit folder:

```bash
cd <old-toolkit>/lit
npm unlink -g lit-debug-suite
```

Then create the global link from this repo again:

```bash
cd <runtime-intelligence>/lit
npm link
```

## UI Platform integration

### 1. Common Lit base / RufElement

The recommended integration point is the shared Lit base class, not every component.

```js
import { LitElement } from 'lit';
import { LitDebugMixin } from 'lit-debug-suite';

export class RufElement extends LitDebugMixin(LitElement) {
    // existing RufElement behavior
}
```

Existing components continue to extend `RufElement` normally:

```js
class ProductEditor extends RufElement {
    // component code remains unchanged
}
```

Do not manually call `LitAdapter`, `EvidenceStore`, or `LitIntelligencePipeline` from each component. `LitDebugMixin` owns that integration.

### 2. UI Platform plugin bundle

Import once from application/bootstrap code:

```js
import 'lit-debug-suite/custom/ui-platform';
```

This keeps the mature UI Platform integration:

- Falcor request decoding
- DataObjectManager slow API instrumentation
- ACI helpers
- legacy `__RUF_*` to `__LDS_*` compatibility aliases

### 3. Debug panel

Import once:

```js
import 'lit-debug-suite/panel';
```

The module registers:

```html
<lds-debug-panel></lds-debug-panel>
```

The restored canonical LDS panel remains the product surface. Runtime Intelligence augments this panel instead of creating a second diagnostics UI.

## Enable diagnostics

Enable all diagnostics for a local debugging session before application/component initialization:

```js
window.__LDS_DEBUG__ = true;
```

Selective example:

```js
window.__LDS_DEBUG__ = {
    intelligence: true,
    perf: true,
    network: true,
};
```

Runtime Intelligence only:

```js
window.__LDS_INTELLIGENCE_ENABLED__ = true;
```

The recorder, incident analysis, and panel intelligence presentation are opt-in. Lightweight Lit lifecycle evidence remains handled through `LitDebugMixin`/`LitAdapter`.

## Useful browser checks

Evidence stream:

```js
window.__LDS_EVIDENCE__?.()
```

Runtime Intelligence pipeline:

```js
window.__LDS_INTELLIGENCE_PIPELINE__
```

Latest analyzed incident:

```js
window.__LDS_INTELLIGENCE__
```

Network collector:

```js
window.__LDS_NETWORK_LOG__
```

## Baseline -> upgraded version

The integration contract intentionally remains close to the advanced baseline toolkit:

```text
UI Platform components
        ↓
RufElement
        ↓
LitDebugMixin
        ↓
legacy collectors + LitAdapter
        ↓
UREP EvidenceStore
        ↓
EvidenceGraph / RootCause / Incident Recorder / Evidence Capsule
        ↓
existing LDS Debug Panel
```

What should not change in UI Platform:

- hundreds of Lit components should not be edited
- existing components keep extending `RufElement`
- the existing LDS panel remains the UI
- the UI Platform-specific plugin remains a one-time bootstrap import
- npm-link development continues to use `lit-debug-suite`

What is new internally:

- framework-neutral UREP evidence
- Lit lifecycle evidence through `LitAdapter`
- incident flight recording
- root-cause grouping
- Evidence Capsules
- slow-update incident analysis
- network evidence bridging
- enterprise privacy boundaries
- panel replay verification handoff

## Recommended UI Platform smoke test

After linking this upgraded package:

1. Start UI Platform normally.
2. Enable `window.__LDS_DEBUG__ = true` before the app initializes.
3. Open a screen containing several `RufElement` descendants.
4. Confirm existing panel tabs/data still work.
5. Check `window.__LDS_EVIDENCE__()` returns lifecycle/runtime evidence.
6. Check `window.__LDS_INTELLIGENCE_PIPELINE__` exists.
7. Exercise a normal property/update path.
8. Trigger or observe a runtime error or qualifying slow Lit update.
9. Check `window.__LDS_INTELLIGENCE__` contains the incident/root-cause/capsule model.
10. Confirm Falcor/network diagnostics still work.

## Important architecture rule

UI Platform should consume the integration surface, not assemble Runtime Intelligence internals itself.

Prefer:

```text
UI Platform -> RufElement -> lit-debug-suite
```

Avoid adding Runtime Intelligence plumbing directly to business components.

## Validation note

The repository connector can verify source and package contracts but cannot execute the actual UI Platform browser/runtime. The UI Platform smoke test above remains the final real-environment validation checkpoint for Mission 09.5.
