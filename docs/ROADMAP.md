# Runtime Intelligence roadmap

## Foundation / intelligence core — COMPLETE

Missions 01–12 established FrameworkAdapter v2, UREP, EvidenceGraph/root-cause grouping, source resolution, incident recording, workflow verification, resource ownership, privacy/redaction, governance and shared advisers.

## React productization / parity — COMPLETE

R5.2 through R5.7.4 unified React with the canonical mature panel, shared browser collectors/intelligence, ownership/profiling, Fault Lab validation, normalized JSON/HTML reports and first-class Opportunities.

Parity is closed. React work is allowed when real dogfood or the hostile zero-touch benchmark exposes a concrete trust/value defect.

## R6 — Productization & distribution — COMPLETE

R6.1–R6.5 established package safety, conditional loading, onboarding, public API/extension stability and the private/proprietary distribution boundary.

## R7 — Vue Adapter + Vue Fault Lab — COMPLETE

Vue is another thin framework evidence producer into the same UREP/intelligence/panel product.

## P0 — ACTIVE — SOURCE PINPOINT / PROVENANCE

This program supersedes framework-count expansion. Optimize for developer time-to-relevant-code.

### P0.1 — DONE — HIGH

Universal runtime invocation provenance:

- shared application-frame extraction/filtering;
- bounded explicit provenance semantics;
- network/error source retained into UREP;
- sequential request common-origin provenance;
- Opportunities + Pinpoint file:line:column presentation;
- no fabricated source from internal/vendor-only stacks.

### P0.2 — DONE — HIGH

Exact React source attribution:

- HOC/component-boundary registration source with exact line/column when provable;
- exact invocation source for tracked state updates;
- exact registration source for runtime effects/resources;
- effect error-origin provenance;
- Profiler inherits known boundary source without upgrading render evidence;
- provenance preserved through update-budget and resource-lifetime derived diagnostics;
- issue-specific Pinpoint source selection.

Focused implementation validation: **16 passed, 0 failed**. P0.2 is pinned into TrustWeave for real-world validation.

### P0.3A — DONE IN SOURCE — MEDIUM-HIGH

Hostile uninstrumented React benchmark + cross-framework adoption guide.

Deliverables:

- a separate `examples/react-uninstrumented-lab` whose business components contain zero Runtime Intelligence imports/HOCs/hooks/profilers/manual provenance;
- one root-only Runtime Intelligence integration boundary;
- realistic faults covering network waterfall/failure, rejection, console noise, slow render, render storm, oversized list, resource leak, async race and main-thread report work;
- a static guard preventing the hostile business code from becoming accidentally instrumented later;
- explicit acceptance categories: automatically provable, detected-but-source-limited, and Level-0 unobservable;
- `docs/NEW-PROJECT-INTEGRATION-GUIDE.md` for React, Lit and Vue with Level 0 → Level 1 → Level 2 adoption guidance.

Static contract/parse validation is complete. Browser acceptance is intentionally P0.3B.

### P0.3B / P0.4 — HOSTILE ACCEPTANCE COMPLETE — MEDIUM-HIGH

Console invocation attribution is browser-verified without modifying business components. Lifecycle, privacy/export and evidence honesty passed; generated module coordinates are labelled. Acceptance matrix and development metadata findings: [P0.4-HOSTILE-ACCEPTANCE.md](P0.4-HOSTILE-ACCEPTANCE.md).

Known limits: no exact uninstrumented child render source; no original JSX source-map mapping; resource ownership and stale state-write cause remain unobservable at Level 0.

### P0 real-consumer check — CLOSED PARTIAL / DEFERRED

On 2026-10-11 UTC the user directed stopping TrustWeave after the running browser item and proceeding to R8. Installation/source gate/TypeScript, Playground load and timeline filtering passed. Directory profile QA timed out at its selector; later flows and connected API acceptance were not executed. This closes the work item, not overall P0 acceptance. No synthetic faults or generic runtime implementation were added to TrustWeave.

## R8 — Multi-framework Product Hardening — HIGH — IN PROGRESS

R8.1 shared browser lifecycle is complete: overlapping page-flag ownership, best-effort startup/teardown, stale callback isolation, in-flight fetch generation isolation and XHR listener release. See [R8-HARDENING.md](R8-HARDENING.md).

Remaining: React/Lit/Vue compatibility/version matrix, adapter/provenance contracts, broader runtime teardown stress, overhead budgets, production-disable behavior, repeated package/loader installation and report privacy regression. Existing evidence limits remain explicit.

## R9 — Adoption / Product Experience — MEDIUM

Improve installation, Level 0 → Level 1 → Level 2 guidance, framework recipes, troubleshooting, finding/provenance explanations, “why this source?” and “what next?” workflows, and demo integrations.

## R10 — Angular Adapter + Angular Fault Lab — MEDIUM-HIGH/HIGH — DEFERRED

Begin only after multi-framework hardening and an explicit roadmap decision; P0 consumer acceptance remains incomplete. Check current official Angular APIs and zoneless behavior at that time. Angular remains a thin UREP evidence producer into the existing shared product; no separate panel or intelligence engine.
