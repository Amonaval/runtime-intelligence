# Mission 12A — DOM Duplication Advisor

Status: COMPLETE

## Goal
Detect repeated singleton-style DOM structures such as tooltip/dialog/overlay custom elements and tell the developer what is duplicated and where a shared instance could live.

## Implementation
- `lit/src/core/dom-duplication-advisor.js`
- framework-neutral; zero Lit/React imports
- MutationObserver-driven with debounce
- emits UREP `DIAGNOSTIC` events with `domDuplication:true`
- reports duplicate tag, instance count, common ancestor, identical-content signal and strength
- surfaced in the dedicated Opportunities presentation

## Validation
Covered by `lit/test/unit/dom-duplication-advisor.test.mjs` and included in the Mission 11–12 focused 44/44 passing test run.
