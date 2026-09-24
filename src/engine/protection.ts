export type ProtectionDevice = 'fuse' | 'mcb';
export type MCBTripCurve = 'B' | 'C' | 'D';

export interface ProtectionSelectionInput {
  loadCurrent: number;
  loadType?: 'resistive' | 'motor' | 'lighting' | 'mixed';
  device?: ProtectionDevice;
  preferredRating?: number;
  mcbCurve?: MCBTripCurve;
  margin?: number;
}

export interface ProtectionSelectionResult {
  loadCurrent: number;
  designCurrent: number;
  selectedRating: number | null;
  device: ProtectionDevice;
  curve?: MCBTripCurve;
  adequate: boolean;
  reason: string;
  availableRatings: number[];
}

export interface TripResult {
  tripped: boolean;
  instantaneous: boolean;
  reason: string;
}

export const STANDARD_PROTECTION_RATINGS = [2, 4, 6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100];

export function selectProtection(input: ProtectionSelectionInput): ProtectionSelectionResult {
  const loadCurrent = Math.max(0, input.loadCurrent);
  const margin = input.margin ?? 1.25;
  const designCurrent = loadCurrent * margin;
  const device = input.device ?? 'mcb';
  const ratings = STANDARD_PROTECTION_RATINGS;
  const selectedRating = input.preferredRating
    ? ratings.find((rating) => rating >= Math.max(designCurrent, input.preferredRating!)) ?? null
    : ratings.find((rating) => rating >= designCurrent) ?? null;

  if (!selectedRating) {
    return { loadCurrent, designCurrent, selectedRating: null, device, curve: device === 'mcb' ? (input.mcbCurve ?? 'C') : undefined, adequate: false, reason: 'تيار التصميم أكبر من نطاق قيم الحماية المتاحة.', availableRatings: ratings };
  }

  const curve = device === 'mcb' ? (input.mcbCurve ?? 'C') : undefined;
  return {
    loadCurrent,
    designCurrent,
    selectedRating,
    device,
    curve,
    adequate: selectedRating >= designCurrent,
    reason: `${device === 'mcb' ? `MCB منحنى ${curve}` : 'Fuse'} بقيمة ${selectedRating} A يغطي تيار التصميم ${designCurrent.toFixed(2)} A.`,
    availableRatings: ratings,
  };
}

export function evaluateMCBTrip(ratedCurrent: number, actualCurrent: number, curve: MCBTripCurve = 'C'): TripResult {
  if (ratedCurrent <= 0 || actualCurrent < 0) return { tripped: false, instantaneous: false, reason: 'قيم الإدخال غير صالحة.' };
  const multiple = actualCurrent / ratedCurrent;
  const instantaneousThreshold = curve === 'B' ? 5 : curve === 'C' ? 10 : 20;
  if (multiple >= instantaneousThreshold) return { tripped: true, instantaneous: true, reason: `فصل مغناطيسي فوري عند ${multiple.toFixed(1)}× من التيار المقنن.` };
  if (multiple > 1.45) return { tripped: true, instantaneous: false, reason: `فصل حراري بسبب زيادة التيار إلى ${multiple.toFixed(1)}× من القيمة المقننة.` };
  return { tripped: false, instantaneous: false, reason: 'MCB لم يصل إلى حالة الفصل في نموذج المحاكاة.' };
}
