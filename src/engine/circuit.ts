import type { Circuit, ElectricalComponent, Terminal } from './types';

export function terminal(componentId: string, name: string): Terminal {
  return { id: `${componentId}.${name}`, componentId, name };
}

export function createSource(id = 'source', voltage = 220): ElectricalComponent {
  return { id, type: 'source', name: 'مصدر التغذية', voltage, enabled: true, terminals: [terminal(id, 'L'), terminal(id, 'N')] };
}

export function createFuse(id = 'fuse', ratedCurrent = 10): ElectricalComponent {
  return { id, type: 'fuse', name: 'فيوز حماية', ratedCurrent, state: 'armed', terminals: [terminal(id, 'COM'), terminal(id, 'L1')] };
}

export function createMCB(id = 'mcb', ratedCurrent = 16, curve: 'B' | 'C' | 'D' = 'C'): ElectricalComponent {
  return { id, type: 'mcb', name: 'قاطع MCB', ratedCurrent, curve, state: 'armed', terminals: [terminal(id, 'LINE'), terminal(id, 'LOAD')] };
}

export function createSwitch(id = 'switch', state: 'closed' | 'open' = 'closed'): ElectricalComponent {
  return { id, type: 'switch', name: 'مفتاح تحكم', state, terminals: [terminal(id, 'COM'), terminal(id, 'L1')] };
}

export function createLamp(id = 'lamp', resistance = 48.4, ratedVoltage = 220): ElectricalComponent {
  return { id, type: 'lamp', name: 'مصباح', resistance, ratedVoltage, power: 0, lit: false, terminals: [terminal(id, 'L'), terminal(id, 'N')] };
}

export function createSocket(id = 'socket', resistance = 48.4, ratedVoltage = 220, ratedCurrent = 10): ElectricalComponent {
  return { id, type: 'socket', name: 'مقبس كهربائي', resistance, ratedVoltage, ratedCurrent, energized: false, terminals: [terminal(id, 'L'), terminal(id, 'N'), terminal(id, 'E')] };
}

export function createWire(id: string, resistance = 0.01): ElectricalComponent {
  return { id, type: 'wire', name: 'سلك توصيل', resistance, terminals: [terminal(id, 'A'), terminal(id, 'B')] };
}

export function createBasicMCBCircuit(): Circuit {
  return {
    components: [createSource(), createMCB(), createSwitch(), createLamp(), createWire('w1'), createWire('w2')],
    connections: [
      { id: 'm1', fromTerminalId: 'source.L', toTerminalId: 'mcb.LINE' },
      { id: 'm2', fromTerminalId: 'mcb.LOAD', toTerminalId: 'switch.COM' },
      { id: 'm3', fromTerminalId: 'switch.L1', toTerminalId: 'lamp.L' },
      { id: 'm4', fromTerminalId: 'lamp.N', toTerminalId: 'source.N' },
    ],
  };
}

export function createBasicLampCircuit(): Circuit {
  return {
    components: [
      createSource(),
      createFuse(),
      createSwitch(),
      createLamp(),
      createWire('w1'),
      createWire('w2'),
      createWire('w3'),
      createWire('w4'),
    ],
    connections: [
      { id: 'c1', fromTerminalId: 'source.L', toTerminalId: 'fuse.COM' },
      { id: 'c2', fromTerminalId: 'fuse.L1', toTerminalId: 'switch.COM' },
      { id: 'c3', fromTerminalId: 'switch.L1', toTerminalId: 'lamp.L' },
      { id: 'c4', fromTerminalId: 'lamp.N', toTerminalId: 'source.N' },
    ],
  };
}

export function findComponent(circuit: Circuit, id: string): ElectricalComponent | undefined {
  return circuit.components.find((component) => component.id === id);
}

export function allTerminals(circuit: Circuit): Terminal[] {
  return circuit.components.flatMap((component) => component.terminals);
}
