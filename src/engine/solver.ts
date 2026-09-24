import type {
  Circuit,
  ElectricalComponent,
  FuseComponent,
  LampComponent,
  SimulationResult,
  ComponentMeasurement,
  SourceComponent,
  SwitchComponent,
  MCBComponent,
  SocketComponent,
} from './types';
import { findComponent } from './circuit';
import { evaluateMCBTrip } from './protection';

const EPSILON = 1e-9;
const OPEN_RESISTANCE = 1e12;

type ConductivePart = {
  component: ElectricalComponent;
  a: string;
  b: string;
  resistance: number;
};

class UnionFind {
  private parent = new Map<string, string>();

  add(x: string) { if (!this.parent.has(x)) this.parent.set(x, x); }
  find(x: string): string {
    this.add(x);
    let p = this.parent.get(x)!;
    if (p !== x) { p = this.find(p); this.parent.set(x, p); }
    return p;
  }
  union(a: string, b: string) {
    const ra = this.find(a); const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

function terminalNodes(circuit: Circuit): { uf: UnionFind; nodeOf: Map<string, string> } {
  const uf = new UnionFind();
  for (const c of circuit.components) for (const t of c.terminals) uf.add(t.id);
  for (const junction of circuit.junctions ?? []) uf.add(junction.id);
  for (const connection of circuit.connections) uf.union(connection.fromTerminalId, connection.toTerminalId);
  const nodeOf = new Map<string, string>();
  for (const c of circuit.components) for (const t of c.terminals) nodeOf.set(t.id, uf.find(t.id));
  return { uf, nodeOf };
}

function conductingParts(circuit: Circuit, nodeOf: Map<string, string>): ConductivePart[] {
  const parts: ConductivePart[] = [];
  for (const component of circuit.components) {
    if (component.type === 'source') continue;
    if (component.type === 'switch' && component.state === 'open') continue;
    if ((component.type === 'fuse' || component.type === 'mcb') && component.state === 'tripped') continue;
    if (component.terminals.length !== 2) continue;
    const [a, b] = component.terminals;
    let resistance = OPEN_RESISTANCE;
    if (component.type === 'lamp' || component.type === 'resistor' || component.type === 'socket' || component.type === 'wire') resistance = component.resistance;
    if (component.type === 'switch' || component.type === 'fuse' || component.type === 'mcb') resistance = 0.001;
    parts.push({ component, a: nodeOf.get(a.id)!, b: nodeOf.get(b.id)!, resistance: Math.max(resistance, 0) });
  }
  return parts;
}

function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row;
    if (Math.abs(M[pivot][col]) < EPSILON) continue;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const divisor = M[col][col];
    for (let j = col; j <= n; j++) M[col][j] /= divisor;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      if (Math.abs(factor) < EPSILON) continue;
      for (let j = col; j <= n; j++) M[row][j] -= factor * M[col][j];
    }
  }
  for (let i = 0; i < n; i++) if (Math.abs(M[i][i]) < EPSILON) return null;
  return M.map(row => row[n]);
}

function connectedByConductors(parts: ConductivePart[], start: string, target: string): boolean {
  const graph = new Map<string, string[]>();
  for (const p of parts) {
    const a = graph.get(p.a) ?? []; a.push(p.b); graph.set(p.a, a);
    const b = graph.get(p.b) ?? []; b.push(p.a); graph.set(p.b, b);
  }
  const q = [start]; const seen = new Set([start]);
  while (q.length) {
    const x = q.shift()!;
    if (x === target) return true;
    for (const next of graph.get(x) ?? []) if (!seen.has(next)) { seen.add(next); q.push(next); }
  }
  return false;
}

function reachableNodes(parts: ConductivePart[], start: string): Set<string> {
  const graph = new Map<string, string[]>();
  for (const p of parts) {
    const a = graph.get(p.a) ?? []; a.push(p.b); graph.set(p.a, a);
    const b = graph.get(p.b) ?? []; b.push(p.a); graph.set(p.b, b);
  }
  const seen = new Set<string>([start]);
  const q = [start];
  while (q.length) {
    const x = q.shift()!;
    for (const next of graph.get(x) ?? []) {
      if (!seen.has(next)) { seen.add(next); q.push(next); }
    }
  }
  return seen;
}

function pathComponentIds(parts: ConductivePart[], start: string, target: string): string[] {
  const graph = new Map<string, Array<{ node: string; componentId: string }>>();
  for (const p of parts) {
    const a = graph.get(p.a) ?? []; a.push({ node: p.b, componentId: p.component.id }); graph.set(p.a, a);
    const b = graph.get(p.b) ?? []; b.push({ node: p.a, componentId: p.component.id }); graph.set(p.b, b);
  }
  const q = [start]; const prev = new Map<string, { node: string; componentId: string } | null>([[start, null]]);
  while (q.length) {
    const x = q.shift()!;
    if (x === target) break;
    for (const next of graph.get(x) ?? []) if (!prev.has(next.node)) { prev.set(next.node, { node: x, componentId: next.componentId }); q.push(next.node); }
  }
  if (!prev.has(target)) return [];
  const ids: string[] = []; let cursor = target;
  while (prev.get(cursor)) { const p = prev.get(cursor)!; ids.unshift(p.componentId); cursor = p.node; }
  return ids;
}

