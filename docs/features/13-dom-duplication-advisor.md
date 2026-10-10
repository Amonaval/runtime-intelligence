# DOM Duplication Advisor (13)

## Pain solved
Detects when a "singleton" UI element (modal, tooltip, dialog, drawer) is being instantiated
once per data item instead of being shared at parent level — 47 `<my-tooltip>` elements in the
DOM where one shared instance would serve all.

## Enable
```js
window.__LDS_DEBUG__ = true
// or
window.__LDS_INTELLIGENCE_ENABLED__ = true
// Advisor starts automatically when LitIntelligencePipeline starts.
```

## Window API
No direct window API. Findings appear in:
```js
window.__LDS_EVIDENCE_STORE__.snapshot({ type: 'diagnostic' })
  .filter(e => e.payload?.domDuplication === true)
```

## What it emits
`RuntimeEventType.DIAGNOSTIC` — `EvidenceLevel.OBSERVATION` — `AttributionQuality.HEURISTIC`

Payload fields:
- `domDuplication: true` — discriminator flag
- `duplicateTag: string` — the repeated custom element tag name
- `instanceCount: number` — count of simultaneous instances in DOM
- `commonAncestorTag: string` — nearest shared ancestor's tag name
- `identicalContent: boolean` — true if innerHTML lengths are within 10% of each other
- `strength: 'high' | 'medium'` — 'high' if identicalContent, else 'medium'

Confidence: 0.7 (identicalContent) or 0.5 (structural only)

## Where it surfaces
**Opportunities tab** (new `⚡ Opportunities` tab injected by `panel-opportunities-presentation.js`):
- Section border: `#f38ba8` (red — correctness severity)
- Header: "🔁 DOM Duplication — N patterns detected"
- Per entry: tag × count, ancestor, identical-content flag, actionable copy

**Pinpoint tab**:
- `issueType: 'dom-duplication'`
- `severity: 'high'` (identicalContent) or `'medium'`
- Recommendation: "Move `<duplicateTag>` to `<commonAncestorTag>` level and toggle via property."

## Known limits / future work
- Does not cross shadow DOM boundaries for LCA (stops at ShadowRoot host)
- `innerHTML` access guarded with try/catch for cross-origin shadow DOMs
- Custom element detection relies on tag name containing `-` (Web Components convention)
- Does not detect duplicated non-custom-element singletons (e.g. native `<dialog>`)
- Future: detect hidden vs visible instances to distinguish "prerendered pool" from true duplication
