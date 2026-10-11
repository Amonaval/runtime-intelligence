# React Uninstrumented Hostile Lab

This is the P0.3 benchmark for the hardest adoption case: a non-trivial React application whose **business components are completely unaware of Runtime Intelligence**.

The tool is integrated exactly once at the application boundary in `src/diagnostics/RuntimeIntelligenceRoot.jsx`. Everything under `src/app/**` must remain ordinary React/business code.

## What “uninstrumented” means here

Business components may **not**:

- import `runtime-intelligence/*`;
- use `RuntimeIntelligenceProfiler` or React `Profiler`;
- use `withRuntimeIntelligence`;
- use `useRuntimeTrackedState`, `useRuntimeEffect`, `useRuntimeResource`, or other Runtime Intelligence hooks;
- pass manual source/provenance metadata.

Run the guard any time the lab changes:

```bash
npm run validate:uninstrumented
```

## Run

From this directory:

```bash
npm install
npm run validate:uninstrumented
npm run dev
```

Or from the repository root after the root convenience scripts are available:

```bash
npm run lab:react:hostile:install
npm run lab:react:hostile:validate
npm run lab:react:hostile
```

Open `http://127.0.0.1:4181`.

## Scenario matrix

| Scenario | Defect | Level-0 expectation | Pinpoint expectation |
| --- | --- | --- | --- |
| Sequential API waterfall | three awaited requests | browser/network + sequential API evidence | application fetch/service call site should be provable |
| HTTP 503 | failing dependency | network/error evidence | service call site should be provable |
| Unhandled rejection | rejected promise from event handler | browser error evidence | application error-origin frame should be provable |
| Console burst | repeated warn/error | console evidence | source depends on the console collector; do not fabricate |
| Slow search render | ~75 ms render work | root React render pressure | exact child source is a P0.3 benchmark, not assumed |
| Render storm | repeated state updates | root update/render evidence | exact uninstrumented child source is a P0.3 benchmark |
| 900-row expansion | oversized rendered list | virtualization/DOM adviser may flag | source may remain unknown unless independently provable |
| Timer + listener leak | missing effect cleanup | no fabricated ownership | Level 0 currently lacks explicit component resource ownership |
| Async stale-result race | slow old result overwrites new result | network chronology | business-level causal claim must remain unknown |
| Heavy report | large response + main-thread work | network/shared adviser evidence | invocation source may be available; worker recommendation remains advisory |

## P0.3 acceptance bar

This lab is successful only when it helps distinguish three outcomes cleanly:

1. **Provable automatically:** exact application file/line/column from browser/runtime evidence without touching the business component.
2. **Detected but source-limited:** a real issue is visible, but only root/related/unknown source is justified.
3. **Not observable at Level 0:** the tool explicitly says what additional integration would be required rather than pretending.

The next React-source mission should optimize category 2 only when a trustworthy React dev/fiber/build source can be proven. Private framework fields must be treated as guarded, best-effort metadata rather than a causal contract.

## Why this lab is separate from `react-fault-lab`

`react-fault-lab` is deterministic feature coverage and intentionally uses Runtime Intelligence hooks/boundaries. This hostile lab measures **zero-touch adoption value** and must never be “improved” by instrumenting its business components.

## Automated hostile browser acceptance

See [P0.4 acceptance](../../docs/P0.4-HOSTILE-ACCEPTANCE.md) for results and known source limitations.

Install optional Playwright tooling in this lab and its Chromium binary, then run:

```bash
npm run accept:browser -- /absolute/path/to/results
```

The runner starts its own Vite server, exercises all ten hostile scenarios, verifies lifecycle and actual JSON/HTML exports, and writes a machine receipt. Do not run another lab server on port 4181. Business source remains completely uninstrumented.
