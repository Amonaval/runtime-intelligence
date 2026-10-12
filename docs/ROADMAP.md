# Runtime Intelligence roadmap

## Governing product thesis

Runtime Intelligence must earn its complexity through the developer outcome:

```text
Evidence
→ trustworthy provenance
→ diagnosis/action
→ verification
```

It is not trying to replace browser DevTools, React/Vue DevTools, profiling, logs or APM for ordinary bugs.

The product should continue only where it materially improves difficult runtime investigations.

## Foundation / intelligence core — COMPLETE

Missions 01–12 established FrameworkAdapter v2, UREP, EvidenceGraph/root grouping, source resolution, incident recording, workflow verification, resource ownership, privacy/redaction, governance and shared advisers.

## React productization / parity — COMPLETE

R5.2 through R5.7.4 unified React with the canonical panel, shared browser collectors/intelligence, ownership/profiling, Fault Lab validation, normalized JSON/HTML reports and Opportunities.

Parity is closed. New React work is allowed only when real proof exposes a trust/value defect.

## R6 — Productization & distribution — COMPLETE

R6.1–R6.5 established package safety, conditional loading, onboarding, public API/extension stability and the private/proprietary distribution boundary.

## R7 — Vue Adapter + Vue Fault Lab — COMPLETE

Vue remains a thin evidence producer into the same UREP/intelligence/panel product.

## P0 — Source Pinpoint / Provenance — TECHNICALLY MATURE

P0 established bounded runtime invocation provenance, React targeted source refinement, hostile zero-touch acceptance, console provenance and explicit source-quality limits.

Real-consumer acceptance remains partial/parked. TrustWeave is not treated as a completed production proof.

## R8 — Multi-framework Product Hardening — COMPLETE WITH BOUNDED COVERAGE

R8 closed the highest-value lifecycle, compatibility, teardown, retention, privacy/export and development-overhead hardening risks.

Final release gate: **316 unit tests and 14 production checks PASS**.

## R9 — Adoption / Product Experience — COMPLETE

R9 added source/evidence explanations, targeted adoption guidance, current React/Vue/Lit recipes and consistent report guidance.

Full release gate: **319 unit tests and 14 production checks PASS**.

## R9.1 — Verification & Causality Contract — IMPLEMENTED

Before/after improvement no longer manufactures causality. A causal upgrade requires pre-existing governed `causality-confirmed` UREP evidence.

## R9.2 — Diagnostic Before/After — IMPLEMENTED

Framework-neutral guided baseline/replay flow over the shared EvidenceStore.

R9.3 supersedes cumulative-snapshot behavior with evidence sequence windows.

## R9.3 — Finding → Verify Fix + Lit Lab + Developer Guide — IMPLEMENTED

Delivered the bounded finding-to-verification bridge, Lit full-scale lab, unified developer guide and adversarial product review.

The strategic review explicitly makes future investment conditional on measurable developer advantage.

## R9.4A — Comparative Value Proof Pilot — IMPLEMENTED / HUMAN EXECUTION NEXT — HIGH

### Goal

Test whether Runtime Intelligence creates a real developer advantage rather than merely a technically coherent diagnostics framework.

Compare:

```text
native tools only
vs
RI Level 0
vs
RI targeted instrumentation
```

### Frozen pilot corpus

Nine real-behavior scenarios:

- 3 React;
- 3 Vue;
- 3 Lit;
- 3 source/provenance;
- 3 cross-signal;
- 3 action/verification.

The adjudication set deliberately balances:

- 3 analyzer-favorable;
- 3 neutral;
- 3 known-limit.

Injected/synthetic coverage is excluded from the pilot corpus.

### Measures

Record:

- time to relevant application source/boundary;
- time to actionable diagnosis;
- source quality;
- useful vs irrelevant vs false-positive findings;
- instrumentation files/lines;
- verification usefulness;
- developer choice to use again;
- explicit trust violations.

Timing is human-recorded only. No generated time-savings claims are allowed.

### Anti-bias controls

- each fault runs all three modes;
- first-run mode is counterbalanced 3/3/3;
- one bounded targeted step only;
- oracle is reviewed only after the three modes for a fault;
- oracle defines truth/evidence limits, not an expected winner;
- missing milestones stay missing instead of receiving guessed times.

### Mission artifacts

- `benchmarks/value-proof/README.md`
- `benchmarks/value-proof/faults.json`
- `benchmarks/value-proof/oracles.json`
- `benchmarks/value-proof/results-template.json`
- `scripts/validate-r9.4a-value-proof.mjs`
- `scripts/summarize-r9.4a-value-proof.mjs`
- `docs/R9.4A-COMPARATIVE-VALUE-PROOF-PILOT.md`

Run:

```bash
npm run value-proof:validate
npm run value-proof:summarize -- /path/to/results.json
```

The summarizer reports evidence; it intentionally does not declare a winner.

### Gate

R9.4A is a one-participant protocol/value pilot, not product approval.

Proceed only if actual runs show repeated concrete value without evidence overclaim, unacceptable false positives or excessive instrumentation.

If the pilot is promising, the next work is proof-driven fixes and independent/non-lab validation—not another framework.

## R9.4B — Proof-driven fixes / independent validation — CONDITIONAL

Do not pre-scope feature work.

R9.4B exists only if R9.4A data identifies a small number of concrete defects or promising unique jobs.

Allowed examples:

- wrong/misleading provenance;
- cross-framework semantic inconsistency exposed by the same fault class;
- advisor false positives;
- one adoption step that materially blocks value;
- verification UX/metric gap exposed by a real pilot case.

After those bounded fixes, repeat the affected comparisons and move to an independent developer or real consumer.

## Real-consumer validation — CONDITIONAL

TrustWeave remains parked.

Reopen TrustWeave or choose another real application only after the comparative pilot shows enough signal to justify consumer-integration cost.

Synthetic/fault-lab success never substitutes permanently for real usage.

## TypeScript public-surface completion — IMPORTANT, AFTER PROOF

Current public declarations cover several adoption surfaces but `/core` and `/lit` remain incomplete.

Finish public TypeScript coverage before broader external enterprise evaluation if the value proof remains positive.

Do not turn this into a broad TypeScript rewrite of internal implementation.

## R10 — Angular Adapter + Angular Fault Lab — DEFERRED

Angular is not the next priority.

React, Vue and Lit are already sufficient to validate architecture and product value.

Add Angular only after comparative and real-consumer evidence justifies broader framework expansion. Angular must remain a thin UREP producer into the shared product.

## Explicitly deferred while value proof is open

Do not spend the current phase on:

- more generic advisers;
- framework-count expansion;
- broad pipeline rewrites for aesthetics;
- speculative ML/confidence calibration machinery;
- new panel tabs;
- documentation-only missions;
- broad abstraction cleanup without a proof-driven defect;
- TrustWeave work without a strategic validation reason.

The next phase is about proving value, including the possibility that the correct outcome is to simplify or remove product surface.
