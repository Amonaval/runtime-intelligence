# Runtime Intelligence roadmap

## Foundation / intelligence core — COMPLETE

Missions 01–12 established FrameworkAdapter v2, UREP, EvidenceGraph/root-cause grouping, source resolution, incident recording, workflow verification, resource ownership, privacy/redaction, governance and shared advisers.

## React productization / parity — COMPLETE

R5.2 through R5.7.4 unified React with the canonical mature panel, shared browser collectors/intelligence, ownership/profiling, Fault Lab validation, normalized JSON/HTML reports and first-class Opportunities.

Do not restart React parity work unless real dogfood exposes a concrete defect.

## R6 — Productization & distribution — COMPLETE

### R6.1 — DONE — MEDIUM
Package Contract & Publish Safety.

### R6.2 — DONE — MEDIUM-HIGH
Production Safety & Conditional Loading.

### R6.3 — DONE — MEDIUM
Developer Onboarding & Reproducible Installation.

### R6.4 — DONE — MEDIUM-HIGH
Public API Stability & Extension Contract.

### R6.5 — DONE — LOW-MEDIUM
Distribution / License / IP Strategy.

- package remains `runtime-intelligence` and `private: true`;
- proprietary `UNLICENSED` baseline + `LICENSE.md`;
- authorized private Git/tarball distribution only;
- no public registry and no hard-coded registry;
- distribution posture enforced by `npm run distribution:validate`;
- release validation includes distribution policy;
- obfuscation is not treated as an IP boundary;
- secret/premium intelligence may later live behind an opt-in service boundary;
- historical rights are not claimed to be revoked.

## R7 — NEXT — MEDIUM-HIGH

Vue Adapter + Vue Fault Lab.

- add Vue adapter without duplicating intelligence logic;
- reuse UREP, shared browser surface, shared advisers and canonical panel;
- define evidence-capability honesty for Vue before implementing collectors;
- build a focused synthetic Fault Lab;
- validate package/onboarding/API contracts remain unchanged or are deliberately versioned.

## After R7

Angular Adapter + Angular Fault Lab, then broader dogfood/adoption work as justified by real consumers.
