import { describe, expect, it } from 'vitest';
import { createBasicLampCircuit, createBasicMCBCircuit } from '../circuit';
import { simulateCircuit } from '../solver';

function setSwitch(circuit: ReturnType<typeof createBasicLampCircuit>, state: 'open' | 'closed') {
  const sw = circuit.components.find((c) => c.type === 'switch');
  if (sw?.type === 'switch') sw.state = state;
}

describe('Electrical Core Engine — basic lamp circuit', () => {
  it('keeps the lamp off when the source is disabled', () => {
    const circuit = createBasicLampCircuit();
    const source = circuit.components.find((c) => c.type === 'source');
    if (source?.type === 'source') source.enabled = false;
    const result = simulateCircuit(circuit);
    expect(result.status).toBe('off');
    expect(result.measurements.current).toBe(0);
    expect(result.lampLit).toBe(false);
  });

  it('opens the circuit when the switch is open', () => {
    const circuit = createBasicLampCircuit();
    setSwitch(circuit, 'open');
    const result = simulateCircuit(circuit);
    expect(result.status).toBe('open-circuit');
    expect(result.measurements.current).toBe(0);
    expect(result.lampLit).toBe(false);
  });

  it('runs the lamp when the circuit is closed', () => {
    const circuit = createBasicLampCircuit();
    const result = simulateCircuit(circuit);
    expect(result.status).toBe('running');
    expect(result.measurements.current).toBeCloseTo(220 / 48.4, 5);
    expect(result.lampLit).toBe(true);
    expect(result.measurements.power).toBeCloseTo(1000, 0);
  });

  it('trips protection when the load current exceeds the fuse rating', () => {
    const circuit = createBasicLampCircuit();
    const fuse = circuit.components.find((c) => c.type === 'fuse');
    if (fuse?.type === 'fuse') fuse.ratedCurrent = 1;
    const result = simulateCircuit(circuit);
    expect(result.status).toBe('protected');
    expect(result.fuseState).toBe('tripped');
    expect(result.lampLit).toBe(false);
  });
});

describe('Measurement and fault integration', () => {
  it('exposes component current and terminal voltages after solving', () => {
    const circuit = createBasicLampCircuit();
    const result = simulateCircuit(circuit);
    expect(result.componentMeasurements?.lamp.current).toBeCloseTo(220 / 48.4, 2);
    expect(result.nodeVoltages?.['lamp.L']).toBeGreaterThan(result.nodeVoltages?.['lamp.N'] ?? 0);
  });
});


describe('MCB as a real circuit component', () => {
  it('allows current through an armed MCB', () => {
    const circuit = createBasicMCBCircuit();
    const result = simulateCircuit(circuit);
    expect(result.status).toBe('running');
    expect(result.protectionDevice).toBe('mcb');
    expect(result.mcbState).toBe('armed');
    expect(result.componentMeasurements?.mcb.current).toBeGreaterThan(0);
  });

  it('trips the MCB on an overload and opens the simulated branch', () => {
    const circuit = createBasicMCBCircuit();
    const mcb = circuit.components.find((c) => c.type === 'mcb');
    const lamp = circuit.components.find((c) => c.type === 'lamp');
    if (mcb?.type === 'mcb') mcb.ratedCurrent = 0.5;
    if (lamp?.type === 'lamp') lamp.resistance = 10;
    const result = simulateCircuit(circuit);
    expect(result.status).toBe('protected');
    expect(result.mcbState).toBe('tripped');
    expect(result.protectionDevice).toBe('mcb');
  });
});
