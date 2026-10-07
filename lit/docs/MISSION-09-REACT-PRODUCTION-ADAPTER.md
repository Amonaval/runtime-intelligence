# Mission 09 — React Production Adapter

Status: COMPLETE

## Goal

Prove the framework-neutral runtime intelligence architecture against React without forcing React to imitate Lit lifecycle semantics.

The React adapter is production-safe, dependency-free and based only on public/explicit integration points.

## Delivered

- `src/adapter/react/ReactAdapter.js`
  - framework-neutral `FrameworkAdapter v2` implementation for React;
  - stable opaque instance tokens with lifecycle generations;
  - explicit mount/unmount evidence for instrumented component boundaries;
  - React Profiler-compatible callback bridge;
  - explicit update-request and state-change instrumentation;
  - effect lifecycle diagnostics;
  - resource acquire/release evidence compatible with Mission 06;
  - capability resolver for downstream evidence-strength capping;
  - no React Fiber/private internals;
  - no monkey-patching React;
  - no runtime dependency on `react` or `react-dom`.

- `test/unit/react-adapter.test.mjs`
  - capability honesty;
  - lifecycle generation isolation;
  - Profiler timing;
  - single-request structural correlation;
  - concurrent/batched-request ambiguity;
  - state evidence honesty;
  - resource ownership;
  - effect lifecycle;
  - late cleanup during unmount ordering;
  - reconnect isolation;
  - invalid-token fail-closed behavior;
  - duplicate connect idempotence;
  - structural diagnostics state.

- `src/index.js`
  - public `ReactAdapter` / `reactAdapter` export.

- `package.json`
  - direct `./adapter/react` export;
  - Lit peer dependency marked optional so React-only consumers are not forced to install Lit;
  - package description/keywords updated to reflect the framework-neutral direction.

## React integration model

The adapter intentionally does not import React. A React application supplies a stable opaque token, normally from `useRef({})`.

```text
React component boundary
       ↓
stable useRef token
       ↓
effect mount / cleanup
       ↓
ReactAdapter owner lifecycle
       ↓
UREP
```

A typical integration shape is:

```js
const runtimeToken = useRef({});

useEffect(() => {
  reactAdapter.connect(runtimeToken.current, {
    name: 'ProductEditor',
    source: { file: '/src/ProductEditor.jsx' },
  });

  return () => {
    reactAdapter.disconnect(runtimeToken.current);
  };
}, []);
```

The token is not a DOM node and not a Fiber object. It is only a stable application-owned identity handle.

## Capability model

Default adapter capability declaration:

```text
owner-lifecycle       partial
update-lifecycle      partial
update-cause          partial
state-change          partial
render-timing         partial
source-location       partial
reactive-dependency   unsupported
resource-ownership    partial
effect-lifecycle      partial
```

`render-timing` becomes `framework-reported` only when the adapter is created with:

```js
new ReactAdapter({ profilingEnabled: true })
```

This distinction is intentional because React's normal production build does not enable Profiler timing by default. Applications that use a profiling-enabled React production build can opt into the stronger capability declaration.

All other capability defaults remain conservative. A fully controlled integration may explicitly override individual capabilities through `options.capabilities` only when that deployment can actually prove stronger coverage.

## Profiler bridge

The adapter exposes a callback compatible with React Profiler's public `onRender` signature:

```js
const onRender = reactAdapter.createProfilerCallback(runtimeToken.current);
```

The callback records:

```text
profiler id
phase
actual duration
base duration
start time
commit time
```

It emits `component.update.completed`.

### Important correlation rule

React concurrent rendering and batching mean multiple scheduled updates may contribute to one commit.

Therefore:

```text
1 pending explicit request
    → may become parentEventId structural context

2+ pending requests
    → no single parent is selected

causedByEventId
    → never synthesized by the adapter
```

The adapter does not claim that one setter/dispatch definitely caused a specific commit.

## Update and state instrumentation

