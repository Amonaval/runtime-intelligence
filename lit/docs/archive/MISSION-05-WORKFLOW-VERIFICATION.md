# Mission 05 — Generic Baseline + Compare + Verify + Evidence Capsule

> **Historical semantic note:** R9.1 (`docs/R9.1-VERIFICATION-CAUSALITY-HARDENING.md`) supersedes Mission 05's original causality wording. A successful before/after replay now verifies the configured improvement target at correlation level; it does **not** by itself produce `causality-confirmed`. A causal upgrade requires pre-existing governed UREP causality-confirmed evidence.

Status: COMPLETE

## Delivered

- `src/core/workflow-verification.js`
  - framework-neutral workflow run snapshots from UREP/incident events;
  - explicit healthy baseline promotion;
  - deterministic run comparison without causal interpretation;
  - built-in event-count metrics plus declarative custom numeric metrics;
  - fix verification with explicit target direction and absolute/relative thresholds;
  - successful replay improvement verification, with causal upgrade governed by the stronger R9.1 evidence contract;
  - explicit inconclusive, not-confirmed and regressed outcomes;
  - custom metrics cannot overwrite built-in verification metrics.

- `src/core/evidence-capsule.js`
  - `RUF Evidence Capsule` v1 portable investigation object;
  - problem, trigger, owner, source, evidence references, root cause, causal chain, attribution, recommendation, verification, environment and AI prompt;
  - immutable JSON-serializable output;
  - raw runtime payloads omitted;
  - raw trace/interaction identifiers omitted while retaining context-presence flags;
  - source locations reuse Mission 03 sanitization before export;
  - generated AI handoff prompt explicitly preserves evidence-level honesty.

- focused unit tests and public exports from `src/index.js`.

## Product model

```text
incident / workflow run
        ↓
normalized run snapshot
        ↓
healthy baseline or before-fix run
        ↓
measurement-only comparison
        ↓
explicit intervention + replay + target criterion
        ↓
verify
  ├─ confirmed target improvement
  ├─ not-confirmed
  ├─ regressed
  └─ inconclusive
        ↓
optional governed causal evidence
        ↓
causal upgrade only when already supported by UREP
        ↓
portable Evidence Capsule
```

## Verification law

Comparison never proves causality by itself.

A normal successful verification requires:

1. the intervention is explicitly recorded as applied;
2. before/after are distinct runs;
3. both runs identify the same workflow;
4. the target metric is available in both runs;
5. the target changes in the declared improvement direction;
6. the change meets configured absolute/relative significance thresholds.

That verifies the configured improvement target and remains correlation-level evidence.

Under R9.1, `causality-confirmed` is emitted by workflow verification only when the successful replay is accompanied by an existing valid UREP event that already carries `evidence.level = causality-confirmed` and `causedByEventId`. The verifier consumes stronger causal evidence; it does not manufacture it from temporal ordering.

## Baseline semantics

A baseline is an explicitly promoted workflow-run snapshot, normally representing known healthy behavior. Comparing against a baseline measures drift/regression; it does not automatically label the candidate unhealthy or causally explain the difference.

Built-in metrics include total events and `count:<event-type>` for the UREP vocabulary. Declarative custom metrics can filter by event type/owner and aggregate numeric payload fields using `count`, `sum`, `avg`, `min`, or `max`.

## Evidence Capsule privacy boundary

The Capsule is intentionally safer than dumping raw runtime events:

- no event payload values;
- no raw trace/interaction IDs;
- source URL/path fields are normalized through `sanitizeSourceFile`;
- only structural evidence references are exported by default.

This is still not the planned enterprise privacy/redaction layer. Problem text, environment metadata and other caller-supplied fields must be treated according to the later enterprise export policy.

## Validation

Original Mission 05 focused tests were executed with Node's built-in test runner in an isolated ESM harness: 10 passed, 0 failed.

R9.1 separately hardens the verification semantics; see its receipt for current focused validation and release-gate limitations.

## Known limits

- A baseline currently represents one explicitly selected healthy run; statistical/multi-run baseline modeling is deferred.
- Verification is deterministic threshold-based logic, not statistical causal inference.
- Consumers define the target metric and meaningful-improvement threshold.
- Evidence Capsule has no HTML/report UI integration yet.
- Enterprise-wide value redaction/export policy remains a separate mission.

## Next mission

Mission 06 — Runtime Resource Ownership Ledger v2

Effort: HIGH

Goal: generically track acquisition/release of runtime resources against lifecycle owners so active resources that outlive their owners can become lifetime-violation evidence with framework-appropriate attribution strength.
