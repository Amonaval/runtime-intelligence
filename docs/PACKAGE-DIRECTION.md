# Package direction — Runtime Intelligence

The canonical product will evolve toward four package surfaces:

- `@runtime-intelligence/core` — evidence protocol/store/graph, root cause, recorder, verification, privacy, framework-neutral analyzers/advisors.
- `@runtime-intelligence/react` — React adapter, React pipeline and React instrumentation helpers.
- `@runtime-intelligence/lit` — Lit adapter, Lit pipeline and Lit-specific integration bridges.
- `@runtime-intelligence/panel` — optional UI/presentation package consuming framework-neutral presentation models plus optional framework plugins.

Consumer rule: generic functionality never lands first in TrustWeave or another app. It is implemented in `Amonaval/runtime-intelligence` and consumed by apps. Consumer-specific translation plugins are allowed only when they map proprietary app concepts to UREP.

TrustWeave will consume `core + react + panel` in development mode only.
