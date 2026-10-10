# Mission 12C — Paint Advisor

Status: COMPLETE

## Goal
Expose browser paint timing and repeated expensive CSS patterns as optimization evidence without overstating them as proven root causes.

## Implementation
- `lit/src/core/paint-advisor.js`
- framework-neutral
- PerformanceObserver paint timings with buffered capture
- idle/background CSS scan with a bounded element cap
- emits `paintTiming:true` and `expensivePaint:true` UREP diagnostics
- expensive layout-thrash inference remains deferred because its false-positive risk is higher
- surfaced in the Opportunities presentation

## Validation
Covered by `lit/test/unit/paint-advisor.test.mjs` and included in the Mission 11–12 focused 44/44 passing test run.
