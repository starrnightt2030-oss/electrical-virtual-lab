import { describe, expect, it } from 'vitest';
import { decodeAlphanumericResistor, decodeResistorBands } from '../resistorCodes';

describe('resistor codes', () => {
  it('decodes 4-band 4.7k resistor', () => {
    expect(decodeResistorBands(['yellow','violet','red','gold']).resistance).toBe(4700);
  });
  it('decodes EIA 472 as 4.7k', () => expect(decodeAlphanumericResistor('472')).toBe(4700));
  it('decodes 4R7', () => expect(decodeAlphanumericResistor('4R7')).toBe(4.7));
});
