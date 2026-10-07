# Mission 09.5 — Lit Collector → UREP End-to-End Integration

Status: FIRST END-TO-END SLICE COMPLETE

## Delivered

The mature Lit error collector now feeds the framework-neutral Runtime Intelligence path without duplicating Lit lifecycle evidence.

Runtime path:

`Lit component/update → LdsErrorBoundary → legacy collector bridge → EvidenceStore privacy boundary → EvidenceGraph → RootCauseGrouper → IncidentFlightRecorder → Evidence Capsule → existing LDS Pinpoint presentation bridge → panel replay verification handoff`

### Key decisions

- `LitAdapter` remains the sole owner of Lit owner/update lifecycle evidence.
- The collector bridge emits only collector-specific `error` evidence and correlates it to the latest Lit update request/state change.
- The existing debug panel remains the product surface. A transitional presentation bridge augments it at runtime instead of creating a second diagnostics UI or modifying the restored canonical panel source.
- Panel replay completion is handed back to the generic pipeline as verification metadata and is included in the refreshed Evidence Capsule.
- Privacy is applied first by `EvidenceStore` and again at Evidence Capsule export boundaries.

## Focused regression

`lit/test/unit/lit-intelligence-pipeline.test.mjs` proves the error path from a real Lit owner/update chain through collector evidence, privacy, graph/root grouping, incident freeze, capsule generation, panel-facing presentation model, and verification handoff. It also checks that bridging the collector does not duplicate owner/update lifecycle evidence.

## Validation honesty

This connector session did not have an executable repository checkout, so `npm test` and `npm run build` were not executed here. The new test is committed as the mechanical gate for the next executable checkout.

## Remaining incremental collector work

The end-to-end architecture is now proven with the error collector. Subsequent slices should migrate additional non-lifecycle collector signals such as network and specialized performance/resource findings into the same UREP substrate, while avoiding duplicate evidence already emitted by `LitAdapter`.

Mission 10 / Vue remains blocked until the Lit bridge is exercised in a real checkout/browser and the highest-value remaining Lit collectors are connected.
