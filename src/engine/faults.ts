import type { Circuit, ElectricalComponent } from './types';

export type FaultType = 'open-wire' | 'lamp-failure' | 'loose-connection' | 'short-circuit' | 'fuse-blown' | 'overload';

export interface FaultDefinition {
  id: FaultType;
  name: string;
  description: string;
}

export const faultCatalog: FaultDefinition[] = [
  { id: 'open-wire', name: 'سلك مقطوع', description: 'يفتح أحد مسارات التوصيل.' },
  { id: 'lamp-failure', name: 'مصباح تالف', description: 'ترتفع مقاومة المصباح إلى قيمة كبيرة جدًا.' },
  { id: 'loose-connection', name: 'وصلة مرتخية', description: 'تضاف مقاومة اتصال غير طبيعية إلى أحد الأسلاك.' },
  { id: 'short-circuit', name: 'قصر كهربائي', description: 'يضاف مسار منخفض المقاومة بين خط المصدر والعودة.' },
  { id: 'fuse-blown', name: 'فيوز محترق', description: 'يتم فصل عنصر الحماية.' },
  { id: 'overload', name: 'حمل زائد', description: 'تخفض قيمة حماية الفيوز لتجربة الفصل بسبب زيادة التيار.' },
];

function cloneCircuit(circuit: Circuit): Circuit {
  return {
    components: circuit.components.map(c => ({ ...c, terminals: c.terminals.map(t => ({ ...t })) } as ElectricalComponent)),
    connections: circuit.connections.map(c => ({ ...c })),
    junctions: circuit.junctions?.map(j => ({ ...j })),
  };
}

export function injectFault(circuit: Circuit, fault: FaultType): Circuit {
  const next = cloneCircuit(circuit);
  if (fault === 'open-wire') {
    const wire = next.components.find(c => c.type === 'wire');
    if (wire) next.connections = next.connections.filter(c => c.fromTerminalId !== wire.terminals[0].id && c.toTerminalId !== wire.terminals[0].id);
    else next.connections.pop();
  }
  if (fault === 'lamp-failure') {
    const lamp = next.components.find(c => c.type === 'lamp');
    if (lamp?.type === 'lamp') lamp.resistance = 1e12;
  }
  if (fault === 'loose-connection') {
    const wire = next.components.find(c => c.type === 'wire');
    if (wire?.type === 'wire') wire.resistance = 25;
  }
  if (fault === 'fuse-blown') {
    const fuse = next.components.find(c => c.type === 'fuse');
    if (fuse?.type === 'fuse') fuse.state = 'tripped';
  }
  if (fault === 'overload') {
    const fuse = next.components.find(c => c.type === 'fuse');
    if (fuse?.type === 'fuse') fuse.ratedCurrent = Math.max(0.1, fuse.ratedCurrent / 10);
  }
  if (fault === 'short-circuit') {
    const source = next.components.find(c => c.type === 'source');
    const wireId = `fault-short-${next.components.length}`;
    if (source) {
      next.components.push({ id: wireId, type: 'wire', name: 'مسار قصر تجريبي', resistance: 0.00001, terminals: [
        { id: `${wireId}.A`, componentId: wireId, name: 'A' },
        { id: `${wireId}.B`, componentId: wireId, name: 'B' },
      ] });
      const mcb = next.components.find(c => c.type === 'mcb');
      const hotTarget = mcb?.type === 'mcb' ? 'mcb.LOAD' : 'source.L';
      next.connections.push(
        { id: `${wireId}-1`, fromTerminalId: `${wireId}.A`, toTerminalId: hotTarget },
        { id: `${wireId}-2`, fromTerminalId: `${wireId}.B`, toTerminalId: 'source.N' },
      );
    }
  }
  return next;
}
