# Idle Scheduling Advisor (17)

## Pain solved
Identifies component updates that run on the main thread without any preceding user gesture —
background refreshes, analytics trackers, prefetch components — and suggests deferring them to
`requestIdleCallback` or `scheduler.postTask`.

## Enable
```js
window.__LDS_DEBUG__ = true
// Starts automatically with LitIntelligencePipeline.
```

## Window API
```js
window.__LDS_EVIDENCE_STORE__.snapshot({ type: 'diagnostic' })
  .filter(e => e.payload?.idleOpportunity === true)
```

## What it emits
`RuntimeEventType.DIAGNOSTIC` — `EvidenceLevel.CORRELATION` — `AttributionQuality.HEURISTIC`

Payload fields:
- `idleOpportunity: true`
- `ownerTag: string` — component tag name
- `durationMs: number` — update duration
- `trigger: 'periodic' | 'non-urgent'`
- `strength: 'high' | 'medium'`

Trigger classification:
- `'periodic'`: ≥5 updates from the same owner with gaps ≥2000ms and no preceding
  `STATE_CHANGED` event in the 500ms lookback window
- `'non-urgent'`: single update ≥16ms with no preceding `STATE_CHANGED`

Confidence: 0.6

## Where it surfaces
**Opportunities tab** — section border `#f9e2af` (yellow):
```
💤 Idle Scheduling Candidates — 3 non-urgent updates
├── <x-analytics-tracker> · 85ms · periodic (no gesture)
├── <x-prefetch-panel> · 42ms · non-urgent
└── → requestIdleCallback(fn, {timeout:2000})
    or scheduler.postTask(fn, {priority:'background'})
```

**Pinpoint tab**:
- `issueType: 'idle-scheduling-opportunity'`
- `severity: 'medium'`

## Precision note
Uses `RuntimeEventType.STATE_CHANGED` as a user-interaction proxy. `INTERACTION` events exist
in the protocol but are not yet wired by `LitAdapter`. This is conservative — more false
negatives (misses real opportunities) than false positives (false alarms). Precision improves
automatically once `INTERACTION` events are emitted by the adapter; no advisor code changes needed.

## Streaming data guard
Updates spaced <2000ms apart are NOT classified as "periodic" — they are likely live data feeds,
not schedulable background work.

## Known limits / future work
- Periodic timer detection based on inter-update gap, not on setInterval detection in call stack
- `STATE_CHANGED` proxy means any programmatic state change suppresses the signal, not only
  genuine user gestures
- Future: once `INTERACTION` events wired, swap `STATE_CHANGED` snapshot to `INTERACTION` filter
- Does not distinguish between "heavy but urgent" and "light but deferrable" — threshold is 16ms
