# Paint Advisor (15)

## Pain solved
Surfaces First Paint / FCP timing and expensive CSS properties (filter, backdrop-filter,
box-shadow) that force expensive GPU layers on every frame — without requiring Lighthouse or
DevTools Layers panel.

## Enable
```js
window.__LDS_DEBUG__ = true
// Starts automatically with LitIntelligencePipeline.
```

## Window API
```js
window.__LDS_EVIDENCE_STORE__.snapshot({ type: 'diagnostic' })
  .filter(e => e.payload?.paintTiming === true || e.payload?.expensivePaint === true)
```

## What it emits
Two DIAGNOSTIC sub-types:

### (a) Paint Timing
`RuntimeEventType.DIAGNOSTIC` — `EvidenceLevel.OBSERVATION` — `AttributionQuality.DETERMINISTIC`
- `paintTiming: true`
- `metric: 'first-paint' | 'first-contentful-paint'`
- `valueMs: number`
- Emitted once per metric (deduplicated by `#paintTimingEmitted` Set)

### (b) Expensive CSS
`RuntimeEventType.DIAGNOSTIC` — `EvidenceLevel.OBSERVATION` — `AttributionQuality.HEURISTIC`
- `expensivePaint: true`
- `property: string` — e.g. `'filter'`
- `elementCount: number` — elements with this property
- `exampleTag: string` — one example custom element tag

Checked CSS properties: `filter`, `backdrop-filter`, `box-shadow`, `-webkit-filter`, `transform`
(only complex transforms — not identity transforms).

## Where it surfaces
**Opportunities tab** — section border `#fab387` (orange):
```
🎨 Paint Analysis
├── FCP: 1,240ms  First Paint: 890ms  [green/yellow/red]
└── Expensive CSS · 23 elements with filter
    Example: <x-card>
    → Limit to <10 elements; use will-change:transform only on animated elements
```

FCP color: green (<1800ms) / yellow (<3000ms) / red (≥3000ms)

**Pinpoint tab**:
- `expensivePaint` → `issueType: 'expensive-paint'`, `severity: elementCount > 30 ? 'high' : 'medium'`
- FCP > 3000ms → `issueType: 'paint-timing'`, `severity: 'high'`

## Performance note
CSS scan (`getComputedStyle`) uses `requestIdleCallback` if available, else `setTimeout(fn, 0)`.
Capped at 500 elements per scan cycle to avoid causing the paint issue being diagnosed.

## Known limits / future work
- Layout thrash detection (Mission 12F) is explicitly deferred — requires adapter-level
  instrumentation to avoid false positives from non-Lit layout shifts
- `transform` check only flags matrix3d/perspective — simple `translate` is excluded
- Paint timing is captured on `start()` with `buffered: true`; FCP seen before tool loads is
  still captured by the buffered observer
- Scans all elements, not just custom elements — intentional (expensive CSS often on leaf nodes)
