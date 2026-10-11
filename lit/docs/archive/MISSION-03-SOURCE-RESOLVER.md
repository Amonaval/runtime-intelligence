# Mission 03 — Generic Source Resolver / Source-map Attribution

Status: COMPLETE

## Delivered

- `src/core/source-resolver.js`
  - framework-neutral `SourceResolver`;
  - canonical source-location result with original and generated coordinates;
  - preserves already-canonical sources;
  - prefers framework-reported canonical source metadata;
  - accepts pluggable source-map/mapping providers;
  - supports registry/component source hints as a weaker fallback;
  - parses common runtime stack frames, browser URLs, webpack/vite/file paths and Windows paths;
  - strips URL query values and fragments before retaining source locations;
  - treats browser/build-runtime forms (`http(s)`, `blob`, `data`, `file`, `webpack`, `webpack-internal`, `vite`, Vite `/@fs/`) as generated locations so mapping providers can resolve them;
  - redacts embedded `data:` URL payloads rather than retaining source/data contents;
  - degrades gracefully when mappings are missing or providers fail;
  - requires no network dependency.

- `test/unit/source-resolver.test.mjs`
  - direct canonical source;
  - generated browser URL + query/fragment masking;
  - framework source hint;
  - pluggable source-map provider;
  - provider failure fallback;
  - unresolved fallback;
  - evidence-level non-upgrade invariant;
  - Windows stack paths;
  - `file://` generated/provider path;
  - `webpack-internal://` generated/provider path;
  - Vite `/@fs/` generated/provider path;
  - `data:` payload redaction.

- public exports from `src/index.js`.

## Resolution order

```text
canonical event source
→ framework source hint
→ source-map/mapping provider
→ registry/component hint
→ sanitized generated runtime location
→ unresolved
```

The provider boundary is intentionally small. A provider receives normalized generated coordinates and may return an original source location. This keeps source-map libraries, framework integrations, private map stores, and later IDE/build-tool integrations outside the generic core.

## Product invariant

Source resolution and causal certainty are separate truth axes.

A successful source-map lookup can improve attribution quality to `source-attributed`, but it does not and must not upgrade an event from observation/correlation to attribution/causality. The resolver does not accept, mutate, or return an evidence level.

## Privacy / safety

Source URLs are normalized without query values or fragments so tokens, IDs, route state, or other query data are not retained by this layer. Embedded `data:` URL payloads are replaced with `data:[redacted]`. This is bounded source-location hygiene, not a replacement for enterprise privacy/redaction policy.

## 2026-10-11 current-main hardening

A review against the Mission 03 acceptance criteria found four concrete gaps in the already-implemented resolver:

- `file://` and Vite `/@fs/` locations were normalized but not classified as generated, so they could be overstated as direct canonical source and bypass mapping providers;
- `webpack-internal://` was not recognized/normalized as generated;
- `data:` URLs could retain embedded source/data payloads.

The resolver now keeps those runtime forms on the generated/provider path and redacts data-URL payloads.

## Validation

Focused Source Resolver tests were executed with Node's built-in test runner in an isolated ESM harness after hardening: **12 passed, 0 failed**.

A full checked-out repository test run was not available because the local container could not reach GitHub. No GitHub Actions, CI, cloud or paid resource was enabled, so this mission does not claim that the entire repository test suite was executed here.

## Known limits

- No bundled source-map parser/library; actual mapping is supplied through providers.
- No automatic source-map discovery or network fetching.
- Source attribution quality does not imply causal evidence.
- Blob URLs remain normalized/fallback locations unless a provider resolves them; data-URL payloads are intentionally redacted.

## Next mission at original Mission 03 completion

Mission 04 — Incident Flight Recorder (MEDIUM) was the original next mission and has since been implemented on current `main`. Use current canonical status/roadmap rather than this archived mission file for present-day sequencing.
