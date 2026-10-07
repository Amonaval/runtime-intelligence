# Claude Handover Index

This folder closes the ChatGPT development phase and hands the Runtime Intelligence work to Claude for independent review.

Read in this order:

1. `CLAUDE-COMPLETE-HANDOVER-PROMPT.md`
   - primary prompt to give Claude
   - contains user intent, current concerns, validation expectations, and decision freedom

2. `CHATGPT-WORK-KT-AND-DECISION-HISTORY.md`
   - detailed technical/product KT
   - explains what ChatGPT built, why, corrections made during real UI Platform validation, and known weaknesses

3. `FUTURE-WORK-AND-STRATEGIC-DECISIONS.md`
   - all previously discussed future work
   - explicitly backlog-only, not pre-approved
   - asks Claude to rank by value/effort after independent review

Also read relevant existing repository documentation, especially Mission 09.5, previous Claude review-loop documents, baseline docs, and current `lit/README.md`.

## Current handover status

Development is intentionally stopped.

The user has observed the dedicated Intelligence tab but is not yet convinced the current Runtime Intelligence layer produces enough immediate value relative to its complexity. A root-cause result also appeared questionable in a real application scenario.

Claude should therefore begin with review and validation, not continuation.

## Core instruction

Do not preserve ChatGPT's work for its own sake.

Keep, simplify, merge, rework, defer, or remove pieces based on demonstrated debugging value, correctness, runtime safety, and maintainability.
