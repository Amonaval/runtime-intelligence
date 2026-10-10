# Mission 12B — Virtualization Advisor

Status: COMPLETE

## Goal
Detect large repeated child collections where most elements are outside the viewport and identify strong candidates for list/grid virtualization.

## Implementation
- `lit/src/core/virtualization-advisor.js`
- framework-neutral
- MutationObserver + debounce rather than polling
- checks sibling counts and viewport geometry
- emits UREP `DIAGNOSTIC` events with `virtualizationOpportunity:true`
- reports parent/child tags, child count, off-screen ratio and signal strength
- surfaced in the Opportunities presentation

## Validation
Covered by `lit/test/unit/virtualization-advisor.test.mjs` and included in the Mission 11–12 focused 44/44 passing test run.
