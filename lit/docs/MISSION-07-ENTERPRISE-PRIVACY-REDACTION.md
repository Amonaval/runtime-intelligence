# Mission 07 — Enterprise Privacy / Redaction

Status: COMPLETE

## Delivered

- `src/core/enterprise-privacy.js`
  - centralized enterprise privacy policy model;
  - safe-by-default policy preset;
  - sensitive field/header redaction;
  - URL query-value masking and fragment removal;
  - request/response body shape-only capture by default;
  - DOM text shape-only capture by default;
  - state/prop value shape-only capture for state/update evidence;
  - configurable email/phone redaction;
  - bearer/JWT scrubbing;
  - bounded depth/key/string handling;
  - export-time removal of raw trace/interaction identifiers;
  - immutable privacy audit summaries with transformation counts.

- `EvidenceStore`
  - enterprise policy enforced before immutable UREP event creation;
  - captured events expose privacy audit metadata;
  - privacy can be disabled only through explicit `privacyPolicy:false` configuration for trusted/local diagnostics.

- `Evidence Capsule`
  - enterprise export policy now applies to all caller-supplied fields;
  - `problem`, environment metadata, root-cause summaries, recommendations, verification details and custom AI prompts pass through the same export policy;
  - raw correlation identifiers remain excluded;
  - privacy audit metadata is embedded in the Capsule.

- public exports from `src/index.js`.
- focused privacy regression tests.

## Product model

```text
framework/browser collector
        ↓
raw diagnostic input
        ↓
Enterprise Privacy Policy
        ↓
sanitized immutable UREP
        ↓
Evidence Store / Graph / Flight Recorder / Ledger
        ↓
export boundary
        ↓
Enterprise Privacy Policy
        ↓
Evidence Capsule / AI handoff / later reports
```

Privacy is enforced twice for different reasons:

1. **capture boundary** — sensitive runtime values should not enter the immutable evidence history unnecessarily;
2. **export boundary** — caller-supplied investigation/report metadata must not re-introduce secrets or PII.

## Default enterprise policy

```text
Authorization / Proxy-Authorization → redact
Cookie / Set-Cookie                 → redact
API keys / tokens / passwords       → redact
URL query values                    → mask
URL fragments                       → remove
request/response body               → shape-only
DOM text                            → shape-only
state / prop runtime values         → shape-only
email                               → redact
phone                               → redact
Bearer / Basic credentials          → redact
JWT-like values                     → redact
traceId / interactionId on export   → drop
```

Structural diagnostic information is retained where possible: field names, query parameter names, resource IDs, event types, owners, evidence levels, timing, source line/column and causal references.

## Policy customization

`createPrivacyPolicy()` allows trusted environments to selectively retain diagnostic values such as DOM/state data while sensitive keys, credentials and configured PII rules remain independently controlled.

`privacyPolicy:false` exists only as an explicit EvidenceStore escape hatch for trusted/local debugging. It is never the default.

## Important invariants

1. Privacy transformation never changes evidence level, attribution quality or causal references.
2. Privacy transformation never mutates producer input.
3. Sensitive header values are never preserved by the default policy.
4. URL query parameter names may remain, but default query values do not.
5. Shape-only state/body/DOM capture retains diagnostic structure without retaining original content.
6. Export sanitization removes raw trace/interaction identifiers by default.
7. Privacy audit metadata contains counts/policy identity, not the sensitive field values themselves.

## Integration with prior missions

- Mission 03 source hygiene remains responsible for canonical source paths.
- Mission 04 Flight Recorder inherits already-sanitized UREP events.
- Mission 05 Evidence Capsule now enforces the same policy on non-event export metadata.
- Mission 06 Resource Ledger already stores structural resource/lifecycle data and therefore benefits from sanitized upstream evidence without retaining browser handles.

## Validation

Focused Mission 07 tests plus existing Evidence Capsule compatibility tests were executed with Node's built-in test runner in an isolated ESM harness: **12 passed, 0 failed**.

Coverage includes:

- URL query masking;
- sensitive headers;
- default EvidenceStore capture enforcement;
- state value shaping;
- DOM text shaping;
- configurable trusted policy behavior;
- export correlation-ID removal;
- email/phone/token redaction;
- Evidence Capsule export enforcement;
- explicit privacy disable behavior;
- producer-input immutability;
- existing Evidence Capsule behavior compatibility.

A full checked-out repository test execution is not claimed in the connector environment.

## Known limits

- Pattern-based PII redaction is intentionally conservative and is not a DLP/classification engine.
- URL path segments are preserved; only query values/fragments are sanitized by the default policy.
- Business-specific sensitive fields may require additional policy rules in a later configuration layer.
- Encrypted storage, tenant policy distribution, RBAC and audit-log persistence are outside the local runtime scope.
- No browser API instrumentation is added here; this mission governs captured/exported data, not collection coverage.

## Next mission

Mission 08 — Rules / Budgets / Suppressions

Effort: MEDIUM

Goal: define deterministic local diagnostic policies for thresholds, budget violations, rule suppressions and severity without turning the core into a cloud policy engine.
