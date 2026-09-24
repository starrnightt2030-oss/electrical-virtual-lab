export function inductorEnergy(inductanceHenries: number, currentAmps: number): number {
  return 0.5 * Math.max(0, inductanceHenries) * currentAmps * currentAmps;
}

export function inductorEquivalent(inductances: number[], mode: 'series' | 'parallel'): number {
  const values = inductances.filter((l) => l > 0);
  if (!values.length) return 0;
  if (mode === 'series') return values.reduce((sum, l) => sum + l, 0);
  return 1 / values.reduce((sum, l) => sum + 1 / l, 0);
}

export function inductiveReactance(inductanceHenries: number, frequencyHz: number): number {
  return 2 * Math.PI * Math.max(0, frequencyHz) * Math.max(0, inductanceHenries);
}
