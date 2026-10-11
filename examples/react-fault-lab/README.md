# React Fault Lab

Controlled React/browser validation harness for Runtime Intelligence.

The lab is intentionally outside the published package surface. It creates deliberate defects only inside `examples/react-fault-lab`; TrustWeave and normal consumers remain clean.

## Fast validation path

From the repository root:

```bash
npm run lab:react:install
npm run lab:react
```

Open `http://127.0.0.1:4178` and use **Run all + export JSON + HTML**.

That one action:

1. triggers every behavioral fault,
2. waits for async/network/resource evidence,
3. injects deterministic rare-signal UREP coverage,
4. refreshes the mature panel,
5. exports normalized JSON and HTML reports.

If Chrome blocks multiple automatic downloads, use the adjacent **Export JSON** and **Export HTML** buttons after the run completes.

## Behavioral faults

These create real runtime behavior rather than synthetic events:

- slow React Profiler render
- rapid tracked-state render storm/update-budget pressure
- bounded effect/state feedback loop
- unhandled Promise rejection
- console warnings + error
- slow fetch
- HTTP 503 fetch
- sequential fetch calls
- large response followed by CPU/long-task work
- XHR 503 failure
- duplicate singleton/dialog DOM
- large unvirtualized list
- oversized DOM (~1800 extra nodes)
- repeated expensive box-shadow paint pattern
- tracked resource outliving its owner
- retained same-name component-owner/mount spike

## Deterministic full-coverage injection

Some browser signals are timing/browser dependent. The injected pack is explicitly labeled `fault-lab-injected` and covers:

- interaction + update correlation
- slow render
- repeated state changes/property thrash
- slow + failed network evidence
- DOM duplication
- virtualization
- expensive paint
- worker opportunity
- sequential API opportunity
- update-budget violation
- idle scheduling opportunity
- slow paint timing
- network correlation and orphan-suspect diagnostics
- runtime error
- resource lifetime violation
- retained-owner/mount spike

Synthetic evidence is never intended to be interpreted as a defect in a real application.

## What to send for review

Prefer both exported files. The normalized report contains:

- legacy mature-panel report
- complete UREP evidence
- diagnostics
- normalized findings
- optimization/reliability opportunities
- Intelligence summary
- evidence capsule
- evidence counts by event type

This makes report review possible without manually checking every panel tab.
