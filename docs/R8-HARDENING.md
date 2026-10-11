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

## R8.2–R8.4 coordinated batch — complete within bounded acceptance

An independent review defined and checked acceptance; Work implemented concrete defects and verified the final behavior. This was internal delegated review, not an exchange with another Chat conversation. All generic changes remain canonical; TrustWeave stays parked.

### Compatibility and adapter contracts

| React | Vue | App Lit | Packed build | Chromium lifecycle | Disabled production | Export privacy |
|---|---|---|---|---|---|---|
| 18.3.1 | 3.3.13 | 3.0.2 | PASS | PASS | PASS | PASS |
| 19.0.0 | 3.5.13 | 3.3.3 | PASS | PASS | PASS | PASS |

Vite 5.4.21, Chromium 153, Node 24.19.0. The product retains its own Lit dependency; the table records installed application framework versions. Public tarball imports also pass with React/Vue peers absent. Development builds test React Profiler lifecycle; built production output tests the disabled loader. Ordinary production React profiling is not claimed.

Lit ownership/update state is now adapter-local. All three frameworks generate unique physical instance IDs across adapters sharing one store. React public callback bridges bind to one owner lifecycle; stale callbacks cannot attribute work to a reconnected owner. Internal React mount-before-effect profiling remains supported. React/Vue update-cause and reactive-dependency capabilities remain unsupported.

### Runtime lifecycle and bounded retention

Pipelines and canonical panel resolvers release their live globals with descriptor-aware ownership. Either stop order restores the remaining live owner; final stop restores original descriptors and preserves newer host replacements. Managed panel listeners are released, and delayed custom-element definition cannot reinstall a stopped bridge. Legacy unmanaged installers and stateless panel prototype patches retain page lifetime.

Public Lit activation stop now detaches active owners and its page services, releases only network/vitals clients it acquired, and permits a fresh session. It cannot steal a concurrent framework client's collectors. Deferred Lit completion cannot finish a new lifecycle. Lit programmatic configuration remains latest-config-wins; an older controller cannot disable a newer configuration.

Navigation preserves original method identity/results, drops stale wrapper callbacks and retains one pending settled-navigation orphan check; stop cancels it. Network evidence bridges are isolated per network/store and reinstall after cleanup. Budget/idle adviser histories retain at most 1000 owners and evict destroyed owners. Budget windows keep newest budget+1 timestamps, preserving threshold detection without unlimited same-owner bursts. Panel private histories are bounded and cleared on stop; compatibility report aggregates remain historical page data.

### Overhead and report privacy

The reproducible Node benchmark measures evidence throughput and shared analysis, checks a 250-event retention cap and proves 1000 disabled-loader calls dispatch zero imports. Seven measured batches follow one warmup. Local p95 batch averages are recorded in R8-OVERHEAD-RECEIPT.json, below the explicit development budgets (5ms/event ordinary path, 100ms/event shared analysis). These are conservative regression ceilings, not render-latency targets or production overhead guarantees. Browser frame/heap profiling and every framework/browser version remain outside this bounded acceptance.

Canonical and legacy exports now enforce the enterprise policy across every branch, including notes, analysis/capsules, collector headers/bodies and prose URLs. Raw console/network callStack is omitted. Application source/provenance remains useful. Exports are deeply immutable and contain exportPrivacy audit metadata. Default 1000-event stores export all events; larger custom inputs disclose truncation. HTML escapes dynamic count fields as well as text. Query-free and KEEP-policy URLs have a regression preventing recursive sanitization.

### Final validation and reproduction

Full `npm run validate:release` PASS: **316 unit tests, 14 production checks**, package/API/distribution/onboarding validators. All **31 R8-focused tests** pass. Hostile Chromium JSON/HTML/restart regression passes with the existing 4 A / 4 B / 2 C source-limit matrix. No new original-coordinate or causality claim.

```bash
npm run validate:release
npm run overhead:validate
npm run compatibility:validate
```

The compatibility command builds and installs exact tarball consumers; without Chromium configuration browser checks are explicitly NOT EXECUTED. For full browser checks supply RI_PLAYWRIGHT_MODULE (absolute Playwright module path), RI_CHROMIUM_EXECUTABLE and optional RI_CHROMIUM_ARGS JSON. RI_MATRIX_RECEIPT selects the receipt path; temporary installs are cleaned unless RI_KEEP_MATRIX_WORK=1. These are validation tools, excluded from product package files. No CI, telemetry or runtime dependency was added.

Receipts: R8-COMPATIBILITY-RECEIPT.json, R8-OVERHEAD-RECEIPT.json, R8-EXPORT-BROWSER-REGRESSION.json. Independent review found no further blocker within this scope. R9 adoption is next (MEDIUM); R10 Angular remains deferred. TrustWeave's connected acceptance remains unexecuted and does not become a passed P0 gate.
