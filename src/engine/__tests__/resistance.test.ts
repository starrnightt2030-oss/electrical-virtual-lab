import { describe, expect, it } from 'vitest';
import { currentDivider, parallelResistance, seriesResistance, solveResistorNetwork, voltageDivider } from '../resistance';

describe('resistance calculations', () => {
  it('calculates series resistance', () => expect(seriesResistance([10, 20, 30])).toBe(60));
  it('calculates parallel resistance', () => expect(parallelResistance([10, 10])).toBe(5));
  it('calculates voltage divider', () => {
    expect(voltageDivider(12, 1000, 2000).outputVoltage).toBeCloseTo(8, 6);
  });
  it('calculates current divider', () => {
    const result = currentDivider(3, 10, 20);
    expect(result.i1).toBeCloseTo(2, 6);
    expect(result.i2).toBeCloseTo(1, 6);
  });
  it('solves a series network', () => {
    const result = solveResistorNetwork(12, [{ id: 'r1', resistance: 10 }, { id: 'r2', resistance: 20 }], 'series');
    expect(result.equivalentResistance).toBe(30);
    expect(result.totalCurrent).toBeCloseTo(0.4, 6);
    expect(result.branchVoltages.r1).toBeCloseTo(4, 6);
    expect(result.branchVoltages.r2).toBeCloseTo(8, 6);
  });
  it('solves a parallel network', () => {
    const result = solveResistorNetwork(12, [{ id: 'r1', resistance: 10 }, { id: 'r2', resistance: 20 }], 'parallel');
    expect(result.equivalentResistance).toBeCloseTo(6.6666667, 5);
    expect(result.branchCurrents.r1).toBeCloseTo(1.2, 6);
    expect(result.branchCurrents.r2).toBeCloseTo(0.6, 6);
  });
});
