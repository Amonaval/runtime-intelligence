# Runtime Intelligence

Runtime Intelligence is a dedicated tab in the existing LDS debug panel.

## Why it exists

The original panel tabs are measurement/debug views:

- Pinpoint finds known issue patterns.
- Perf shows render timing.
- Network/Falcor show requests.
- Events show activity.
- Memory shows lifecycle/resource symptoms.

Those views are valuable, but the developer still has to connect the dots manually.

Runtime Intelligence adds an **answer layer**:

> Combine the strongest related runtime signals and tell the developer what happened, why it likely happened, where to look and what to do next.

## Where to find it

Open the LDS panel and select:

`✨ Intelligence`

Runtime Intelligence does **not** render a banner over Summary, Pinpoint, Perf, Network or any other tab.

## What the Intelligence tab shows

The tab is intentionally simple:

1. **What is different from the original toolkit?** — explains the value of the new layer.
2. **How should I use it?** — a short workflow.
3. **Current finding** — the actual developer answer.
4. **Technical evidence (optional)** — hidden unless deeper investigation is needed.

A finding answers:

- **Problem** — what happened?
- **Likely cause** — strongest related cause found.
- **Where** — source file/line when available.
- **Impact** — useful timing/counts such as renders, state changes and requests.
- **Do next** — where to start investigating.
- **Confidence** — strength of the evidence.

The top of the tab also shows whether Intelligence, Perf and Network are enabled and how much data they have captured.

## Normal workflow

1. Enable diagnostics before the application starts.
2. Open the LDS panel.
3. Open `✨ Intelligence` once to confirm it is ready.
4. Use the application normally and reproduce the UI problem.
5. Return to `✨ Intelligence`.
6. Read **Problem → Likely cause → Where → Impact → Do next**.
7. Open Pinpoint/Perf/Network only when supporting detail is needed.

## What currently creates a finding

Runtime Intelligence currently analyzes:

- Lit runtime errors
- Lit updates at or above the configured slow-update threshold (500 ms by default)

Network completions are captured as supporting evidence. A failed request alone does not currently create an Intelligence incident.

## Developer-facing browser model

```js
window.__LDS_INTELLIGENCE__
```

This is intentionally compact. It should not contain full incident arrays, evidence graphs or dozens of `evt-*` references.

## Deep evidence is optional

Only for forensic debugging or AI handoff:

```js
window.__LDS_INTELLIGENCE_PIPELINE__.exportCapsule()
```

For raw Runtime Intelligence troubleshooting only:

```js
window.__LDS_EVIDENCE__()
```

Neither is intended as the normal developer experience.

## Memory/safety model

Runtime diagnostics must not become the application problem.

Safeguards include:

- bounded EvidenceStore retention
- bounded incident flight-recorder retention/time window
- bounded Evidence Capsule references
- bounded root-cause symptoms/candidates
- compact `window.__LDS_INTELLIGENCE__` with no raw event arrays
- raw event payloads excluded from Evidence Capsule export
- privacy filtering before evidence/export boundaries

## Mental model

```text
Original LDS tabs
Perf · Network · Events · Errors · Memory · Pinpoint
                    ↓
       bounded runtime evidence
                    ↓
          Runtime Intelligence
                    ↓
 Problem · likely cause · where · impact · next action
                    ↓
     original tabs for supporting detail
```

The goal is not to show more telemetry. The goal is to reduce how much telemetry a developer has to understand.
