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
        -> normalized runtime-intelligence-report/1 JSON + HTML
```

The governing rule remains evidence honesty: observation, correlation, attribution, lifetime violation and confirmed causality must never be conflated.

## React parity work completed

- R5.2 — Canonical Panel Unification: React mounts the existing mature panel through a thin UREP compatibility bridge; no second React dashboard.
- R5.3 — Shared Runtime Surface Parity: existing Network, Vitals, Console, errors, interaction capture and generic advisers are reused in React.
- R5.4 — React Component & Ownership Intelligence: owner hierarchy plus opt-in tracked state/effect/resource evidence feeds mature Perf/Memory/Pinpoint workflows.
- R5.5 — React Correlation + Intelligence: shared interaction context, EvidenceGraph, RootCauseGrouper, incident recorder, navigation/network correlation and Intelligence tab/evidence capsule.
- R5.6 — TrustWeave React Parity Closure: root-profiler de-duplication option, low-friction HOC boundaries, budget-monitor integration, package/test hardening and explicit parity matrix.
- R5.7 — React Fault Lab: isolated deterministic validation harness for React/browser capabilities.
- R5.7.1 — React presentation/export hardening: framework-aware recommendations, graceful unknown attribution and normalized JSON/HTML report export including diagnostics/opportunities/Intelligence/evidence capsule.
- R5.7.2 — Expanded one-pass Fault Lab: broader behavioral fault coverage, rare-signal injection, one-button run-all flow and report export.

## Product/packaging boundary

`LdsDebugPanel` remains the canonical mature product UI and is implemented with Lit. The root package therefore carries `lit` as an internal dependency for the panel. React remains an optional peer for the React adapter/runtime. React consumers do not maintain a second panel implementation.

Fault-lab fixtures live under `examples/` and remain outside the published package allowlist.

## Practical parity expectation

React now targets roughly 80–90% of Lit's practical product value. The remaining gap is primarily native framework semantics: arbitrary Lit reactive-property watching/dependency cascades do not have a defensible automatic React equivalent without explicit instrumentation. Runtime Intelligence exposes opt-in tracked state/effect/resource hooks rather than guessing.

## Evidence safeguards retained

- React `UPDATE_CAUSE` remains unsupported unless stronger explicit evidence exists.
- React `REACTIVE_DEPENDENCY` remains unsupported.
- Interaction proximity produces temporal correlation context only.
- Nested owner hierarchy is structural, not causal.
- Profiler timing is framework-reported observation.
- Network→state matching is correlation and never sets `causedByEventId`.
- Fault Lab synthetic evidence is explicitly labeled and never represents a consumer defect.

## Framework adoption

See `docs/FRAMEWORK-ADOPTION-LADDER.md`.

The intended pattern for React, Lit, future Vue/Angular and other adapters is:

```text
small root/plugin integration
        + optional strategic framework instrumentation
        -> same UREP evidence model
        -> same shared intelligence
        -> same mature panel
        -> same normalized report schema
```

## Validation

Unit/regression coverage exists for canonical panel bridging, shared browser runtime capture, React ownership/resource mapping, interaction-context correlation, cross-surface adviser contracts and normalized report presentation. Real browser execution remains the final checkpoint; the React Fault Lab now makes that checkpoint repeatable with one-pass JSON/HTML artifacts.
