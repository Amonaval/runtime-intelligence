# Mission 01 — FrameworkAdapter v2 + Universal Evidence Protocol

**Status:** implemented and locally verified  
**Goal:** remove Lit semantics from the framework contract without regressing the mature Lit product.

## Delivered

1. `src/core/evidence-protocol.js`
   - schema v1
   - universal event types
   - evidence level and attribution quality as separate dimensions
   - framework capability vocabulary
   - privacy-aware runtime value summaries
   - validation/normalization
2. `src/core/evidence-store.js`
   - bounded local evidence buffer
   - subscription API
   - type/owner/trace filtering
   - `window.__LDS_EVIDENCE_STORE__` and `window.__LDS_EVIDENCE__()` bridge
3. `FrameworkAdapter.js` v2
   - neutral `emit()` API
   - explicit capability contract
   - no Lit lifecycle methods in the base interface
4. `LitAdapter.js` v2
   - deterministic component lifetime evidence
   - framework-reported property/update cause
   - update start/complete timing evidence
   - raw objects summarized, not retained
   - legacy Lit helper methods preserved as compatibility shims
5. `LitDebugMixin.js`
   - connects/disconnects Lit owners
   - records update requests and render lifecycle through v2
   - preserves synchronous vs Promise `performUpdate()` return semantics
   - marks owner destroyed after disconnect cleanup
   - existing LDS tools still operate
6. Unit tests for protocol/store/capabilities/Lit adapter compatibility.

## Deliberate non-goals

- No evidence graph yet.
- No root-cause grouping yet.
- No React/Vue/Angular adapter implementation in this mission.
- No migration of all existing LDS globals into UREP yet.
- No panel redesign.

Those choices keep Mission 1 foundational and low-risk.

## Product laws preserved

- evidence first, model second;
- correlation is not causality;
- framework adapters enrich semantics but do not redefine core truth;
- mature Lit workflow remains usable;
- no cloud/backend/paid dependency.

## Verification

Run:

```bash
cd lit
npm test
node --check src/core/evidence-protocol.js
node --check src/core/evidence-store.js
node --check src/adapter/FrameworkAdapter.js
node --check src/adapter/lit/LitAdapter.js
node --check src/LitDebugMixin.js
```

Local result: **7 tests passed, 0 failed**.

## Next recommended mission

**Mission 02 — Evidence Graph + causal/root-cause grouping** — HIGH effort.

Why next: Mission 1 creates normalized nodes/events. Mission 2 creates the relationships that turn telemetry into product intelligence: interaction → state → update → network/resource/browser symptom, while preserving evidence strength per edge.
