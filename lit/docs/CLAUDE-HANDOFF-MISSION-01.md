# Claude Handoff — Mission 01

Read `MISSION-01-FRAMEWORK-ADAPTER-V2.md`, `architecture/UNIVERSAL-EVIDENCE-PROTOCOL.md`, and `architecture/FRAMEWORK-ADAPTER-V2.md` first.

## Challenge this work, do not merely extend it

Questions Claude should actively attack:

1. Is the event vocabulary genuinely framework-neutral, or are hidden Lit assumptions still present?
2. Are evidence level and attribution quality sufficient as two axes, or is a third concept (for example data provenance) necessary?
3. Are capability support values too coarse for React/Vue/Angular/Svelte realities?
4. Can event correlation IDs be introduced without AsyncLocalStorage-like browser complexity or global mutable context bugs?
5. Does `summarizeRuntimeValue()` leak more semantic data than an enterprise-safe default should?
6. Can `requestUpdate` evidence legitimately be called `attribution`, or should some cases stay `correlation` until source/call-chain evidence exists?
7. Does `LitDebugMixin.performUpdate()` preserve all Lit semantics, including errors and superclass behavior?
8. How should React public-only mode and deep/Fiber mode advertise different capabilities without fragmenting the protocol?

## Guardrails

Do not:
- turn UREP into an enormous telemetry standard;
- make the kernel dependent on React Fiber or Lit methods;
- call temporal adjacency causality;
- store arbitrary raw props/state by default;
- replace the mature Pinpoint/report/verification workflow with a generic dashboard.

## Desired next review

Before Mission 02 implementation, compare the proposed graph against at least Lit, React, Vue, Angular and Svelte examples. The graph should be able to represent different certainty per edge rather than forcing every framework into the same proof quality.
