# Worker Opportunity Advisor (16)

## Pain solved
Identifies main-thread long tasks (>80ms) that correlate with large network responses, giving
developers a specific file/URL to move into a Web Worker.

## Enable
```js
window.__LDS_DEBUG__ = true
// Starts automatically with LitIntelligencePipeline.
```

## Window API
```js
window.__LDS_EVIDENCE_STORE__.snapshot({ type: 'diagnostic' })
  .filter(e => e.payload?.workerOpportunity === true)
```

## What it emits
`RuntimeEventType.DIAGNOSTIC` — `EvidenceLevel.CORRELATION` — `AttributionQuality.TEMPORAL_INFERENCE`

Payload fields:
- `workerOpportunity: true`
- `durationMs: number` — long task duration
- `scriptUrl: string` — script URL from `PerformanceLongTaskTiming.attribution[0].containerSrc`
  (empty string on Firefox/Safari where attribution is unavailable)
- `isThirdParty: boolean` — compares origin to `window.location.origin`
- `trigger: 'large-network-response' | 'longtask-only'`
- `networkResponseKB: number` — only present when `trigger === 'large-network-response'`
- `strength: 'high' | 'medium'`

Confidence: 0.55 (temporal correlation, not causation)

## Detection mechanism
1. `PerformanceObserver('longtask')` with threshold 80ms
2. Subscribes to `RuntimeEventType.NETWORK_COMPLETED` from evidence store (NOT `window.__LDS_NETWORK_LOG__`)
3. When a long task fires, scans recent network events for completions within 500ms before the
   task start where `responseSize > 100KB`
4. If match found: `trigger: 'large-network-response'`; otherwise: `trigger: 'longtask-only'`
5. Deduplicates by scriptUrl with 60-second cooldown per URL

## Where it surfaces
**Opportunities tab** — section border `#cba6f7` (purple):
```
⚙️ Worker Offload Candidates — 2 patterns
├── vendor/heavy-parser.js · 340ms
│   Triggered 120ms after 2.4MB network response
│   → new Worker(url) + postMessage
└── ...
```

**Pinpoint tab**:
- `issueType: 'worker-opportunity'`
- `severity: 'medium'`

## Browser compatibility
- `longtask` PerformanceObserver: Chromium only
- `PerformanceLongTaskTiming.attribution`: Chromium only (empty on Firefox/Safari)
- Advisor still runs on all browsers; `scriptUrl` is empty and `trigger` is `'longtask-only'`
  on non-Chromium — still useful as a duration signal

## Known limits / future work
- Temporal correlation is not causation; a co-incidental long task near a large fetch will
  fire with 0.55 confidence
- Does not distinguish between synchronous post-fetch processing vs unrelated work
- Future: use User Timing API marks from the app to confirm processing location
