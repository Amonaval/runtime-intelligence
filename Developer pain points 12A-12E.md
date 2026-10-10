# Developer pain points 12A–12E — Opportunities Advisor Series

Status: IMPLEMENTED / SYNCED TO CANONICAL REPO
Date: 2026-10-10

This document records the product problems behind Mission 12A–12E. The implementation is framework-neutral and belongs in `Amonaval/runtime-intelligence`, not in consumer applications.

## 12A — DOM duplication

Pain: repeated singleton-style UI such as tooltips, dialogs, overlays, popups, drawers or flyouts are instantiated once per list item instead of shared at the nearest useful ancestor. This wastes DOM, listeners and memory and makes large pages harder to reason about.

Signal: repeated singleton-role/custom-element pattern, minimum instance threshold, shared ancestor, optional identical-content signal.

Developer outcome: identify the duplicated element, count, common ancestor and a concrete hoisting/shared-instance recommendation.

## 12B — Virtualization

Pain: developers know a page is heavy but cannot immediately see which list/grid has hundreds of mostly off-screen children.

Signal: many same-tag siblings plus a high off-screen ratio.

Developer outcome: identify parent/child tags, child count, off-screen ratio and recommend virtual scrolling/windowing.

## 12C — Paint

Pain: paint timing and visually expensive CSS are hidden among many unrelated performance signals.

Signal: browser paint timings plus repeated expensive CSS such as filters, backdrop filters and shadows.

Developer outcome: expose FP/FCP and point to high-count expensive paint patterns without pretending they are proven root causes.

## 12D — Worker opportunity

Pain: expensive main-thread work—especially shortly after a large network response—can block interaction, but developers often lack a direct hint that the work may be movable off-thread.

Signal: long task, optionally temporally correlated with a large network response.

Developer outcome: surface a Worker-offload candidate with honest correlation strength; never claim causality from timing alone.

## 12E — Idle scheduling

Pain: periodic/background UI work executes with normal priority even when it is not user-triggered.

Signal: meaningful update duration with no recent interaction proxy; stronger when a repeated periodic pattern is observed.

Developer outcome: identify candidate component/update and suggest `requestIdleCallback` or background-priority scheduling.

## Product rule

These are proactive optimization opportunities, not incident root causes. They belong in the dedicated **⚡ Opportunities** surface and must remain separate from the incident-focused **✨ Intelligence** surface.
