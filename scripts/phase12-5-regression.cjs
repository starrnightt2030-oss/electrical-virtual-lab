const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const root = path.resolve(__dirname, '..');
const out = path.join(root, '.qa-engine-build-125');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify({ type: 'commonjs' }));
const tsc = path.join(root, 'node_modules', '.bin', 'tsc');
const compiler = fs.existsSync(tsc) ? tsc : 'tsc';
execFileSync(compiler, ['-p', path.join(root, 'tsconfig.engine.json'), '--module', 'CommonJS', '--moduleResolution', 'Node', '--noEmit', 'false', '--outDir', out, '--declaration', 'false'], { stdio: 'inherit', cwd: root });

const circuit = require(path.join(out, 'circuit.js'));
const solver = require(path.join(out, 'solver.js'));
const resistance = require(path.join(out, 'resistance.js'));
const capacitor = require(path.join(out, 'capacitor.js'));
const inductor = require(path.join(out, 'inductor.js'));
const power = require(path.join(out, 'power.js'));
const protection = require(path.join(out, 'protection.js'));
const cable = require(path.join(out, 'cable.js'));
const measurements = require(path.join(out, 'measurements.js'));
const diagnostics = require(path.join(out, 'diagnostics.js'));
const faults = require(path.join(out, 'faults.js'));
const residential = require(path.join(out, 'residential.js'));
const validation = require(path.join(out, 'validation.js'));
const fundamentals = require(path.join(out, 'fundamentals.js'));
const codes = require(path.join(out, 'resistorCodes.js'));
const ohmGraph = require(path.join(out, 'ohmGraph.js'));

function approx(actual, expected, eps = 1e-6) { assert.ok(Math.abs(actual - expected) <= eps, `${actual} != ${expected}`); }

// Fundamentals
assert.deepEqual(fundamentals.solveOhmsLaw('current', 220, 44), { voltage: 220, current: 5, resistance: 44, power: 1100 });
approx(fundamentals.conductorResistance({ material: 'copper', lengthMeters: 10, areaMm2: 2.5 }), 0.06912, 0.001);

// Passive networks
assert.equal(resistance.seriesResistance([10, 20, 30]), 60);
approx(resistance.parallelResistance([10, 10]), 5);
approx(capacitor.capacitorEquivalent([10e-6, 20e-6], 'parallel'), 30e-6);
approx(capacitor.capacitorEquivalent([10e-6, 20e-6], 'series'), 6.6666666667e-6, 1e-12);
approx(capacitor.capacitorVoltageCharge(100e-6, 220), 0.022);
approx(inductor.inductorEquivalent([1, 2], 'series'), 3);
approx(inductor.inductorEquivalent([1, 2], 'parallel'), 2/3);
approx(inductor.inductiveReactance(0.1, 50), 31.4159265359, 1e-9);

// Color/alphanumeric resistor decoding
assert.equal(codes.decodeAlphanumericResistor('472'), 4700);
assert.equal(codes.decodeAlphanumericResistor('4R7'), 4.7);
const bands = codes.encodeResistorBands(4700, 5, 4);
assert.deepEqual(codes.decodeResistorBands(bands), { resistance: 4700, tolerance: 5, nominalText: '4.70 kΩ' });

// Power
const p = power.calculatePower({ voltage: 220, current: 5, powerFactor: 0.8, load: 'inductive' });
assert.equal(p.activePowerW, 880); assert.equal(p.apparentPowerVA, 1100); approx(p.reactivePowerVAR, 660, 1e-9);
assert.equal(power.energyKWh(1000, 2), 2); assert.equal(power.energyCost(1000, 2, 1.5), 3);

// Protection / cable
const sel = protection.selectProtection({ loadCurrent: 12, device: 'mcb', loadType: 'mixed', mcbCurve: 'C' });
assert.equal(sel.selectedRating, 16);
assert.equal(protection.evaluateMCBTrip(16, 20, 'C').tripped, false);
assert.equal(protection.evaluateMCBTrip(16, 100, 'C').tripped, true);
const drop = cable.calculateVoltageDrop({ designCurrent: 10, lengthMeters: 20, crossSectionMm2: 2.5, material: 'copper', voltage: 220, phase: 'single', powerFactor: 1 });
assert.ok(drop > 0 && drop < 10);
const sized = cable.sizeCable({ designCurrent: 12, lengthMeters: 20, material: 'copper', voltage: 220, phase: 'single', powerFactor: 1, installation: 'conduit' });
assert.ok(sized.selectedSizeMm2 >= 1.5);

// Base circuit solver
const base = circuit.createBasicMCBCircuit();
let result = solver.simulateCircuit(base);
assert.equal(result.status, 'running'); assert.equal(result.lampLit, true); approx(result.measurements.current, 220/48.4, 0.01);

// Protection regression
base.components.find(x => x.id === 'lamp').resistance = 1;
result = solver.simulateCircuit(base);
assert.equal(result.status, 'protected'); assert.equal(result.mcbState, 'tripped');

// Measurement safety: resistance/continuity/megger must not operate energized
const energized = circuit.createBasicMCBCircuit();
result = solver.simulateCircuit(energized);
const v = measurements.readMeasurement(energized, result, 'voltage', 'source.L', 'source.N');
assert.equal(v.valid, true); approx(v.value, 220);
const ohmBlocked = measurements.readMeasurement(energized, result, 'resistance', 'lamp.L');
assert.equal(ohmBlocked.valid, false);
const contBlocked = measurements.readMeasurement(energized, result, 'continuity', 'lamp.L', 'lamp.N');
assert.equal(contBlocked.valid, false);
const meggerBlocked = diagnostics.probeMegger(energized, result, 'lamp.L', 'lamp.N');
assert.equal(meggerBlocked.valid, false);

// De-energized instrument path
energized.components.find(c => c.id === 'source').enabled = false;
result = solver.simulateCircuit(energized);
const ohm = measurements.readMeasurement(energized, result, 'resistance', 'lamp.L');
assert.equal(ohm.valid, true); approx(ohm.value, 48.4);
const megger = diagnostics.probeMegger(energized, result, 'lamp.L', 'lamp.N');
assert.equal(megger.valid, true);

// Fault injection preserves junctions and changes behavior
const parallel = residential.createResidentialCircuit('parallel-lamps');
assert.equal((parallel.junctions || []).length, 2);
const faulted = faults.injectFault(parallel, 'lamp-failure');
assert.equal(faulted.junctions.length, parallel.junctions.length);
const shorted = faults.injectFault(parallel, 'short-circuit');
assert.ok(shorted.components.some(c => c.id.startsWith('fault-short-')));

// Residential presets all validate structurally and simulate without throwing
for (const preset of residential.getResidentialPresets()) {
  const vr = validation.validateCircuit(preset.circuit);
  assert.equal(vr.valid, true, `${preset.kind} invalid: ${vr.issues.map(i => i.code).join(',')}`);
  const sim = solver.simulateCircuit(preset.circuit);
  assert.ok(['running', 'open-circuit', 'protected', 'short-circuit', 'off'].includes(sim.status));
}

// Ohm graph sanity
const graph = ohmGraph.generateOhmGraph('current-vs-voltage', 44, 0, 220, 11);
assert.equal(graph.length, 12); approx(graph[11].y, 5);

console.log('PHASE12_5_REGRESSION_OK');
