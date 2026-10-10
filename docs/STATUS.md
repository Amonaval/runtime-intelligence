# STATUS — Runtime Intelligence

Updated: 2026-10-10

## Canonical source of truth

`Amonaval/runtime-intelligence` is the reusable product source. Consumer applications such as TrustWeave must consume this product through package/build boundaries rather than evolve generic runtime-intelligence logic in their own repository.

## Completed and active

- UREP evidence protocol/store/graph/root-cause/recorder/capsule/privacy/source-resolution core
- Lit adapter + LitIntelligencePipeline
- ReactAdapter v2.1
- Mission 10A–10F developer-pain series, including Mission 10F evidence-semantics and update-budget hardening
- Mission 11 ZIP reconciliation: background session history, Falcor call graph, sequential API detector, network call-site stacks and session report plumbing
- Mission 12 ZIP reconciliation: DOM duplication, virtualization, paint, worker opportunity and idle-scheduling advisors plus dedicated Opportunities presentation

## Validation

- Canonical pre-sync Mission 10F: npm test, smoke test and library build were passing at commit `cda72da22fd3a47ee1af9fdaa87f98280e5ce444`.
- User-provided ZIP focused Mission 11 + 12 suites: 44/44 passing before reconciliation.
- A reconciliation regression test preserves public exports and Mission 10F update-budget episode semantics.

## Current mission

Package Boundary + React Dogfood:

1. define `@runtime-intelligence/core`, `@runtime-intelligence/react`, `@runtime-intelligence/lit` and optional `@runtime-intelligence/panel` boundaries;
2. build the React intelligence pipeline on the same generic core;
3. make TrustWeave consume `core + react + panel` in development mode only;
4. retire the transitional TrustWeave-vendored generic toolkit after canonical feature equivalence is proven.

## Explicit non-goals right now

- production instrumentation in TrustWeave
- backend recommendation/brainwork service before frontend evidence quality is proven
- Vue/Angular before React dogfood works
- heavy JavaScript obfuscation as a supposed security boundary
