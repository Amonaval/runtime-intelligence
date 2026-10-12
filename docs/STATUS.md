# Runtime Intelligence — Current Status

**Updated:** 2026-10-12
**Canonical status:** this file is the single current-state summary. Historical mission/handover files are context, not competing status sources.

## Canonical baseline

Current `main` includes validated React R5.7.4, R6 productization, completed Vue R7, the P0 Source Pinpoint / Provenance program, bounded R8 hardening, completed R9 adoption, implemented R9.1 verification/causality contract hardening, and implemented R9.2 diagnostic before/after experience.

- Validated React R5.7.4 baseline: `0908f7c8d90d81745db788913a17e6292d2147a0`
- Accepted source-resolver hardening: `b558e3a08c5f2aea18861a7ea1e1f1e62ad89ec1`
- R6.1–R6.5 productization: complete
- R7 Vue Adapter + Vue Fault Lab: complete
- P0.1 Universal runtime invocation provenance: complete in source and pinned to TrustWeave
- P0.2 Exact React source attribution: complete in source and pinned to TrustWeave
- P0.3A/B Hostile benchmark + browser acceptance: complete; source limitations recorded
- P0.4 Zero-touch console source attribution: browser/lifecycle/JSON+HTML acceptance complete
- Overall P0 real-consumer closure: pending post-P0.4 TrustWeave normal-flow acceptance
- R8 multi-framework hardening: complete with bounded coverage
- R9 adoption/product experience: complete
- R9.1 verification/causality semantics: implemented; focused validation passed, full release gate not rerun in connector environment
- R9.2 diagnostic before/after experience: implemented in source; full release validation pending a normal checkout
- Angular/framework expansion: **BLOCKED/DEFERRED until explicit roadmap decision and P0 value-proposition closure**

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

## R8 coordinated closure — COMPLETE WITH BOUNDED COVERAGE

R8.2–R8.4 independently reviewed and implemented: exact-version packed/browser compatibility, adapter isolation and stale-callback contracts, managed pipeline/panel teardown and Lit page stop/restart, navigation and bounded adviser retention, Node throughput budgets and complete export privacy. Full release PASS: **316/316 unit tests, 14/14 production checks**. Two exact React/Vue/Lit browser rows, peer-absent imports, disabled production bundle/patch checks and actual hostile JSON/HTML downloads pass. All 31 R8-focused tests pass.

Coverage and receipts: [R8-HARDENING.md](R8-HARDENING.md). No full-range/browser-heap/production React profiling claim. R9 adoption subsequently completed (see below), R10 Angular deferred, TrustWeave parked with consumer acceptance partial. This entry supersedes the earlier R8 IN PROGRESS entry.

## R9 — Adoption / Product Experience — COMPLETE

Pinpoint and Opportunities now explain why a source is shown and suggest the next targeted adoption step. Normalized JSON/HTML carry the same guidance. Generated coordinates, latest matching event selection and unavailable source are explicit; evidence strength is unchanged. The installed artifact includes the React/Vue/Lit integration guide and unified Level 0/1/2 ladder. The README disabled React path renders the application normally; troubleshooting and guided demo steps cover opt-in, teardown and source limits.

Validation: full release gate **319/319 unit tests, 14/14 production checks PASS**; packed installation/public imports and both installed guides PASS; real Chromium hostile lab validates visible Pinpoint/Opportunities guidance and JSON/HTML downloads. See [R9-ADOPTION.md](R9-ADOPTION.md) and [R9-ADOPTION-RECEIPT.json](R9-ADOPTION-RECEIPT.json). TrustWeave remains parked, consumer P0 acceptance partial, R10 deferred. No framework expansion or new telemetry.

## R9.1 — Verification & Causality Contract Hardening — IMPLEMENTED

R9.1 corrects the older workflow-verification semantic that treated an applied intervention followed by meaningful replay improvement as causal proof.

`verifyFix(...)` now distinguishes:

- **verification confirmed** — the configured metric improved on a distinct replay of the same workflow after an intervention recorded as applied;
- **causality confirmed** — allowed only when verification is accompanied by an existing valid UREP event that already carries `causality-confirmed` evidence and `causedByEventId`.

Ordinary successful replay verification remains `outcome: confirmed`/`confirmed: true` for public compatibility, but now reports `verificationConfirmed: true`, `causalityConfirmed: false` and `evidenceLevel: correlation`. The Evidence Capsule prompt makes the same distinction and refuses to promote correlation merely because a fix was followed by improvement.

Focused isolated Node validation: **10/10 workflow-verification tests PASS** and changed JS/test syntax checks PASS.

Full `npm run validate:release` was **NOT EXECUTED in this connector environment** because the full checked-out repository/dependency tree could not be obtained. The prior R9 319/319 receipt is historical baseline and is not claimed as R9.1 proof.

See [R9.1-VERIFICATION-CAUSALITY-HARDENING.md](R9.1-VERIFICATION-CAUSALITY-HARDENING.md) and [R9.1-VERIFICATION-CAUSALITY-RECEIPT.json](R9.1-VERIFICATION-CAUSALITY-RECEIPT.json).

TrustWeave remains parked. R10 remains deferred.

## R9.2 — Diagnostic Before/After Experience — IMPLEMENTED

R9.2 wraps the existing workflow baseline/compare/verify primitives in a single developer session flow: **capture baseline → apply fix → capture replay → improved / unchanged / regressed / inconclusive**.

The new framework-neutral `createDiagnosticBeforeAfterSession(...)` API reads the shared UREP EvidenceStore. The canonical panel mount exposes `startBeforeAfter(...)` and `getBeforeAfterState()`, and active state is included in normalized JSON plus a dedicated HTML report section.

R9.1 remains authoritative: a successful before/after replay can verify improvement while remaining correlation-level; the experience explicitly reports whether causality is separately confirmed rather than inferring it.

Focused unit coverage was added for state transitions, improvement/threshold/regression/inconclusive cases, reset/immutability and report rendering. Full `npm run validate:release` remains pending a normal checked-out environment and is not claimed here.

See [R9.2-DIAGNOSTIC-BEFORE-AFTER.md](R9.2-DIAGNOSTIC-BEFORE-AFTER.md) and [R9.2-DIAGNOSTIC-BEFORE-AFTER-RECEIPT.json](R9.2-DIAGNOSTIC-BEFORE-AFTER-RECEIPT.json).

TrustWeave remains parked. R10 remains deferred.
