const { performance } = require('node:perf_hooks');
const { createSource, createMCB, createLamp } = require('../.qa-engine-build-125/circuit.js');
const { simulateCircuit } = require('../.qa-engine-build-125/solver.js');

function terminal(componentId, name) { return { id: `${componentId}.${name}`, componentId, name }; }
function parallelLampCircuit(count) {
  const source = createSource('source', 220);
  const mcb = createMCB('mcb', 1000, 'C');
  const components = [source, mcb];
  const connections = [{ id: 'mains', fromTerminalId: 'source.L', toTerminalId: 'mcb.LINE' }];
  for (let i = 0; i < count; i++) {
    const lamp = createLamp(`lamp-${i}`, 48.4, 220);
    components.push(lamp);
    connections.push({ id: `l-${i}`, fromTerminalId: 'mcb.LOAD', toTerminalId: lamp.terminals[0].id });
    connections.push({ id: `n-${i}`, fromTerminalId: lamp.terminals[1].id, toTerminalId: 'source.N' });
  }
  return { components, connections, junctions: [] };
}

const sizes = [1, 10, 25, 50, 100];
const results = [];
for (const size of sizes) {
  const circuit = parallelLampCircuit(size);
  const warmups = 3;
  for (let i = 0; i < warmups; i++) simulateCircuit(circuit);
  const runs = 20;
  const start = performance.now();
  let last;
  for (let i = 0; i < runs; i++) last = simulateCircuit(circuit);
  const elapsed = performance.now() - start;
  const avg = elapsed / runs;
  if (!last || !last.measurements) throw new Error(`invalid simulation result at ${size}`);
  results.push({ size, avgMs: Number(avg.toFixed(3)), totalMs: Number(elapsed.toFixed(3)), status: last.status });
}

const max = Math.max(...results.map(r => r.avgMs));
console.log(JSON.stringify({ marker: 'PHASE12_8_PERFORMANCE_OK', results, maxAvgMs: max }, null, 2));
if (max > 100) process.exitCode = 2;
