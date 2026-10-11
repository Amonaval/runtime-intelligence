# Runtime Intelligence — Current Status

**Updated:** 2026-10-11  
**Canonical status:** this file is the single current-state summary. Historical mission/handover files are context, not competing status sources.

## Canonical baseline

Current `main` includes validated React R5.7.4, R6 productization, completed Vue R7, and the active P0 Source Pinpoint / Provenance program.

- Validated React R5.7.4 baseline: `0908f7c8d90d81745db788913a17e6292d2147a0`
- Accepted source-resolver hardening: `b558e3a08c5f2aea18861a7ea1e1f1e62ad89ec1`
- R6.1–R6.5 productization: complete
- R7 Vue Adapter + Vue Fault Lab: complete and validated by the follow-up Vue work
- P0 Source Pinpoint / Provenance: **ACTIVE — highest product priority**
- Angular/framework expansion: **BLOCKED/DEFERRED until P0 value-proposition closure**

## Current product state

Runtime Intelligence is one mature developer product with framework adapters, not separate Lit, React and Vue products.

```text
explicit production/debug gate
        -> runtime-intelligence/loader
        -> LitAdapter / ReactAdapter / VueAdapter / governed extensions
        -> Universal Runtime Evidence Protocol (UREP)
        -> shared evidence store
        -> source provenance + EvidenceGraph/root-cause + shared advisers
        -> normalized findings/opportunities/report
        -> one canonical mature panel
```

The governing rule remains evidence honesty: observation, correlation, attribution, lifetime violation and confirmed causality must never be conflated.

## React validation — CLOSED for parity, OPEN for P0 source precision

R5.2–R5.7.4 parity is complete. React work is now defect/value-driven only. Real TrustWeave testing exposed a major product-value gap: many useful findings did not automatically identify the application call site with file/line/column.

## R6 — COMPLETE

Package contract, production safety, onboarding, public API/extension stability and private/proprietary distribution are complete.

## R7 — Vue Adapter + Vue Fault Lab — COMPLETE

Vue remains a thin UREP evidence producer reusing the same browser surface, intelligence, Opportunities/reporting and canonical panel.

## P0 — Source Pinpoint / Provenance — ACTIVE

### P0.1 — Universal runtime invocation provenance — implemented in source

P0.1 adds a framework-neutral source-provenance layer and closes the highest-value evidence loss found during TrustWeave dogfood:

- captured network call stacks are no longer discarded at the UREP boundary;
- browser errors/unhandled rejections derive bounded application-only source provenance when available;
- sequential API opportunities retain their common caller location;
- Lit legacy network evidence uses the same provenance path;
- Opportunities prominently shows file:line:column, provenance meaning and application frames;
- canonical Pinpoint enriches legacy cards from source-bearing UREP evidence instead of inventing fallback paths;
- internal/vendor-only stacks remain unattributed rather than producing false precision;
- local machine roots are minimized where possible.

P0.1 deliberately does **not** claim that a runtime invocation location is a root cause. React render timing remains an observation unless stronger evidence exists.

### P0 validation state

Focused executable validation covers source parsing/filtering, TrustWeave-style Next stacks, browser network/error integration, legacy network bridging and panel presentation.

Still required for full P0 closure:

- real TrustWeave browser dogfood on the new runtime build;
- React/Next component-definition/original-source attribution where runtime stacks alone are insufficient;
- source-map/build metadata strategy and validation;
- finding → displayed location → relevant code acceptance test on real issues.

See `docs/P0-SOURCE-PINPOINT-PROVENANCE.md`.

## Next — P0.2, not Angular

**P0.2 — React/Next original-source attribution + source-map/build metadata + real TrustWeave closure.**

Recommended effort: **HIGH**.

Angular remains deferred until Runtime Intelligence's core value proposition is demonstrably strong in real consumer use.
