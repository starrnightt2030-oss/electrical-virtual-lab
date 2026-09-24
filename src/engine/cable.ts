export type ConductorMaterial = 'copper' | 'aluminium';
export type InstallationMethod = 'conduit' | 'tray' | 'free-air';

export interface CableSizingInput {
  designCurrent: number;
  material?: ConductorMaterial;
  lengthMeters?: number;
  crossSectionMm2?: number;
  installationMethod?: InstallationMethod;
  ambientTemperatureC?: number;
  groupingFactor?: number;
  voltage?: number;
  maxVoltageDropPercent?: number;
  phase?: 'single' | 'three';
  powerFactor?: number;
}

export interface CableSizingResult {
  material: ConductorMaterial;
  selectedSizeMm2: number | null;
  ampacity: number;
  designCurrent: number;
  voltageDropVolts: number;
  voltageDropPercent: number;
  acceptableVoltageDrop: boolean;
  ampacityAdequate: boolean;
  reason: string;
}

// Educational baseline ampacity table. Values are intentionally conservative and configurable later per code/installation standard.
const BASE_AMPACITY: Record<ConductorMaterial, Record<number, number>> = {
  copper: { 1.5: 14, 2.5: 20, 4: 26, 6: 34, 10: 46, 16: 61, 25: 80, 35: 99, 50: 119, 70: 151, 95: 182, 120: 210 },
  aluminium: { 2.5: 15, 4: 20, 6: 26, 10: 36, 16: 48, 25: 63, 35: 77, 50: 93, 70: 118, 95: 142, 120: 164 },
};

const RESISTIVITY = { copper: 0.0175, aluminium: 0.0282 } as const;

export function calculateVoltageDrop(input: Required<Pick<CableSizingInput, 'designCurrent' | 'lengthMeters' | 'crossSectionMm2' | 'material'>> & Pick<CableSizingInput, 'voltage' | 'phase' | 'powerFactor'>): number {
  const phase = input.phase ?? 'single';
  const pf = input.powerFactor ?? 1;
  const r = RESISTIVITY[input.material] * (input.lengthMeters / input.crossSectionMm2);
  return phase === 'three' ? Math.sqrt(3) * input.designCurrent * r * pf : 2 * input.designCurrent * r * pf;
}

export function sizeCable(input: CableSizingInput): CableSizingResult {
  const material = input.material ?? 'copper';
  const method = input.installationMethod ?? 'conduit';
  const grouping = Math.min(1, Math.max(0.5, input.groupingFactor ?? 1));
  const temperatureFactor = Math.min(1, Math.max(0.7, 1 - Math.max(0, (input.ambientTemperatureC ?? 30) - 30) * 0.01));
  const requiredAmpacity = Math.max(0, input.designCurrent) / (grouping * temperatureFactor);
  const table = BASE_AMPACITY[material];
  const sizes = Object.keys(table).map(Number).sort((a, b) => a - b);
  let selectedSize = sizes.find((size) => table[size] >= requiredAmpacity) ?? null;

  // Free-air receives a modest educational correction; a real deployment should load a code-specific table.
  const methodFactor = method === 'free-air' ? 1.1 : method === 'tray' ? 1.05 : 1;
  if (selectedSize) {
    selectedSize = sizes.find((size) => table[size] * methodFactor >= requiredAmpacity) ?? null;
  }

  const voltage = input.voltage ?? 220;
  const maxDrop = input.maxVoltageDropPercent ?? 3;
  const voltageDropVolts = selectedSize
    ? calculateVoltageDrop({ designCurrent: input.designCurrent, lengthMeters: input.lengthMeters ?? 10, crossSectionMm2: selectedSize, material, voltage, phase: input.phase ?? 'single', powerFactor: input.powerFactor ?? 1 })
    : Infinity;
  const voltageDropPercent = Number.isFinite(voltageDropVolts) ? (voltageDropVolts / voltage) * 100 : Infinity;
  const acceptableVoltageDrop = voltageDropPercent <= maxDrop;

  // If ampacity passes but voltage drop fails, move to a larger size.
  if (selectedSize && !acceptableVoltageDrop) {
    const start = sizes.indexOf(selectedSize);
    selectedSize = sizes.slice(start + 1).find((size) => {
      const drop = calculateVoltageDrop({ designCurrent: input.designCurrent, lengthMeters: input.lengthMeters ?? 10, crossSectionMm2: size, material, voltage, phase: input.phase ?? 'single', powerFactor: input.powerFactor ?? 1 });
      return (drop / voltage) * 100 <= maxDrop && table[size] * methodFactor >= requiredAmpacity;
    }) ?? null;
  }

  const finalDrop = selectedSize ? calculateVoltageDrop({ designCurrent: input.designCurrent, lengthMeters: input.lengthMeters ?? 10, crossSectionMm2: selectedSize, material, voltage, phase: input.phase ?? 'single', powerFactor: input.powerFactor ?? 1 }) : Infinity;
  const finalDropPercent = Number.isFinite(finalDrop) ? (finalDrop / voltage) * 100 : Infinity;
  const ampacityAdequate = selectedSize !== null;
  const finalAcceptable = finalDropPercent <= maxDrop;
  return {
    material,
    selectedSizeMm2: selectedSize,
    ampacity: selectedSize ? table[selectedSize] * methodFactor * grouping * temperatureFactor : 0,
    designCurrent: input.designCurrent,
    voltageDropVolts: finalDrop,
    voltageDropPercent: finalDropPercent,
    acceptableVoltageDrop: finalAcceptable,
    ampacityAdequate,
    reason: selectedSize
      ? `مقطع ${selectedSize} mm² يحقق سعة تيار مناسبة، وهبوط الجهد ${finalDropPercent.toFixed(2)}%.`
      : 'لا يوجد مقطع متاح يحقق متطلبات التيار وهبوط الجهد مع الإعدادات الحالية.',
  };
}
