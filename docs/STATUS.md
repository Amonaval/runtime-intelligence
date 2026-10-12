# Runtime Intelligence — Current Status

**Updated:** 2026-10-12  
**Canonical status:** this file is the single current-state summary. Historical mission/handover files are context, not competing status sources.

## Canonical baseline

Current `main` includes validated React R5.7.4, R6 productization, completed Vue R7, the P0 Source Pinpoint / Provenance program, bounded R8 hardening, completed R9 adoption, R9.1 causality hardening, R9.2 before/after verification, R9.3 Finding → Verify Fix / Lit lab / unified developer guidance, and the R9.4A Comparative Value Proof pilot harness.

- Validated React R5.7.4 baseline: `0908f7c8d90d81745db788913a17e6292d2147a0`
- Accepted source-resolver hardening: `b558e3a08c5f2aea18861a7ea1e1f1e62ad89ec1`
- R6.1–R6.5 productization: complete
- R7 Vue Adapter + Vue Fault Lab: complete
- P0.1 Universal runtime invocation provenance: complete in source and pinned to TrustWeave
- P0.2 Exact React source attribution: complete in source and pinned to TrustWeave
- P0.3A/B hostile zero-touch benchmark + browser acceptance: complete; source limitations recorded
- P0.4 zero-touch console source attribution: browser/lifecycle/JSON+HTML acceptance complete
- Overall P0 real-consumer closure: partial/parked by user direction
- R8 multi-framework hardening: complete with bounded coverage
- R9 adoption/product experience: complete
- R9.1 verification/causality semantics: implemented; focused validation passed
- R9.2 diagnostic before/after experience: implemented; R9.3 hardens evidence-window isolation
- R9.3 Finding → Verify Fix bridge: implemented in source
- Lit Fault Lab: implemented under `examples/lit-fault-lab`
- Unified `docs/DEVELOPER-GUIDE.md`: implemented and included in the packed artifact
- Strategic critic review: `docs/STRATEGIC-REVIEW-R9.3.md`
- R9.4A Comparative Value Proof Pilot: **protocol/harness implemented; human pilot execution/results pending**
- Angular/framework expansion: **DEFERRED**
- TrustWeave: **PARKED**

## Product direction

Runtime Intelligence remains one developer product with shared UREP, intelligence and one canonical panel. Framework adapters remain thin evidence producers.

```text
runtime/browser/framework evidence
        → source provenance
        → UREP EvidenceStore
        → EvidenceGraph / root grouping / shared advisers
        → normalized findings + Opportunities
        → canonical panel
        → Finding → Verify Fix / reports
```

The governing evidence rule remains:

```text
observation ≠ causality
correlation ≠ causality
source attribution ≠ business root cause
structural ownership ≠ causal ownership
verification improvement ≠ causal proof
```

The strategic rule is now stronger than framework completeness:

> **Do not expand framework count or generic analyzer breadth until the existing product proves repeated developer value against native tooling on difficult realistic faults.**

## P0 — Source Pinpoint / Provenance — TECHNICALLY MATURE; REAL-CONSUMER ACCEPTANCE PARTIAL

The source/provenance program established:

- application-frame extraction and bounded source semantics;
- network/error invocation provenance retained through UREP;
- React targeted ownership/state/effect/resource source refinement where provable;
- explicit generated/contextual/unavailable source handling;
- issue-specific Pinpoint source selection;
- zero-touch hostile React acceptance with known Level-0 limits.

Known limits remain intentionally visible: exact uninstrumented child-render source, original source-map coordinates in all toolchains, stale state-write causality and untracked resource ownership are not universally available at Level 0.

TrustWeave consumer validation remains partial by user direction. The work item is parked rather than treated as a passed production-consumer gate.

## R8 — Multi-framework Product Hardening — COMPLETE WITH BOUNDED COVERAGE

R8 covered lifecycle/restart isolation, adapter contracts, teardown/retention, packed installation, private distribution checks, export privacy and bounded development-overhead regression checks.

Final R8 release gate: **316/316 unit tests, 14/14 production checks PASS**.

Tested exact rows included React 18.3.1 / Vue 3.3.13 / Lit 3.0.2 and React 19.0.0 / Vue 3.5.13 / Lit 3.3.3. This does not claim every peer/browser version, browser heap-leak proof or production React profiling.

See [R8-HARDENING.md](R8-HARDENING.md).

## R9 — Adoption / Product Experience — COMPLETE

