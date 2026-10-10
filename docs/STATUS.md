# Runtime Intelligence — Current Status

**Updated:** 2026-10-11  
**Canonical status:** this file is the single current-state summary. Historical mission/handover files are context, not competing status sources.

## Current product state

Runtime Intelligence is one mature developer product with framework adapters, not separate Lit and React products.

```text
LitAdapter / ReactAdapter / browser collectors
        -> Universal Runtime Evidence Protocol (UREP)
        -> shared evidence store
        -> incident recorder + EvidenceGraph + RootCauseGrouper
        -> shared developer intelligence / evidence capsule
        -> one mature LdsDebugPanel (including ✨ Intelligence)
```

The governing rule remains evidence honesty: observation, correlation, attribution, lifetime violation and confirmed causality must never be conflated.

## React parity work completed

- R5.2 — Canonical Panel Unification: React mounts the existing mature panel through a thin UREP compatibility bridge; no second React dashboard.
- R5.3 — Shared Runtime Surface Parity: existing Network, Vitals, Console, errors, interaction capture and generic advisers are reused in React.
- R5.4 — React Component & Ownership Intelligence: owner hierarchy plus opt-in tracked state/effect/resource evidence feeds mature Perf/Memory/Pinpoint workflows.
- R5.5 — React Correlation + Intelligence: shared interaction context, EvidenceGraph, RootCauseGrouper, incident recorder, navigation/network correlation and Intelligence tab/evidence capsule.
- R5.6 — TrustWeave React Parity Closure: root-profiler de-duplication option, low-friction HOC boundaries, budget-monitor integration, package/test hardening and explicit parity matrix.

## Product/packaging boundary

`LdsDebugPanel` remains the canonical mature product UI and is implemented with Lit. The root package therefore carries `lit` as an internal dependency for the panel. React remains an optional peer for the React adapter/runtime. React consumers do not maintain a second panel implementation.

## Practical parity expectation

React now targets roughly 80–90% of Lit's practical product value. The remaining gap is primarily native framework semantics: arbitrary Lit reactive-property watching/dependency cascades do not have a defensible automatic React equivalent without explicit instrumentation. Runtime Intelligence exposes opt-in tracked state/effect/resource hooks rather than guessing.

## Evidence safeguards retained

- React `UPDATE_CAUSE` remains unsupported unless stronger explicit evidence exists.
- React `REACTIVE_DEPENDENCY` remains unsupported.
- Interaction proximity produces temporal correlation context only.
- Nested owner hierarchy is structural, not causal.
- Profiler timing is framework-reported observation.
- Network→state matching is correlation and never sets `causedByEventId`.

## Validation

Unit/regression coverage exists for canonical panel bridging, shared browser runtime capture, React ownership/resource mapping, interaction-context correlation and parity architecture. Real TrustWeave browser testing remains the final product-level checkpoint.
