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

### P0.3B — NEXT — MEDIUM-HIGH

Hostile browser acceptance + remaining uninstrumented React original-source path.

Goals:

- run every hostile scenario and record whether Pinpoint lands on the relevant application file:line:column;
- prove browser/network/error source attribution without touching business components;
- quantify where root Profiler evidence stops short of child-component attribution;
- test whether React development/Fiber metadata can safely refine source for those source-limited cases;
- use build/source-map metadata only where it produces a trustworthy original source;
- preserve generated/related/unknown when exact original source cannot be proven;
- avoid a mandatory build plugin unless hostile-app evidence proves runtime/dev metadata insufficient;
- keep source location semantics distinct from causal/root-cause claims.

### P0.4 — only if dogfood/hostile validation justifies it

Extend provenance to additional high-value collectors or editor/deep-link ergonomics only when it measurably reduces time-to-relevant-code.

## R8 — Angular Adapter + Angular Fault Lab — BLOCKED

Do not start Angular until P0 source precision and the overall developer value proposition are mature and validated in real consumer use.

When unblocked, Angular must remain a thin UREP evidence producer and reuse the same provenance/intelligence/panel stack.
