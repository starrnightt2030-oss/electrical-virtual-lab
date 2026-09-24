export type ResistorBandColor = 'black'|'brown'|'red'|'orange'|'yellow'|'green'|'blue'|'violet'|'gray'|'white'|'gold'|'silver';

const digitMap: Record<ResistorBandColor, number> = {
  black: 0, brown: 1, red: 2, orange: 3, yellow: 4, green: 5,
  blue: 6, violet: 7, gray: 8, white: 9, gold: -1, silver: -1,
};
const multiplierMap: Record<ResistorBandColor, number> = {
  black: 1, brown: 10, red: 100, orange: 1_000, yellow: 10_000, green: 100_000,
  blue: 1_000_000, violet: 10_000_000, gray: 100_000_000, white: 1_000_000_000,
  gold: 0.1, silver: 0.01,
};
const toleranceMap: Record<ResistorBandColor, number> = {
  brown: 1, red: 2, green: 0.5, blue: 0.25, violet: 0.1, gray: 0.05, gold: 5, silver: 10,
  black: 0, orange: 0, yellow: 0, white: 0,
};

export function decodeResistorBands(bands: ResistorBandColor[]): { resistance: number; tolerance: number; nominalText: string } {
  if (bands.length !== 4 && bands.length !== 5) throw new Error('Resistor color code requires 4 or 5 bands.');
  const significant = bands.length === 4 ? digitMap[bands[0]] * 10 + digitMap[bands[1]] : digitMap[bands[0]] * 100 + digitMap[bands[1]] * 10 + digitMap[bands[2]];
  const multiplier = multiplierMap[bands[bands.length === 4 ? 2 : 3]];
  const tolerance = toleranceMap[bands[bands.length - 1]];
  if (significant < 0 || !Number.isFinite(multiplier)) throw new Error('Invalid resistor band combination.');
  const resistance = significant * multiplier;
  return { resistance, tolerance, nominalText: formatResistance(resistance) };
}

export function encodeResistorBands(resistance: number, tolerance = 5, bandCount: 4 | 5 = 4): ResistorBandColor[] {
  if (!(resistance > 0)) throw new Error('Resistance must be greater than zero.');
  const colors = Object.keys(digitMap) as ResistorBandColor[];
  const toleranceColor = Object.entries(toleranceMap).find(([, value]) => Math.abs(value - tolerance) < 1e-9)?.[0] as ResistorBandColor | undefined;
  if (!toleranceColor) throw new Error('Unsupported tolerance.');
  const exponent = Math.floor(Math.log10(resistance));
  const scale = bandCount === 4 ? 1 : 2;
  const significant = Math.round(resistance / Math.pow(10, exponent - scale));
  const digitCount = scale + 1;
  const digits = String(significant).padStart(digitCount, '0').slice(0, digitCount).split('').map(Number);
  const multiplierPower = exponent - scale;
  if (multiplierPower < -2 || multiplierPower > 9) throw new Error('Resistance is outside the supported educational color-code range.');
  const multiplierColor = colors.find((c) => Math.abs(Math.log10(multiplierMap[c]) - multiplierPower) < 1e-9);
  if (!multiplierColor) throw new Error('Unsupported multiplier.');
  const digitColors = colors.filter((c) => digitMap[c] >= 0);
  return [...digits.map((d) => digitColors[d]), multiplierColor, toleranceColor] as ResistorBandColor[];
}

export function decodeAlphanumericResistor(code: string): number {
  const value = code.trim().toUpperCase().replace(/Ω/g, '');
  const match = value.match(/^(\d+)([RKM])?(\d*)$/);
  if (!match) throw new Error('Invalid resistor code. Examples: 472, 4R7, 2K2.');
  const [, whole, unit, fraction] = match;
  const base = unit === 'R' && fraction ? Number(`${whole}.${fraction}`) : Number(`${whole}${fraction}` || whole);
  if (!Number.isFinite(base)) throw new Error('Invalid resistor code.');
  if (unit === 'R') return base;
  if (unit === 'K') return base * 1_000;
  if (unit === 'M') return base * 1_000_000;
  // 3-digit EIA-style code: 472 = 47 × 10².
  if (!unit && value.length === 3 && /^\d{3}$/.test(value)) return Number(value.slice(0, 2)) * Math.pow(10, Number(value[2]));
  return base;
}

export function formatResistance(ohms: number): string {
  if (ohms >= 1_000_000) return `${(ohms / 1_000_000).toFixed(2).replace(/\.00$/, '')} MΩ`;
  if (ohms >= 1_000) return `${(ohms / 1_000).toFixed(2).replace(/\.00$/, '')} kΩ`;
  return `${ohms.toFixed(2).replace(/\.00$/, '')} Ω`;
}