function defaultMeasurements(source?: SourceComponent, resistance = 0) {
  return { voltage: source?.voltage ?? 0, current: 0, power: 0, loadResistance: resistance };
}

function emptyComponentMeasurements(circuit: Circuit): Record<string, ComponentMeasurement> {
  return Object.fromEntries(circuit.components.map(c => [c.id, { componentId: c.id, voltage: 0, current: 0, power: 0 }]));
}

export function simulateCircuit(circuit: Circuit): SimulationResult {
  const source = circuit.components.find((c): c is SourceComponent => c.type === 'source');
  const fuse = circuit.components.find((c): c is FuseComponent => c.type === 'fuse');
  const mcb = circuit.components.find((c): c is MCBComponent => c.type === 'mcb');
  const lamps = circuit.components.filter((c): c is LampComponent => c.type === 'lamp');
  const sockets = circuit.components.filter((c): c is SocketComponent => c.type === 'socket');
  const sw = circuit.components.find((c): c is SwitchComponent => c.type === 'switch');
  const protection = fuse ?? mcb;
  const errors: string[] = [];
  const warnings: string[] = [];
  const componentMeasurements = emptyComponentMeasurements(circuit);

  if (!source) errors.push('لا يوجد مصدر تغذية.');
  if (!protection) errors.push('لا توجد وسيلة حماية.');
  if (!source || !protection) return { status: 'open-circuit', measurements: defaultMeasurements(source), lampLit: false, fuseState: fuse?.state ?? 'armed', mcbState: mcb?.state, protectionDevice: protection ? (protection.type === 'mcb' ? 'mcb' : 'fuse') : 'none', currentPath: [], errors, warnings };
  if (!source!.enabled) return { status: 'off', measurements: defaultMeasurements(source), lampLit: false, fuseState: fuse?.state ?? 'armed', mcbState: mcb?.state, protectionDevice: protection.type === 'mcb' ? 'mcb' : 'fuse', currentPath: [], errors, warnings };
  if (protection.state === 'tripped') return { status: 'protected', measurements: defaultMeasurements(source), lampLit: false, fuseState: fuse?.state ?? 'armed', mcbState: mcb?.state, protectionDevice: protection.type === 'mcb' ? 'mcb' : 'fuse', currentPath: [], errors, warnings };

  const { nodeOf } = terminalNodes(circuit);
  const parts = conductingParts(circuit, nodeOf);
  const sourceLTerminal = source.terminals.find(t => t.name === 'L')?.id;
  const sourceNTerminal = source.terminals.find(t => t.name === 'N')?.id;
  if (!sourceLTerminal || !sourceNTerminal) {
    errors.push('أطراف المصدر L و N غير مكتملة.');
    return { status: 'open-circuit', measurements: defaultMeasurements(source), lampLit: false, fuseState: fuse?.state ?? 'armed', mcbState: mcb?.state, protectionDevice: protection.type === 'mcb' ? 'mcb' : 'fuse', currentPath: [], errors, warnings };
  }
  const sourceL = nodeOf.get(sourceLTerminal)!;
  const sourceN = nodeOf.get(sourceNTerminal)!;
  const currentPath = pathComponentIds(parts, sourceL, sourceN);

  if (!connectedByConductors(parts, sourceL, sourceN)) {
    return { status: 'open-circuit', measurements: defaultMeasurements(source), lampLit: false, fuseState: fuse?.state ?? 'armed', mcbState: mcb?.state, protectionDevice: protection.type === 'mcb' ? 'mcb' : 'fuse', currentPath, errors, warnings };
  }

  // DC nodal analysis. Only nodes reachable from the energized source are included;
  // disconnected components must not create singular matrix rows.
  const reachable = reachableNodes(parts, sourceL);
  const activeParts = parts.filter(p => reachable.has(p.a) && reachable.has(p.b));
  const nodes = [...new Set(activeParts.flatMap(p => [p.a, p.b]))].filter(n => n !== sourceL && n !== sourceN);
  const index = new Map(nodes.map((n, i) => [n, i]));
  const A = nodes.map(() => Array(nodes.length).fill(0));
  const b = nodes.map(() => 0);
  const voltageOf = (node: string) => node === sourceL ? source!.voltage : node === sourceN ? 0 : null;

  for (const p of activeParts) {
    const g = 1 / Math.max(p.resistance, 1e-6);
    const va = voltageOf(p.a); const vb = voltageOf(p.b);
    const ia = index.get(p.a); const ib = index.get(p.b);
    if (ia !== undefined) { A[ia][ia] += g; if (ib !== undefined) A[ia][ib] -= g; else if (vb !== null) b[ia] += g * vb; }
    if (ib !== undefined) { A[ib][ib] += g; if (ia !== undefined) A[ib][ia] -= g; else if (va !== null) b[ib] += g * va; }
  }

  const voltages = nodes.length ? solveLinear(A, b) : [];
  if (voltages === null) {
    warnings.push('تعذر إيجاد حل مستقر للدائرة؛ تحقق من التوصيلات أو وجود قصر شديد.');
    return { status: 'short-circuit', measurements: { ...defaultMeasurements(source), current: Infinity, power: Infinity, loadResistance: 0 }, lampLit: false, fuseState: fuse?.state ?? 'armed', mcbState: mcb?.state, protectionDevice: protection.type === 'mcb' ? 'mcb' : 'fuse', currentPath, errors, warnings };
  }
  const V = (node: string) => voltageOf(node) ?? voltages[index.get(node)!];
  const currentFor = (p: ConductivePart) => (V(p.a) - V(p.b)) / Math.max(p.resistance, 1e-6);
  const nodeVoltages: Record<string, number> = {};
  for (const component of circuit.components) for (const terminal of component.terminals) {
    const node = nodeOf.get(terminal.id);
    if (node) nodeVoltages[terminal.id] = V(node);
  }
  for (const p of activeParts) {
    const current = Math.abs(currentFor(p));
    const voltage = Math.abs(V(p.a) - V(p.b));
    componentMeasurements[p.component.id] = { componentId: p.component.id, voltage, current, power: voltage * current };
  }
  const sourceParts = activeParts.filter(p => p.a === sourceL || p.b === sourceL);
  const totalCurrent = sourceParts.reduce((sum, p) => sum + Math.abs(currentFor(p)), 0);
  const equivalentResistance = totalCurrent > EPSILON ? source.voltage / totalCurrent : Infinity;
  const power = source.voltage * totalCurrent;

  if (fuse && totalCurrent > fuse.ratedCurrent) {
    fuse.state = 'tripped';
    for (const lamp of lamps) { lamp.lit = false; lamp.power = 0; }
    return { status: 'protected', measurements: { voltage: source.voltage, current: totalCurrent, power, loadResistance: equivalentResistance }, lampLit: false, fuseState: 'tripped', mcbState: mcb?.state, protectionDevice: 'fuse', currentPath, errors, warnings: [`تيار ${totalCurrent.toFixed(2)} A تجاوز قيمة حماية الفيوز ${fuse.ratedCurrent} A.`] };
  }

  if (mcb) {
    const trip = evaluateMCBTrip(mcb.ratedCurrent, totalCurrent, mcb.curve);
    if (trip.tripped) {
      mcb.state = 'tripped';

  if (!Number.isFinite(totalCurrent) || totalCurrent > 1e4 || equivalentResistance < 0.01) {
    return { status: 'short-circuit', measurements: { voltage: source.voltage, current: totalCurrent, power, loadResistance: Math.max(0, equivalentResistance) }, lampLit: false, fuseState: fuse?.state ?? 'armed', mcbState: mcb?.state, protectionDevice: protection.type === 'mcb' ? 'mcb' : 'fuse', currentPath, errors, warnings: [...warnings, 'تم اكتشاف قصر كهربائي أو مقاومة مكافئة منخفضة جدًا.'] };
  }

  for (const lamp of lamps) { lamp.lit = false; lamp.power = 0; }
      return { status: 'protected', measurements: { voltage: source.voltage, current: totalCurrent, power, loadResistance: equivalentResistance }, lampLit: false, fuseState: fuse?.state ?? 'armed', mcbState: 'tripped', protectionDevice: 'mcb', currentPath, errors, warnings: [trip.reason] };
    }
  }

  for (const lamp of lamps) {
    const part = parts.find(p => p.component.id === lamp.id);
    const i = part ? Math.abs(currentFor(part)) : 0;
    lamp.lit = i > 1e-6;
    lamp.power = i * i * lamp.resistance;
  }
  for (const socket of sockets) {
    const part = parts.find(p => p.component.id === socket.id);
    const i = part ? Math.abs(currentFor(part)) : 0;
    socket.energized = i > 1e-6;
  }
  if (sw && sw.state === 'open') warnings.push('المفتاح مفتوح.');
  return { status: 'running', measurements: { voltage: source.voltage, current: totalCurrent, power, loadResistance: equivalentResistance }, lampLit: lamps.some(l => l.lit), fuseState: fuse?.state ?? 'armed', mcbState: mcb?.state, protectionDevice: protection.type === 'mcb' ? 'mcb' : 'fuse', currentPath, errors, warnings, componentMeasurements, nodeVoltages };
}

