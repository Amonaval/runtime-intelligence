# Runtime Intelligence — Current Status

**Updated:** 2026-10-10  
**Canonical implementation baseline:** the latest user-supplied `v2/runtime-intelligence` snapshot. This file summarizes current state; it does not override implementation contracts established in that snapshot.

## Current product state

Runtime Intelligence is an additive developer-answer layer above the mature LDS panel.

Active path:

```text
runtime collectors/adapters
  -> UREP evidence store
  -> incident recorder
  -> evidence graph
  -> root-cause grouping
  -> developer summary
  -> Intelligence tab / evidence capsule
```

Evidence quality remains explicit: observations, correlations, attributions and confirmed findings must retain their actual evidence level.

## Strategic review state — keep intact

Claude's strategic review deliberately narrowed the active surface:

- `lit/src/archive/diagnostic-policy.js` — archived; detached from the active pipeline.
- `lit/src/future/resource-ownership-ledger.js` — deferred until resource acquire/release UREP wiring exists.
- historical architecture/mission material belongs under `lit/docs/archive/`.
- Claude's `lit/CLAUDE.md`, `lit/CODEBASE.md`, roadmap/session handovers and feature guides are part of the current knowledge surface.
- active development must build on this topology; do not automatically reconnect archived/future modules.

Lit is a **required** peer dependency by product decision. Do not make it optional unless that decision changes explicitly.

## Completed active missions

- Missions 01–09.5 — historical foundation; archive/defer decisions preserved.
- Mission 10A — Reactive Cascade Tracker.
- Mission 10B — Property Watch + mutation source.
- Mission 10C — Navigation / orphan-suspect diagnostics.
- Mission 10D — Network -> State correlator.
- Mission 10E — Component Update Budget Monitor.
- Mission 10F — Integrity hardening rebased on the canonical v2 implementation.

## Mission 10F state

1. **Mission 10D contract preserved.** A temporal network/state diagnostic keeps:
   - `correlation.causedByEventId = pending.networkEventId`
   - `correlation.traceId = net-trace-<network-event-id>`
   - `evidence.level = CORRELATION`
   - `evidence.attribution = TEMPORAL_INFERENCE`
   - `evidence.confidence = 0.6`
2. EvidenceGraph may therefore contain a `CAUSES` relation for that explicit reference, but the edge retains correlation-level / temporal-inference evidence. 10F must not silently upgrade the evidence quality.
3. Update-budget diagnostics emit once per continuous violation episode and re-arm after recovery.
4. Strategic archive/future topology remains authoritative.
5. Lit remains required in package metadata.
6. Confidence-aware product wording and structural-ancestry discounting from Claude's strategic review remain intact.
7. The canonical v2 replay-completion event (`lds-replay-complete`) is part of the expected panel/integration contract and must be retained.

## Source-of-truth correction

An earlier 10F pass incorrectly removed `causedByEventId` and documented Network -> State as TRACE_CONTEXT-only. That interpretation is superseded. The latest supplied v2 implementation is authoritative.

Likewise, an earlier repository overlay retained the older panel body and therefore missed the v2 `lds-replay-complete` dispatch. The corrective v2 rebase restores that integration contract rather than redesigning it.

## Validation

Focused hardening checks cover:

- canonical Mission 10D correlation metadata and evidence quality;
- update-budget episode de-duplication/recovery;
- required Lit dependency policy;
- strategic archive/future separation.

A final browser checkpoint in the real UI Platform remains required for product-level validation.

## Next validation checkpoint

Use real UI Platform scenarios:

1. runtime error -> wording must reflect actual evidence strength;
2. slow render -> named component/signal must be genuinely related, not merely a high ancestor;
3. network followed by state mutation -> Mission 10D correlation must retain its canonical metadata and temporal-inference evidence quality;
4. replay completion -> `lds-replay-complete` must reach Intelligence verification handling;
5. sustained over-render burst -> one budget diagnostic per episode, not one per render.

## Next development decision

After real-app validation, choose the next mission from current active value and Claude's canonical roadmap. Do not reconnect `src/archive/` or `src/future/` without an explicit product decision.
