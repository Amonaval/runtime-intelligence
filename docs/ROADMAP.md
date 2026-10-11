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

### R6.2 — DONE — MEDIUM-HIGH
Production Safety & Conditional Loading.

- default-off `/loader` dynamic-import boundary;
- disabled React path avoids runtime construction;
- disabled Lit path avoids adapter/collector activation;
- reversible network/console/vitals instrumentation;
- teardown restores host globals/listeners;
- focused proof that collector initialization does not initiate network requests.

### R6.3 — DONE — MEDIUM
Developer Onboarding & Reproducible Installation.

- root README with 5-minute React/Lit quick starts;
- local tarball is the recommended pre-registry install path;
- safe dev/debug enablement recipes;
- packed-artifact consumer smoke via `npm run onboarding:validate`;
- aggregate release validation command;
- troubleshooting and local report/export workflow;
- Git-SHA installs retained for existing dogfood, not promoted as final distribution UX.

### R6.4 — NEXT — MEDIUM-HIGH
Public API Stability & Extension Contract.

- public vs internal API policy;
- UREP/plugin extension contract;
- compatibility/versioning rules;
- prevent consumers from relying on incidental browser globals;
- identify any exports that should be stabilized, deprecated, or moved behind internal boundaries before wider distribution.

### R6.5 — LOW-MEDIUM + OWNER DECISION
Distribution / License / IP Strategy.

Choose package naming, public vs private registry, intended license and any commercial-service boundary. Browser JavaScript cannot be made truly uncopyable; obfuscation is only friction, not protection.

## After R6 baseline

Vue adapter + Vue Fault Lab, then Angular adapter + Angular Fault Lab, reusing the same UREP/report/Opportunities/Intelligence/panel stack.
