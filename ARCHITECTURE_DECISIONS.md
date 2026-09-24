# Architecture Decisions

## ADR-001 — Local-first PWA
The V1 application is intentionally local-first. Student accounts, backend licensing, grades and remote dashboards are excluded from V1.

## ADR-002 — Electrical Engine separated from UI
Electrical simulation logic must not depend on React. The engine exposes plain TypeScript models and deterministic simulation functions.

## ADR-003 — Terminal-based connectivity
Components expose named terminals. Circuit connections reference terminal IDs rather than UI coordinates. This allows the same electrical model to drive 2D, 3D and schematic views.

## ADR-004 — Protection is part of simulation state
Fuse/MCB state is modeled in the electrical engine so protection behavior can later drive animation, sound and troubleshooting.

## ADR-005 — Incremental solver development
The first solver supports the basic source/fuse/switch/lamp path. Series/parallel networks and a generalized graph solver will be added after the initial behavior is tested.
