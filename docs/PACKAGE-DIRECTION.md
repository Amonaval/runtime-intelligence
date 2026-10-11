# Package direction — Runtime Intelligence

## Current decision

Runtime Intelligence is **one package with stable public subpaths**, not four independently versioned packages.

```text
runtime-intelligence/loader
runtime-intelligence/core
runtime-intelligence/extension
runtime-intelligence/react
runtime-intelligence/lit
runtime-intelligence/panel
runtime-intelligence/panel/lit
```

This keeps UREP, adapters, intelligence, reports and the canonical panel on one compatibility/version line while the product is pre-1.0.

Do not split into `@runtime-intelligence/*` packages unless real distribution/ownership constraints justify the additional release/versioning complexity.

## Distribution

The R6.5 baseline is private/proprietary:

- package name stays `runtime-intelligence`;
- `private: true`;
- `license: "UNLICENSED"`;
- authorized private Git SHA or authorized tarball delivery;
- no public registry configured.

A future private registry may map this product to a scoped registry name if the selected provider requires one. That should not trigger a source architecture split.

## Consumer rule

Generic functionality never lands first in TrustWeave or another app. It is implemented in `Amonaval/runtime-intelligence` and consumed by apps.

Consumer-specific translation plugins are allowed only when they map app concepts to the governed UREP/extension contract.

TrustWeave consumes the canonical package in development/debug mode only and remains pinned to an explicitly validated SHA until intentionally repinned.
