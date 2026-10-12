# R9.4A — Comparative Value Proof Pilot

This folder is a **study harness**, not product runtime code.

Its purpose is to test the thesis:

```text
Evidence
→ trustworthy provenance
→ diagnosis/action
→ verification
```

against the tools an experienced frontend engineer already has.

R9.4A compares three modes on the same nine difficult faults:

1. `native` — browser/framework tooling only; Runtime Intelligence off.
2. `ri-level-0` — the minimum supported Runtime Intelligence adoption for that framework.
3. `ri-targeted` — one bounded Level 1/2 instrumentation step only when Level 0 is insufficient.

The pilot deliberately contains:

- 3 React, 3 Vue and 3 Lit faults;
- 3 source/provenance, 3 cross-signal and 3 action/verification cases;
- 3 analyzer-favorable, 3 neutral and 3 known-limit cases;
- only real behavioral scenarios from the existing labs; injected coverage is excluded.

The last balance is stored in `oracles.json`. **Do not read an oracle before completing all three modes for that fault.**

## Why this is only a pilot

The existing fault labs are useful because they are reproducible, but they were built inside this repository and some scenarios overlap current analyzers.

Therefore R9.4A can prove whether the **measurement protocol works** and whether there is a credible product-value signal. It cannot by itself prove general market value.

A promising result must move next to an independent developer and/or a real consumer/non-lab incident.

## Freeze before running

Run:

```bash
npm run value-proof:validate
```

The validator asserts the corpus, counterbalancing and anti-confirmation-bias rules. Do not change the corpus after seeing results. If a fault is broken, record it as aborted and fix the corpus in a separately versioned follow-up.

## Run order

Each fault declares `runOrder`. The first mode is counterbalanced across the nine faults:

```text
3 start native
3 start RI Level 0
3 start RI targeted
```

This does not eliminate learning effects, but it prevents the same product from always benefiting from being run first or last.

Reset the application/state between runs.

For targeted mode, obey `targetedLimit`. The point is to measure the cheapest useful escalation, not to instrument the application until Runtime Intelligence wins.

## Timer contract

Human timing only.

Start the timer immediately before triggering the fault from a clean/reset state.

Record:

- `elapsedToRelevantSourceMs` when you can name the application file/boundary you would inspect next **and why**;
- `elapsedToActionableDiagnosisMs` when you can state a concrete code change or bounded next investigation.

If a milestone is not reached, leave the time `null` and record the reason. Do not replace failed runs with guessed durations.

## Record quality, not only speed

For every run capture:

- source precision/outcome;
- diagnosis usefulness;
- action specificity;
- verification usefulness;
- findings shown/useful/irrelevant/false-positive;
- instrumentation files/lines changed;
- whether you would use the mode again;
- any trust violation.

Trust violations are critical. Examples:

```text
generated coordinate presented as original source
correlation presented as causality
unowned resource presented as proven ownership
wrong source presented as exact
```

A faster wrong answer is a loss.

## Oracle review

After all three modes for one fault are complete, open `oracles.json` and adjudicate the recorded diagnosis against the known implementation.

The oracle defines ground truth and evidence-honesty requirements. It does **not** define an expected winner.

## Results file

Copy `results-template.json` to a separate results file and add exactly 27 run records for one complete participant:

```text
9 faults × 3 modes = 27 runs
```

Then run:

```bash
npm run value-proof:summarize -- /path/to/results.json
```

The summarizer checks completeness and protocol order, then reports mode-level:

- useful-source/diagnosis/action counts;
- milestone reach counts and human-measured medians;
- irrelevant and false-positive findings;
- trust violations;
- instrumentation cost;
- “would use again” responses.

It intentionally **does not declare a winner**. Timing medians are shown beside reach counts so a mode cannot look fast merely because hard cases failed before reaching the milestone.

## Decision rule

R9.4A is not product approval.

Continue to proof-driven fixes / independent validation only if there is repeated concrete value on difficult cases without unacceptable trust/noise/instrumentation cost.

Narrow or simplify if:

- native tooling is preferred on most cases;
- Runtime Intelligence mostly reorganizes information without improving the next action;
- Level 0/targeted useful outcomes remain below roughly half the corpus;
- verification rarely adds practical confidence;
- false positives or evidence overclaims undermine trust.

Do not add Angular or more generic analyzers to improve the benchmark.
