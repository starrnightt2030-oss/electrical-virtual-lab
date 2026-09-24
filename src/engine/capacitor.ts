export type CapacitorConnection = 'series' | 'parallel';

export function capacitorEnergy(capacitanceFarads: number, voltage: number): number {
  return 0.5 * Math.max(0, capacitanceFarads) * voltage * voltage;
}

export function capacitorEquivalent(capacitances: number[], mode: CapacitorConnection): number {
  const values = capacitances.filter((c) => c > 0);
  if (!values.length) return 0;
  if (mode === 'parallel') return values.reduce((sum, c) => sum + c, 0);
  return 1 / values.reduce((sum, c) => sum + 1 / c, 0);
}

export function capacitorVoltageCharge(capacitanceFarads: number, voltage: number): number {
  return Math.max(0, capacitanceFarads) * voltage;
}

export function chargingVoltage(vSupply: number, resistanceOhms: number, capacitanceFarads: number, timeSeconds: number): number {
  const tau = Math.max(0, resistanceOhms) * Math.max(0, capacitanceFarads);
  if (tau === 0) return vSupply;
  return vSupply * (1 - Math.exp(-Math.max(0, timeSeconds) / tau));
}

export function dischargingVoltage(vInitial: number, resistanceOhms: number, capacitanceFarads: number, timeSeconds: number): number {
  const tau = Math.max(0, resistanceOhms) * Math.max(0, capacitanceFarads);
  if (tau === 0) return 0;
  return vInitial * Math.exp(-Math.max(0, timeSeconds) / tau);
}
