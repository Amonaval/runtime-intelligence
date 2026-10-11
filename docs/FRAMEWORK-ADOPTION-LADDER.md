# Framework Adoption Ladder — How Much Instrumentation Is Needed?

Runtime Intelligence is designed so framework adoption starts with a very small integration and deeper instrumentation is optional. The product should not require developers to rewrite components just to obtain useful diagnostics.

## Level 0 — Runtime root: required, low effort

### React

Wrap the application once with `RuntimeIntelligenceProvider` and mount the canonical panel in development.

This starts the shared browser/runtime surface and gives useful data with no per-component changes:

- fetch/XHR Network and Slow API
- Core Web Vitals / long tasks where the browser exposes them
- browser errors and unhandled rejections
- console capture
- user interaction capture
- DOM duplication adviser
- virtualization adviser
- paint adviser
- worker opportunity adviser
- idle scheduling adviser
- EvidenceStore / EvidenceGraph / root-cause grouping
- incident flight recorder
- Intelligence summary / evidence capsule
- mature Runtime Intelligence panel

Effort: typically one integration component plus dev-only activation.

## Level 1 — Strategic component boundaries: recommended

React Profiler only reports useful component attribution where a boundary exists. Add `RuntimeIntelligenceProfiler` or `withRuntimeIntelligence()` around meaningful product surfaces, not every component.

Good candidates:

- page/root content surfaces
- large grids/lists
- editors/forms
- dashboards
- heavy modals/drawers
- expensive widgets

A typical application should start with roughly 3–10 strategic boundaries and add more only when dogfood proves a blind spot.

Provides:

- named React render timing
- source/file attribution supplied by the app
- structural parent/child ownership
- component-aware Perf/Pinpoint evidence

## Level 2 — Tracked state: targeted, optional

Use `useRuntimeTrackedState` for state whose update reason matters during investigation.

Do **not** replace every `useState` mechanically. Use it for:

- high-frequency state
- query/filter state
- state suspected of render churn
- critical workflow state where before/after evidence is valuable

Provides instrumented `UPDATE_REQUESTED` and `STATE_CHANGED` evidence and can power render-reason/property-thrash/update-budget analysis.

## Level 3 — Effect lifecycle: targeted, optional

Use `useRuntimeEffect` around important effects when lifecycle/error evidence matters.

Useful for:

- subscriptions
- data synchronization
- timers
- observers
- event buses
- effects suspected of feedback loops

Provides effect-start/effect-cleanup evidence and captures effect-thrown errors without inventing dependency causality.

## Level 4 — Resource ownership: targeted, highest diagnostic value for leaks

Use `useRuntimeResource` for resources with explicit ownership/lifetime, or call the adapter resource APIs for custom resources.

Examples:

- timers
- DOM/event-bus listeners
- observers
- sockets
- subscriptions
- workers
- application-specific handles

A matching acquire/release lets Runtime Intelligence prove a lifetime violation when an owner dies with an unreleased tracked resource.

## What React still does not claim automatically

Runtime Intelligence deliberately keeps these unsupported unless stronger evidence exists:

- arbitrary React `UPDATE_CAUSE`
- arbitrary hook/reactive dependency causality

Temporal proximity remains correlation, not proof.

## Lit adoption

Lit currently has a stronger automatic instrumentation surface because `LitDebugMixin` can wrap the framework lifecycle directly.

Typical integration:

```js
class RufElement extends LitDebugMixin(LitElement) {}
```

Every component inheriting that base automatically receives owner lifecycle, update request/start/complete instrumentation plus enabled memory/perf/error/property/cycle/event/slow-api tools. Page-level network, vitals and Intelligence initialize once.

For an application that already has a common Lit base element, the incremental developer effort can therefore be close to one base-class change plus tool activation.

## Vue / Angular / future frameworks

The intended architecture is the same, not a new product per framework:

```text
Framework plugin/adapter
        ↓
UREP EvidenceStore
        ↓
shared browser collectors + advisers
        ↓
EvidenceGraph / Intelligence
        ↓
canonical mature panel + normalized report
```

A future adapter should provide:

1. one root/plugin integration,
2. automatic lifecycle/render hooks where the framework exposes them safely,
3. strategic component boundaries only where automatic attribution is insufficient,
4. optional state/effect/resource instrumentation for semantics the framework does not expose reliably.

The Fault Lab pattern should also be cloned per framework: `react-fault-lab`, `vue-fault-lab`, `angular-fault-lab`, each running the same normalized scenario contract and producing the same JSON/HTML report schema.

## Practical effort summary

| Integration depth | React developer effort | Value |
| --- | --- | --- |
| Root runtime only | Very low | broad browser/network/vitals/error/DOM/adviser/intelligence coverage |
| + strategic profiler boundaries | Low | strong component/source performance attribution |
| + selected tracked state | Low–medium, targeted | render-reason/thrash/update-budget evidence |
| + selected tracked effects | Low–medium, targeted | effect lifecycle/error evidence |
| + tracked resources | Medium, only where valuable | strongest leak/lifetime evidence |

The design goal is **not** “instrument everything.” Start at Levels 0–1, dogfood, then add Levels 2–4 only where the diagnostic value justifies the few lines of code.
