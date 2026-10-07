# Pre-Mission-10 Audit — Foundation Review and Hardening

Status: REVIEWED + HARDENING PATCH PREPARED

Scope: current `main` from the Mission 01 foundation through Mission 09 React adapter, compared against the canonical advanced Lit reference `navalamol/ui-toolkit@524d3c9a9e3864cd1f52f59d739ea10b8cdfd10a`.

## Why this checkpoint exists

The mission-by-mission focused harnesses proved individual changes, but the repository had not yet been treated as one integrated product. This audit deliberately challenged three different questions:

1. Does the current repository build/import as declared?
2. Do the generic intelligence modules preserve their evidence/correctness contracts when combined?
3. Does the new architecture actually preserve the useful product surface of the advanced Lit baseline, or are parts still only implemented in isolation?

## Confirmed defects fixed by this audit

### 1. Package metadata referenced files that do not exist — HIGH

Before this audit, `package.json` declared:

- `./panel -> ./src/panel/LdsDebugPanel.js`
- `./custom/ui-platform -> ./custom/ui-platform/index.js`
- build scripts using `rollup.lib.config.js` and `rollup.extension.config.js`

Those targets/configs are not present in the active runtime-intelligence `lit/` tree.

Hardening:

- remove package exports for absent surfaces;
- expose only real root/Lit/React targets;
- restore a truthful library-only Rollup config;
- make `npm run build` execute unit tests + root-import smoke test + library build;
- add a package-integrity unit test that fails if any declared export target is missing.

This does **not** claim the missing panel/extension/custom plugin product surface has been restored. It makes the active package honest and buildable as the source tree that actually exists.

### 2. Resource IDs could collide across owners — HIGH

Mission 06 documented lifecycle-specific ownership, but its internal map key was effectively:

```text
framework + resourceId
```

Two owners could legitimately both acquire `timer-1`; the second acquisition could overwrite the first record.

Hardening changes identity to:

```text
framework + owner.id + lifecycleGeneration + resourceId
```

Release remains backward-compatible:

- owner-qualified release resolves exactly;
- ownerless release is accepted only when exactly one active matching resource exists;
- wrong-owner release cannot clear another owner's resource.

A regression test now creates two different owners with the same resource ID and proves independent lifecycle tracking.

### 3. Structural parent edges could overstate cluster strength — HIGH

`parentEventId` is structural lineage, not causal proof. The graph previously allowed a parent edge to inherit `attribution` evidence level from its target event. `RootCauseGrouper` could therefore classify a parent-only cluster as `attributed`.

Hardening:

```text
parentEventId edge
→ always correlation-level edge evidence
```

The target event may itself carry stronger evidence, but the parent relationship does not gain causal/attribution strength merely because of that target metadata.

### 4. Non-finite bounds could silently disable bounded-memory guarantees — MEDIUM

Several constructors used forms such as:

```js
Math.max(1, Math.floor(value))
```

For `NaN`, the result remains `NaN`; comparisons against it are false, so pruning/freeze behavior can silently stop working.

Hardening now normalizes non-finite values to safe defaults in:

- `EvidenceStore.maxEntries`
- `IncidentFlightRecorder.maxEvents`
- `IncidentFlightRecorder.postTriggerEvents`
- `RuntimeResourceOwnershipLedger.maxRecords`
- `RuntimeResourceOwnershipLedger.maxFindings`

Invalid clock functions also fail early in Store/Recorder rather than failing later during capture.

## Objective-achievement review

### What is genuinely achieved

The current repository has a coherent framework-neutral intelligence kernel:

```text
Framework adapters
  ↓
UREP + EvidenceStore + Privacy
  ↓
Evidence Graph + Root Cause grouping
  ↓
Source attribution
  ↓
Incident Flight Recorder
  ↓
Workflow baseline/compare/verification
  ↓
Evidence Capsule
  ↓
Resource Ownership Ledger
  ↓
Rules/Budgets/Suppressions
```

The React adapter is meaningful architectural proof that downstream intelligence is no longer hard-wired to Lit semantics.

Evidence-strength separation is also materially stronger than the original toolkit: correlation, attribution, lifetime violation, retainer confirmation and fix verification are represented separately rather than collapsed into a generic "root cause" claim.

### What is NOT yet achieved end-to-end

The advanced Lit collectors and the new generic intelligence kernel are still partly parallel systems.

Examples confirmed during audit:

- legacy `network.js` writes `window.__LDS_NETWORK_LOG__` but does not emit UREP network evidence;
- legacy `perf.js` writes `__LDS_PERF__` / `__LDS_SLOW_RENDERS__` but does not feed EvidenceStore;
- legacy `error-boundary.js` writes `__LDS_ERRORS__` and has legacy crash export behavior but does not route those reports through the generic privacy/export path;
- legacy `memory.js` maintains its own resource ledger instead of feeding Mission 06 automatically;
- legacy event tracing remains outside the new evidence graph unless an adapter explicitly emits corresponding evidence.

Therefore the repository should **not yet be described as a full replacement for the advanced Lit gold-standard product**.

The generic engines exist; collector-to-UREP migration/integration is still required.

## Gold-standard parity gap

The canonical reference contains mature product surfaces that are absent from the active tree, including the large debug panel, extension assets/build, and Syndigo custom/Falcor integration.

This audit intentionally does not copy those files wholesale. The original project rule says they must be ported deliberately into the generic architecture.

Before a release-quality claim, we still need an explicit integration mission for:

```text
legacy Lit collectors
→ UREP
→ enterprise privacy
→ graph/root-cause
→ recorder/capsule/verification
→ product presentation/export
```

and a deliberate decision on panel/extension/custom-plugin parity.

## Validation added by this audit

New regression coverage checks:

- parent-only structural lineage cannot upgrade root-cause strength;
- `EvidenceStore` remains bounded with `NaN` configuration;
- flight recorder fails safe for invalid event/post-trigger bounds;
- same resource ID across two owners remains isolated;
- ledger non-finite bounds normalize safely;
- every package export target exists;
- package root can be imported and exposes key public APIs;
- library Rollup config exists.

## Validation honesty

This connector session can inspect and modify the private repository but cannot execute a full checked-out repository or browser application locally. Therefore this audit does **not** claim that `npm test` / `npm run build` were executed against a real checkout in this session.

The repository is being changed so those commands are now meaningful and fail on package drift. A real local/CI execution remains the final mechanical gate before Mission 10 or release.

No GitHub Actions were enabled.

## Gate before Mission 10

Mission 10 should not start until this hardening commit is reviewed on `main`.

After that, the next architectural priority should be an explicit **Lit Collector → UREP Integration mission** before adding too many more framework adapters. Otherwise we risk proving more adapters against a kernel that the gold-standard Lit product still does not fully use.
