# Runtime Intelligence — Current Status

**Updated:** 2026-10-12
**Canonical status:** this file is the single current-state summary. Historical mission/handover files are context, not competing status sources.

## Canonical baseline

Current `main` includes validated React R5.7.4, R6 productization, completed Vue R7, the P0 Source Pinpoint / Provenance program, bounded R8 hardening, completed R9 adoption, R9.1 causality hardening, R9.2 before/after verification, and R9.3 Finding → Verify Fix / Lit lab / unified developer guidance.

- Validated React R5.7.4 baseline: `0908f7c8d90d81745db788913a17e6292d2147a0`
- Accepted source-resolver hardening: `b558e3a08c5f2aea18861a7ea1e1f1e62ad89ec1`
- R6.1–R6.5 productization: complete
- R7 Vue Adapter + Vue Fault Lab: complete
- P0.1 Universal runtime invocation provenance: complete in source and pinned to TrustWeave
- P0.2 Exact React source attribution: complete in source and pinned to TrustWeave
- P0.3A/B Hostile benchmark + browser acceptance: complete; source limitations recorded
- P0.4 Zero-touch console source attribution: browser/lifecycle/JSON+HTML acceptance complete
- Overall P0 real-consumer closure: partial/parked by user direction
- R8 multi-framework hardening: complete with bounded coverage
- R9 adoption/product experience: complete
- R9.1 verification/causality semantics: implemented; focused validation passed, full release gate not rerun in connector environment
- R9.2 diagnostic before/after experience: implemented; R9.3 subsequently hardens workflow isolation by evidence sequence window
- R9.3 Finding → Verify Fix bridge: implemented in source
- Lit Fault Lab: implemented under `examples/lit-fault-lab`
- Unified `docs/DEVELOPER-GUIDE.md`: implemented and included in the packed artifact
- Strategic critic review: `docs/STRATEGIC-REVIEW-R9.3.md`
- Angular/framework expansion: **DEFERRED; comparative value proof is the recommended next program**

## Product direction

Runtime Intelligence is one developer product with shared UREP, intelligence and one canonical panel. Framework adapters remain evidence producers only.

```text
runtime/browser/framework evidence
        -> source provenance
        -> UREP EvidenceStore
        -> EvidenceGraph / root-cause / shared advisers
        -> normalized findings + Opportunities
        -> canonical mature panel
        -> Finding -> Verify Fix / reports
```

The governing rule remains evidence honesty: observation, correlation, attribution, lifetime violation and confirmed causality must never be conflated.

The current strategic rule is now stronger: **do not expand framework count until the existing product proves faster/better debugging on realistic difficult faults.**

## React parity — CLOSED; source precision/value proof — ACTIVE

R5.2–R5.7.4 parity remains closed. React work is driven by real source-precision/value defects exposed by dogfood or hostile benchmarks, not feature parity for its own sake.

## R6 — COMPLETE

Package contract, production safety, onboarding, public API/extension stability and private/proprietary distribution are complete.

## R7 — Vue — COMPLETE

Vue remains a thin UREP evidence producer reusing shared browser collection, intelligence, Opportunities/reporting and the canonical panel.

## P0 — Source Pinpoint / Provenance — TECHNICALLY MATURE; REAL-CONSUMER ACCEPTANCE PARTIAL

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

`examples/react-uninstrumented-lab` targets the adoption case the original React Fault Lab cannot prove:

- business code has zero Runtime Intelligence imports/HOCs/hooks/profilers/manual provenance;
- Runtime Intelligence is wired once at the application root;
- scenarios cover network waterfall/failure, rejection, console noise, slow render, render storm, oversized list, resource leak, stale async race, and main-thread report work;
- acceptance distinguishes automatically provable, detected-but-source-limited, and Level-0 unobservable behavior.

### P0.3B / P0.4 — HOSTILE BROWSER GATE CLOSED

Console invocation attribution, teardown/restart, recursion guard, host state restoration, bounded collection and actual JSON/HTML exports passed in Chromium with React 18.3.1. Raw console/network interception stacks are omitted from reports; UREP source/provenance is retained.

Matrix: **4 A / 4 B / 2 C**. Child-render and worker/virtualization source remain limited; unregistered resource ownership and stale state-write causality remain unobservable. Vite coordinates are generated module coordinates, not exact original JSX lines.

Full P0.4 `npm run validate:release`: **PASS**, production checks 14/14 and unit suite 285/285.

### P0 real-consumer check — CLOSED PARTIAL / PARKED

The user directed stopping TrustWeave after the current browser item. Installation/source gate/TypeScript, Playground load and timeline filtering passed. Directory profile QA timed out; later flows and connected API acceptance were not executed. This closes the work item, not overall consumer acceptance.

## R8 — Multi-framework Product Hardening — COMPLETE WITH BOUNDED COVERAGE

