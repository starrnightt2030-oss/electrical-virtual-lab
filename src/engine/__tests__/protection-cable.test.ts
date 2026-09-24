import { describe, expect, it } from 'vitest';
import { evaluateMCBTrip, selectProtection } from '../protection';
import { calculateVoltageDrop, sizeCable } from '../cable';

describe('Protection engine', () => {
  it('selects a standard MCB above design current', () => {
    const result = selectProtection({ loadCurrent: 12, device: 'mcb', margin: 1.25, mcbCurve: 'C' });
    expect(result.designCurrent).toBe(15);
    expect(result.selectedRating).toBe(16);
    expect(result.adequate).toBe(true);
  });

  it('models instantaneous MCB trip by curve', () => {
    expect(evaluateMCBTrip(16, 160, 'C').tripped).toBe(true);
    expect(evaluateMCBTrip(16, 32, 'C').tripped).toBe(false);
  });
});

describe('Cable engine', () => {
  it('calculates single phase voltage drop', () => {
    const drop = calculateVoltageDrop({ designCurrent: 10, lengthMeters: 20, crossSectionMm2: 2.5, material: 'copper', voltage: 220, phase: 'single', powerFactor: 1 });
    expect(drop).toBeCloseTo(2.8, 2);
  });

  it('selects a cable that satisfies current and voltage drop', () => {
    const result = sizeCable({ designCurrent: 10, lengthMeters: 20, material: 'copper', voltage: 220, maxVoltageDropPercent: 3 });
    expect(result.selectedSizeMm2).toBe(2.5);
    expect(result.acceptableVoltageDrop).toBe(true);
  });
});
