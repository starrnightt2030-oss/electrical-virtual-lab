export type ComponentType = 'source' | 'fuse' | 'mcb' | 'switch' | 'lamp' | 'socket' | 'resistor' | 'capacitor' | 'inductor' | 'wire';

export interface ComponentTransform {
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
}
export type SwitchState = 'open' | 'closed';
export type ProtectionState = 'armed' | 'tripped';

export interface Terminal {
  id: string;
  componentId: string;
  name: string;
}

export interface ComponentBase {
  id: string;
  type: ComponentType;
  name: string;
  terminals: Terminal[];
  transform?: ComponentTransform;
}

export interface SourceComponent extends ComponentBase {
  type: 'source';
  voltage: number;
  enabled: boolean;
}

export interface FuseComponent extends ComponentBase {
  type: 'fuse';
  ratedCurrent: number;
  state: ProtectionState;
}

export interface MCBComponent extends ComponentBase {
  type: 'mcb';
  ratedCurrent: number;
  curve: 'B' | 'C' | 'D';
  state: ProtectionState;
}

export interface SwitchComponent extends ComponentBase {
  type: 'switch';
  state: SwitchState;
}

export interface LampComponent extends ComponentBase {
  type: 'lamp';
  resistance: number;
  ratedVoltage: number;
  power: number;
  lit: boolean;
}

export interface SocketComponent extends ComponentBase {
  type: 'socket';
  resistance: number;
  ratedVoltage: number;
  ratedCurrent: number;
  energized: boolean;
}

export interface ResistorComponent extends ComponentBase {
  type: 'resistor';
  resistance: number;
}

export interface CapacitorComponent extends ComponentBase {
  type: 'capacitor';
  capacitance: number;
  initialVoltage: number;
  voltage: number;
}

export interface InductorComponent extends ComponentBase {
  type: 'inductor';
  inductance: number;
  internalResistance: number;
}

export interface WireComponent extends ComponentBase {
  type: 'wire';
  resistance: number;
}

export type ElectricalComponent =
  | SourceComponent
  | FuseComponent
  | MCBComponent
  | SwitchComponent
  | LampComponent
  | SocketComponent
  | ResistorComponent
  | CapacitorComponent
  | InductorComponent
  | WireComponent;

export interface Connection {
  id: string;
  fromTerminalId: string;
  toTerminalId: string;
}

export interface CircuitJunction {
  id: string;
  x: number;
  y: number;
  label?: string;
}

export interface Circuit {
  components: ElectricalComponent[];
  connections: Connection[];
  junctions?: CircuitJunction[];
}

export interface CircuitMeasurements {
  voltage: number;
  current: number;
  power: number;
  loadResistance: number;
  /** Equivalent resistance seen by the source. */
  equivalentResistance?: number;
}

export interface ComponentMeasurement {
  componentId: string;
  voltage: number;
  current: number;
  power: number;
}

export type MeasurementMode = 'voltage' | 'current' | 'resistance' | 'continuity';

export interface MeasurementReading {
  mode: MeasurementMode;
  value: number | boolean;
  unit: 'V' | 'A' | 'Ω' | 'continuity';
  valid: boolean;
  message?: string;
}

export type CircuitStatus = 'off' | 'open-circuit' | 'running' | 'short-circuit' | 'protected';

export interface SimulationResult {
  status: CircuitStatus;
  measurements: CircuitMeasurements;
  lampLit: boolean;
  fuseState: ProtectionState;
  mcbState?: ProtectionState;
  protectionDevice?: 'fuse' | 'mcb' | 'none';
  currentPath: string[];
  errors: string[];
  warnings: string[];
  componentMeasurements?: Record<string, ComponentMeasurement>;
  nodeVoltages?: Record<string, number>;
}
