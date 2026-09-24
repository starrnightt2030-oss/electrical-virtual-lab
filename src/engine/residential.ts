import { createLamp, createMCB, createSocket, createSource, createSwitch, terminal } from './circuit';
import type { Circuit, ElectricalComponent } from './types';

export type ResidentialCircuitKind =
  | 'single-lamp'
  | 'lamp-socket'
  | 'parallel-lamps'
  | 'two-way-lamp';

export interface ResidentialPreset {
  kind: ResidentialCircuitKind;
  title: string;
  description: string;
  circuit: Circuit;
  learningPoints: string[];
}

function baseComponents(): ElectricalComponent[] {
  return [createSource('house-source', 220), createMCB('house-mcb', 16, 'C')];
}

export function createResidentialCircuit(kind: ResidentialCircuitKind): Circuit {
  if (kind === 'single-lamp') {
    return {
      components: [...baseComponents(), createSwitch('sw1', 'open'), createLamp('lamp1', 48.4, 220)],
      connections: [
        { id: 'r1', fromTerminalId: 'house-source.L', toTerminalId: 'house-mcb.LINE' },
        { id: 'r2', fromTerminalId: 'house-mcb.LOAD', toTerminalId: 'sw1.COM' },
        { id: 'r3', fromTerminalId: 'sw1.L1', toTerminalId: 'lamp1.L' },
        { id: 'r4', fromTerminalId: 'lamp1.N', toTerminalId: 'house-source.N' },
      ],
    };
  }
  if (kind === 'lamp-socket') {
    return {
      components: [...baseComponents(), createSwitch('sw1', 'open'), createLamp('lamp1', 48.4, 220), createSocket('socket1', 48.4, 220, 10)],
      junctions: [{ id: 'jL', x: 420, y: 180, label: 'L' }, { id: 'jN', x: 420, y: 360, label: 'N' }],
      connections: [
        { id: 'r1', fromTerminalId: 'house-source.L', toTerminalId: 'house-mcb.LINE' },
        { id: 'r2', fromTerminalId: 'house-mcb.LOAD', toTerminalId: 'jL' },
        { id: 'r3', fromTerminalId: 'jL', toTerminalId: 'sw1.COM' },
        { id: 'r4', fromTerminalId: 'sw1.L1', toTerminalId: 'lamp1.L' },
        { id: 'r5', fromTerminalId: 'lamp1.N', toTerminalId: 'jN' },
        { id: 'r6', fromTerminalId: 'jN', toTerminalId: 'house-source.N' },
        { id: 'r7', fromTerminalId: 'jL', toTerminalId: 'socket1.L' },
        { id: 'r8', fromTerminalId: 'socket1.N', toTerminalId: 'jN' },
      ],
    };
  }
  if (kind === 'parallel-lamps') {
    return {
      components: [...baseComponents(), createSwitch('sw1', 'open'), createLamp('lamp1', 48.4, 220), createLamp('lamp2', 48.4, 220)],
      junctions: [{ id: 'j1', x: 420, y: 180, label: 'L' }, { id: 'j2', x: 420, y: 360, label: 'N' }],
      connections: [
        { id: 'r1', fromTerminalId: 'house-source.L', toTerminalId: 'house-mcb.LINE' },
        { id: 'r2', fromTerminalId: 'house-mcb.LOAD', toTerminalId: 'sw1.COM' },
        { id: 'r3', fromTerminalId: 'sw1.L1', toTerminalId: 'j1' },
        { id: 'r4', fromTerminalId: 'j1', toTerminalId: 'lamp1.L' },
        { id: 'r5', fromTerminalId: 'j1', toTerminalId: 'lamp2.L' },
        { id: 'r6', fromTerminalId: 'lamp1.N', toTerminalId: 'j2' },
        { id: 'r7', fromTerminalId: 'lamp2.N', toTerminalId: 'j2' },
        { id: 'r8', fromTerminalId: 'j2', toTerminalId: 'house-source.N' },
      ],
    };
  }
  return {
    components: [...baseComponents(), createSwitch('swA', 'open'), createSwitch('swB', 'closed'), createLamp('lamp1', 48.4, 220)],
    connections: [
      { id: 'r1', fromTerminalId: 'house-source.L', toTerminalId: 'house-mcb.LINE' },
      { id: 'r2', fromTerminalId: 'house-mcb.LOAD', toTerminalId: 'swA.COM' },
      { id: 'r3', fromTerminalId: 'swA.L1', toTerminalId: 'swB.COM' },
      { id: 'r4', fromTerminalId: 'swB.L1', toTerminalId: 'lamp1.L' },
      { id: 'r5', fromTerminalId: 'lamp1.N', toTerminalId: 'house-source.N' },
    ],
  };
}

export function getResidentialPresets(): ResidentialPreset[] {
  return [
    { kind: 'single-lamp', title: 'إنارة بمفتاح مفرد', description: 'تشغيل مصباح من نقطة تحكم واحدة.', circuit: createResidentialCircuit('single-lamp'), learningPoints: ['الفاز يمر عبر الحماية والمفتاح.', 'المفتاح يفتح ويغلق مسار المصباح.', 'المصباح والحمل يعودان إلى المحايد.'] },
    { kind: 'lamp-socket', title: 'مصباح + مقبس', description: 'دائرة إنارة مع مقبس على نفس الحماية.', circuit: createResidentialCircuit('lamp-socket'), learningPoints: ['المقبس فرع مستقل عن مفتاح المصباح.', 'المحايد مشترك في هذا النموذج التعليمي.', 'الأرضي للمقبس موجود كطرف حماية مستقل.'] },
    { kind: 'parallel-lamps', title: 'مصباحان على التوازي', description: 'مصباحان يعملان على نفس الجهد ويمكن اعتبارهما فرعين.', circuit: createResidentialCircuit('parallel-lamps'), learningPoints: ['كل مصباح يحصل على جهد المصدر تقريبًا.', 'تيار الخط يساوي مجموع تيارات الفروع.', 'تعطل فرع لا يعني بالضرورة انطفاء الفرع الآخر.'] },
    { kind: 'two-way-lamp', title: 'ديفاتوري — تحكم من نقطتين', description: 'مبدأ التحكم في مصباح من مكانين.', circuit: createResidentialCircuit('two-way-lamp'), learningPoints: ['مفتاحان يغيران مسار التغذية.', 'الحالة تتغير بتبديل أي نقطة تحكم.', 'هذا النموذج هو الأساس لدوائر التحكم من نقطتين.'] },
  ];
}
