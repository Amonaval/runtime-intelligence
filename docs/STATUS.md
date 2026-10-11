# Runtime Intelligence — Current Status

**Updated:** 2026-10-11  
**Canonical status:** this file is the single current-state summary. Historical mission/handover files are context, not competing status sources.

## Canonical baseline

Current `main` includes validated React R5.7.4 plus one accepted post-R5.7.4 source-resolver hardening commit.

- Validated React R5.7.4 baseline: `0908f7c8d90d81745db788913a17e6292d2147a0`
- Accepted source-resolver hardening: `b558e3a08c5f2aea18861a7ea1e1f1e62ad89ec1`
- TrustWeave remains intentionally pinned to the R5.7.4 baseline and was not repinned for the source-resolver hardening review.

The hardening is accepted because it conservatively keeps `file://`, `webpack-internal://` and Vite `/@fs/` runtime locations on the generated/provider path, redacts embedded `data:` payloads, and does not upgrade evidence certainty.

## Current product state

Runtime Intelligence is one mature developer product with framework adapters, not separate Lit and React products.

```text
LitAdapter / ReactAdapter / browser collectors
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

Completed sequence:

- R5.2 — Canonical Panel Unification
- R5.3 — Shared Runtime Surface Parity
- R5.4 — React Component & Ownership Intelligence
- R5.5 — React Correlation + Intelligence
- R5.6 — TrustWeave React Parity Closure
- R5.7 — React Fault Lab
- R5.7.1 — Presentation/export hardening
- R5.7.2 — Expanded one-pass Fault Lab
- R5.7.3 — Validation-gap closure
- R5.7.4 — First-class Opportunities

Further React work is defect-driven only. Do not add parity missions merely to increase coverage.

## Evidence safeguards retained

- React `UPDATE_CAUSE` remains unsupported unless explicit stronger evidence exists.
- React `REACTIVE_DEPENDENCY` remains unsupported generically.
- Interaction proximity and Network→state proximity are correlation only.
- Nested owner hierarchy is structural, not causal.
- Profiler timing is framework-reported observation.
- Resource lifetime violations require explicitly tracked ownership.
- Synthetic Fault Lab evidence is explicitly labeled and must not leak into consumer dogfood.

## R6 productization

### R6.1 — Package Contract & Publish Safety — COMPLETE

The R6 baseline keeps one package with explicit `/core`, `/react`, `/lit`, `/panel` and `/panel/lit` exports. The package is now guarded with `private: true` until distribution/license strategy is explicitly approved. The generic package allowlist contains `lit/src` only; Syndigo-specific `lit/custom` is no longer part of the packed artifact.

`npm run package:validate` validates the export contract and `npm pack --dry-run` contents.

### Next: R6.2 — Production Safety & Conditional Loading

Prove and harden:

- dev-only enablement;
- near-zero disabled overhead;
- safe conditional loading/tree-shaking boundaries;
- no surprise production network calls;
- privacy-safe defaults remain intact when enabled.

Recommended effort: MEDIUM-HIGH.

## Framework expansion

Vue/Angular work remains deferred until the R6 package/product contract is stable. Future adapters must reuse UREP, shared intelligence, Opportunities and the canonical panel rather than forking product logic.
