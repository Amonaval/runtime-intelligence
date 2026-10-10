# React Fault Lab

A deterministic validation harness for Runtime Intelligence's React integration.

This app is intentionally separate from TrustWeave and from the shipped package surface. Deliberate defects belong here, never in consumer applications.

## Why two kinds of scenarios

**Behavioral** scenarios create real React/browser behavior. These validate that the adapter and collectors actually observe a problem.

**Injected** scenarios emit clearly labeled synthetic UREP evidence. These validate rare panel/intelligence workflows deterministically without pretending that the browser detected the issue.

The two layers prevent a common testing mistake: synthetic evidence can prove presentation plumbing, but it cannot prove detection; real faults can prove detection, but they are not deterministic enough to cover every product path.

## Run

```bash
cd examples/react-fault-lab
npm install
npm run dev
```

Open the Vite URL (default `http://127.0.0.1:4178`). The canonical mature panel opens automatically.

## Behavioral scenarios

| Scenario | Expected product surface |
| --- | --- |
| ~620 ms React render | Perf, slow-render evidence, Intelligence |
| 8 updates / ~80 ms | Perf, render reasons, property thrash, update-budget finding |
| Unhandled rejection | Errors, Intelligence |
| Slow API >2s | Network, Slow API |
| HTTP 503 | Network error |
| 3 sequential APIs | Network, sequential API opportunity, Intelligence |
| Large response + 180 ms main-thread task | Network and Worker opportunity where Long Task API is supported |
| 4 dialog-role elements | DOM duplication opportunity |
| 120 rows | Virtualization opportunity |
| tracked resource destroyed without release evidence | Memory/Pinpoint lifetime violation, Intelligence |

Some browser APIs (notably Long Task) are Chromium-dependent. That is why deterministic injected coverage also exists.

## Injected full-coverage pack

The injected pack exercises the bridge/presentation with synthetic evidence for slow render, state thrash, slow API, DOM duplication, virtualization, expensive paint, worker opportunity, sequential APIs, update budget, runtime error and resource lifetime violation.

Injected evidence uses framework name `fault-lab-injected` and source `injected-scenarios.js`. It is a validation fixture, not an application finding.

## Validation rule

A capability is considered React-ready only when:

1. its behavioral scenario is detected where browser support makes that possible;
2. its deterministic UREP scenario renders correctly in the mature panel;
3. evidence wording preserves observation/correlation/attribution semantics;
4. TrustWeave dogfood does not require any test-only code.
