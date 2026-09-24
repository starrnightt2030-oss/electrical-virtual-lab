export type OhmSolveMode = 'voltage' | 'current' | 'resistance';

export interface OhmResult {
  voltage: number;
  current: number;
  resistance: number;
  power: number;
}

export function solveOhmsLaw(mode: OhmSolveMode, valueA: number, valueB: number): OhmResult {
  const a = Math.max(0, Number(valueA) || 0);
  const b = Math.max(0, Number(valueB) || 0);

  if (mode === 'voltage') {
    const current = a;
    const resistance = b;
    const voltage = current * resistance;
    return { voltage, current, resistance, power: voltage * current };
  }

  if (mode === 'current') {
    const voltage = a;
    const resistance = b;
    const current = resistance > 0 ? voltage / resistance : 0;
    return { voltage, current, resistance, power: voltage * current };
  }

  const voltage = a;
  const current = b;
  const resistance = current > 0 ? voltage / current : 0;
  return { voltage, current, resistance, power: voltage * current };
}

export type ConductorMaterial = 'copper' | 'aluminium';

export interface ConductorResistanceInput {
  lengthMeters: number;
  areaMm2: number;
  material: ConductorMaterial;
}

// Educational reference resistivities at approximately 20°C, Ω·mm²/m.
const RESISTIVITY: Record<ConductorMaterial, number> = {
  copper: 0.0175,
  aluminium: 0.0282,
};

export function conductorResistance(input: ConductorResistanceInput): number {
  const length = Math.max(0, input.lengthMeters);
  const area = Math.max(0.000001, input.areaMm2);
  return (RESISTIVITY[input.material] * length) / area;
}

export function conductorCurrent(input: ConductorResistanceInput & { voltage: number }): number {
  const resistance = conductorResistance(input);
  return resistance > 0 ? Math.max(0, input.voltage) / resistance : 0;
}
