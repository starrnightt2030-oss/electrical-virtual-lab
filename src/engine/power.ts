export type LoadKind = 'resistive' | 'inductive' | 'capacitive';

export interface ACLoadInput {
  voltage: number;
  current: number;
  powerFactor: number;
  load: LoadKind;
  frequency?: number;
}

export interface PowerResult {
  activePowerW: number;
  apparentPowerVA: number;
  reactivePowerVAR: number;
  powerFactor: number;
  phaseAngleDeg: number;
}

export function clampPowerFactor(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, Math.abs(value)));
}

export function calculatePower(input: ACLoadInput): PowerResult {
  const voltage = Math.max(0, input.voltage);
  const current = Math.max(0, input.current);
  const pf = clampPowerFactor(input.powerFactor);
  const apparent = voltage * current;
  const active = apparent * pf;
  const reactiveMagnitude = apparent * Math.sqrt(Math.max(0, 1 - pf * pf));
  const reactive = input.load === 'capacitive' ? -reactiveMagnitude : input.load === 'resistive' ? 0 : reactiveMagnitude;
  return {
    activePowerW: active,
    apparentPowerVA: apparent,
    reactivePowerVAR: reactive,
    powerFactor: pf,
    phaseAngleDeg: Math.acos(pf) * 180 / Math.PI * (input.load === 'capacitive' ? -1 : 1),
  };
}

export function energyKWh(powerW: number, hours: number): number {
  return Math.max(0, powerW) * Math.max(0, hours) / 1000;
}

export function energyCost(powerW: number, hours: number, tariffPerKWh: number): number {
  return energyKWh(powerW, hours) * Math.max(0, tariffPerKWh);
}

export function apparentPowerFromPF(activePowerW: number, powerFactor: number): number {
  const pf = clampPowerFactor(powerFactor);
  return pf === 0 ? Infinity : Math.abs(activePowerW) / pf;
}

export function reactivePowerFromPF(activePowerW: number, powerFactor: number, load: LoadKind = 'inductive'): number {
  const s = apparentPowerFromPF(activePowerW, powerFactor);
  if (!Number.isFinite(s)) return Infinity;
  const q = Math.sqrt(Math.max(0, s * s - activePowerW * activePowerW));
  return load === 'capacitive' ? -q : load === 'resistive' ? 0 : q;
}
