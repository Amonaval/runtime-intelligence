# Runtime Intelligence roadmap

## Foundation / intelligence core — COMPLETE

Missions 01–12 established FrameworkAdapter v2, UREP, EvidenceGraph/root-cause grouping, source resolution, incident recording, workflow verification, resource ownership, privacy/redaction, governance and shared advisers.

## React productization / parity — COMPLETE

R5.2 through R5.7.4 unified React with the canonical mature panel, shared browser collectors/intelligence, ownership/profiling, Fault Lab validation, normalized JSON/HTML reports and first-class Opportunities.

Do not restart React parity work unless real dogfood exposes a concrete defect.

## R6 — Productization & distribution

### R6.1 — DONE — MEDIUM
Package Contract & Publish Safety.

- explicit stable package subpaths;
- generic package allowlist;
- accidental-publish guard;
- `npm pack` contract validation.

### R6.2 — NEXT — MEDIUM-HIGH
Production Safety & Conditional Loading.

- dev-only activation;
- near-zero disabled overhead;
- conditional loading/tree-shaking boundaries;
- no surprise production network calls.

### R6.3 — MEDIUM
Developer Onboarding & Reproducible Installation.

- 5-minute React/Lit quick starts;
- local tarball/install validation;
- troubleshooting and export workflow;
- replace temporary Git-SHA install UX with a deliberate distribution path once approved.

### R6.4 — MEDIUM
Public API Stability & Extension Contract.

- public vs internal API policy;
- UREP/plugin extension contract;
- compatibility/versioning rules;
- prevent consumers from relying on incidental browser globals.

### R6.5 — LOW-MEDIUM + OWNER DECISION
Distribution / License / IP Strategy.

Choose package naming, public vs private registry, intended license and any commercial-service boundary. Browser JavaScript cannot be made truly uncopyable; obfuscation is only friction, not protection.

## After R6 baseline

Vue adapter + Vue Fault Lab, then Angular adapter + Angular Fault Lab, reusing the same UREP/report/Opportunities/Intelligence/panel stack.
