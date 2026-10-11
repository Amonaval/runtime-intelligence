# P0 — Universal Source Pinpoint / Provenance

**Priority:** P0 — blocks framework expansion  
**P0.1 status:** implemented in source; real TrustWeave browser closure still required

## Why this is now the product priority

Runtime Intelligence already detects and correlates meaningful runtime problems. The value proposition is weak if a finding still leaves the developer searching the repository manually.

The product target is:

> A real finding should lead the developer to the most relevant application source location the runtime can honestly prove, with file, line, column and a short application-only stack where available.

Angular and other framework expansion are deferred until this workflow is mature enough to be a defining product advantage.

## P0.1 — Runtime invocation provenance

P0.1 introduces one framework-neutral provenance primitive and wires existing runtime evidence through it.

Implemented:

- application-frame extraction from V8/Chrome and Firefox-style stacks;
- filtering of Runtime Intelligence, React/runtime, `node_modules`, Next internals and bundler runtime frames;
- project-facing path normalization for Next/webpack module paths;
- local-machine path minimization so usernames/workspace roots are not retained unnecessarily;
- bounded provenance: at most a small application-only frame list is retained;
- network `fetch`/XHR evidence now preserves the caller source that `LdsNetwork` was already capturing instead of dropping it at the UREP boundary;
- failed/unhandled browser errors derive an application source from browser location/stack when available;
- sequential-request opportunities retain the common originating source as explicit `common-origin` provenance;
- legacy Lit network evidence receives the same invocation provenance;
- Opportunities shows file:line:column, provenance meaning and an expandable application stack;
- canonical Pinpoint can enrich legacy finding cards from UREP evidence, including failed-network source locations, without forking or rewriting the mature panel.

## Provenance semantics

A source location is not automatically a root cause.

The bounded metadata distinguishes meanings such as:

- `invocation` — where an intercepted operation was called;
- `registration` — where a tracked resource was registered;
- `error-origin` — the application frame associated with an error;
- `component-definition` — framework/build metadata identifying a component definition;
- `common-origin` — a common call site shared by a correlated request sequence;
- `related` — useful source context without stronger semantics.

The existing evidence ladder remains unchanged. P0 does not manufacture confirmed causality.

## Deliberate boundary

React Profiler callbacks do **not** provide a trustworthy component-definition stack. P0.1 therefore does not capture `new Error().stack` inside `onRender` and pretend that React internals identify the expensive TSX line.

Original React/Next source definition and source-map resolution are P0 follow-up work. They should use build/source-map metadata where runtime stacks cannot prove the location.

## Validation performed for P0.1

Focused executable harnesses cover:

- TrustWeave-style Next/webpack call stacks;
- Firefox-style stacks;
- internal-only stacks producing no invented source;
- local-path privacy minimization;
- generated Next chunk paths remaining explicitly generated;
- network invocation attribution;
- unhandled rejection attribution;
- legacy Lit network bridge provenance;
- Opportunities source presentation;
- canonical Pinpoint network-source enrichment.

Full repository release validation and real TrustWeave browser dogfood are separate closure gates and must not be inferred from these focused checks.

## P0 closure gate

P0 is not fully closed until real TrustWeave dogfood demonstrates this workflow:

1. trigger or observe an unfamiliar real finding;
2. open Runtime Intelligence;
3. use the displayed source location/application stack;
4. arrive at the relevant TrustWeave code without manually searching the repository;
5. preserve honest labels when only generated or related source is available.

## Next — P0.2

**React/Next original-source attribution + source-map/build metadata + real TrustWeave closure.**

Recommended effort: **HIGH**.

This remains ahead of Angular or any new framework adapter.
