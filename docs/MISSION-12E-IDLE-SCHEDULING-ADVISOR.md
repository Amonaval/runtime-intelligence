# Mission 12E — Idle Scheduling Advisor

Status: COMPLETE

## Goal
Identify meaningful non-user-triggered/periodic updates that may be candidates for idle or background-priority scheduling.

## Implementation
- `lit/src/core/idle-scheduling-advisor.js`
- framework-neutral and store-only
- observes UREP `UPDATE_COMPLETED`
- uses recent `STATE_CHANGED` as the current interaction proxy until explicit `INTERACTION` events are broadly wired
- recognizes periodic patterns with a minimum interval guard
- emits `idleOpportunity:true` correlation diagnostics
- surfaced in the Opportunities presentation

## Validation
Covered by `lit/test/unit/idle-scheduling-advisor.test.mjs` and included in the Mission 11–12 focused 44/44 passing test run.
