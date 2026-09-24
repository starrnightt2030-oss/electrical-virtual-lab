import type { Circuit, ComponentType } from './types';

export type ValidationSeverity = 'error' | 'warning';
export interface CircuitValidationIssue { severity: ValidationSeverity; code: string; message: string; }
export interface CircuitValidationResult { valid: boolean; runnable: boolean; issues: CircuitValidationIssue[]; connectedTerminals: Set<string>; }

const terminalRules: Record<ComponentType, string[]> = {
  source: ['L', 'N'], fuse: ['LINE', 'LOAD'], mcb: ['LINE', 'LOAD'],
  switch: ['COM', 'L1'], lamp: ['L', 'N'], socket: ['L', 'N', 'E'], resistor: ['A', 'B'], capacitor: ['A', 'B'], inductor: ['A', 'B'], wire: ['A', 'B'],
};

export function validateCircuit(circuit: Circuit): CircuitValidationResult {
  const issues: CircuitValidationIssue[] = [];
  const connectedTerminals = new Set<string>();
  const components = new Map(circuit.components.map(c => [c.id, c]));
  const terminals = new Set(circuit.components.flatMap(c => c.terminals.map(t => t.id)));
  const junctions = new Set((circuit.junctions ?? []).map(j => j.id));
  const endpoints = new Set([...terminals, ...junctions]);
  const connectionPairs = new Set<string>();

  if (circuit.components.length === 0) issues.push({ severity: 'error', code: 'EMPTY', message: 'الدائرة فارغة. أضف مكونات أولًا.' });
  const sources = circuit.components.filter(c => c.type === 'source');
  const protections = circuit.components.filter(c => c.type === 'fuse' || c.type === 'mcb');
  if (sources.length === 0) issues.push({ severity: 'error', code: 'NO_SOURCE', message: 'لا يوجد مصدر تغذية.' });
  if (sources.length > 1) issues.push({ severity: 'warning', code: 'MULTI_SOURCE', message: 'يوجد أكثر من مصدر؛ النسخة الحالية مهيأة لمصدر واحد.' });
  if (protections.length === 0) issues.push({ severity: 'warning', code: 'NO_PROTECTION', message: 'لا توجد وسيلة حماية. يفضل إضافة Fuse أو MCB.' });

  for (const component of circuit.components) {
    const expected = terminalRules[component.type];
    const names = component.terminals.map(t => t.name);
    if (expected.some(name => !names.includes(name))) {
      issues.push({ severity: 'error', code: 'TERMINALS', message: `المكون «${component.name}» لديه أطراف غير مكتملة.` });
    }
  }

  for (const connection of circuit.connections) {
    if (!endpoints.has(connection.fromTerminalId) || !endpoints.has(connection.toTerminalId)) {
      issues.push({ severity: 'error', code: 'DANGLING_CONNECTION', message: 'يوجد سلك يشير إلى طرف غير موجود.' });
      continue;
    }
    if (connection.fromTerminalId === connection.toTerminalId) {
      issues.push({ severity: 'error', code: 'SELF_CONNECTION', message: 'لا يمكن توصيل الطرف بنفسه.' });
      continue;
    }
    const fromComponent = connection.fromTerminalId.startsWith('junction:') ? undefined : components.get(connection.fromTerminalId.split('.')[0]);
    const toComponent = connection.toTerminalId.startsWith('junction:') ? undefined : components.get(connection.toTerminalId.split('.')[0]);
    if (fromComponent && toComponent && fromComponent.id === toComponent.id) {
      issues.push({ severity: 'error', code: 'INTERNAL_CONNECTION', message: `لا يمكن عمل وصلة مباشرة داخل «${fromComponent.name}».` });
    }
    const pair = [connection.fromTerminalId, connection.toTerminalId].sort().join('|');
    if (connectionPairs.has(pair)) issues.push({ severity: 'error', code: 'DUPLICATE', message: 'هناك وصلة مكررة.' });
    connectionPairs.add(pair);
    for (const id of [connection.fromTerminalId, connection.toTerminalId]) {
      if (junctions.has(id)) continue;
      if (connectedTerminals.has(id)) issues.push({ severity: 'error', code: 'MULTI_WIRE', message: `الطرف ${id.split('.')[1]} متصل بأكثر من سلك. استخدم Junction للتفرع.` });
      connectedTerminals.add(id);
    }
  }

  for (const component of circuit.components) {
    for (const terminal of component.terminals) {
      if (!connectedTerminals.has(terminal.id)) {
        issues.push({ severity: 'warning', code: 'UNCONNECTED', message: `الطرف «${terminal.name}» في «${component.name}» غير موصل.` });
      }
    }
  }

  for (const junction of circuit.junctions ?? []) {
    const degree = circuit.connections.filter(c => c.fromTerminalId === junction.id || c.toTerminalId === junction.id).length;
    if (degree === 0) issues.push({ severity: 'warning', code: 'UNUSED_JUNCTION', message: 'يوجد Junction غير مستخدم.' });
    if (degree === 1) issues.push({ severity: 'warning', code: 'SINGLE_JUNCTION', message: 'الـJunction متصل بسلك واحد فقط ولا يضيف تفرعًا.' });
  }

  const source = sources[0];
  if (source) {
    const hasSourceL = connectedTerminals.has(`${source.id}.L`);
    const hasSourceN = connectedTerminals.has(`${source.id}.N`);
    if (!hasSourceL || !hasSourceN) issues.push({ severity: 'error', code: 'SOURCE_OPEN', message: 'طرفا المصدر L و N يجب أن يكونا موصلين.' });
  }

  const errors = issues.filter(i => i.severity === 'error');
  return { valid: errors.length === 0, runnable: errors.length === 0 && sources.length === 1, issues, connectedTerminals };
}
