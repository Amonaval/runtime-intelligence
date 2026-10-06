# Mission 02 — Evidence Graph + Root-Cause Grouping

Status: COMPLETE

## Delivered

- `src/core/evidence-graph.js`
  - builds graph nodes from UREP events;
  - explicit `causedByEventId` => causal edge;
  - explicit `parentEventId` => structural lineage edge;
  - shared `interactionId` / `traceId` => correlation-only context edges;
  - every edge records relation, basis, inferred flag, evidence level, attribution quality and confidence;
  - rejects future-event causal direction when building edges;
  - supports descendants and connected components for later Pinpoint/report use.

- `src/core/root-cause.js`
  - groups connected evidence into causal clusters;
  - ranks likely root candidates;
  - collapses downstream symptoms by type/count;
  - labels cluster certainty as `confirmed`, `attributed`, or `correlated`;
  - never upgrades correlation-only context into causality.

- `test/unit/evidence-graph.test.mjs`
  - explicit causality vs structural lineage;
  - context correlation remains inferred;
  - future cause rejected;
  - downstream symptoms collapse under attributed state change;
  - correlation-only clusters remain correlated.

## Product rule

The graph is evidence, not decoration. A connection must explain why it exists and how strongly it is supported.

```text
explicit causedByEventId  -> causal edge
explicit parentEventId    -> structural edge
shared interaction/trace  -> correlation-only edge
```

Root-cause ranking is a diagnostic hypothesis layer. It does not override the evidence carried by graph edges.

## Known limits

- No source-map resolver yet.
- No graph UI/panel integration yet.
- Root scoring is deterministic heuristic ranking, not ML.
- Context edges use shared trace/interaction identity only; arbitrary temporal adjacency is intentionally not linked.
- Existing collectors still need progressive migration to emit richer interaction/trace correlations.

## Next mission

Mission 03 — Generic Source Resolver / source-map attribution

Effort: MEDIUM-HIGH

Goal: resolve runtime stacks and framework source hints into canonical `file:line:column` locations reusable by Pinpoint, Evidence Graph, Fix Table, HTML reports and AI handoff.
