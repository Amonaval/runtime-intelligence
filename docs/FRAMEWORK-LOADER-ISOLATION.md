# Framework Loader Isolation Rule

## Why this exists

`runtime-intelligence/loader` is the generic multi-framework loader. Its dynamic import graph references React, Lit and Vue. Bundlers such as Vite/Rollup may still resolve every dynamic import during build, even when the application selects only one framework at runtime. Because React and Vue are optional peers, a Lit-only application can otherwise fail while Rollup tries to resolve `react` from the unused React adapter.

This failure has recurred enough that it is now a repository contract rather than an ad-hoc Vite fix.

## Rule

Framework-specific applications, examples and fault labs must use the matching isolated loader:

```text
React -> runtime-intelligence/loader/react
Lit   -> runtime-intelligence/loader/lit
Vue   -> runtime-intelligence/loader/vue
```

Each isolated loader may import only:

- its own framework integration;
- the shared panel when requested.

It must not reference another framework adapter.

The generic `runtime-intelligence/loader` remains supported when the consumer intentionally supports multiple frameworks in one bundle or when all relevant peers are available.

## Do not use Rollup `external` as the default fix

Adding an absent framework such as `react` to `build.rollupOptions.external` can suppress build-time resolution, but it may leave a bare unresolved import in generated output. That is acceptable only when the host environment deliberately provides that external at runtime.

For ordinary single-framework applications the correct fix is import-graph isolation, not externalization.

## Enforcement

`npm run package:validate` now runs `scripts/validate-framework-loader-isolation.mjs`.

The validation fails when:

- `/loader/react`, `/loader/lit`, or `/loader/vue` is missing;
- a framework-specific loader references another framework adapter;
- the Lit Fault Lab regresses to the generic loader;
- the Vue Fault Lab stops using its isolated loader.

When a new optional framework ecosystem is added, create its isolated loader and extend this validator in the same mission.
