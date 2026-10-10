# R5 — React Intelligence Hardening

## Goal

Make the first real React dogfood experience useful without overstating what React runtime evidence can prove.

## Implemented

- React root providers can carry an explicit source location, matching nested profiler boundaries.
- The framework-neutral panel preserves source attribution in recent evidence.
- Profiler `component.update.completed` evidence is summarized into render activity by named/source-attributed boundary.
- Render activity reports commit count, mount/update split, total recorded duration, average duration and maximum duration per boundary.
- Boundaries are ranked by recorded profiler duration so developers can decide where to inspect first.
- Nested profiler boundaries are explicitly documented as overlapping; their totals must not be treated as exclusive application work.
- The panel explicitly states that these are profiler observations and **no render cause is inferred**.
- Recent profiler evidence now uses human-readable timing labels and displays evidence level + attribution quality.

## Deliberately not implemented

- No arbitrary slow-render threshold.
- No fake state/update cause.
- No dependency causality.
- No automatic claim that a highly ranked boundary is defective.
- No backend intelligence or production runtime work.

Those remain evidence-driven follow-up candidates after browser dogfood.

## Browser validation focus

Use TrustWeave development mode and exercise representative flows. Validate that:

1. `TrustWeave.Root` and `TrustWeave.NetworkApp` appear as distinct render boundaries.
2. Their source files are visible in render activity/recent evidence.
3. Navigation and interaction cause profiler observations to accumulate without breaking the app.
4. Per-boundary ranking helps identify where recorded profiler duration is concentrated while making overlap clear.
5. React dev/Strict Mode does not create misleading noise that materially harms usefulness.
6. Advisor opportunities remain separate from profiler render activity and are not presented as causal conclusions.

R6 packaging/distribution remains intentionally deferred until browser dogfood validates product usefulness.
