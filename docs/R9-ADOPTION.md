# R9 — Adoption / Product Experience

R9 turns findings into a developer workflow without widening evidence claims or adding framework engines.

## Delivered

- Expanded Pinpoint cards explain source provenance, generated coordinates and latest matching owner/event selection. They give a targeted next step with adoption level 0, 1 or 2.
- Opportunities use the same guidance model. Unknown source stays unavailable; React root-only render investigations recommend one named ownership boundary, Vue checks trustworthy metadata/filters, Lit checks the instrumented base/activation, and resource investigations focus on cleanup/acquire/release.
- Normalized JSON findings/opportunities include optional `developerGuidance`; HTML renders the explanations. HTML escapes dynamic text and the existing export privacy boundary remains active. No new public function exports or schema-version change.
- Authorized tarballs now include only the integration guide and adoption ladder from docs. Package checks enforce this narrow allowlist; installed-consumer validation reads both guides.
- React README startup renders the application when disabled and disposes diagnostics on HMR. The existing detailed React/Vue/Lit recipes now have explicit opt-in/off steps, a unified ladder, SSR/storage/bootstrap and duplicate-event troubleshooting, and guided demo routes.

## Validation

`npm run validate:release`: PASS, 319 unit tests, 14 production checks; package/API/distribution/onboarding gates pass. Focused R9 tests cover provenance semantics, generated/contextual locations, framework-specific next steps, unchanged evidence, model/report propagation and escaped HTML.

The extended `examples/react-uninstrumented-lab/scripts/accept-browser.mjs` performs real Chromium checks for expanded Pinpoint and Opportunities guidance, unavailable child-source Level 1 advice, error-origin explanation and downloaded JSON/HTML guidance. Screenshot inspected at the normal panel width: text wraps within cards and guidance expands without obscuring recommendations. Existing hostile scenarios and stop/restart/privacy regressions pass in the same run. See [receipt](R9-ADOPTION-RECEIPT.json).

Repeat the browser acceptance with the lab dependencies and Playwright/Chromium installed using `npm run lab:react:hostile:accept`. The runner accepts `RI_PLAYWRIGHT_MODULE`, `RI_CHROMIUM_EXECUTABLE` and `RI_CHROMIUM_ARGS` for a supplied browser environment.

## Boundaries

This is adoption/presentation work, not a new source resolver or causal inference engine. No automatic diagnosis of uninstrumented state races/resource ownership is claimed. Browser product acceptance is React; Vue/Lit guidance is unit validated with installed public imports. R8 exact-version receipts remain the compatibility baseline. TrustWeave stays parked with partial consumer acceptance, and Angular/R10 remains deferred.
