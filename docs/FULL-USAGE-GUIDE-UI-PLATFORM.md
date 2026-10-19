# Runtime Intelligence — UI Platform / RufElement Full Usage Guide

This guide is the canonical setup for using the private `runtime-intelligence` package inside Syndigo UI Platform. It covers local linking, the shared `RufElement` mixin, the UI-platform compatibility plugin, full-tool activation, panel mounting, Falcor/Slow API validation, exports, and troubleshooting.

## 1. Link the current toolkit locally

Always link from the **repository root**, because the package name and exports live in the root `package.json`.

```bash
cd <path>/runtime-intelligence
npm install
npm link

cd <path>/ui-platform
npm unlink runtime-intelligence
npm link runtime-intelligence
npm ls runtime-intelligence
```

`npm ls runtime-intelligence` should resolve to your local `runtime-intelligence` repository.

Do not link from `runtime-intelligence/lit`; that directory is the historical inner package and is not the current consumer package boundary.

## 2. Enable Runtime Intelligence before UI Platform components connect

For a full local performance investigation, set the master gate before the application/component tree starts:

```js
window.__LDS_DEBUG__ = true;
```

The master gate enables the Runtime Intelligence tool set, including intelligence, memory, error boundary, performance, property audit, inspector, event tracing, slow API, console capture, vitals, network, cycle detection, resource tracking, workflow baseline, Falcor view, and background monitoring.

For normal product builds, leave Runtime Intelligence disabled. The supported production-safe default is OFF.

## 3. Wire the shared RufElement once

Do not instrument individual components. UI Platform already routes Lit components through `RufElement`, so instrument the shared base/mixin once.

```js
import { LitDebugMixin } from 'runtime-intelligence/lit';
import {
  attachToElement as _ldsAttachAci,
} from 'runtime-intelligence/custom/ui-platform';

var RufElement = superclass => class extends LitDebugMixin(
  MixinManager(superclass).with(aci.uiInit)
) {
  connectedCallback() {
    super.connectedCallback?.();
    _ldsAttachAci(this);
  }

  // existing RufElement implementation continues here
};
```

The ordering matters. This is correct:

```js
LitDebugMixin(MixinManager(superclass).with(aci.uiInit))
```

This is incorrect because `MixinManager(superclass)` is a builder, not a class:

```js
LitDebugMixin(MixinManager(superclass)).with(aci.uiInit)
```

Once `RufElement` is wired, existing components such as:

```js
class RockAttributeList extends MixinManager(LitElement).with(
  RufElement,
  ComponentContextBase,
) {}
```

need no Runtime Intelligence-specific changes.

## 4. Why `runtime-intelligence/custom/ui-platform` is required

Generic Runtime Intelligence can observe Lit lifecycle, browser network activity, performance, memory, errors, DOM opportunities, and evidence. UI Platform has additional product-specific semantics that a generic library cannot safely infer.

Importing:

```js
import 'runtime-intelligence/custom/ui-platform';
```

or importing `attachToElement` from that subpath activates the module and therefore:

1. Registers the UI Platform Falcor decoder with `LdsNetwork`.
2. Installs the DataObjectManager Slow API integration.
3. Exposes ACI tracing helpers.
4. Installs legacy `__RUF_*` compatibility aliases where applicable.

This compatibility code is deliberately isolated from generic Lit/React entrypoints.

## 5. DataObjectManager requirement for Slow API

The UI-platform plugin looks for:

```js
window.__dataObjectManager__
```

and wraps these methods when they exist:

```text
get
post
rest
initiateRequest
```

If Slow API stays empty, first verify:

```js
window.__dataObjectManager__
```

Then lower the threshold temporarily if needed:

```js
window.__LDS_SLOW_API_MS__ = 300;
```

The default Slow API threshold is 2000 ms, so a healthy page can legitimately show no entries.

Inspect directly:

```js
window.__LDS_SLOW_API_LOG__
window.__LDS_SLOW_API_REPORT__?.()
```

## 6. Falcor capture and validation

Falcor has two layers:

```text
Browser fetch/XHR
   -> LdsNetwork
   -> UI Platform Falcor decoder
   -> entry.decoded.protocol = "falcor"
   -> FalcorCallGraph
   -> panel Falcor view
```

