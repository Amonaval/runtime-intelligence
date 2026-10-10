# Mission 11–12 Sync Note — Canonical Reconciliation

Status: COMPLETE
Date: 2026-10-10

This sync reconciles the user-provided v2/runtime-intelligence ZIP with the newer canonical GitHub main rather than replacing main wholesale.

## Imported from the ZIP

Mission 11 runtime intelligence:
- BackgroundSessionStore
- FalcorCallGraph
- SequentialApiDetector
- network call-site stack capture
- background monitoring gate
- Lit pipeline lifecycle/accessors/session report integration
- panel intelligence background/session refresh integration

Mission 12 opportunities:
- DomDuplicationAdvisor
- VirtualizationAdvisor
- PaintAdvisor
- WorkerOpportunityAdvisor
- IdleSchedulingAdvisor
- dedicated Opportunities presentation tab
- public barrel exports
- focused unit coverage

Product governance:
- PRODUCT.md
- DECISIONS.md
- KILL_LIST.md
- refreshed CLAUDE.md operating guide

## Canonical-main behavior deliberately preserved

The newer Mission 10F implementations remain authoritative for:
- UpdateBudgetMonitor continuous-episode debounce/re-arm semantics
- NetworkStateCorrelator evidence/correlation semantics
- React adapter/package work already present on main
- current evidence protocol/privacy hardening

## Panel reconciliation decision

The ZIP contains direct edits to the large `LdsDebugPanel.js` monolith. Those edits are not copied byte-for-byte because the newer product decision is to keep intelligence/opportunity extensions in presentation plugins rather than continuing to grow the panel monolith. The Mission 12 Opportunities UI is therefore provided through `panel-opportunities-presentation.js`; the canonical panel itself remains on the newer main lineage.

## Validation evidence

Focused ZIP suites for Mission 11 + 12 were executed together before sync:
- BackgroundSessionStore
- FalcorCallGraph
- SequentialApiDetector
- DomDuplicationAdvisor
- VirtualizationAdvisor
- PaintAdvisor
- WorkerOpportunityAdvisor
- IdleSchedulingAdvisor

Result: 44/44 passing.

The merge is intentionally additive: ZIP functionality is brought forward without regressing newer canonical Mission 10F behavior.
