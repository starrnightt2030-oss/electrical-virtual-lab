import type { Circuit, Connection, Terminal } from './types';

export interface Junction {
  id: string;
  x: number;
  y: number;
  label?: string;
}

export type CircuitEndpoint = Terminal | Junction;

export function endpointId(endpoint: CircuitEndpoint): string {
  return endpoint.id;
}

export function isJunctionId(id: string): boolean {
  return id.startsWith('junction:');
}

export function createJunction(id: string, x: number, y: number): Junction {
  return { id: id.startsWith('junction:') ? id : `junction:${id}`, x, y };
}

export function buildElectricalNodes(circuit: Circuit): Map<string, string> {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    if (!parent.has(id)) parent.set(id, id);
    const p = parent.get(id)!;
    if (p === id) return id;
    const root = find(p);
    parent.set(id, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a); const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const c of circuit.components) for (const t of c.terminals) find(t.id);
  for (const j of circuit.junctions ?? []) find(j.id);
  for (const connection of circuit.connections) union(connection.fromTerminalId, connection.toTerminalId);

  const result = new Map<string, string>();
  for (const c of circuit.components) for (const t of c.terminals) result.set(t.id, find(t.id));
  for (const j of circuit.junctions ?? []) result.set(j.id, find(j.id));
  return result;
}

export function connectionUsesEndpoint(circuit: Circuit, endpointIdValue: string): Connection[] {
  return circuit.connections.filter(c => c.fromTerminalId === endpointIdValue || c.toTerminalId === endpointIdValue);
}

export function connectedEndpoints(circuit: Circuit, endpointIdValue: string): string[] {
  return connectionUsesEndpoint(circuit, endpointIdValue).map(c => c.fromTerminalId === endpointIdValue ? c.toTerminalId : c.fromTerminalId);
}
