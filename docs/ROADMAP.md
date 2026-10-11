# Runtime Intelligence roadmap

## Foundation / intelligence core — COMPLETE

Missions 01–12 established FrameworkAdapter v2, UREP, EvidenceGraph/root-cause grouping, source resolution, incident recording, workflow verification, resource ownership, privacy/redaction, governance and shared advisers.

## React productization / parity — COMPLETE

R5.2 through R5.7.4 unified React with the canonical mature panel, shared browser collectors/intelligence, ownership/profiling, Fault Lab validation, normalized JSON/HTML reports and first-class Opportunities.

Parity is closed. New React work is allowed when real dogfood exposes a concrete trust/value defect.

## R6 — Productization & distribution — COMPLETE

R6.1–R6.5 established package safety, conditional loading, onboarding, public API/extension stability and the private/proprietary distribution boundary.

## R7 — Vue Adapter + Vue Fault Lab — COMPLETE

Vue is another thin framework evidence producer into the same UREP/intelligence/panel product.

## P0 — ACTIVE — SOURCE PINPOINT / PROVENANCE

This program supersedes framework-count expansion. Runtime Intelligence must first become extremely strong at turning runtime evidence into an actionable source location.

### P0.1 — Universal runtime invocation provenance — DONE IN SOURCE — HIGH

- shared application-frame extraction and filtering;
- bounded provenance metadata with explicit meaning;
- network invocation source preserved into UREP;
- browser error/rejection source attribution when provable;
- sequential request common-origin provenance;
- legacy Lit network parity;
- Opportunities file:line:column + provenance/application stack;
- canonical Pinpoint source enrichment;
- no fabricated source when only internal/vendor frames exist.

Full closure still requires real consumer validation.

### P0.2 — NEXT — HIGH

React/Next original-source attribution + source maps/build metadata + real TrustWeave closure.

Goals:

- identify component definition/original TSX location without pretending a React Profiler callback stack is the component source;
- use dev-build metadata and/or source-map providers where generated runtime coordinates need mapping;
- keep integration automatic or near-zero-friction for consumers;
- validate against real TrustWeave findings, not only Fault Labs;
- require finding → file:line → relevant code without manual repository search;
- retain generated/related/unknown labels when exact original source cannot be proven.

### P0.3 — only if real dogfood justifies it

Extend the same provenance primitive to additional high-value collectors such as console diagnostics and automatic resource registration/ownership callsites. Do not add collectors merely for breadth.

## R8 — Angular Adapter + Angular Fault Lab — DEFERRED / BLOCKED

Do not start Angular until P0 source precision and the overall developer value proposition are mature and validated in real consumer use.

When unblocked, Angular must remain a thin UREP evidence producer and reuse the same provenance/intelligence/panel stack.

## Governing roadmap rule

Optimize for **developer time-to-relevant-code**, not number of supported frameworks or number of diagnostics.
