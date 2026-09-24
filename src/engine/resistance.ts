import type { Circuit, ResistorComponent } from './types';

export type ResistorNetworkMode = 'series' | 'parallel' | 'mixed';

export interface ResistorNetworkResult {
  equivalentResistance: number;
  totalCurrent: number;
  totalPower: number;
  branchCurrents: Record<string, number>;
  branchVoltages: Record<string, number>;
}

const EPSILON = 1e-12;

export function seriesResistance(resistances: number[]): number {
  return resistances.reduce((sum, r) => sum + Math.max(0, r), 0);
}

export function parallelResistance(resistances: number[]): number {
  const positive = resistances.filter((r) => r > EPSILON);
  if (positive.length === 0) return 0;
  return 1 / positive.reduce((sum, r) => sum + 1 / r, 0);
}

export function mixedResistance(seriesGroups: number[][]): number {
  return seriesResistance(seriesGroups.map(parallelResistance));
}

export function voltageDivider(voltage: number, r1: number, r2: number): { outputVoltage: number; current: number } {
  const total = r1 + r2;
  if (total <= EPSILON) return { outputVoltage: 0, current: 0 };
  const current = voltage / total;
  return { outputVoltage: current * r2, current };
}

export function currentDivider(totalCurrent: number, r1: number, r2: number): { i1: number; i2: number } {
  const denominator = r1 + r2;
  if (denominator <= EPSILON) return { i1: 0, i2: 0 };
  return { i1: totalCurrent * (r2 / denominator), i2: totalCurrent * (r1 / denominator) };
}

export function solveResistorNetwork(
  voltage: number,
  resistors: Pick<ResistorComponent, 'id' | 'resistance'>[],
  mode: ResistorNetworkMode,
): ResistorNetworkResult {
  const values = resistors.map((r) => Math.max(0, r.resistance));
  let equivalentResistance = 0;

  if (mode === 'series') equivalentResistance = seriesResistance(values);
  else if (mode === 'parallel') equivalentResistance = parallelResistance(values);
  else {
    // Mixed V1 convention: first two resistors form a parallel branch, then remaining resistors are in series.
    const groups = [values.slice(0, 2), values.slice(2)].filter((g) => g.length);
    equivalentResistance = mixedResistance(groups);
  }

  const totalCurrent = equivalentResistance > EPSILON ? voltage / equivalentResistance : Number.POSITIVE_INFINITY;
  const totalPower = Number.isFinite(totalCurrent) ? voltage * totalCurrent : Number.POSITIVE_INFINITY;
  const branchCurrents: Record<string, number> = {};
  const branchVoltages: Record<string, number> = {};

  if (mode === 'series' && Number.isFinite(totalCurrent)) {
    resistors.forEach((r) => {
      branchCurrents[r.id] = totalCurrent;
      branchVoltages[r.id] = totalCurrent * r.resistance;
    });
  } else if (mode === 'parallel' && Number.isFinite(totalCurrent)) {
    resistors.forEach((r) => {
      branchVoltages[r.id] = voltage;
      branchCurrents[r.id] = r.resistance > EPSILON ? voltage / r.resistance : Number.POSITIVE_INFINITY;
    });
  }

  return { equivalentResistance, totalCurrent, totalPower, branchCurrents, branchVoltages };
}

export function findResistors(circuit: Circuit): ResistorComponent[] {
  return circuit.components.filter((c): c is ResistorComponent => c.type === 'resistor');
}
