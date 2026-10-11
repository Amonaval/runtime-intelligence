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
- R6.5 Distribution / License / IP Strategy: complete
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

Completed sequence: R5.2 through R5.7.4. Further React work is defect-driven only.

## R6 productization — COMPLETE

### R6.1 — Package Contract & Publish Safety — COMPLETE

One package with explicit public subpaths, generic pack allowlist and package-contract validation.

### R6.2 — Production Safety & Conditional Loading — COMPLETE

Default-off `/loader`, disabled-path near-zero instrumentation, reversible browser hooks and no collector-initiated network request.

Focused local production-safety tests: **8 passed, 0 failed**.

### R6.3 — Developer Onboarding & Reproducible Installation — COMPLETE

Root quick start, tarball consumer validation, safe enablement recipes and aggregate release validation.

### R6.4 — Public API Stability & Extension Contract — COMPLETE

Exact public API baseline, governed `runtime-intelligence/extension`, compatibility rules and guarded causal claims.

Focused extension tests: **5 passed, 0 failed**. Public API baseline validation passed in the isolated harness.

### R6.5 — Distribution / License / IP Strategy — COMPLETE

R6.5 closes the product/distribution boundary:

- package remains `runtime-intelligence` and `private: true`;
- package license changes from the earlier MIT metadata to the current proprietary `UNLICENSED` baseline;
- `LICENSE.md` carries an all-rights-reserved proprietary notice;
- approved delivery is authorized private Git SHA or authorized tarball;
- no public registry or registry URL is configured;
- `npm run distribution:validate` machine-checks the distribution posture and packed license notice;
- `npm run validate:release` now includes distribution-policy validation;
- browser obfuscation is explicitly treated only as friction, not IP protection;
- local collectors/adapters/UREP/panel remain in the browser package;
- truly secret/premium intelligence may later move behind an opt-in service boundary consuming sanitized report/evidence contracts;
- R6.5 adds no telemetry, background upload or surprise network calls;
- historical rights are not claimed to be revoked by this policy change.

## R6 closure

R6.1–R6.5 establish a complete productization baseline: package contract, production safety, onboarding, stable API/extensions and proprietary distribution policy.

Full repository `npm run validate:release` remains a release checkpoint in a normal checked-out environment.

## Next: R7 — Vue Adapter + Vue Fault Lab

Vue is the next framework expansion now that the R6 contract is stable.

Recommended effort: **MEDIUM-HIGH**.

R7 must reuse UREP, shared intelligence, Opportunities, extension contract and canonical panel rather than creating a Vue-specific product fork.