R8 lifecycle, exact-version packed/browser compatibility, adapter isolation/stale-callback contracts, teardown/retention, measured Node throughput, disabled production, packed installation and export/privacy validation are complete.

Final R8 release gate: **316/316 unit tests, 14/14 production checks PASS**.

Tested exact rows: React 18.3.1 / Vue 3.3.13 / Lit 3.0.2 and React 19.0.0 / Vue 3.5.13 / Lit 3.3.3. This does not claim full peer-range/browser coverage, browser heap-leak proof or production React profiling.

See [R8-HARDENING.md](R8-HARDENING.md).

## R9 — Adoption / Product Experience — COMPLETE

Pinpoint and Opportunities explain why a source is shown and suggest the next targeted adoption step. Normalized JSON/HTML carry the same guidance. Generated coordinates, latest matching event selection and unavailable source are explicit; evidence strength is unchanged.

Validation: full release gate **319/319 unit tests, 14/14 production checks PASS** plus hostile real-browser guidance/export acceptance.

See [R9-ADOPTION.md](R9-ADOPTION.md).

## R9.1 — Verification & Causality Contract Hardening — IMPLEMENTED

`verifyFix(...)` now distinguishes:

- **verification confirmed** — the configured metric improved on a distinct replay of the same workflow after an intervention recorded as applied;
- **causality confirmed** — only when accompanied by existing governed UREP `causality-confirmed` evidence and `causedByEventId`.

Ordinary successful verification remains correlation-level.

Focused isolated Node validation: **10/10 workflow-verification tests PASS** and changed JS/test syntax checks PASS. Full release gate was not rerun in the connector environment.

See [R9.1-VERIFICATION-CAUSALITY-HARDENING.md](R9.1-VERIFICATION-CAUSALITY-HARDENING.md).

## R9.2 — Diagnostic Before/After Experience — IMPLEMENTED / HARDENED BY R9.3

R9.2 wraps the workflow primitives in:

```text
start session
→ reproduce baseline workflow
→ capture baseline
→ apply fix
→ replay same workflow
→ capture replay
→ improved / unchanged / regressed / inconclusive
```

The canonical panel exposes `startBeforeAfter(...)` and a visible Before/After tab; reports include the active state.

R9.3 found and corrected an important semantic issue: the original R9.2 implementation compared full cumulative store snapshots. Sessions now mark the evidence sequence at session start and baseline capture so baseline and replay are isolated windows without destructive store clearing.

R9.1 remains authoritative: improved does not automatically mean causal.

See [R9.2-DIAGNOSTIC-BEFORE-AFTER.md](R9.2-DIAGNOSTIC-BEFORE-AFTER.md).

## R9.3 — Finding → Verify Fix + Lit Lab + Developer Guide — IMPLEMENTED IN SOURCE

R9.3 closes the finding-to-verification UX gap.

Public panel APIs:

- `FindingVerificationSupport`
- `createFindingVerificationPlan(...)`
- `createFindingVerificationSession(...)`
- `panel.startFindingVerification(...)`

Pinpoint cards with a safe auto-derived metric now show **Verify fix →** and switch into the Before/After workflow. Automatic targets are deliberately limited to cases where a meaningful observable metric can be derived honestly:

- owner-scoped runtime error count;
- owner-scoped completed-update count for render storm/update budget;
- average slow-render duration only when a numeric duration field is actually present.

Other findings remain explicitly unsupported unless the developer supplies an explicit target.

The missing Lit fault lab is now present under `examples/lit-fault-lab` with off-by-default activation, real Lit/browser faults, the canonical panel, and an end-to-end Finding → Verify Fix scenario.

`docs/DEVELOPER-GUIDE.md` now gives the complete minimal → targeted → full path for React, Vue and Lit and ends with all three fault labs/full-scale examples. It is included in package files.

`docs/STRATEGIC-REVIEW-R9.3.md` challenges the product from first principles. Its conclusion is conditional: Runtime Intelligence is useful for difficult multi-signal frontend runtime incidents only if it materially shortens debugging versus native tools; it is not needed for ordinary bugs.

See [R9.3-FINDING-VERIFY-FIX-BRIDGE.md](R9.3-FINDING-VERIFY-FIX-BRIDGE.md).

## Recommended next — R9.4 Comparative Value Proof

Freeze broad feature/framework expansion and measure Runtime Intelligence against native tools on 10–20 realistic faults not designed around current analyzers.

Primary measures:

- time to relevant application source/boundary;
- Level 0/1 useful-result rate;
- irrelevant/noisy findings;
- instrumentation cost;
- finding → action conversion;
- verification usefulness;
- developer choice: “would you use this again?”

Use the kill criteria in [STRATEGIC-REVIEW-R9.3.md](STRATEGIC-REVIEW-R9.3.md). Angular remains deferred.

TrustWeave remains parked.
