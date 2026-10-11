# Runtime Intelligence — Current Status

**Updated:** 2026-10-12
**Canonical status:** this file is the single current-state summary. Historical mission/handover files are context, not competing status sources.

## Canonical baseline

Current `main` includes validated React R5.7.4, R6 productization, completed Vue R7, and the active P0 Source Pinpoint / Provenance program.

- Validated React R5.7.4 baseline: `0908f7c8d90d81745db788913a17e6292d2147a0`
- Accepted source-resolver hardening: `b558e3a08c5f2aea18861a7ea1e1f1e62ad89ec1`
- R6.1–R6.5 productization: complete
- R7 Vue Adapter + Vue Fault Lab: complete
- P0.1 Universal runtime invocation provenance: complete in source and pinned to TrustWeave
- P0.2 Exact React source attribution: complete in source and pinned to TrustWeave
- P0.3A/B Hostile benchmark + browser acceptance: complete; source limitations recorded
- P0.4 Zero-touch console source attribution: browser/lifecycle/JSON+HTML acceptance complete
- Overall P0 real-consumer closure: pending post-P0.4 TrustWeave normal-flow acceptance
- Angular/framework expansion: **BLOCKED/DEFERRED until P0 value-proposition closure**

## Product direction

Runtime Intelligence is one developer product with shared UREP, intelligence and one canonical panel. Framework adapters remain evidence producers only.

```text
runtime/browser/framework evidence
        -> source provenance
        -> UREP EvidenceStore
        -> EvidenceGraph / root-cause / shared advisers
        -> normalized findings + Opportunities
        -> canonical mature panel
        -> JSON / HTML
```

The governing rule remains evidence honesty: observation, correlation, attribution, lifetime violation and confirmed causality must never be conflated.

## React parity — CLOSED; source precision — ACTIVE

R5.2–R5.7.4 parity remains closed. React work is now driven by the P0 source-precision/value defect exposed by real dogfood and the zero-touch hostile benchmark.

## R6 — COMPLETE

Package contract, production safety, onboarding, public API/extension stability and private/proprietary distribution are complete.

## R7 — Vue — COMPLETE

Vue remains a thin UREP evidence producer reusing shared browser collection, intelligence, Opportunities/reporting and the canonical panel.

## P0 — Source Pinpoint / Provenance — ACTIVE

### P0.1 — DONE

- network invocation stacks no longer disappear at the UREP boundary;
- browser errors/rejections derive bounded application-only source where possible;
- sequential API findings retain common caller provenance;
- Opportunities and Pinpoint surface source provenance explicitly;
- internal-only stacks remain unattributed rather than generating fake precision.

P0.1 runtime baseline: `a465a67bc7378bba9b605f39bb41c1efb3b8b3bc`.

### P0.2 — DONE / DOGFOOD PINNED

- React HOC/boundary registration can refine filename-only source to exact line/column from the consumer registration stack;
- tracked React state updates capture the actual application invocation call site;
- runtime effect/resource hooks capture registration source;
- effect errors capture application error origin when provable;
- Profiler observations inherit known component-boundary source but remain framework-reported observations;
- derived update-budget diagnostics retain provenance;
- resource-lifetime findings preserve the resource registration source rather than owner teardown source;
- Pinpoint uses issue-specific evidence selection.

P0.2 runtime baseline: `4ed24b2f5278cba75b25c9c61c25155ff69ec3c8`.
TrustWeave P0.2 consumer pin: `1f41cc62261147fc0df756df53dabc435570d425` on `runtime-observability-trustweave`.

Focused P0.2 behavioral validation during implementation: **16 passed, 0 failed**. Final changed/new JS syntax checks passed.

### P0.3A — IMPLEMENTED IN SOURCE

A second React validation project now targets the adoption case the original React Fault Lab cannot prove:

- `examples/react-uninstrumented-lab` contains multiple realistic faulty React components;
- all business code under `src/app/**` is forbidden from importing Runtime Intelligence, using Runtime Intelligence HOCs/hooks/profilers, using React `Profiler`, or supplying source provenance manually;
- Runtime Intelligence is wired once at the application root;
- scenarios cover sequential API calls, HTTP failure, unhandled rejection, console noise, slow render, render storm, oversized list, resource leak, stale async race, and heavy report processing;
- the lab explicitly distinguishes automatically provable source, detected-but-source-limited evidence, and Level-0 unobservable ownership/cause;
- `docs/NEW-PROJECT-INTEGRATION-GUIDE.md` defines the new-project adoption path for React, Lit and Vue.

Static hostile-lab validation passed locally: the uninstrumented boundary guard passed for 9 business source files and JS/JSX parse validation passed for 11 source files.

### P0.3B / P0.4 — HOSTILE BROWSER GATE CLOSED

Console warning/error source attribution, teardown/restart, recursion guard, host state restoration, bounded collection and actual JSON/HTML exports passed in Chromium with React 18.3.1. Raw console/network interception stacks are omitted from reports; UREP source/provenance is retained.

Matrix: **4 A / 4 B / 2 C**. Child-render and worker/virtualization source remain limited; unregistered resource ownership and stale state-write causality remain unobservable. Vite coordinates are generated module coordinates, not exact original JSX lines. React development `_debugSource` was null in the tested owner chain.

Full `npm run validate:release`: **PASS**, production checks 14/14 and unit suite 285/285. Hostile build/static contract/browser runner passed.

See [P0.4-HOSTILE-ACCEPTANCE.md](P0.4-HOSTILE-ACCEPTANCE.md) and its machine receipt for evidence and reproduction.

## R8.1 — Shared browser lifecycle hardening — COMPLETE

TrustWeave's current item is closed partial at the user's direction. Canonical pin installation, source gate, app TypeScript, Playground load and timeline filtering passed. Directory profile QA hit a selector timeout; remaining normal flows and connected API acceptance were NOT EXECUTED. Overall P0 acceptance is not claimed. TrustWeave closure commit: `4bea344eddae023a20f05b6dbf212bcaa9e9884a` on its runtime-observability branch.

R8.1 fixes overlapping surface flag ownership, throwing cleanup that skipped remaining resources, callbacks from prior start generations, in-flight network completion contamination after restart and retained/repeated XHR listeners. Transport results/rejections remain unchanged.

Validation: **294/294 unit tests**, **14/14 production checks**, full `validate:release` PASS; Chromium hostile browser/export regression PASS. Dedicated stress cases cover 100 surface restarts and 100 XHR reuse cycles. These are listener/subscriber retention checks, not proof of every browser heap leak or framework version.

See [R8-HARDENING.md](R8-HARDENING.md). R8 remains IN PROGRESS; next are broader adapter/version compatibility and runtime lifecycle contracts. R9 adoption and R10 Angular remain deferred.
