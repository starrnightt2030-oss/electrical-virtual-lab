const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const app = read('src/App.tsx');
const main = read('src/main.tsx');
const workbench = read('src/components/ComponentWorkbench.tsx');
const schematic = read('src/components/SchematicRenderer.tsx');
const types = read('src/engine/types.ts');
const vite = read('vite.config.ts');
const pkg = JSON.parse(read('package.json'));

// Application -> engine integration contract.
for (const name of [
  './engine/solver', './engine/measurements', './engine/faults', './engine/protection',
  './engine/cable', './engine/resistance', './engine/capacitor', './engine/inductor',
  './engine/power', './engine/residential', './engine/diagnostics',
]) assert(app.includes(name), `App missing engine integration: ${name}`);
assert(app.includes("import ComponentWorkbench from './components/ComponentWorkbench';"), 'Workbench is not mounted by App');
assert(app.includes('<ComponentWorkbench />'), 'Workbench component is not rendered');
assert(main.includes("registerSW({ immediate: true })"), 'PWA service worker registration is missing');
assert(vite.includes('VitePWA('), 'Vite PWA plugin is missing');
assert(vite.includes("registerType: 'autoUpdate'"), 'PWA auto update is missing');
assert(app.includes('Mohamed _ Eldawly'), 'Developer credit is missing or changed');

// Workbench -> shared electrical model contract.
assert(workbench.includes("import type { Circuit, ComponentType, ElectricalComponent } from '../engine/types';"), 'Workbench does not use Circuit model');
assert(workbench.includes('simulateCircuit(circuit)'), 'Workbench does not invoke the electrical solver');
assert(workbench.includes('validateCircuit(circuit)'), 'Workbench does not invoke circuit validation');
assert(workbench.includes('<SchematicRenderer circuit={circuit}'), 'Workbench does not feed the same Circuit to schematic renderer');
assert(workbench.includes('junctions: current.junctions'), 'Component deletion must preserve Junction state');

// Schematic contract: consumes Circuit, not a separate schematic model.
assert(schematic.includes("import type { Circuit, ElectricalComponent } from '../engine/types';"), 'Schematic renderer is detached from Circuit model');
assert(schematic.includes('function SchematicRenderer({ circuit }'), 'Schematic renderer does not accept Circuit');
assert(schematic.includes('circuit.connections'), 'Schematic renderer does not inspect circuit connections');
assert(types.includes('junctions?: CircuitJunction[]'), 'Circuit model does not support Junctions');

// Tooling contract.
for (const script of ['build', 'typecheck', 'typecheck:engine', 'qa:engine', 'qa:regression']) {
  assert(typeof pkg.scripts[script] === 'string', `Missing npm script: ${script}`);
}

console.log('PHASE12_6_INTEGRATION_CONTRACT_OK');
console.log('INTEGRATION_RUNTIME_BLOCKED_BY_MISSING_FRONTEND_DEPENDENCIES');
