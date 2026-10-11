# Runtime Intelligence — Current Status

**Updated:** 2026-10-11  
**Canonical status:** this file is the single current-state summary. Historical mission/handover files are context, not competing status sources.

## Canonical baseline

Current `main` includes validated React R5.7.4 plus accepted product hardening/productization work.

- Validated React R5.7.4 baseline: `0908f7c8d90d81745db788913a17e6292d2147a0`
- Accepted source-resolver hardening: `b558e3a08c5f2aea18861a7ea1e1f1e62ad89ec1`
- R6.1 Package Contract & Publish Safety: complete
- R6.2 Production Safety & Conditional Loading: complete
- R6.3 Developer Onboarding & Reproducible Installation: complete
- R6.4 Public API Stability & Extension Contract: complete
- TrustWeave remains intentionally pinned to the R5.7.4 baseline while R6 productization proceeds independently.

## Current product state

Runtime Intelligence is one mature developer product with framework adapters, not separate Lit and React products.

```text
explicit production/debug gate
        -> runtime-intelligence/loader (default off, dynamic imports only)
        -> LitAdapter / ReactAdapter / governed extensions
        -> Universal Runtime Evidence Protocol (UREP)
        -> shared evidence store
        -> incident recorder + EvidenceGraph + RootCauseGrouper
        -> shared developer intelligence / evidence capsule
        -> normalized opportunities/report model
        -> one mature LdsDebugPanel (✨ Intelligence + ⚡ Opportunities)
        -> normalized runtime-intelligence-report/1 JSON + HTML
```

The governing rule remains evidence honesty: observation, correlation, attribution, lifetime violation and confirmed causality must never be conflated.

## React validation — CLOSED

Completed sequence: R5.2 through R5.7.4. Further React work is defect-driven only; do not add parity missions merely to increase coverage.

Evidence safeguards remain unchanged: React does not invent `UPDATE_CAUSE` or `REACTIVE_DEPENDENCY`; temporal proximity remains correlation; owner hierarchy is structural; Profiler timing is framework-reported observation; lifetime violations require explicit ownership evidence; synthetic Fault Lab evidence must not leak into consumer dogfood.

## R6 productization

### R6.1 — Package Contract & Publish Safety — COMPLETE

- one package with explicit public subpaths;
- package remains `private: true` pending explicit distribution/license decision;
- generic packed artifact excludes Syndigo-specific `lit/custom`;
- `npm run package:validate` checks export/pack contract.

### R6.2 — Production Safety & Conditional Loading — COMPLETE

- default-off `runtime-intelligence/loader`;
- disabled React and Lit paths avoid runtime instrumentation;
- browser network/console/vitals instrumentation is reversible;
- no surprise network request is initiated by collector startup;
- host-owned diagnostic flags are restored on teardown.

Focused local R6.2 production-safety tests: **8 passed, 0 failed**. Full repository validation remains a release checkpoint in a normal checked-out environment.

### R6.3 — Developer Onboarding & Reproducible Installation — COMPLETE

- root README with 5-minute React/Lit quick starts;
- local tarball is the recommended pre-registry install path;
- `npm run onboarding:validate` tests the packed artifact in an isolated consumer;
- `npm run validate:release` aggregates release checks;
- troubleshooting and report/export workflow are documented.

### R6.4 — Public API Stability & Extension Contract — COMPLETE

R6.4 freezes the R6 public contract and provides a supported alternative to deep imports/browser-global integration.

- new `runtime-intelligence/extension` public surface;
- explicit API version `0.1`;
- `npm run api:validate` checks exact public subpaths and named exports against a committed baseline;
- compatibility policy: pre-1.0 breaking changes require a new minor line; UREP/extension compatibility is same-major;
- deep imports and `window.__LDS_*` are explicitly internal/unsupported for consumers;
- extensions require an explicit EvidenceStore-compatible store and automatically namespace diagnostic names;
- extension evidence is tagged with extension/API/UREP manifest metadata;
- confirmed causal claims are blocked by default and require explicit opt-in plus `causality-confirmed` + `causedByEventId`;
- onboarding validation now exercises the extension surface from the packed artifact;
- package validation now checks TypeScript declaration targets as well as runtime targets.

Focused R6.4 extension tests: **5 passed, 0 failed**. The public API baseline validator also passed in the local isolated validation harness.

### Next: R6.5 — Distribution / License / IP Strategy

This is primarily an owner decision: public vs private registry, final package naming, license/IP position, and any commercial/service boundary.

Recommended effort: LOW-MEDIUM implementation effort + OWNER DECISION.

## Framework expansion

Vue/Angular work remains deferred until the R6 package/product contract is stable. Future adapters must reuse UREP, shared intelligence, Opportunities, the extension contract and the canonical panel rather than forking product logic.