`window.__LDS_FALCOR_VIEW__` is only a legacy enable flag. It is not the captured data.

Useful checks:

```js
window.__LDS_NETWORK_LOG__?.length
```

```js
window.__LDS_NETWORK_LOG__?.map(entry => ({
  url: entry.url,
  durationMs: entry.durationMs,
  decoded: entry.decoded,
}))
```

```js
window.__LDS_NETWORK_LOG__?.filter(
  entry => entry.decoded?.protocol === 'falcor'
)
```

```js
window.__LDS_FALCOR_CALL_GRAPH__?.getBursts?.()
```

A Falcor burst requires multiple decoded Falcor calls close together; a single call can be decoded correctly without producing a burst.

## 7. Mount the canonical panel in the app shell/main app

Prefer one page-level canonical panel rather than placing a panel in every component.

```js
import { evidenceStore } from 'runtime-intelligence/core';
import { mountRuntimeIntelligencePanel } from 'runtime-intelligence/panel';

let runtimePanel;

function mountDiagnosticsPanel() {
  if (runtimePanel || !document.body) return runtimePanel;

  runtimePanel = mountRuntimeIntelligencePanel({
    store: evidenceStore,
    collapsed: true,
  });

  return runtimePanel;
}
```

Call it once from the application bootstrap or main-app lifecycle after `document.body` exists.

To open it programmatically:

```js
runtimePanel?.setCollapsed(false);
```

To refresh:

```js
runtimePanel?.refresh();
```

To export:

```js
runtimePanel?.downloadJson();
runtimePanel?.downloadHtml();
runtimePanel?.downloadBoth();
```

To remove it:

```js
runtimePanel?.destroy();
runtimePanel = null;
```

## 8. Recommended performance-investigation workflow

Use one reproducible scenario rather than browsing randomly.

1. Start the app with `window.__LDS_DEBUG__ = true` before components connect.
2. Confirm the local package link.
3. Open the canonical panel.
4. Clear/reload before the scenario when possible.
5. Navigate to the known slow entity/page.
6. Perform the exact user action once.
7. Inspect Intelligence/Pinpoint, Perf, Memory, Network, Falcor, Slow API, Vitals, opportunities and resource findings.
8. Export JSON + HTML immediately after the scenario.
9. Compare after a fix using the same workflow.

## 9. Useful runtime checks

```js
window.__LDS_DEBUG__
window.__LDS_NETWORK_LOG__
window.__LDS_SLOW_API_LOG__
window.__LDS_PERF__
window.__LDS_MEMORY__
window.__LDS_ERRORS__
window.__LDS_VITALS__
window.__LDS_INTELLIGENCE__
window.__LDS_FALCOR_CALL_GRAPH__?.getBursts?.()
window.__LDS_INTELLIGENCE_PIPELINE__?.exportCapsule?.()
```

These globals are compatibility/debug surfaces; application code should prefer package APIs.

## 10. Troubleshooting

### Cannot resolve `runtime-intelligence`

Use exported subpaths. There is intentionally no root `runtime-intelligence/` barrel.

```js
import { LitDebugMixin } from 'runtime-intelligence/lit';
```

### Cannot resolve `runtime-intelligence/custom/ui-platform`

Pull a version containing the UI-platform package export, re-run `npm install`, then recreate the root `npm link`.

### `Class extends value #<MixinBuilder>`

The mixin order is wrong. Use:

```js
LitDebugMixin(MixinManager(superclass).with(aci.uiInit))
```

### Network works but Falcor is empty

Inspect `entry.decoded`. Falcor view requires `decoded.protocol === 'falcor'`. Confirm the UI-platform compatibility module is imported before the requests are made.

### Slow API is empty

Confirm `window.__dataObjectManager__` exists, the compatibility module loaded, and the request duration exceeds `window.__LDS_SLOW_API_MS__` (2000 ms by default).

### Perf/memory work but network is empty

Runtime Intelligence probably started after the requests. Enable it before app bootstrap and reproduce the navigation/request again.

## 11. Turn it off

Do not leave the local full-debug gate enabled in production code. Remove the temporary bootstrap flag or set the programmatic configuration to disabled.

The product contract is default-off; diagnostics should be explicitly activated for a debugging session.
