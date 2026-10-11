# P0 — Universal Source Pinpoint / Provenance

**Priority:** P0 — blocks framework expansion  
**P0.1 status:** implemented and pinned into TrustWeave dogfood  
**P0.2 status:** implemented in source; real TrustWeave browser closure still required
**P0.3B/P0.4 status:** hostile browser acceptance complete; overall consumer closure still required

## Product target

Runtime Intelligence is not "wow" if it detects a useful problem but leaves the developer searching the repository manually.

The target is:

> A real finding should lead the developer to the most relevant application source location the runtime can honestly prove, with file, line, column and a short application-only stack where available.

Angular and other framework expansion remain deferred until this workflow is mature in real consumer use.

## P0.1 — Universal runtime invocation provenance

P0.1 established the framework-neutral provenance primitive and stopped losing source evidence already available at runtime.

Implemented:

- application-frame extraction from V8/Chrome and Firefox-style stacks;
- filtering of Runtime Intelligence, framework/vendor, `node_modules`, Next internals and bundler runtime frames;
- project-facing Next/webpack path normalization and local-machine path minimization;
- bounded application-only provenance frames;
- fetch/XHR invocation provenance preserved into UREP;
- browser error/unhandled-rejection origin when provable;
- sequential-request common-origin provenance;
- Lit network parity;
- Opportunities file:line:column + provenance/application stack;
- canonical Pinpoint enrichment from source-bearing UREP evidence.

P0.1 runtime baseline: `a465a67bc7378bba9b605f39bb41c1efb3b8b3bc`.

## P0.2 — Exact React source attribution

P0.2 strengthens React/Next source precision without pretending a React Profiler callback contains source information that it does not expose.

Implemented:

- `withRuntimeIntelligence(...)` captures its consumer/module registration stack once and can refine a filename-only boundary source to exact line/column when the captured frame is the same file;
- registration never borrows line/column from a different file;
- runtime-specific React hooks capture their actual application registration location once;
- tracked-state setters capture the application invocation stack at the state-update call site;
- effect errors retain an application-only error-origin stack where available;
- React owner metadata carries source provenance so Profiler observations can inherit the known component boundary location without changing Profiler evidence semantics;
- update-budget diagnostics preserve upstream source provenance instead of dropping it during derived intelligence;
- resource-lifetime diagnostics point to the tracked resource registration location rather than the later owner teardown location;
- canonical Pinpoint selects issue-relevant evidence (render/update/resource/error/network) instead of an arbitrary later event from the same owner;
- React-specific filtering rejects bundled Runtime Intelligence frames before choosing the first application frame.

### React evidence boundary

React Profiler remains:

- `observation` evidence;
- `framework-reported` attribution for render timing;
- no invented `UPDATE_CAUSE`;
- no invented causality.

A component registration location means **where the instrumented boundary was registered**, not necessarily the line responsible for an expensive render.

A state-update invocation location means **where the tracked update was requested**, not automatically the business/root cause.

## Provenance semantics

Source metadata distinguishes meanings such as:

- `invocation` — where an intercepted/runtime operation was called;
- `registration` — where a tracked resource/effect/state hook was registered;
- `error-origin` — the application frame associated with an error;
- `component-registration` — where an instrumented React boundary was registered;
- `component-definition` — framework/build metadata identifying the actual definition when available;
- `common-origin` — a common call site shared by a correlated request sequence;
- `related` — useful source context without stronger semantics.

A source location is not automatically a root cause. The UREP evidence ladder remains unchanged.

## P0.2 focused validation

Executable focused checks cover:

- React HOC registration exact source refinement;
- prevention of cross-file line borrowing;
- state-update invocation source selection;
- Profiler inheritance of known boundary source while remaining observation/framework-reported;
- existing React pending-update/correlation honesty semantics;
- Pinpoint selection of the correct render/update event rather than unrelated later evidence;
- source-provenance propagation through update-budget diagnostics;
- resource-lifetime diagnosis pointing to resource registration rather than owner teardown.

Focused P0.2 behavioral result during implementation: **16 passed, 0 failed**.

Syntax validation of the final changed/new JavaScript test/source files also passed.

This does **not** claim the full repository test suite or real-browser TrustWeave validation.

## Remaining P0 closure work

Real TrustWeave is the closure bar.

Required:

1. install the latest P0 runtime pin in TrustWeave and restart/clear stale Next output if needed;
2. exercise normal API-backed and instrumented React flows — no synthetic faults;
3. verify findings show application paths rather than Runtime Intelligence/React/Next/vendor frames;
4. verify exact line/column where runtime/registration stacks provide them;
5. confirm the displayed provenance label describes what the location means;
6. from an unfamiliar finding, open the displayed location and arrive at relevant TrustWeave code without repository search.

## Next within P0

The remaining hard case is **uninstrumented React component-definition/original-source attribution** where there is no exact runtime invocation or explicit/registration source.

Investigate a dev-only, evidence-honest path using React debug/fiber metadata and source-map/build metadata. If exact original source cannot be proven, preserve generated/related/unknown status rather than fabricating precision.

Angular stays blocked until this real-consumer acceptance test is strong.

## P0.4 acceptance update — 2026-10-12

Post-P0.4 hostile browser console source/lifecycle and actual JSON/HTML export acceptance is complete. Raw console/network collector stacks are omitted from exports while bounded UREP attribution is retained. Pinpoint distinguishes generated module/runtime coordinates from original source coordinates.

The ten-scenario matrix is 4 automatically actionable, 4 detected/source-limited, and 2 Level-0 unobservable. Development Fiber metadata did not expose child source in this Vite baseline. Keep those limitations honest. Full release validation passed (14 production checks and 285 unit tests).

See [P0.4-HOSTILE-ACCEPTANCE.md](P0.4-HOSTILE-ACCEPTANCE.md). This does not close the real-consumer acceptance requirement above: a post-P0.4 TrustWeave browser run remains NOT EXECUTED. After that gate, the roadmap is R8 hardening → R9 adoption → R10 Angular.

## Consumer gate disposition — 2026-10-11 UTC

The user stopped further TrustWeave work after its running normal-flow item. Playground load/timeline filtering passed; directory profile QA timed out at a locator. Later steps and connected API acceptance were NOT EXECUTED. The work item is closed partial; overall P0 acceptance remains incomplete. R8 proceeds at the user's explicit direction; see R8-HARDENING.md.
