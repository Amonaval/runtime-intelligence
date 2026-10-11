# Framework Adoption Ladder

Use [the integration guide](NEW-PROJECT-INTEGRATION-GUIDE.md) for installable React, Vue and Lit recipes. All frameworks feed one evidence store, intelligence pipeline, panel and report format.

| Level | React | Vue 3 | Lit | Decision to advance |
| --- | --- | --- | --- | --- |
| 0 — application shell | Development gate, provider/root profiler, shared panel | Install plugin before mount, shared panel | Activate before connect; choose shared base, shared panel | Reproduce one real interaction and inspect browser/network/error evidence first |
| 1 — component ownership | One named Profiler/HOC around a suspected subtree | Lifecycle observation is already broad; check filters and trustworthy component file metadata | Instrument a selected component family through the shared base | Advance only when missing ownership/source prevents answering a specific question |
| 2 — targeted operations | Selected tracked state, effect or resource hooks | Explicit application/domain evidence when justified | Focused property/resource evidence when justified | Advance only when invocation, registration or lifetime evidence is needed |

Level 2 includes the older React ladder's separate state/effect/resource stages (previously Levels 2–4). These are independent options, not required sequential migrations. A custom governed UREP extension is an advanced option, not an onboarding prerequisite.

## What the shell provides

Enabled browser collectors can observe fetch/XHR, errors/rejections, console, interactions and browser-supported vitals/long tasks. Shared advisers, Intelligence, Pinpoint and Opportunities interpret available evidence. No business-component rewrite is required for React or Vue. Lit lifecycle evidence requires an instrumented base; page/browser evidence alone does not observe every element lifecycle.

Start with one component boundary when a render investigation needs it. Do not wrap every component or mechanically replace every state/effect hook. Vue source resolution must use trustworthy metadata; Lit must not be globally prototype patched.

## Choosing the next step

- An invocation source identifies where an operation was called; inspect that location and reproduce it.
- A registration source identifies where a resource/effect was registered; inspect cleanup and matched lifetime evidence.
- A component boundary identifies ownership, not the definition or cause of every child render.
- A missing React child source is expected at root-only profiling depth. Add one strategic boundary if that question matters.
- A related/common source is context until stronger evidence establishes its role.
- Generated module/runtime coordinates must not be advertised as original JSX/TypeScript lines.

The panel's **Why this source? / What next?** guidance recommends the cheapest useful step and preserves evidence limitations. Observation, attribution and correlation alone do not prove business causality. Unsupported React update-cause/reactive-dependency semantics remain unsupported. Angular is deferred to a separately authorized R10 mission.
