# Runtime Intelligence roadmap

## Foundation / intelligence core — COMPLETE

Missions 01–12 established FrameworkAdapter v2, UREP, EvidenceGraph/root-cause grouping, source resolution, incident recording, workflow verification, resource ownership, privacy/redaction, governance and shared advisers.

## React productization / parity — COMPLETE

R5.2 through R5.7.4 unified React with the canonical mature panel, shared browser collectors/intelligence, ownership/profiling, Fault Lab validation, normalized JSON/HTML reports and first-class Opportunities.

Do not restart React parity work unless real dogfood exposes a concrete defect.

## R6 — Productization & distribution

### R6.1 — DONE — MEDIUM
Package Contract & Publish Safety.

### R6.2 — DONE — MEDIUM-HIGH
Production Safety & Conditional Loading.

### R6.3 — DONE — MEDIUM
Developer Onboarding & Reproducible Installation.

### R6.4 — DONE — MEDIUM-HIGH
Public API Stability & Extension Contract.

- exact public subpath/named-export baseline;
- `runtime-intelligence/extension` governed UREP extension surface;
- explicit `0.1` API compatibility contract;
- same-major UREP/extension compatibility;
- deep imports and `window.__LDS_*` classified internal;
- confirmed causality guarded by explicit extension opt-in;
- public API validation added to the release gate.

### R6.5 — NEXT — LOW-MEDIUM + OWNER DECISION
Distribution / License / IP Strategy.

Choose:

- final package name/scope;
- public vs private registry;
- intended license/IP position;
- whether any proprietary intelligence moves behind a service boundary;
- release/versioning mechanics for the chosen distribution model.

Browser JavaScript cannot be made truly uncopyable; obfuscation is only friction, not protection.

## After R6 baseline

Vue adapter + Vue Fault Lab, then Angular adapter + Angular Fault Lab, reusing the same UREP/report/Opportunities/Intelligence/extension/panel stack.
