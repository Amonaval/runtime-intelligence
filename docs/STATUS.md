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
- TrustWeave remains intentionally pinned to the R5.7.4 baseline while R6 productization proceeds independently.

The source-resolver hardening is accepted because it conservatively keeps `file://`, `webpack-internal://` and Vite `/@fs/` runtime locations on the generated/provider path, redacts embedded `data:` payloads, and does not upgrade evidence certainty.

## Current product state

Runtime Intelligence is one mature developer product with framework adapters, not separate Lit and React products.

```text
explicit production/debug gate
        -> runtime-intelligence/loader (default off, dynamic imports only)
        -> LitAdapter / ReactAdapter / browser collectors
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

- one package with explicit `/core`, `/react`, `/lit`, `/panel` and `/panel/lit` surfaces;
- package remains `private: true` pending explicit distribution/license decision;
- generic packed artifact excludes Syndigo-specific `lit/custom`;
- `npm run package:validate` checks export/pack contract.

### R6.2 — Production Safety & Conditional Loading — COMPLETE

New `runtime-intelligence/loader` is the default-off production boundary. It has no static imports from Runtime Intelligence and loads only the explicitly selected framework plus optional panel after `enabled: true`.

Additional hardening:

- disabled React providers no longer instantiate `ReactIntelligenceRuntime`;
- disabled Lit mixins do not connect adapters or baseline collectors;
- BrowserRuntimeSurface stop releases network/console/vitals instrumentation and listeners;
- `fetch`/XHR and console patches are reversible and reference-counted;
- PerformanceObservers disconnect when the final diagnostics consumer stops;
- console module import no longer mutates browser globals;
- network initialization observes traffic without initiating its own request;
- host-owned `__LDS_INTELLIGENCE_ENABLED__` state is restored on stop.

Focused local R6.2 production-safety tests: **8 passed, 0 failed**. Full repository validation remains a release checkpoint in a normal checked-out environment.

### R6.3 — Developer Onboarding & Reproducible Installation — COMPLETE

R6.3 adds a real root README and a deliberate pre-registry adoption path instead of expecting developers to understand repository internals.

- 5-minute React and Lit quick-start recipes;
- production-safe `/loader` enablement examples;
- local tarball as the recommended pre-registry consumer-install path;
- Git-SHA installs retained for existing dogfood compatibility, not as the primary onboarding UX;
- `npm run onboarding:validate` packs the artifact, installs it in a temporary consumer, and smoke-imports `/loader`, `/core`, `/react`, and `/lit`;
- `npm run validate:release` aggregates package, production, onboarding, and repository tests;
- troubleshooting now covers export errors, activation, React/Lit wiring, panel mounting, teardown, and privacy defaults;
- JSON/HTML export workflow is documented as local/user-triggered by default.

R6.3 deliberately does not publish to a registry or alter licensing. Those remain R6.5 owner decisions.

### Next: R6.4 — Public API Stability & Extension Contract

Define what is public vs internal, formalize supported UREP/plugin extension points and compatibility/versioning rules, and reduce reliance on incidental browser globals.

Recommended effort: MEDIUM-HIGH.

## Framework expansion

Vue/Angular work remains deferred until the R6 package/product contract is stable. Future adapters must reuse UREP, shared intelligence, Opportunities and the canonical panel rather than forking product logic.
