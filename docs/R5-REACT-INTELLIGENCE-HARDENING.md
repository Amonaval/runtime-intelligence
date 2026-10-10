# R5 — React Intelligence Hardening

## Goal

Establish trustworthy React evidence collection and dogfood integration without creating a second Runtime Intelligence product surface.

## Retained outcomes

- React root providers and nested profiler boundaries can carry explicit source locations.
- React profiler observations emit normalized runtime evidence through the shared evidence protocol.
- Mount/update timing remains framework-reported evidence and does not invent render cause.
- React integration remains fail-safe and development-only in TrustWeave.
- Generic advisers and core intelligence remain shared rather than being reimplemented for React.

## Architectural correction

The temporary framework-neutral lightweight panel introduced during early React dogfood was the wrong product direction and has been removed.

`lit/src/panel/LdsDebugPanel.js` is the existing mature Runtime Intelligence product UI and remains the canonical panel. React support must plug into that product through shared runtime/evidence contracts rather than growing a parallel panel.

The public `/panel` entry now points back to the canonical `LdsDebugPanel`. The mature panel still has Lit implementation details internally; resolving that delivery boundary for React consumers is part of R5.2, not a reason to rebuild the panel.

## Evidence honesty retained

- No arbitrary slow-render threshold.
- No fake state/update cause.
- No dependency causality when React cannot support it.
- No automatic claim that profiler duration proves a defect.

## Next direction

R5.2–R5.6 will pursue React practical parity by reusing the mature panel, shared collectors, shared core intelligence and React-specific adapter evidence. The target is 80–90% of Lit's practical product value in React, with unsupported framework semantics surfaced honestly rather than simulated.
