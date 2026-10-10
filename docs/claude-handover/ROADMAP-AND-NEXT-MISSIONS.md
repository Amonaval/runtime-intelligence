# Runtime Intelligence — Roadmap and Next Missions

Last updated: 2026-10-10

## Strategic direction

Runtime Intelligence is one reusable product with a framework-neutral core. Lit and React are consumers of the same evidence protocol, analyzers, root-cause engine, verification flow, and presentation contracts. TrustWeave is the first large React/Next.js dogfood consumer; it must not own a divergent copy of the toolkit.

Target package boundary:

```
runtime-intelligence
├── @runtime-intelligence/core
├── @runtime-intelligence/react
├── @runtime-intelligence/lit
└── @runtime-intelligence/panel   (optional UI)
```

TrustWeave target consumption: `core + react + panel` in development only.

## Current state

- UREP core, evidence store/graph, root-cause grouping, recorder, capsule, privacy and source resolution: complete.
- Lit adapter + LitIntelligencePipeline: active.
- ReactAdapter v2.1: active at the framework adapter boundary.
- Mission 10A–10F developer-pain series: complete on canonical main, including the later Mission 10F evidence-semantics hardening.
- Mission 11 runtime intelligence: synced from the user-provided ZIP into canonical main.
  - BackgroundSessionStore
  - FalcorCallGraph
  - SequentialApiDetector
  - network call-site stack capture
  - session/background report plumbing
- Mission 12 Opportunities advisor series: synced from the ZIP into canonical main.
  - DOM duplication
  - virtualization
  - paint
  - worker opportunity
  - idle scheduling
  - dedicated Opportunities presentation surface
- Focused Mission 11 + 12 ZIP validation: 44/44 tests passing before reconciliation.

## Immediate next mission — Package Boundary + React Dogfood

### Goal

Make `Amonaval/runtime-intelligence` the only implementation source used by TrustWeave and future apps.

### Work

1. Establish package/build boundaries for:
   - `@runtime-intelligence/core`
   - `@runtime-intelligence/react`
   - `@runtime-intelligence/lit`
   - `@runtime-intelligence/panel`
2. Keep core free of React/Lit imports.
3. Build a `ReactIntelligencePipeline` that composes the existing ReactAdapter with the same generic evidence store, graph/root-cause engine, recorder, advisors and verification model.
4. Make the panel consume framework-neutral presentation data; framework-specific detail may be added through adapters/plugins.
5. Replace TrustWeave's transitional vendored toolkit with the canonical package/product boundary.
6. Keep TrustWeave integration hard-disabled outside development builds.

### Validation target

In TrustWeave development mode, prove that the canonical product can capture and surface at least:
- React profiler render timing
- component owner lifecycle
- effect/resource lifecycle where explicitly instrumented
- network/runtime evidence available to the generic core
- update-budget/opportunity signals applicable to React
- one trustworthy root-cause/intelligence finding

Then compare usefulness against the existing TrustWeave vendored toolkit and remove the latter once the canonical path is at least feature-equivalent for the scenarios we use.

## Package/publication sequence

1. TrustWeave dogfood from canonical repo boundary.
2. Harden package exports/build/minification/types.
3. Publish private/beta package or internal registry artifact.
4. Broader npm distribution only after real React + Lit validation.

Browser-delivered JavaScript cannot be made truly untraceable. Distribution hardening should publish `dist` only, omit source maps/source/tests/internal docs, minify/mangle production artifacts, and keep any future proprietary recommendation/brainwork server-side when that backend is introduced.

## Architectural invariants

1. Generic intelligence lives in `Amonaval/runtime-intelligence`, never in a consumer app.
2. Consumer-specific plugins may live in the consumer only when they translate proprietary app concepts into the generic evidence protocol; generic functionality must move upstream.
3. Evidence strength must remain honest: observation < correlation < attribution < lifetime-violation < retainer-confirmed < causality-confirmed.
4. Core has zero framework imports.
5. React/Lit adapters emit UREP rather than teaching core framework-specific lifecycle semantics.
6. Presentation is optional and replaceable; analyzers must not depend on the panel.
7. TrustWeave runtime instrumentation is development-only.
8. Expensive collectors can be optimized later with sampling/overhead budgets; correctness and real-world usefulness are the current dogfood priority.

## Deferred

- Backend recommendation/brainwork service: after frontend evidence quality is proven.
- Vue/Angular adapters: after React path is proven.
- Heavy obfuscation: not a security boundary and not worth the debugging/compatibility cost now.
- Production TrustWeave instrumentation: explicitly out of scope.
