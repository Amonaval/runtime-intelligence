# Mission 10F — Integrity + Evidence Semantics Hardening

## Goal

Harden the active Runtime Intelligence path **on top of Claude's latest v2 strategic-review state**, without reconstructing older work or silently changing established v2 contracts.

The latest user-supplied `v2/runtime-intelligence` snapshot is the baseline truth for this mission.

## Existing strategic decisions preserved

- Confidence-aware wording remains active: correlated -> **Strongest signal**, attributed -> **Likely cause**, confirmed -> **Confirmed cause**.
- Root-cause scoring continues to heavily discount structural `PARENT` ancestry versus explicit `CAUSES` reachability.
- `diagnostic-policy.js` remains archived under `src/archive/`.
- `resource-ownership-ledger.js` remains deferred under `src/future/`.
- Historical architecture/mission material remains under `lit/docs/archive/`.
- Claude's `CLAUDE.md`, `CODEBASE.md`, roadmap/session handovers and feature guides remain part of the current knowledge surface.
- Lit is a **required** peer dependency. 10F does not change dependency policy.

## Change A — Preserve canonical Mission 10D correlation contract

Claude's latest v2 implementation intentionally emits the network/state diagnostic with:

```text
correlation.causedByEventId = pending.networkEventId
correlation.traceId         = net-trace-<network-event-id>
evidence.level              = CORRELATION
evidence.attribution        = TEMPORAL_INFERENCE
evidence.confidence         = 0.6
```

10F preserves this contract exactly.

The important evidence-quality guard is that the relationship remains explicitly classified as **correlation / temporal inference**, not attribution or confirmed causality. EvidenceGraph may represent `causedByEventId` as a `CAUSES` relation, but the edge inherits the target event's correlation-level evidence metadata.

10F must not remove `causedByEventId` merely to reinterpret the Mission 10D design.

## Change B — Update-budget episode debounce

One continuous over-budget burst should create one actionable diagnostic, not a diagnostic for every subsequent update.

```text
under budget
  -> threshold crossed: emit once, mark violating
  -> still over budget: no new diagnostic
  -> rolling window recovers: clear violating
  -> threshold crossed later: emit a new episode
```

This is additive hardening and does not change Claude's Mission 10E public API or budget semantics.

## Change C — Replay completion integration

The canonical v2 `LdsDebugPanel._completeReplay()` dispatches:

```js
this.dispatchEvent(new CustomEvent('lds-replay-complete', {
    detail: { comparison: comp, status: 'done' },
    bubbles: true,
    composed: true,
}));
```

That event is part of the latest v2 integration state and must be retained. It decouples replay completion from Intelligence presentation/verification consumers.

## Change D — Strategic-review topology integrity

10F preserves Claude's strategic review instead of reconnecting deferred work:

- `src/archive/diagnostic-policy.js` stays inactive.
- `src/future/resource-ownership-ledger.js` stays inactive.
- their tests remain outside the active `test/unit/*.test.mjs` glob.
- historical docs stay archived.
- current Mission 10A–10E docs/features remain active.

## Regression coverage

10F verifies:

- network/state diagnostics retain canonical `causedByEventId` and `net-trace-*` metadata;
- their evidence stays `CORRELATION / TEMPORAL_INFERENCE` with confidence `0.6`;
- EvidenceGraph keeps the relationship without upgrading its evidence quality;
- a continuous update-budget breach emits once;
- recovery re-arms the budget monitor;
- Lit remains a required peer dependency.

## Source-of-truth correction

An earlier 10F pass incorrectly removed `causedByEventId` and omitted the panel's `lds-replay-complete` hook based on a review interpretation. That is superseded by this rebase: the latest supplied v2 snapshot is canonical, and 10F now layers only non-conflicting hardening on top of it.

## Validation target

Before closure:

```text
npm test
npm run test:smoke
npm run build
```

plus real UI Platform validation of runtime error, slow render, network/state correlation, replay verification, and sustained over-render bursts.
