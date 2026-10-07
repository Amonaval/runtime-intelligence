# Claude Review Loop and Mission 09.5 Decision Log

## Why this file exists

This repo is now using a deliberate builder/reviewer loop:

1. ChatGPT implements the mission and keeps the repo moving.
2. Claude independently reviews the resulting code and architecture.
3. Review feedback is not accepted automatically. It is checked against the actual current `main` branch, existing contracts, tests, and product constraints.
4. Useful feedback is incorporated; weak, duplicate, premature, or semantically incorrect suggestions are rejected with justification.
5. The loop repeats until the mission is genuinely closed.

This is a good strategy for this project because it reduces single-model blind spots while preserving one coherent implementation direction. The user acts as the arbiter and keeps both systems evidence-driven.

This review loop should be reused periodically at meaningful boundaries rather than after every tiny edit. Recommended checkpoints:

- after a compatibility-sensitive mission,
- after an architectural integration mission,
- before introducing a new framework adapter,
- before large product-surface changes,
- before declaring a milestone closed.

The goal is not to maximize review comments. The goal is to find high-value mistakes while keeping missions efficient.

---

## Review considered

Claude re-reviewed the post-baseline `runtime-intelligence` work and recommended continuing the current direction. It identified the error-boundary -> UREP -> recorder -> evidence graph -> root cause -> evidence capsule -> existing LDS panel -> replay verification path as stronger than its earlier proof of concept.

The overall verdict was accepted.

The review also proposed or highlighted:

- slow-render incident triggering,
- bridging legacy perf data,
- confirmed root-cause-strength coverage,
- candidate-score tie-break coverage,
- replacing private `_completeReplay` coupling with a public event later,
- a public `analyzeIncident()` API,
- bridging network evidence,
- gating the intelligence panel bridge,
- eventually removing prototype mutation.

---

## Corrections made to the review itself

The review was useful but not perfectly reconciled with the current Git history.

Two commit descriptions were reversed:

- `953c994` is `feat: add Lit intelligence pipeline coordinator`.
- `1969bae` is `feat: surface generic intelligence in existing LDS panel`.

The review also undercounted the post-baseline commits by omitting the next-session handover and focused panel-compatibility cleanup commits.

These are bookkeeping errors, not architecture blockers, but they reinforce the reason for verifying reviewer claims against `main` rather than applying recommendations mechanically.

---

## Feedback accepted and implemented

### 1. Add slow Lit incident triggering

Accepted, with an important semantic refinement.

`LitAdapter.recordUpdateCompleted()` already emits UREP `UPDATE_COMPLETED` evidence with `payload.durationMs`. That is the correct signal for an individual Lit update/render duration.

Mission 09.5 now treats a qualifying `UPDATE_COMPLETED` as an incident trigger using a configurable threshold. The initial default is 500 ms to align with the mature diagnostic suite's existing notion of a visibly slow component path.

The incident pipeline now supports:

- `ERROR` -> reason `lit-runtime-error`
- slow `UPDATE_COMPLETED` -> reason `lit-slow-update`

This keeps incident detection inside the framework-neutral evidence path rather than creating a second Lit-specific slow-render collector.

### 2. Preserve opt-in diagnostic semantics

Accepted and promoted in priority.

The previous integration started `LitIntelligencePipeline` unconditionally from `LitDebugMixin._initPageTools()`. That conflicted with the repo's explicit opt-in diagnostics model, particularly after gate behavior had just been hardened.

The intelligence pipeline is now gated via `_toolEnabled('intelligence')` and can be independently enabled with:

```js
window.__LDS_INTELLIGENCE_ENABLED__ = true;
```

It is also enabled by the normal master debug semantics:

```js
window.__LDS_DEBUG__ = true;
```

or:

```js
window.__LDS_DEBUG__ = { intelligence: true };
```

The lightweight UREP adapter lifecycle itself remains part of the mixin architecture. The recorder, incident analysis, and panel presentation are the opt-in product behavior.

### 3. Add slow-incident regression coverage

Accepted.

The Mission 09.5 integration test now covers:

- a qualifying UREP `UPDATE_COMPLETED` incident,
- the `lit-slow-update` reason,
- capsule problem semantics,
- the configured threshold in capsule environment metadata,
- a below-threshold update that must not freeze/create an incident.

### 4. Add root-cause hardening tests

Accepted in principle and intended to be bundled into Mission 09.5 closure rather than split into standalone missions:

