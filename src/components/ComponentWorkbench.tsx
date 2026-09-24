import { useMemo, useRef, useState } from 'react';
import type { Circuit, ComponentType, ElectricalComponent } from '../engine/types';
import { createJunction } from '../engine/nodes';
import { componentCatalog, createComponent } from '../engine/catalog';
import { simulateCircuit } from '../engine/solver';
import { validateCircuit } from '../engine/validation';
import SchematicRenderer from './SchematicRenderer';

const GRID = 24;
const BOARD_WIDTH = 1100;
const BOARD_HEIGHT = 620;
const COMPONENT_WIDTH = 150;

function snap(value: number) { return Math.round(value / GRID) * GRID; }
function ensureTransform(component: ElectricalComponent, index: number): ElectricalComponent {
  return { ...component, transform: component.transform ?? { x: 120 + (index % 3) * 180, y: 90 + Math.floor(index / 3) * 120, rotation: 0 } };
}

export default function ComponentWorkbench() {
  const [circuit, setCircuit] = useState<Circuit>({ components: [], connections: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTerminal, setSelectedTerminal] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => circuit.components.find(c => c.id === selectedId), [circuit.components, selectedId]);
  const validation = useMemo(() => validateCircuit(circuit), [circuit]);
  const [simulation, setSimulation] = useState<ReturnType<typeof simulateCircuit> | null>(null);
  const getComponent = (id: string) => circuit.components.find(c => c.id === id);
  const getJunction = (id: string) => circuit.junctions?.find(j => j.id === id);
  const terminalPoint = (terminalId: string) => {
    if (terminalId.startsWith('junction:')) {
      const junction = getJunction(terminalId);
      return junction ? { x: junction.x, y: junction.y } : { x: 0, y: 0 };
    }
    const [componentId, terminalName] = terminalId.split('.');
    const component = getComponent(componentId);
    if (!component) return { x: 0, y: 0 };
    const t = component.transform ?? { x: 100, y: 100, rotation: 0 };
    const index = component.terminals.findIndex(term => term.id === terminalId);
    const side = index % 2 === 0 ? -1 : 1;
    const local = { x: side < 0 ? 0 : COMPONENT_WIDTH, y: 50 };
    // Keep the visual wire geometry stable and predictable; rotation is represented by the component itself.
    void terminalName;
    return { x: t.x + local.x, y: t.y + local.y };
  };

  const addJunction = () => {
    const id = `junction:${Date.now()}`;
    const junction = createJunction(id, snap(420 + (circuit.junctions?.length ?? 0) * 48), 300);
    setCircuit(current => ({ ...current, junctions: [...(current.junctions ?? []), junction] }));
    setSelectedTerminal(junction.id);
  };

  const removeJunction = (junctionId: string) => {
    setCircuit(current => ({
      ...current,
      junctions: (current.junctions ?? []).filter(j => j.id !== junctionId),
      connections: current.connections.filter(c => c.fromTerminalId !== junctionId && c.toTerminalId !== junctionId),
    }));
    if (selectedTerminal === junctionId) setSelectedTerminal(null);
  };

  const add = (type: ComponentType) => {
    const id = `${type}-${Date.now()}`;
    const created = ensureTransform(createComponent(type, id), circuit.components.length);
    setCircuit(current => ({ ...current, components: [...current.components, created] }));
    setSelectedId(id);
  };

  const updateSelected = (patch: Partial<ElectricalComponent>) => {
    if (!selectedId) return;
    setCircuit(current => ({ ...current, components: current.components.map(c => c.id === selectedId ? { ...c, ...patch } as ElectricalComponent : c) }));
  };

  const updateTransform = (key: 'x' | 'y' | 'rotation', value: number) => {
    if (!selectedId) return;
    setCircuit(current => ({ ...current, components: current.components.map(c => c.id === selectedId ? { ...c, transform: { ...(c.transform ?? { x: 100, y: 100, rotation: 0 }), [key]: key === 'rotation' ? value : snap(value) } } as ElectricalComponent : c) }));
  };

  const beginDrag = (event: React.PointerEvent, component: ElectricalComponent) => {
    if ((event.target as HTMLElement).closest('button')) return;
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const t = component.transform ?? { x: 100, y: 100, rotation: 0 };
    setSelectedId(component.id);
    setDrag({ id: component.id, offsetX: event.clientX - rect.left - t.x, offsetY: event.clientY - rect.top - t.y });
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent) => {
    if (!drag) return;
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const x = Math.max(0, Math.min(BOARD_WIDTH - COMPONENT_WIDTH, event.clientX - rect.left - drag.offsetX));
    const y = Math.max(0, Math.min(BOARD_HEIGHT - 80, event.clientY - rect.top - drag.offsetY));
    setCircuit(current => ({ ...current, components: current.components.map(c => c.id === drag.id ? { ...c, transform: { ...(c.transform ?? { x: 0, y: 0, rotation: 0 }), x, y } } as ElectricalComponent : c) }));
  };

  const endDrag = () => {
    if (!drag) return;
    setCircuit(current => ({ ...current, components: current.components.map(c => c.id === drag.id ? { ...c, transform: { ...(c.transform ?? { x: 0, y: 0, rotation: 0 }), x: snap(c.transform?.x ?? 0), y: snap(c.transform?.y ?? 0) } } as ElectricalComponent : c) }));
    setDrag(null);
  };

  const connect = (terminalId: string) => {
    if (!selectedTerminal) { setSelectedTerminal(terminalId); return; }
    if (selectedTerminal === terminalId) { setSelectedTerminal(null); return; }
    const [fromComponent] = selectedTerminal.split('.');
    const [toComponent] = terminalId.split('.');
    if (fromComponent === toComponent) { setSelectedTerminal(null); return; }
    const endpointIsJunction = terminalId.startsWith('junction:');
    const selectedIsJunction = selectedTerminal.startsWith('junction:');
    const alreadyUsed = !endpointIsJunction && circuit.connections.some(c => c.fromTerminalId === terminalId || c.toTerminalId === terminalId);
    if (alreadyUsed) { setSelectedTerminal(null); return; }
    if (!selectedIsJunction && circuit.connections.some(c => c.fromTerminalId === selectedTerminal || c.toTerminalId === selectedTerminal)) { setSelectedTerminal(null); return; }
    const duplicate = circuit.connections.some(c => (c.fromTerminalId === selectedTerminal && c.toTerminalId === terminalId) || (c.fromTerminalId === terminalId && c.toTerminalId === selectedTerminal));
    if (!duplicate) setCircuit(current => ({ ...current, connections: [...current.connections, { id: `wire-${Date.now()}`, fromTerminalId: selectedTerminal, toTerminalId: terminalId }] }));
    setSimulation(null);
    setSelectedTerminal(null);
  };

  const removeConnection = (connectionId: string) => setCircuit(current => ({ ...current, connections: current.connections.filter(c => c.id !== connectionId) }));

  const removeSelected = () => {
    if (!selectedId) return;
    setCircuit(current => ({
      ...current,
      components: current.components.filter(c => c.id !== selectedId),
      connections: current.connections.filter(c => !c.fromTerminalId.startsWith(`${selectedId}.`) && !c.toTerminalId.startsWith(`${selectedId}.`)),
      junctions: current.junctions,
    }));
    setSelectedId(null); setSelectedTerminal(null);
  };

  const rotate = () => {
    if (!selected) return;
    const next = (((selected.transform?.rotation ?? 0) + 90) % 360) as 0 | 90 | 180 | 270;
    updateTransform('rotation', next);
  };

  const runSimulation = () => {
    if (!validation.runnable) { setSimulation(null); return; }
    setSimulation(simulateCircuit(circuit));
  };

  const clearSimulation = () => setSimulation(null);


  return <section className="lab-card workbench-card">
    <div className="lab-head"><div><span className="eyebrow">PHASE 3 — INTERACTIVE 2D WORKBENCH</span><h3>ورشة بناء الدائرة</h3><p>اسحب المكونات، حرّكها على شبكة Snap، دوّرها، ثم اضغط طرفين لرسم وصلة كهربائية. اضغط على السلك لحذفه. بعد اكتمال التوصيلات شغّل المحاكاة ليتم حل الدائرة نفسها بواسطة الـElectrical Engine.</p></div><span className={`status-pill ${validation.valid ? 'running' : 'protected'}`}>{validation.valid ? 'الدائرة قابلة للفحص' : 'تحتاج تصحيح'}</span></div>
    <div className="component-palette">{componentCatalog.map(item => <button key={item.type} onClick={() => add(item.type)}><span>{item.icon}</span><b>{item.nameAr}</b><small>{item.nameEn}</small></button>)}<button className="junction-tool" onClick={addJunction}><span>●</span><b>نقطة تفرع</b><small>Junction</small></button></div>
    <div className="validation-toolbar">
      <div className={`validation-summary ${validation.valid ? 'valid' : 'invalid'}`}>
        <b>{validation.valid ? '🟢 Circuit Valid' : '🔴 Circuit Needs Fixes'}</b>
        <span>{validation.issues.filter(i => i.severity === 'error').length} أخطاء · {validation.issues.filter(i => i.severity === 'warning').length} تحذيرات</span>
      </div>
      <div className="lab-controls">
        <button className="primary-action" disabled={!validation.runnable} onClick={runSimulation}>▶ تشغيل المحاكاة</button>
        <button onClick={clearSimulation}>↺ مسح النتيجة</button>
      </div>
    </div>
    {validation.issues.length > 0 && <div className="validation-list">{validation.issues.slice(0, 8).map((issue, i) => <div key={`${issue.code}-${i}`} className={issue.severity}><span>{issue.severity === 'error' ? '⛔' : '⚠️'}</span>{issue.message}</div>)}</div>}
    {simulation && <div className={`simulation-result ${simulation.status}`}>
      <div><span>الحالة</span><strong>{simulation.status}</strong></div>
      <div><span>الجهد</span><strong>{simulation.measurements.voltage.toFixed(1)} V</strong></div>
      <div><span>التيار</span><strong>{Number.isFinite(simulation.measurements.current) ? simulation.measurements.current.toFixed(2) : '∞'} A</strong></div>
      <div><span>القدرة</span><strong>{Number.isFinite(simulation.measurements.power) ? simulation.measurements.power.toFixed(0) : '∞'} W</strong></div>
    </div>}
    <div className="workbench-layout">
      <div ref={boardRef} className="canvas-board interactive-board" onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <div className="grid-overlay" />
        <svg className="wire-layer" viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`} preserveAspectRatio="none">
          {circuit.connections.map(connection => {
            const a = terminalPoint(connection.fromTerminalId); const b = terminalPoint(connection.toTerminalId);
            const midX = (a.x + b.x) / 2;
            return <g key={connection.id} className="wire-group" onClick={(e) => { e.stopPropagation(); removeConnection(connection.id); }}>
              <path d={`M ${a.x} ${a.y} H ${midX} V ${b.y} H ${b.x}`} />
              <circle cx={a.x} cy={a.y} r="4" /><circle cx={b.x} cy={b.y} r="4" />
            </g>;
          })}
        </svg>
        {(circuit.junctions ?? []).map(junction => <button key={junction.id} className={`junction-node ${selectedTerminal === junction.id ? 'active' : ''}`} style={{ left: junction.x - 10, top: junction.y - 10 }} title="Junction" onClick={(e) => { e.stopPropagation(); connect(junction.id); }} onDoubleClick={(e) => { e.stopPropagation(); removeJunction(junction.id); }}>●</button>)}
        {circuit.components.map(component => { const t = component.transform ?? { x: 100, y: 100, rotation: 0 }; const def = componentCatalog.find(d => d.type === component.type)!; return <div key={component.id} className={`canvas-component ${selectedId === component.id ? 'selected' : ''} ${drag?.id === component.id ? 'dragging' : ''}`} style={{ left: t.x, top: t.y, transform: `rotate(${t.rotation}deg)` }} onPointerDown={(e) => beginDrag(e, component)} onClick={() => setSelectedId(component.id)}>
          <div className="component-body"><span>{def.icon}</span><strong>{component.name}</strong><small>{component.type}</small></div>
          <div className="terminal-row">{component.terminals.map(term => <button key={term.id} className={selectedTerminal === term.id ? 'terminal active' : 'terminal'} title={`توصيل ${term.name}`} onClick={(e) => { e.stopPropagation(); connect(term.id); }}>{term.name}</button>)}</div>
        </div> })}
        {circuit.components.length === 0 && <div className="empty-canvas">اختر مكونًا من المكتبة للبدء</div>}
      </div>
      <aside className="properties-panel">
        <div className="panel-title">خصائص العنصر</div>
        {!selected ? <p className="empty-properties">حدد مكونًا من مساحة العمل.</p> : <>
          <label>الاسم<input value={selected.name} onChange={e => updateSelected({ name: e.target.value })} /></label>
          {'resistance' in selected && <label>المقاومة Ω<input type="number" value={selected.resistance} onChange={e => updateSelected({ resistance: Number(e.target.value) } as never)} /></label>}
          {'voltage' in selected && <label>الجهد V<input type="number" value={selected.voltage} onChange={e => updateSelected({ voltage: Number(e.target.value) } as never)} /></label>}
          {'ratedCurrent' in selected && <label>التيار المقنن A<input type="number" value={selected.ratedCurrent} onChange={e => updateSelected({ ratedCurrent: Number(e.target.value) } as never)} /></label>}
          <div className="transform-grid"><label>X<input type="number" value={selected.transform?.x ?? 0} onChange={e => updateTransform('x', Number(e.target.value))}/></label><label>Y<input type="number" value={selected.transform?.y ?? 0} onChange={e => updateTransform('y', Number(e.target.value))}/></label></div>
          <button onClick={rotate}>↻ تدوير 90°</button><button className="danger-action" onClick={removeSelected}>حذف العنصر والوصلات</button>
        </>}
        <div className="panel-help"><b>طريقة الاستخدام</b><br/>• اسحب المكون باللمس أو الماوس.<br/>• اتركه ليعمل Snap على الشبكة.<br/>• اضغط Terminal ثم Terminal لرسم السلك.<br/>• أضف Junction للتفرع ثم وصّل عدة أطراف به.<br/>• اضغط على أي سلك لحذفه.<br/>• التوصيلات محفوظة داخل Circuit Model.</div>
      </aside>
    </div>
    <SchematicRenderer circuit={circuit} />
  </section>;
}
