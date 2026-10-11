# R8 — Multi-framework Product Hardening

## R8.1 shared browser lifecycle — complete

React and Vue runtimes compose the same FrameworkRuntimeServices/BrowserRuntimeSurface. Lit uses the same page-level network collector through its activation path. The changes are in this shared path; no adapter-specific intelligence fork or new evidence claims.

- Concurrent surfaces lease the page intelligence flag. Either stop order keeps it active until the final release. Restore the original property descriptor; preserve a host replacement and tolerate an immutable flag.
- Subscription, detector startup and listener failures do not prevent subsequent instrumentation. Throwing cleanup callbacks do not skip remaining cleanup. Partial detector startup is stopped.
- Every surface start has a generation. Late collector, error, interaction and opportunity callbacks from earlier generations cannot emit into a restarted session.
- In-flight fetch completions from a detached network generation preserve response/rejection identity and omit diagnostics, including after restart. Requests are not aborted.
- XHR completion listeners are removed after completion, final collector detach or synchronous send failure. Request metadata is captured per send. Multiple active collector clients retain instrumentation until the last detach.

## Validation

Full `npm run validate:release` PASS: 294 unit tests, 14 production checks, package/API/distribution/onboarding validators. New focused tests: `r8-browser-lifecycle.test.mjs` and `r8-network-lifecycle.test.mjs`; together with existing browser-surface tests, 11 pass. Stress coverage includes 100 restart cycles and 100 XHR reuse cycles. Listener/subscriber counts and transport behavior are asserted; no wall-clock overhead or heap-leak claim is inferred from them.

Chromium hostile lab regression PASS with React 18.3.1, including actual JSON/HTML downloads, privacy, stop/restart and the existing A/B/C evidence matrix. Machine receipt: R8.1-BROWSER-REGRESSION.json. Browser reproduction follows P0.4-HOSTILE-ACCEPTANCE.md. This validates the shared changes in a real React browser; Lit/Vue adapter tests remain unit contract coverage, not a full version matrix.

## Remaining R8 work

Compatibility/version matrix across React/Lit/Vue; adapter/provenance contracts; broader runtime restart/teardown stress; measured overhead budgets; disabled production and loader/package installation regression; repeated report/privacy validation. Do not infer unsupported compatibility from peer dependency ranges. Keep observation, correlation, attribution and confirmed causality distinct.

R9 adoption and R10 Angular stay deferred. TrustWeave work is closed partial by user direction; its unexecuted connected acceptance does not become a passed gate.
