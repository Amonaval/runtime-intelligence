# Runtime Intelligence roadmap

## Foundation / intelligence core — COMPLETE

Missions 01–12 established FrameworkAdapter v2, UREP, EvidenceGraph/root-cause grouping, source resolution, incident recording, workflow verification, resource ownership, privacy/redaction, governance and shared advisers.

## React productization / parity — COMPLETE

R5.2 through R5.7.4 unified React with the canonical mature panel, shared browser collectors/intelligence, ownership/profiling, Fault Lab validation, normalized JSON/HTML reports and first-class Opportunities.

Parity is closed. React work is allowed when real dogfood exposes a concrete trust/value defect.

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

### P0.2 — DONE IN SOURCE — HIGH

Exact React source attribution:

- HOC/component-boundary registration source with exact line/column when provable;
- exact invocation source for tracked state updates;
- exact registration source for runtime effects/resources;
- effect error-origin provenance;
- Profiler inherits known boundary source without upgrading render evidence;
- provenance preserved through update-budget and resource-lifetime derived diagnostics;
- issue-specific Pinpoint source selection.

Focused implementation validation: **16 passed, 0 failed**. Real TrustWeave browser closure is still required.

### P0.3 — NEXT — HIGH

Real TrustWeave closure + remaining uninstrumented React/Next original-source path.

Goals:

- finding → displayed application file:line:column → relevant TrustWeave code without manual repository search;
- validate normal API-backed and React flows, never synthetic TrustWeave faults;
- investigate React dev/fiber debug metadata and source-map/build metadata for components that do not use a source-bearing boundary/hook;
- preserve generated/related/unknown when exact original source cannot be proven;
- avoid a mandatory build plugin unless real dogfood proves runtime/dev metadata insufficient;
- keep source location semantics distinct from causal/root-cause claims.

### P0.4 — only if dogfood justifies it

Extend provenance to additional high-value collectors or editor/deep-link ergonomics only when it measurably reduces time-to-relevant-code.

## R8 — Angular Adapter + Angular Fault Lab — BLOCKED

Do not start Angular until P0 source precision and the overall developer value proposition are mature and validated in real consumer use.

When unblocked, Angular must remain a thin UREP evidence producer and reuse the same provenance/intelligence/panel stack.
