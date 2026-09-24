export interface OhmGraphPoint { x: number; y: number }

export function generateOhmGraph(mode: 'current-vs-voltage' | 'current-vs-resistance', fixedValue: number, min: number, max: number, samples = 24): OhmGraphPoint[] {
  const safeFixed = Math.max(0.000001, fixedValue);
  const lo = Math.max(0, min);
  const hi = Math.max(lo, max);
  return Array.from({ length: samples + 1 }, (_, i) => {
    const x = lo + ((hi - lo) * i) / samples;
    const y = mode === 'current-vs-voltage' ? x / safeFixed : safeFixed / Math.max(x, 0.000001);
    return { x, y };
  });
}

export function graphDomain(points: OhmGraphPoint[]) {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  return {
    minX: Math.min(...xs, 0), maxX: Math.max(...xs, 1),
    minY: Math.min(...ys, 0), maxY: Math.max(...ys, 1),
  };
}
