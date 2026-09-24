# Electrical Virtual Lab — Phase 12.5 Regression QA

## Purpose
Strengthen the electrical-engine regression suite and fix concrete defects found during QA.

## Actual checks passed
- Engine TypeScript compilation: PASS
- Fundamentals / Ohm calculations: PASS
- Conductor resistance: PASS
- Series / parallel resistance: PASS
- Resistor color-code encode/decode: PASS
- Alphanumeric resistor codes: PASS
- Capacitor equivalent/charge: PASS
- Inductor equivalent/reactance: PASS
- Power / energy / cost: PASS
- MCB selection and trip behavior: PASS
- Cable sizing and voltage drop: PASS
- Basic MCB circuit simulation: PASS
- MCB overload protection regression: PASS
- Voltage measurement while energized: PASS
- Resistance measurement blocked while energized: PASS
- Continuity measurement blocked while energized: PASS
- Megger blocked while energized: PASS
- Megger allowed when de-energized: PASS
- Fault injection junction preservation: PASS
- Residential preset structural validation: PASS
- Residential preset simulation smoke tests: PASS
- Ohm graph generation: PASS

## Defects fixed during this phase
1. Solver off-state path referenced `fuse.state` even for MCB-only circuits.
2. Resistance/continuity measurements were allowed while a source was energized.
3. Megger could be invoked while energized and had no proper de-energized terminal validation.
4. Fault cloning dropped junctions.
5. Residential branch presets used direct multi-wire terminal connections instead of Junctions.
6. Resistor color-band encoding generated incorrect band counts/significant digits for 4/5-band values.

## Evidence
Runtime command:

```text
node scripts/phase12-5-regression.cjs
```

Result:

```text
PHASE12_5_REGRESSION_OK
```

Engine TypeScript command:

```text
tsc -p tsconfig.engine.json --pretty false
```

Result: exit code 0.

## Remaining gate
The complete React/Vite application build still requires a complete dependency installation in an environment where `npm install` can finish successfully. This phase does not claim a full application build.
