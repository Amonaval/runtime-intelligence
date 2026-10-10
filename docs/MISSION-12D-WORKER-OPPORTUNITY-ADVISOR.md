# Mission 12D — Worker Opportunity Advisor

Status: COMPLETE

## Goal
Identify expensive main-thread work that may be suitable for Web Worker offload, especially when it appears shortly after a large network response.

## Implementation
- `lit/src/core/worker-opportunity-advisor.js`
- framework-neutral
- PerformanceObserver long-task signal
- subscribes to UREP `NETWORK_COMPLETED` events rather than consumer globals
- temporal network correlation remains CORRELATION / TEMPORAL_INFERENCE, never causal proof
- deduplicates repeated script signals
- surfaced in the Opportunities presentation

## Validation
Covered by `lit/test/unit/worker-opportunity-advisor.test.mjs` and included in the Mission 11–12 focused 44/44 passing test run.
