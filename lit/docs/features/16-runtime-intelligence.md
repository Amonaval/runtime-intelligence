# Runtime Intelligence

Runtime Intelligence is the answer layer above the existing LDS debug panel.

## What it adds

The original panel is still useful for inspecting individual areas such as performance, network, events, memory and Pinpoint.

Runtime Intelligence adds one thing on top:

> When a meaningful UI problem happens, combine the related runtime signals and give the developer one simple finding.

You should not normally read UREP events, `evt-*` IDs, evidence graphs or Evidence Capsules yourself.

## Normal workflow

1. Enable diagnostics before the application starts.
2. Open the LDS panel.
3. Use the application normally.
4. Reproduce a slow Lit update or runtime error.
5. Read the Runtime Intelligence card.

The card answers:

- **Problem** — what happened?
- **Likely cause** — what is the strongest related cause we found?
- **Where** — source file/line when available.
- **Impact** — useful counts/timing such as renders, state changes and network requests.
- **Do next** — where the developer should start investigating.
- **Confidence** — how strong the evidence is.

## Ready state

After startup the card should say `Runtime Intelligence is ready`.

The browser check is intentionally small:

```js
window.__LDS_INTELLIGENCE__
```

This is a compact developer-facing model. It should not contain the full incident, causal-chain arrays or large lists of `evt-*` references.

## Deep evidence is optional

Only when deeper forensic detail or AI handoff is needed:

```js
window.__LDS_INTELLIGENCE_PIPELINE__.exportCapsule()
```

The Evidence Capsule is privacy-filtered and bounded. It is not the normal UI.

For raw runtime troubleshooting only:

```js
window.__LDS_EVIDENCE__()
```

Treat this as an advanced/debugger surface, not something every developer should interpret manually.

## What currently creates a finding

Runtime Intelligence currently analyzes:

- Lit runtime errors
- Lit updates at or above the configured slow-update threshold (500 ms by default)

Network completions are captured as supporting evidence but a failed request alone does not currently create an incident.

## Memory/safety model

Runtime diagnostics must not become the application problem.

Current safeguards include:

- bounded EvidenceStore retention
- bounded incident flight recorder retention/time window
- bounded Evidence Capsule references
- bounded root-cause symptoms/candidates
- compact `window.__LDS_INTELLIGENCE__` model with no raw event arrays
- raw event payloads excluded from Evidence Capsule export
- privacy filtering before evidence/export boundaries

## Mental model

```text
Existing diagnostics
(perf / network / events / errors / memory)
            ↓
Runtime evidence + correlation
            ↓
Runtime Intelligence
            ↓
Problem · likely cause · impact · where · next action
            ↓
Optional deep evidence only when needed
```

The goal is not to expose more telemetry. The goal is to reduce the amount of telemetry a developer has to understand.
