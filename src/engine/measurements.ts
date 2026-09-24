import type { Circuit, MeasurementMode, MeasurementReading, SimulationResult } from './types';

/**
 * Virtual instrument API. It deliberately consumes simulation output so the UI
 * never invents a reading that disagrees with the electrical engine.
 */
export function readMeasurement(
  circuit: Circuit,
  result: SimulationResult,
  mode: MeasurementMode,
  firstTerminalId?: string,
  secondTerminalId?: string,
): MeasurementReading {
  if (mode === 'voltage') {
    if (!firstTerminalId || !secondTerminalId || !result.nodeVoltages) {
      return { mode, value: 0, unit: 'V', valid: false, message: 'حدد طرفي قياس الجهد.' };
    }
    const a = result.nodeVoltages[firstTerminalId];
    const b = result.nodeVoltages[secondTerminalId];
    if (a === undefined || b === undefined) {
      return { mode, value: 0, unit: 'V', valid: false, message: 'نقطة القياس غير متصلة بالدائرة.' };
    }
    return { mode, value: Math.abs(a - b), unit: 'V', valid: true };
  }

  if (mode === 'current') {
    if (!firstTerminalId) return { mode, value: 0, unit: 'A', valid: false, message: 'حدد مسار التيار المراد قياسه.' };
    const componentId = firstTerminalId.includes('.') ? firstTerminalId.split('.')[0] : firstTerminalId;
    const reading = result.componentMeasurements?.[componentId];
    if (!reading) return { mode, value: 0, unit: 'A', valid: false, message: 'المكوّن غير موجود أو غير موصل.' };
    return { mode, value: reading.current, unit: 'A', valid: true };
  }

  const sourceEnabled = circuit.components.some(c => c.type === 'source' && c.enabled);
  const safeDeenergizedOnly = mode === 'resistance' || mode === 'continuity';
  if (safeDeenergizedOnly && sourceEnabled) {
    return { mode, value: mode === 'continuity' ? false : Infinity, unit: mode === 'continuity' ? 'continuity' : 'Ω', valid: false, message: 'أوقف التغذية قبل استخدام المقاومة أو اختبار الاستمرارية.' };
  }

  if (mode === 'resistance') {
    if (!firstTerminalId) return { mode, value: 0, unit: 'Ω', valid: false, message: 'حدد المكوّن المراد قياس مقاومته.' };
    const componentId = firstTerminalId.includes('.') ? firstTerminalId.split('.')[0] : firstTerminalId;
    const component = circuit.components.find(c => c.id === componentId);
    if (!component) return { mode, value: 0, unit: 'Ω', valid: false, message: 'المكوّن غير موجود.' };
    if (component.type === 'resistor' || component.type === 'lamp' || component.type === 'wire') {
      return { mode, value: component.resistance, unit: 'Ω', valid: true };
    }
    if (component.type === 'switch') {
      return { mode, value: component.state === 'open' ? Infinity : 0, unit: 'Ω', valid: true };
    }
    return { mode, value: Infinity, unit: 'Ω', valid: false, message: 'هذا المكوّن لا يدعم قياس المقاومة حاليًا.' };
  }

  if (!firstTerminalId || !secondTerminalId || !result.nodeVoltages) {
    return { mode, value: false, unit: 'continuity', valid: false, message: 'حدد طرفي اختبار الاستمرارية.' };
  }
  const a = result.nodeVoltages[firstTerminalId];
  const b = result.nodeVoltages[secondTerminalId];
  if (a === undefined || b === undefined) return { mode, value: false, unit: 'continuity', valid: false, message: 'النقاط غير معروفة.' };
  const continuous = Math.abs(a - b) < 0.5;
  return { mode, value: continuous, unit: 'continuity', valid: true };
}