- confirmed-cluster-strength behavior,
- candidate-score/tie-break behavior where current implementation contracts expose this deterministically.

The purpose is to protect root-cause ranking semantics cheaply, not to create test-only scope.

### 5. Track private panel coupling as transitional debt

Accepted.

`panel-intelligence-presentation.js` currently wraps `LdsDebugPanel.prototype.updated` and the private `_completeReplay` method. The patch is guarded and intentionally transitional, but `_completeReplay` remains a fragile private coupling.

The preferred future direction is a stable replay-complete event or public integration hook from the canonical panel flow. This should be done when panel evolution is intentionally allowed; it is not a reason to refactor the canonical panel during this compatibility-sensitive mission.

### 6. Bridge network evidence after the core incident semantics are stable

Accepted as the next high-value collector integration, provided it can be added without duplicating existing adapter lifecycle evidence or changing legacy network behavior.

---

## Feedback deliberately not taken as proposed

### 1. "Port perf.js" as the slow-render source

Not taken literally because it conflates two different measurements.

The legacy `perf.js` measures component TTI from `connectedCallback` to first `updateComplete`. It records a legacy slow-render entry when that first-render path exceeds 500 ms.

The UREP Lit adapter measures individual update duration from `performUpdate` start to completion and emits it as `UPDATE_COMPLETED.payload.durationMs`.

These signals answer different questions:

- UREP `UPDATE_COMPLETED.durationMs`: how long did this Lit update take?
- legacy `perf.js`: how long from component connection to first committed render?

Therefore slow update incidents use UREP directly. If legacy perf is bridged later, it must preserve explicit first-render/TTI semantics rather than duplicating `UPDATE_COMPLETED` as another "slow render" event.

### 2. Add `analyzeIncident()` public API now

Deferred.

The current product flow is intentionally evidence-driven:

`EvidenceStore -> IncidentFlightRecorder -> EvidenceGraph -> RootCauseGrouper -> EvidenceCapsule -> existing panel`

A public imperative analysis API would add contract surface without a demonstrated consumer. It should be introduced when another real integration needs programmatic incident analysis, not pre-emptively.

### 3. Refactor prototype mutation immediately

Deferred.

The bridge is guarded, small, and exists specifically to avoid modifying the restored canonical panel while still proving product integration. Replacing it now would expand the mission and risk panel compatibility.

It is tracked as debt and should be removed at a deliberate panel-integration milestone.

### 4. Start Mission 10 / Vue now

Rejected for this checkpoint.

Mission 09.5 still needs closure-level hardening and real executable/browser validation. Starting another framework before validating the Lit integration would repeat the pattern this project is explicitly trying to avoid: breadth before verified closure.

---

## Refined Mission 09.5 continuation

The continuation plan is intentionally compact:

1. Generalize the intelligence incident trigger policy beyond errors.
2. Add UREP-native slow Lit update incidents with a configurable 500 ms default.
3. Restore opt-in intelligence recorder/panel behavior.
4. Add slow-path and below-threshold regression tests.
5. Add the remaining root-cause hardening tests where the current public behavior supports deterministic assertions.
6. Bridge the highest-value remaining legacy signal, starting with network, only if it can remain semantically clean and non-duplicative.
7. Keep the canonical `LdsDebugPanel.js` untouched.
8. Keep replay private-method wrapping explicitly transitional.
9. Perform an executable/browser validation checkpoint before Mission 10/Vue.

---

## Mission efficiency rule

For future missions and review cycles:

- code/tests first,
- documentation should explain decisions, not substitute for implementation,
- prefer one mission commit, but use 2-3 focused commits when it keeps risk clear,
- do not add public API without a real consumer,
- do not introduce a second diagnostics product beside the existing LDS panel,
- do not duplicate evidence already emitted by a framework adapter,
- preserve baseline compatibility unless an intentional migration explicitly changes it,
- stop expanding scope once acceptance criteria are met,
- use independent review at strategic checkpoints, not as a reason to churn working code.

---

## Validation honesty

The GitHub connector can inspect and mutate the repository but does not provide an executable working tree in this session. Therefore commits, source contracts, and static regression intent can be verified here, but `npm test`, build output, and browser behavior must not be claimed as executed unless they are run in an environment that actually executes the repo.

If Claude has an executable checkout and reports test results, treat those as reviewer evidence. They still should be reconciled with the exact reviewed commit SHA.
