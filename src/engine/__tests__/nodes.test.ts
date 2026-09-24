import { describe, expect, it } from 'vitest';
import { buildElectricalNodes, createJunction } from '../nodes';
import { createLamp, createSource } from '../circuit';
import type { Circuit } from '../types';

describe('junction graph', () => {
  it('merges multiple branches through a junction', () => {
    const source = createSource();
    const lamp1 = createLamp('lamp1');
    const lamp2 = createLamp('lamp2');
    const junction = createJunction('j1', 300, 200);
    const circuit: Circuit = {
      components: [source, lamp1, lamp2],
      junctions: [junction],
      connections: [
        { id: 'a', fromTerminalId: 'source.L', toTerminalId: junction.id },
        { id: 'b', fromTerminalId: junction.id, toTerminalId: 'lamp1.L' },
        { id: 'c', fromTerminalId: junction.id, toTerminalId: 'lamp2.L' },
      ],
    };
    const nodes = buildElectricalNodes(circuit);
    expect(nodes.get('source.L')).toBe(nodes.get(junction.id));
    expect(nodes.get('lamp1.L')).toBe(nodes.get('lamp2.L'));
  });
});
