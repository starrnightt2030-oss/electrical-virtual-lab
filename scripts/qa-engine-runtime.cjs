const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const root = path.resolve(__dirname, '..');
const out = path.join(root, '.qa-engine-build');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify({ type: 'commonjs' }));

const localTsc = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
const tsc = fs.existsSync(localTsc) ? localTsc : 'tsc';
execFileSync(tsc, [
  '-p', path.join(root, 'tsconfig.engine.json'),
  '--module', 'CommonJS',
  '--moduleResolution', 'Node',
  '--noEmit', 'false',
  '--outDir', out,
  '--declaration', 'false'
], { stdio: 'inherit', cwd: root });

const { createBasicMCBCircuit } = require(path.join(out, 'circuit.js'));
const { simulateCircuit } = require(path.join(out, 'solver.js'));
const { calculatePower, energyKWh, energyCost } = require(path.join(out, 'power.js'));
const { seriesResistance, parallelResistance } = require(path.join(out, 'resistance.js'));

const circuit = createBasicMCBCircuit();
let result = simulateCircuit(circuit);
assert.equal(result.status, 'running');
assert.ok(Math.abs(result.measurements.current - 220 / 48.4) < 0.01);
assert.equal(result.lampLit, true);

circuit.components.find(x => x.id === 'lamp').resistance = 1;
result = simulateCircuit(circuit);
assert.equal(result.status, 'protected');
assert.equal(result.mcbState, 'tripped');

circuit.components.find(x => x.id === 'mcb').state = 'armed';
circuit.components.find(x => x.id === 'switch').state = 'open';
result = simulateCircuit(circuit);
assert.equal(result.status, 'open-circuit');

assert.equal(seriesResistance([10, 20, 30]), 60);
assert.equal(parallelResistance([10, 10]), 5);
const power = calculatePower({ voltage: 220, current: 5, powerFactor: 0.8, load: 'inductive' });
assert.equal(power.apparentPowerVA, 1100);
assert.equal(power.activePowerW, 880);
assert.equal(energyKWh(1000, 2), 2);
assert.equal(energyCost(1000, 2, 1.5), 3);

console.log('PHASE12_3_ENGINE_RUNTIME_OK');
