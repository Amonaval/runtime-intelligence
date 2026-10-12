# Runtime Intelligence — Lit Fault Lab

This is the full-scale Lit example for Runtime Intelligence. It was added because the repository previously had React and Vue fault labs but no equivalent runnable Lit lab.

## What it demonstrates

- safe off-by-default enablement;
- `configureLitRuntimeIntelligence(...)` programmatic activation;
- one shared `LitDebugMixin(LitElement)` application base;
- the shared UREP `EvidenceStore` and canonical panel;
- runtime error and HTTP-failure provenance;
- sequential requests;
- slow rendering and update storms;
- a large unvirtualized list;
- an intentionally leaked listener as a resource/ownership challenge;
- R9.3 Finding → Verify Fix using an actual normalized error finding;
- R9.2 baseline/replay verification with isolated evidence windows;
- the R9.1 rule that verified improvement is not automatically causal proof.

## Run

From repository root:

```bash
npm run lab:lit:install
npm run lab:lit
```

Open `http://127.0.0.1:4175` and click **Enable Runtime Intelligence**. The lab deliberately follows the normal product contract: diagnostics are off until explicitly enabled.

## Recommended walkthrough

1. Trigger **HTTP 503** and inspect Pinpoint / Network. Check the location and provenance meaning.
2. Trigger **Sequential Requests** and inspect Opportunities.
3. Trigger **Slow Render** and **Update Storm**. Compare what is observed with what source/ownership is actually provable.
4. Render **1,600 Rows** and inspect rendering opportunities.
5. Click **Leak Resize Listener** a few times. Treat missing ownership as a product limitation, not permission to fabricate a leak source.
6. Trigger **Intentional Error** once so a normalized `runtime-error` finding exists.
7. Click **Start from latest error finding**. R9.3 derives an owner-scoped error-count target.
8. Keep **Fixed error mode** off, trigger the error again, then click **Capture baseline**.
9. Turn **Fixed error mode** on, run the same workflow, then click **Capture replay**.
10. Open the **Before/After** panel tab and export JSON/HTML. The result should say verified improvement at correlation level unless separate governed causal evidence exists.

## Why the lab matters

The lab is not a showcase where every fault must magically resolve to an exact source. It is an acceptance surface for both capability and limits. If Runtime Intelligence cannot prove ownership, source or causality for a scenario, the correct result is an explicit weaker evidence level or unavailable source.

See `docs/DEVELOPER-GUIDE.md` for the minimal → targeted → full-scale integration path for Lit, React and Vue.
