# Virtualization Advisor (14)

## Pain solved
Pinpoints the specific component rendering a large off-screen list, replacing the vague
"consider virtualising long lists" alarm that fires on total DOM node count.

## Enable
```js
window.__LDS_DEBUG__ = true
// Starts automatically with LitIntelligencePipeline.
```

## Window API
```js
window.__LDS_EVIDENCE_STORE__.snapshot({ type: 'diagnostic' })
  .filter(e => e.payload?.virtualizationOpportunity === true)
```

## What it emits
`RuntimeEventType.DIAGNOSTIC` — `EvidenceLevel.OBSERVATION` — `AttributionQuality.HEURISTIC`

Payload fields:
- `virtualizationOpportunity: true`
- `childTag: string` — repeated child element tag name
- `childCount: number` — total same-tag siblings
- `offScreenRatio: number` — fraction of children outside viewport (0–1)
- `parentTag: string` — nearest custom element ancestor
- `strength: 'high' | 'medium' | 'low'`

Strength thresholds:
- `'high'`: offScreenRatio ≥ 0.85 AND childCount ≥ 100
- `'medium'`: offScreenRatio ≥ 0.7 AND childCount ≥ 50
- `'low'`: offScreenRatio ≥ 0.7 AND childCount < 50

## Where it surfaces
**Opportunities tab** — section border `#94e2d5` (teal):
- "📦 Virtualization Candidates — N patterns"
- Per entry: child tag × count, off-screen %, parent, strength, library suggestion

**Pinpoint tab**:
- `issueType: 'virtualization-opportunity'`
- `severity: 'high' | 'medium'`
- Recommendation: "Use `@lit-labs/virtualizer` or `<virtual-scroller>` for `<childTag>` inside `<parentTag>`."

## Trigger
`MutationObserver` on `document.body` (`{ subtree: true, childList: true }`), debounced 300ms.
Also fires immediately on `start()`. Does NOT run on a clock — only on DOM structural changes.

## Known limits / future work
- `offScreenRatio` uses `getBoundingClientRect()` synchronously — safe here (advisor reads, not patches)
- Apps already using a virtualizer will show few same-tag children — correctly produces no output
- Does not detect non-custom-element lists (e.g. `<div>` children with data attributes)
- `parentTag` is `null` if no custom element ancestor is found within 20 hops
- Future: detect whether the parent already uses IntersectionObserver (no-op if already virtual)
