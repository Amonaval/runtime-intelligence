# Runtime Intelligence — Current Status

**Updated:** 2026-10-11  
**Canonical status:** this file is the single current-state summary. Historical mission/handover files are context, not competing status sources.

## Canonical baseline

Current `main` includes validated React R5.7.4, R6 productization, completed Vue R7, and the active P0 Source Pinpoint / Provenance program.

- Validated React R5.7.4 baseline: `0908f7c8d90d81745db788913a17e6292d2147a0`
- Accepted source-resolver hardening: `b558e3a08c5f2aea18861a7ea1e1f1e62ad89ec1`
- R6.1–R6.5 productization: complete
- R7 Vue Adapter + Vue Fault Lab: complete
- P0.1 Universal runtime invocation provenance: complete in source and pinned to TrustWeave
- P0.2 Exact React source attribution: complete in source; real TrustWeave browser validation pending
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

R5.2–R5.7.4 parity remains closed. React work is now driven by the P0 source-precision defect exposed by real TrustWeave dogfood.

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

### P0.2 — IMPLEMENTED IN SOURCE

- React HOC/boundary registration can refine filename-only source to exact line/column from the consumer registration stack;
- tracked React state updates capture the actual application invocation call site;
- runtime effect/resource hooks capture registration source;
- effect errors capture application error origin when provable;
- Profiler observations inherit known component-boundary source but remain framework-reported observations;
- derived update-budget diagnostics retain provenance;
- resource-lifetime findings preserve the resource registration source rather than owner teardown source;
- Pinpoint uses issue-specific evidence selection.

Focused P0.2 behavioral validation during implementation: **16 passed, 0 failed**. Final changed/new JS syntax checks passed.

Not claimed yet:

- full `npm run validate:release` for the P0.2 commit;
- real-browser TrustWeave P0.2 closure;
- exact original component definition for completely uninstrumented React components.

See `docs/P0-SOURCE-PINPOINT-PROVENANCE.md`.

## Next — P0 real-world closure / uninstrumented React source

Repin TrustWeave to the P0.2 runtime and validate normal real-world flows. Then address the remaining React/Next case using trustworthy dev/fiber/build/source-map metadata only if needed.

Angular remains deferred.
