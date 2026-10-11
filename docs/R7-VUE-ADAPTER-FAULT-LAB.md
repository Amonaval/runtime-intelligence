# R7 — Vue Adapter + Vue Fault Lab

Status: **COMPLETE IN SOURCE**

## Product increment

R7 makes Vue 3 a first-class framework evidence producer without creating a Vue-specific intelligence stack.

```text
Vue app
  -> VueAdapter
  -> UREP / EvidenceStore
  -> existing EvidenceGraph + RootCauseGrouper
  -> existing RuntimeIntelligencePipeline + advisers
  -> existing Opportunities/report model
  -> same canonical LdsDebugPanel
```

## Capability contract

| Capability | Vue support | Meaning |
| --- | --- | --- |
| owner lifecycle | framework-reported | application mixin observes mount/unmount lifecycle |
| update lifecycle | framework-reported | `beforeUpdate` and `updated` hooks |
| update cause | unsupported | Vue hook timing does not prove the mutation/dependency that caused the update |
| state change | unsupported | R7 does not instrument arbitrary Vue reactivity |
| render timing | partial | wall-clock lifecycle window, not render-only profiler timing |
| source location | partial | explicit source or Vue SFC `__file` metadata when available |
| reactive dependency | unsupported | no dependency edge is inferred from timing |
| resource ownership | partial | explicit `recordResourceAcquired/Released` only |
| effect lifecycle | unsupported | not generalized from Vue composables in R7 |

## Integration

`runtime-intelligence/vue` exports:

- `VueAdapter`
- `vueAdapter`
- `VueIntelligenceRuntime`
- `createVueIntelligenceRuntime`
- `installVueRuntimeIntelligence`

`installVueRuntimeIntelligence(app, { enabled })` is default-safe: only literal `true` installs hooks or constructs a runtime. Install it before `app.mount()`.

The installer uses one application-wide mixin for component lifecycle evidence and wraps `app.config.errorHandler` while preserving/restoring any prior handler. Vue mixins cannot be physically removed after registration, so `stop()` makes the installed callbacks inert and stops the runtime.

## Evidence honesty

R7 deliberately does **not**:

- emit `component.update.requested` from guessed reactive triggers;
- emit `state.changed` for arbitrary Vue refs/reactive objects;
- emit `dependency.triggered`;
- populate `causedByEventId` for Vue updates;
- claim `beforeUpdate` → `updated` duration is render-only time;
- promote error capture to causality;
- infer resource lifetime violations without explicit acquisition ownership.

## Fault Lab

`examples/vue-fault-lab` is synthetic and isolated from real consumers. It exercises:

- expensive update timing;
- controlled component error;
- repeated updates;
- explicit resource cleanup and intentional leak;
- interaction/network correlation using a local Vite endpoint;
- the canonical panel.

No synthetic Fault Lab evidence is imported into TrustWeave or any normal consumer path.

## Package/API impact

R7 is an additive pre-1.0 package change:

- package version: `0.1.1`;
- API contract version remains `0.1`;
- checked public API baseline becomes `r7/1`;
- new public subpath: `runtime-intelligence/vue`;
- Vue is an optional peer dependency;
- `/loader` dynamically imports Vue only after explicit enablement.

## Validation performed in the implementation session

- current `main` and R6 docs/source inspected before implementation;
- new Vue JavaScript files syntax-checked;
- isolated behavioral harness: **11 passed, 0 failed**.

The implementation session did **not** claim full `npm run validate:release`, packed-tarball onboarding, browser Fault Lab execution, or real consumer Vue dogfood. Run those from a normal checkout before treating R7 as release-validated.