Pinpoint and Opportunities explain why a source is shown, its provenance/evidence limits and the cheapest useful next adoption step. JSON/HTML carry the same guidance.

R9 full release validation: **319/319 unit tests, 14/14 production checks PASS** plus hostile real-browser guidance/export acceptance.

See [R9-ADOPTION.md](R9-ADOPTION.md).

## R9.1 — Verification & Causality Contract Hardening — IMPLEMENTED

`verifyFix(...)` distinguishes:

- **verification confirmed** — the configured metric improved on a distinct replay after an intervention recorded as applied;
- **causality confirmed** — only when separate governed UREP `causality-confirmed` evidence with `causedByEventId` already exists.

Ordinary successful verification remains correlation-level.

Focused isolated validation: **10/10 workflow-verification tests PASS**. A full release gate was not rerun in the connector environment.

See [R9.1-VERIFICATION-CAUSALITY-HARDENING.md](R9.1-VERIFICATION-CAUSALITY-HARDENING.md).

## R9.2 — Diagnostic Before/After — IMPLEMENTED / HARDENED BY R9.3

Canonical flow:

```text
start session
→ reproduce baseline workflow
→ capture baseline
→ apply intended fix
→ replay same workflow
→ capture replay
→ improved / unchanged / regressed / inconclusive
```

R9.3 corrected the original cumulative-store comparison by isolating baseline and replay through evidence sequence windows.

See [R9.2-DIAGNOSTIC-BEFORE-AFTER.md](R9.2-DIAGNOSTIC-BEFORE-AFTER.md).

## R9.3 — Finding → Verify Fix + Lit Lab + Developer Guide — IMPLEMENTED

Delivered:

- `createFindingVerificationPlan(...)`;
- `createFindingVerificationSession(...)`;
- `panel.startFindingVerification(...)`;
- conservative automatic targets for runtime errors, update storms/budget cases and slow-render duration only when present;
- explicit unsupported results where no truthful metric exists;
- Lit full-scale fault lab;
- unified React/Vue/Lit developer guide;
- adversarial strategic review and kill criteria.

R9.1 evidence semantics remain authoritative.

See [R9.3-FINDING-VERIFY-FIX-BRIDGE.md](R9.3-FINDING-VERIFY-FIX-BRIDGE.md).

## R9.4A — Comparative Value Proof Pilot — HARNESS IMPLEMENTED / EXECUTION PENDING

R9.4A adds **no runtime feature**. It freezes a study contract under `benchmarks/value-proof/` and measures:

```text
native tooling
vs
Runtime Intelligence Level 0
vs
one bounded targeted-instrumentation step
```

across nine real-behavior faults:

- 3 React / 3 Vue / 3 Lit;
- 3 source-provenance / 3 cross-signal / 3 action-verification;
- 3 analyzer-favorable / 3 neutral / 3 known-limit.

The committed result template contains no timings/results. Human timing is mandatory; missing milestones remain missing rather than guessed.

The protocol captures:

- time to relevant application source/boundary;
- time to actionable diagnosis;
- source precision;
- finding usefulness/noise/false positives;
- instrumentation cost;
- verification usefulness;
- trust violations;
- developer reuse choice.

`npm run value-proof:validate` validates the frozen corpus and counterbalancing.  
`npm run value-proof:summarize -- <results.json>` validates and summarizes one complete 27-run participant file without auto-declaring a winner.

See [R9.4A-COMPARATIVE-VALUE-PROOF-PILOT.md](R9.4A-COMPARATIVE-VALUE-PROOF-PILOT.md).

### Important limitation

R9.4A uses existing repository fault labs for reproducibility. Some cases overlap current analyzers. Therefore it is a **protocol/value-signal pilot**, not external product-market proof.

A promising pilot must proceed to an independent developer and/or real-consumer/non-lab validation before broader investment.

## Recommended next — EXECUTE R9.4A

Do not build another framework or generic analyzer.

Run the frozen pilot and inspect actual human evidence.

Only then choose among:

```text
clear repeated advantage
→ R9.4B proof-driven fixes / independent validation

mixed narrow advantage
→ specialize / simplify around the winning jobs

native tooling usually wins or RI adds mostly convenience
→ narrow aggressively or stop broad expansion
```

Any evidence overclaim or wrong-source confidence is a blocker regardless of speed.

TrustWeave remains parked until comparative proof justifies reopening a real consumer.

Angular remains deferred.
