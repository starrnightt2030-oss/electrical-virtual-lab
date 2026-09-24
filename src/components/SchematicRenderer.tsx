import type { Circuit, ElectricalComponent } from '../engine/types';

const WIDTH = 1100;
const HEIGHT = 360;
const NODE_GAP = 150;
const TOP = 150;

type Point = { x: number; y: number };

function terminalsOf(c: ElectricalComponent) {
  return c.terminals.map(t => t.id);
}

function componentLabel(c: ElectricalComponent) {
  const names: Record<string, string> = {
    source: 'مصدر', mcb: 'MCB', fuse: 'Fuse', switch: 'مفتاح', lamp: 'مصباح', socket: 'مقبس', resistor: 'R', capacitor: 'C', inductor: 'L', wire: 'سلك'
  };
  return names[c.type] ?? c.type;
}

function Symbol({ component, x, y }: { component: ElectricalComponent; x: number; y: number }) {
  const stroke = 'currentColor';
  const common = { fill: 'none', stroke, strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (component.type) {
    case 'source':
      return <g><line x1={x - 18} y1={y - 28} x2={x - 18} y2={y + 28} {...common}/><line x1={x + 18} y1={y - 16} x2={x + 18} y2={y + 16} {...common}/><text x={x} y={y - 42} textAnchor="middle" className="schematic-symbol-label">AC 220V</text></g>;
    case 'mcb':
      return <g><rect x={x - 25} y={y - 22} width="50" height="44" rx="6" {...common}/><line x1={x - 12} y1={y + 10} x2={x + 12} y2={y - 10} {...common}/><text x={x} y={y + 42} textAnchor="middle" className="schematic-symbol-label">{componentLabel(component)}</text></g>;
    case 'fuse':
      return <g><line x1={x - 42} y1={y} x2={x - 16} y2={y} {...common}/><rect x={x - 16} y={y - 10} width="32" height="20" rx="3" {...common}/><path d={`M ${x-10} ${y} L ${x-4} ${y-6} L ${x+4} ${y+6} L ${x+10} ${y}`} {...common}/><line x1={x + 16} y1={y} x2={x + 42} y2={y} {...common}/><text x={x} y={y + 40} textAnchor="middle" className="schematic-symbol-label">Fuse {component.ratedCurrent}A</text></g>;
    case 'switch':
      return <g><line x1={x - 42} y1={y} x2={x - 14} y2={y} {...common}/><line x1={x - 14} y1={y} x2={x + 18} y2={component.state === 'closed' ? y : y - 22} {...common}/><circle cx={x - 14} cy={y} r="4" fill={stroke}/><circle cx={x + 18} cy={y} r="4" fill={stroke}/><line x1={x + 18} y1={y} x2={x + 42} y2={y} {...common}/><text x={x} y={y + 40} textAnchor="middle" className="schematic-symbol-label">{componentLabel(component)} · {component.state === 'closed' ? 'ON' : 'OFF'}</text></g>;
    case 'lamp':
      return <g><line x1={x - 42} y1={y} x2={x - 22} y2={y} {...common}/><circle cx={x} cy={y} r="22" {...common}/><path d={`M ${x-12} ${y-12} L ${x+12} ${y+12} M ${x+12} ${y-12} L ${x-12} ${y+12}`} {...common}/><line x1={x + 22} y1={y} x2={x + 42} y2={y} {...common}/><text x={x} y={y + 42} textAnchor="middle" className="schematic-symbol-label">{componentLabel(component)}</text></g>;
    case 'socket':
      return <g><rect x={x - 22} y={y - 22} width="44" height="44" rx="8" {...common}/><circle cx={x - 9} cy={y} r="4" fill="none" stroke={stroke} strokeWidth="3"/><circle cx={x + 9} cy={y} r="4" fill="none" stroke={stroke} strokeWidth="3"/><line x1={x} y1={y - 8} x2={x} y2={y + 10} {...common}/><text x={x} y={y + 42} textAnchor="middle" className="schematic-symbol-label">مقبس {component.ratedCurrent}A</text></g>;
    case 'capacitor':
      return <g><line x1={x - 42} y1={y} x2={x - 8} y2={y} {...common}/><line x1={x - 8} y1={y - 22} x2={x - 8} y2={y + 22} {...common}/><line x1={x + 8} y1={y - 22} x2={x + 8} y2={y + 22} {...common}/><line x1={x + 8} y1={y} x2={x + 42} y2={y} {...common}/><text x={x} y={y + 42} textAnchor="middle" className="schematic-symbol-label">C = {(component.capacitance * 1e6).toFixed(1)}µF</text></g>;
    case 'inductor':
      return <g><line x1={x - 42} y1={y} x2={x - 28} y2={y} {...common}/><path d={`M ${x-28} ${y} C ${x-22} ${y-28}, ${x-10} ${y-28}, ${x-4} ${y} C ${x+2} ${y-28}, ${x+14} ${y-28}, ${x+20} ${y} C ${x+26} ${y-28}, ${x+34} ${y-28}, ${x+40} ${y}`} {...common}/><text x={x} y={y + 42} textAnchor="middle" className="schematic-symbol-label">L = {component.inductance}H</text></g>;
    case 'resistor':
      return <g><line x1={x - 42} y1={y} x2={x - 24} y2={y} {...common}/><path d={`M ${x-24} ${y} L ${x-15} ${y-12} L ${x-6} ${y+12} L ${x+3} ${y-12} L ${x+12} ${y+12} L ${x+24} ${y}`} {...common}/><line x1={x + 24} y1={y} x2={x + 42} y2={y} {...common}/><text x={x} y={y + 40} textAnchor="middle" className="schematic-symbol-label">R = {component.resistance}Ω</text></g>;
    default:
      return <g><line x1={x - 42} y1={y} x2={x + 42} y2={y} {...common}/><text x={x} y={y + 40} textAnchor="middle" className="schematic-symbol-label">{componentLabel(component)}</text></g>;
  }
}

export default function SchematicRenderer({ circuit }: { circuit: Circuit }) {
  const components = circuit.components.filter(c => c.type !== 'wire');
  const byTerminal = new Map<string, ElectricalComponent>();
  for (const c of components) for (const t of terminalsOf(c)) byTerminal.set(t, c);

  const adjacency = new Map<string, Set<string>>();
  for (const c of components) adjacency.set(c.id, new Set());
  for (const connection of circuit.connections) {
    const a = byTerminal.get(connection.fromTerminalId);
    const b = byTerminal.get(connection.toTerminalId);
    if (a && b && a.id !== b.id) { adjacency.get(a.id)?.add(b.id); adjacency.get(b.id)?.add(a.id); }
  }

  const source = components.find(c => c.type === 'source') ?? components[0];
  const ordered: ElectricalComponent[] = [];
  const seen = new Set<string>();
  const walk = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const c = components.find(x => x.id === id); if (c) ordered.push(c);
    for (const next of adjacency.get(id) ?? []) walk(next);
  };
  if (source) walk(source.id);
  for (const c of components) if (!seen.has(c.id)) ordered.push(c);

  const positions = new Map<string, Point>();
  ordered.forEach((c, index) => positions.set(c.id, { x: 90 + index * NODE_GAP, y: TOP }));
  const maxX = Math.max(WIDTH, 120 + ordered.length * NODE_GAP);

  return <div className="schematic-renderer">
    <div className="schematic-toolbar">
      <div><b>المخطط الكهربائي التلقائي</b><span>نفس الـCircuit Model — بدون إعادة رسم يدوي</span></div>
      <div className="schematic-legend"><span><i className="legend-dot live"/>L</span><span><i className="legend-dot neutral"/>N</span><span><i className="legend-dot node"/>Junction</span></div>
    </div>
    <div className="schematic-scroll">
      <svg viewBox={`0 0 ${maxX} ${HEIGHT}`} className="professional-schematic" role="img" aria-label="مخطط كهربائي مولد من الدائرة">
        <defs>
          <pattern id="schematic-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1"/></pattern>
          <filter id="schematic-glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#schematic-grid)"/>
        <text x="28" y="34" className="schematic-title">ELECTRICAL SCHEMATIC</text>
        <text x="28" y="55" className="schematic-subtitle">Generated from the student's actual circuit</text>
        <line x1="40" y1="92" x2={maxX - 40} y2="92" className="rail neutral-rail"/>
        <text x="40" y="82" className="rail-label">N — Neutral</text>
        <line x1="40" y1="265" x2={maxX - 40} y2="265" className="rail live-rail"/>
        <text x="40" y="285" className="rail-label">L — Line</text>
        {ordered.map((component, index) => {
          const p = positions.get(component.id)!;
          const active = component.type === 'lamp' && component.lit;
          return <g key={component.id} className={active ? 'schematic-component active' : 'schematic-component'} filter={active ? 'url(#schematic-glow)' : undefined}>
            <line x1={p.x} y1="92" x2={p.x} y2={p.y - 34} className="vertical-wire neutral-wire"/>
            <line x1={p.x} y1={p.y + 34} x2={p.x} y2="265" className="vertical-wire live-wire"/>
            {index < ordered.length - 1 && <line x1={p.x + 42} y1={p.y} x2={(positions.get(ordered[index + 1].id)?.x ?? p.x) - 42} y2={p.y} className="horizontal-wire"/>}
            <Symbol component={component} x={p.x} y={p.y}/>
          </g>;
        })}
        {(circuit.junctions ?? []).map((j, index) => {
          const x = Math.min(maxX - 60, 120 + index * 90); return <g key={j.id}><circle cx={x} cy="190" r="6" className="junction-dot"/><text x={x + 10} y="194" className="junction-label">J{index + 1}</text></g>;
        })}
        {ordered.length === 0 && <text x={maxX / 2} y="180" textAnchor="middle" className="empty-schematic">أضف مكونات إلى الدائرة لعرض المخطط</text>}
      </svg>
    </div>
  </div>;
}
