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
- secret/premium intelligence may later live behind an opt-in service boundary.

## R7 — DONE — MEDIUM-HIGH

Vue Adapter + Vue Fault Lab.

- Vue is a thin UREP evidence producer, not a new product fork;
- owner lifecycle and update lifecycle use Vue application lifecycle hooks;
- update timing is an observed `beforeUpdate` → `updated` window, not render-only profiling;
- update cause and reactive dependency remain unsupported;
- app-level Vue errors feed the existing error evidence path;
- explicit resource ownership is supported without manufacturing lifetime violations;
- shared browser collectors, advisers, RuntimeIntelligencePipeline, Opportunities/report model and canonical panel are reused;
- `/vue` is a deliberate additive public API/package subpath;
- synthetic Vue Fault Lab covers representative validation cases.

Full checkout-level release validation and real-browser Fault Lab execution remain validation gates rather than assumed results.

## R8 — NEXT — MEDIUM-HIGH

Angular Adapter + Angular Fault Lab.

- define an Angular capability/evidence matrix before implementation;
- reuse UREP and shared intelligence;
- avoid framework-specific root-cause/opportunity/report/panel forks;
- create only the smallest synthetic lab needed to validate Angular evidence semantics;
- preserve production-safe conditional loading and the private package contract.

## After R8

Broader dogfood/adoption work should be justified by real consumers and defects, not framework-count targets.
