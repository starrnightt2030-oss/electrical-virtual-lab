import type { Circuit, SimulationResult } from './types';
import { readMeasurement } from './measurements';

export type DiagnosticInstrument = 'voltage' | 'continuity' | 'clamp' | 'megger';

export interface ProbeReading {
  instrument: DiagnosticInstrument;
  firstTerminalId?: string;
  secondTerminalId?: string;
  value: number | boolean;
  unit: 'V' | 'A' | 'Ω' | 'MΩ' | 'continuity';
  valid: boolean;
  message: string;
}

export interface DiagnosticStep {
  id: string;
  title: string;
  instruction: string;
  expected: string;
  hint: string;
}

export const diagnosticSteps: DiagnosticStep[] = [
  { id: 'supply', title: 'تحقق من التغذية', instruction: 'قِس الجهد بين خط L وخط N عند مصدر التغذية.', expected: 'يجب أن يظهر جهد المصدر عند وجود تغذية.', hint: 'إذا لم يظهر الجهد، ابدأ من المصدر والحماية قبل فحص الحمل.' },
  { id: 'load', title: 'تحقق من الحمل', instruction: 'قِس الجهد على طرفي الحمل.', expected: 'وجود الجهد مع عدم عمل الحمل يشير إلى فحص الحمل نفسه.', hint: 'إذا كان الجهد على الحمل صفرًا، ارجع خطوة في المسار.' },
  { id: 'continuity', title: 'اختبر المسار', instruction: 'بعد فصل التغذية، استخدم الاستمرارية على المسار المشكوك فيه.', expected: 'PASS يعني أن المسار مغلق كهربائيًا.', hint: 'لا تستخدم Ohm/Continuity على دائرة energized.' },
];

export function probeVoltage(circuit: Circuit, result: SimulationResult, a: string, b: string): ProbeReading {
  const r = readMeasurement(circuit, result, 'voltage', a, b);
  return { instrument: 'voltage', firstTerminalId: a, secondTerminalId: b, value: r.value, unit: 'V', valid: r.valid, message: r.message ?? 'قراءة جهد صالحة.' };
}

export function probeContinuity(circuit: Circuit, result: SimulationResult, a: string, b: string): ProbeReading {
  const r = readMeasurement(circuit, result, 'continuity', a, b);
  return { instrument: 'continuity', firstTerminalId: a, secondTerminalId: b, value: r.value, unit: 'continuity', valid: r.valid, message: r.message ?? 'اختبار الاستمرارية تم.' };
}

export function probeClamp(result: SimulationResult, componentId: string): ProbeReading {
  const current = result.componentMeasurements?.[componentId]?.current;
  if (current === undefined) return { instrument: 'clamp', value: 0, unit: 'A', valid: false, message: 'ضع الـClamp على مكوّن يحمل تيارًا معروفًا.' };
  return { instrument: 'clamp', value: Math.abs(current), unit: 'A', valid: true, message: `تيار الفرع المقاس = ${Math.abs(current).toFixed(3)} A.` };
}

export function probeMegger(circuit: Circuit, result: SimulationResult, a: string, b: string, testVoltage = 500): ProbeReading {
  const sourceEnabled = circuit.components.some(c => c.type === 'source' && c.enabled);
  if (sourceEnabled) {
    return { instrument: 'megger', firstTerminalId: a, secondTerminalId: b, value: 0, unit: 'MΩ', valid: false, message: 'اختبار العزل ممنوع أثناء وجود تغذية. افصل المصدر أولًا.' };
  }
  const terminalIds = new Set(circuit.components.flatMap(c => c.terminals.map(t => t.id)));
  if (!terminalIds.has(a) || !terminalIds.has(b)) return { instrument: 'megger', value: 0, unit: 'MΩ', valid: false, message: 'نقطتا الاختبار غير معروفتين.' };
  const mOhm = 100;
  return { instrument: 'megger', firstTerminalId: a, secondTerminalId: b, value: mOhm, unit: 'MΩ', valid: true, message: `اختبار عزل تعليمي عند ${testVoltage} V DC: ${mOhm.toFixed(2)} MΩ.` };
}

export function explainDiagnosis(result: SimulationResult): string {
  switch (result.status) {
    case 'running': return 'الدائرة تعمل. إذا كان الحمل لا يعمل رغم وجود الجهد، افحص الحمل نفسه أو الوصلة المحلية.';
    case 'open-circuit': return 'هناك مسار مفتوح. تتبع L من المصدر حتى الحمل، ثم افحص المفتاح والحماية والوصلات.';
    case 'protected': return 'الحماية فصلت. افحص زيادة التيار أو القصر قبل إعادة القاطع.';
    case 'short-circuit': return 'تم اكتشاف قصر. لا تعِد التغذية قبل تحديد المسار منخفض المقاومة.';
    case 'off': return 'مصدر التغذية غير فعال.';
    default: return 'ابدأ من المصدر واتبع مسار الطاقة خطوة بخطوة.';
  }
}
