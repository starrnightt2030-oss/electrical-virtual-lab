import type { ComponentType, ElectricalComponent, Terminal } from './types';

export interface ComponentDefinition {
  type: ComponentType;
  nameAr: string;
  nameEn: string;
  icon: string;
  category: 'source' | 'protection' | 'control' | 'load' | 'passive' | 'wiring';
  terminals: string[];
  description: string;
}

export const componentCatalog: ComponentDefinition[] = [
  { type: 'source', nameAr: 'مصدر جهد', nameEn: 'Power Source', icon: '⚡', category: 'source', terminals: ['L', 'N'], description: 'مصدر التغذية الكهربائية.' },
  { type: 'mcb', nameAr: 'قاطع MCB', nameEn: 'MCB', icon: '🛡️', category: 'protection', terminals: ['LINE', 'LOAD'], description: 'حماية من زيادة التيار والقصر.' },
  { type: 'fuse', nameAr: 'فيوز', nameEn: 'Fuse', icon: '🧯', category: 'protection', terminals: ['LINE', 'LOAD'], description: 'حماية انصهارية من زيادة التيار.' },
  { type: 'switch', nameAr: 'مفتاح', nameEn: 'Switch', icon: '🔘', category: 'control', terminals: ['COM', 'L1'], description: 'مفتاح تحكم مفتوح/مغلق.' },
  { type: 'lamp', nameAr: 'مصباح', nameEn: 'Lamp', icon: '💡', category: 'load', terminals: ['L', 'N'], description: 'حمل مقاومي يمثل مصباحًا.' },
  { type: 'socket', nameAr: 'مقبس', nameEn: 'Socket', icon: '🔌', category: 'load', terminals: ['L', 'N', 'E'], description: 'مقبس أحادي الطور بأطراف فاز ومحايد وأرضي.' },
  { type: 'resistor', nameAr: 'مقاومة', nameEn: 'Resistor', icon: '〰️', category: 'passive', terminals: ['A', 'B'], description: 'عنصر مقاومي بقيمة Ω قابلة للتعديل.' },
  { type: 'capacitor', nameAr: 'مكثف', nameEn: 'Capacitor', icon: '🔋', category: 'passive', terminals: ['A', 'B'], description: 'عنصر سعوي يخزن الطاقة في مجال كهربائي.' },
  { type: 'inductor', nameAr: 'ملف', nameEn: 'Inductor', icon: '🌀', category: 'passive', terminals: ['A', 'B'], description: 'عنصر حثي يخزن الطاقة في مجال مغناطيسي.' },
  { type: 'wire', nameAr: 'سلك', nameEn: 'Wire', icon: '╱', category: 'wiring', terminals: ['A', 'B'], description: 'موصل منخفض المقاومة.' },
];

export function getComponentDefinition(type: ComponentType) {
  return componentCatalog.find((item) => item.type === type);
}

export function makeTerminals(componentId: string, names: string[]): Terminal[] {
  return names.map((name) => ({ id: `${componentId}.${name}`, componentId, name }));
}

export function createComponent(type: ComponentType, id: string): ElectricalComponent {
  const definition = getComponentDefinition(type);
  if (!definition) throw new Error(`Unsupported component type: ${type}`);
  const base = { id, name: definition.nameAr, terminals: makeTerminals(id, definition.terminals) };
  switch (type) {
    case 'source': return { ...base, type, voltage: 220, enabled: true };
    case 'mcb': return { ...base, type, ratedCurrent: 16, curve: 'C', state: 'armed' };
    case 'fuse': return { ...base, type, ratedCurrent: 10, state: 'armed' };
    case 'switch': return { ...base, type, state: 'open' };
    case 'lamp': return { ...base, type, resistance: 48.4, ratedVoltage: 220, power: 1000, lit: false };
    case 'socket': return { ...base, type, resistance: 48.4, ratedVoltage: 220, ratedCurrent: 10, energized: false };
    case 'resistor': return { ...base, type, resistance: 100 };
    case 'capacitor': return { ...base, type, capacitance: 100e-6, initialVoltage: 0, voltage: 0 };
    case 'inductor': return { ...base, type, inductance: 0.1, internalResistance: 0.1 };
    case 'wire': return { ...base, type, resistance: 0.01 };
  }
}
