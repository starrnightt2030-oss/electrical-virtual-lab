# Phase 12.8 — Performance & Reliability QA

Date: 2026-09-25

## Scope

This phase measures the electrical simulation engine under progressively larger parallel-load circuits and reruns the engine typecheck/regression gate.

## Commands executed

```bash
npm run typecheck:engine
node scripts/phase12-5-regression.cjs
node scripts/phase12-8-performance.cjs
```

## Results

### Typecheck

`npm run typecheck:engine` — PASS

### Regression

`PHASE12_5_REGRESSION_OK` — PASS

### Solver performance

20 timed simulation runs per circuit size, after 3 warm-up runs:

| Parallel lamps | Average simulation |
|---:|---:|
| 1 | 0.058 ms |
| 10 | 0.174 ms |
| 25 | 0.271 ms |
| 50 | 0.478 ms |
| 100 | 0.590 ms |

Maximum observed average: **0.590 ms** at 100 parallel lamps.

All measured scenarios returned `running`.

## Reliability observations

- The engine remains deterministic across repeated runs in this benchmark.
- The benchmark uses the current compiled engine QA build and is intentionally focused on solver behavior, not browser rendering.
- Full browser memory, frame-rate, IndexedDB, service-worker, and installability profiling remain pending until the complete React/Vite dependency installation and browser runtime are available.

## Gate

**PASS for engine performance benchmark.**

This does **not** mean the complete application has passed the release gate.