`recordUpdateRequested()` records that an explicitly instrumented application path scheduled/requested work.

`recordStateChange()` records an explicitly observed state value change.

These stay at observation-level evidence. They do not become causal attribution merely because they occurred before a Profiler commit.

State values flow through the existing Mission 07 enterprise privacy boundary when emitted to the normal `EvidenceStore`.

## Effect lifecycle

React effect lifecycle is represented as diagnostic evidence:

```text
react.effect.started
react.effect.cleanup
```

The adapter provides:

```js
createEffectBridge(token, effectId)
```

Cleanup remains recordable even after owner disconnect so different React cleanup ordering does not silently lose late cleanup evidence.

## Resource ownership

Explicitly instrumented resources can emit:

```text
resource.acquired
resource.released
```

Examples include:

```text
event listeners
timers
animation frames
observers
AbortController/fetch
WebSocket
workers
subscriptions
```

The individual acquire/release events can be deterministic because the wrapper knows exactly when it acquired or released the resource.

However the adapter-level capability remains:

```text
resource-ownership = partial
```

This is critical for Mission 06. The Resource Ownership Ledger can use:

```js
reactAdapter.createCapabilityResolver()
```

to cap lifetime-violation certainty to what the React integration really supports.

Explicit local instrumentation cannot silently upgrade framework-wide resource ownership coverage.

## Strict Mode / reconnect behavior

The same opaque token keeps the same physical `instanceId`, but every connect after a disconnect gets a new lifecycle generation:

```text
react-7-life-1
react-7-life-2
react-7-life-3
```

This prevents development Strict Mode mount/cleanup/remount behavior or real reconnects from collapsing separate ownership windows.

## Production-safety decisions

Mission 09 deliberately does not use:

- Fiber traversal;
- React DevTools global hooks;
- private renderer internals;
- scheduler monkey-patching;
- patched `useState` / `useReducer`;
- patched `createElement`;
- automatic dependency introspection.

Those approaches could increase coverage but would make the adapter fragile across React releases and undermine the evidence-quality model.

## Evidence law

React adapter events follow the same project invariant:

**observability limits cap claims.**

Examples:

```text
Profiler callback happened
→ framework-reported commit timing

instrumented set/dispatch path happened
→ observed update request

state observation happened before commit
→ temporal/structural context only

resource acquired in explicit wrapper
→ deterministic acquisition event

resource still active after owner cleanup
→ Mission 06 decides violation certainty using adapter capability
```

No React-specific bridge may promote correlation to causality by convention.

## Validation

Focused Mission 09 adapter tests were executed with Node's built-in test runner in an isolated ESM harness:

**14 passed, 0 failed**

The tests exercise the adapter contract without importing React itself, which is intentional because the adapter has no React runtime dependency.

A full checked-out repository test run and a browser React application integration run are not claimed in this connector environment.

## Known limits

- Automatic component coverage is not provided; applications must instrument the boundaries they care about.
- Standard React production builds do not provide Profiler timing callbacks by default.
- A profiling-enabled production build adds runtime overhead and should be enabled selectively.
- React concurrent rendering means an explicit update request cannot always be mapped one-to-one to a commit.
- Hook dependency causality is not inferred.
- Server Components / server rendering lifecycle are not covered by this client adapter.
- No Fiber/private React internals are used.
- No React-specific UI/panel integration is added in this mission.

## Architecture proof achieved

Mission 09 demonstrates that the core does not depend on Lit semantics:

```text
Lit Adapter ───┐
               ├─→ UREP → Privacy → Graph → Root Cause
React Adapter ─┘              ↓
                        Recorder / Verify
                        Ledger / Rules
                        Evidence Capsule
```

The same downstream intelligence layers can consume a second framework while preserving different capability strengths.

## Next mission

Mission 10 — Vue Production Adapter

Effort: MEDIUM-HIGH

Goal: add a Vue adapter using Vue's public lifecycle/watch/performance integration points while preserving the same capability-honesty and framework-neutral evidence contract.
