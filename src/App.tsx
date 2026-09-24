import { useMemo, useState } from 'react';
import './styles/app.css';
import { createBasicLampCircuit, createBasicMCBCircuit } from './engine/circuit';
import { simulateCircuit } from './engine/solver';
import { currentDivider, parallelResistance, seriesResistance, voltageDivider } from './engine/resistance';
import { readMeasurement } from './engine/measurements';
import { faultCatalog, injectFault, type FaultType } from './engine/faults';
import { evaluateMCBTrip, selectProtection, type MCBTripCurve } from './engine/protection';
import { sizeCable, type ConductorMaterial, type InstallationMethod } from './engine/cable';
import type { Circuit } from './engine/types';
import ComponentWorkbench from './components/ComponentWorkbench';
import { conductorCurrent, conductorResistance, solveOhmsLaw, type ConductorMaterial as FundamentalMaterial, type OhmSolveMode } from './engine/fundamentals';
import { generateOhmGraph, graphDomain } from './engine/ohmGraph';
import { decodeAlphanumericResistor, decodeResistorBands, type ResistorBandColor, formatResistance } from './engine/resistorCodes';
import { capacitorEquivalent, capacitorEnergy, chargingVoltage, dischargingVoltage } from './engine/capacitor';
import { inductorEquivalent, inductorEnergy, inductiveReactance } from './engine/inductor';
import { calculatePower, energyCost, energyKWh, reactivePowerFromPF, type LoadKind } from './engine/power';
import { createResidentialCircuit, type ResidentialCircuitKind } from './engine/residential';
import { explainDiagnosis, probeClamp, probeContinuity, probeMegger, probeVoltage, diagnosticSteps, type DiagnosticInstrument } from './engine/diagnostics';

const modules = [
  ['⚡', 'أساسيات الكهرباء', 'الدائرة البسيطة والجهد والتيار والمقاومة'],
  ['📐', 'قانون أوم', 'تجارب تفاعلية على العلاقة بين V و I و R'],
  ['🔩', 'المقاومات', 'أنواع المقاومات والتوصيل وشفرة الألوان'],
  ['🔋', 'المكثفات', 'الشحن والتفريغ والتوصيلات'],
  ['🌀', 'الملفات', 'أساسيات الملفات وسلوكها'],
  ['⚡', 'القدرة والطاقة', 'P / Q / S / PF واستهلاك الطاقة'],
  ['🛡️', 'الحماية والكابلات', 'الفيوز والقواطع ومساحة المقطع وهبوط الجهد'],
  ['🏠', 'التمديدات السكنية', 'محاكاة دوائر الإنارة والبرايز والجرس'],
  ['🔍', 'اكتشاف الأعطال', 'ابحث عن الخطأ باستخدام أدوات القياس'],
];

function ResistorLab() {
  const [voltage, setVoltage] = useState(12);
  const [r1, setR1] = useState(100);
  const [r2, setR2] = useState(200);
  const series = seriesResistance([r1, r2]);
  const parallel = parallelResistance([r1, r2]);
  const divider = voltageDivider(voltage, r1, r2);
  const dividerCurrent = currentDivider(1, r1, r2);

  return (
    <section className="lab-card resistor-lab">
      <div className="lab-head">
        <div>
          <span className="eyebrow">CORE ENGINE — RESISTOR NETWORK</span>
          <h3>المقاومات: توالي، توازي، ومقسم الجهد</h3>
          <p>هذه الحسابات أصبحت جزءًا من محرك الكهرباء نفسه، وليس مجرد واجهة تعليمية.</p>
        </div>
      </div>
      <div className="resistor-controls">
        <label>مصدر الجهد <input type="number" min="0" value={voltage} onChange={(e) => setVoltage(Number(e.target.value))} /> V</label>
        <label>R1 <input type="number" min="0.1" value={r1} onChange={(e) => setR1(Number(e.target.value))} /> Ω</label>
        <label>R2 <input type="number" min="0.1" value={r2} onChange={(e) => setR2(Number(e.target.value))} /> Ω</label>
      </div>
      <div className="measure-grid">
        <div><span>Series Req</span><strong>{series.toFixed(2)} Ω</strong></div>
        <div><span>Parallel Req</span><strong>{parallel.toFixed(2)} Ω</strong></div>
        <div><span>Vout</span><strong>{divider.outputVoltage.toFixed(2)} V</strong></div>
        <div><span>Divider I</span><strong>{divider.current.toFixed(3)} A</strong></div>
      </div>
      <div className="engine-note">مقسم التيار عند 1A → R1: {dividerCurrent.i1.toFixed(3)}A — R2: {dividerCurrent.i2.toFixed(3)}A</div>
    </section>
  );
}

function MeasurementLab() {
  const [circuit] = useState<Circuit>(() => createBasicLampCircuit());
  const [mode, setMode] = useState<'voltage' | 'current' | 'resistance' | 'continuity'>('voltage');
  const [result] = useState(() => simulateCircuit(circuit));
  const reading = mode === 'voltage'
    ? readMeasurement(circuit, result, mode, 'lamp.L', 'lamp.N')
    : mode === 'current'
      ? readMeasurement(circuit, result, mode, 'lamp')
      : mode === 'resistance'
        ? readMeasurement(circuit, result, mode, 'lamp')
        : readMeasurement(circuit, result, mode, 'lamp.L', 'lamp.N');

  const display = typeof reading.value === 'boolean'
    ? (reading.value ? 'PASS' : 'OPEN')
    : Number.isFinite(reading.value) ? reading.value.toFixed(mode === 'resistance' ? 1 : 2) : '∞';

  return (
    <section className="lab-card">
      <div className="lab-head">
        <div><span className="eyebrow">MEASUREMENT ENGINE</span><h3>أجهزة القياس الافتراضية</h3><p>الفولتميتر والأميتر والأوم ميتر والاستمرارية يقرأون من نفس حلّ الدائرة.</p></div>
      </div>
      <div className="instrument-tabs">
        {([['voltage','V فولتميتر'],['current','A أميتر'],['resistance','Ω أوم ميتر'],['continuity','◉ Continuity']] as const).map(([id,label]) => (
          <button key={id} className={mode === id ? 'active' : ''} onClick={() => setMode(id)}>{label}</button>
        ))}
      </div>
      <div className="meter-display"><span>{mode.toUpperCase()}</span><strong>{display}</strong><small>{reading.unit}</small></div>
      <div className="engine-note">{reading.message ?? 'تمت القراءة من المحرك الكهربائي.'}</div>
    </section>
  );
}

function FaultLab() {
  const base = useMemo(() => createBasicLampCircuit(), []);
  const [fault, setFault] = useState<FaultType | 'none'>('none');
  const circuit = useMemo(() => fault === 'none' ? base : injectFault(base, fault), [base, fault]);
  const result = useMemo(() => simulateCircuit(circuit), [circuit]);
  const label: Record<typeof result.status, string> = { off: 'المصدر مفصول', 'open-circuit': 'دائرة مفتوحة', running: 'الدائرة تعمل', 'short-circuit': 'قصر كهربائي', protected: 'الحماية فصلت' };
  return (
    <section className="lab-card fault-lab">
      <div className="lab-head"><div><span className="eyebrow">FAULT INJECTION ENGINE</span><h3>مختبر الأعطال</h3><p>الأعطال تُحقن داخل نموذج الدائرة نفسه لا كرسائل واجهة فقط.</p></div><span className={`status-pill ${result.status}`}>{label[result.status]}</span></div>
      <div className="fault-grid">
        <button className={fault === 'none' ? 'selected' : ''} onClick={() => setFault('none')}>✓ بدون عطل</button>
        {faultCatalog.map(item => <button key={item.id} className={fault === item.id ? 'selected' : ''} onClick={() => setFault(item.id)}>{item.name}</button>)}
      </div>
      <div className="measure-grid"><div><span>Current</span><strong>{Number.isFinite(result.measurements.current) ? result.measurements.current.toFixed(2) : '∞'} A</strong></div><div><span>Power</span><strong>{Number.isFinite(result.measurements.power) ? result.measurements.power.toFixed(0) : '∞'} W</strong></div><div><span>Protection</span><strong>{result.fuseState === 'armed' ? 'ARMED' : 'TRIPPED'}</strong></div><div><span>Lamp</span><strong>{result.lampLit ? 'ON' : 'OFF'}</strong></div></div>
      {result.warnings.length > 0 && <div className="lab-warning">⚠️ {result.warnings[0]}</div>}
    </section>
  );
}

function ProtectionCableLab() {
  const [loadCurrent, setLoadCurrent] = useState(12);
  const [length, setLength] = useState(20);
  const [material, setMaterial] = useState<ConductorMaterial>('copper');
  const [method, setMethod] = useState<InstallationMethod>('conduit');
  const [curve, setCurve] = useState<MCBTripCurve>('C');
  const [actualCurrent, setActualCurrent] = useState(18);
  const protection = selectProtection({ loadCurrent, device: 'mcb', margin: 1.25, mcbCurve: curve });
  const cable = sizeCable({ designCurrent: loadCurrent, lengthMeters: length, material, installationMethod: method, voltage: 220, maxVoltageDropPercent: 3 });
  const trip = evaluateMCBTrip(protection.selectedRating ?? 16, actualCurrent, curve);

  return (
    <section className="lab-card protection-lab">
      <div className="lab-head">
        <div><span className="eyebrow">PHASE 2 — PROTECTION & CABLE ENGINE</span><h3>اختيار الحماية ومقطع الكابل</h3><p>نموذج تعليمي يحسب تيار التصميم، قيمة MCB، سعة الكابل، وهبوط الجهد.</p></div>
      </div>
      <div className="resistor-controls">
        <label>تيار الحمل <input type="number" min="0" step="0.1" value={loadCurrent} onChange={e => setLoadCurrent(Number(e.target.value))} /> A</label>
        <label>طول المسار <input type="number" min="1" step="1" value={length} onChange={e => setLength(Number(e.target.value))} /> m</label>
        <label>المادة<select value={material} onChange={e => setMaterial(e.target.value as ConductorMaterial)}><option value="copper">نحاس Copper</option><option value="aluminium">ألومنيوم Aluminium</option></select></label>
        <label>طريقة التركيب<select value={method} onChange={e => setMethod(e.target.value as InstallationMethod)}><option value="conduit">ماسورة Conduit</option><option value="tray">Tray</option><option value="free-air">Free Air</option></select></label>
        <label>منحنى MCB<select value={curve} onChange={e => setCurve(e.target.value as MCBTripCurve)}><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></label>
        <label>تيار الاختبار <input type="number" min="0" step="0.1" value={actualCurrent} onChange={e => setActualCurrent(Number(e.target.value))} /> A</label>
      </div>
      <div className="measure-grid">
        <div><span>Design Current</span><strong>{protection.designCurrent.toFixed(2)} A</strong></div>
        <div><span>MCB</span><strong>{protection.selectedRating ?? '—'} A</strong></div>
        <div><span>Cable</span><strong>{cable.selectedSizeMm2 ?? '—'} mm²</strong></div>
        <div><span>Voltage Drop</span><strong>{Number.isFinite(cable.voltageDropPercent) ? cable.voltageDropPercent.toFixed(2) : '∞'}%</strong></div>
      </div>
      <div className="protection-result-grid">
        <div className="engine-note"><b>الحماية:</b> {protection.reason}</div>
        <div className="engine-note"><b>الكابل:</b> {cable.reason}</div>
        <div className={`trip-result ${trip.tripped ? 'trip' : 'safe'}`}><b>اختبار MCB عند {actualCurrent} A:</b> {trip.reason}</div>
      </div>
      <small className="educational-disclaimer">القيم الحالية نموذج تعليمي أولي وليست بديلًا عن جداول ومعايير الكود المعتمد وظروف التركيب الفعلية.</small>
    </section>
  );
}

function MCBIntegrationLab() {
  const [circuit, setCircuit] = useState<Circuit>(() => createBasicMCBCircuit());
  const result = useMemo(() => simulateCircuit(circuit), [circuit]);
  const mcb = circuit.components.find((c) => c.type === 'mcb');
  const lamp = circuit.components.find((c) => c.type === 'lamp');

  const setOverload = (enabled: boolean) => {
    setCircuit((current) => ({
      ...current,
      components: current.components.map((component) => {
        if (component.type === 'lamp') return { ...component, resistance: enabled ? 8 : 48.4 };
        if (component.type === 'mcb') return { ...component, state: 'armed' };
        return component;
      }),
    }));
  };

  const reset = () => setCircuit(createBasicMCBCircuit());

  return (
    <section className="lab-card protection-lab">
      <div className="lab-head">
        <div>
          <span className="eyebrow">PHASE 2 — GRAPH PROTECTION</span>
          <h3>MCB داخل الدائرة الكهربائية نفسها</h3>
          <p>الـMCB أصبح عنصرًا حقيقيًا داخل Circuit Graph. تيار الحمل هو الذي يحدد هل سيستمر القاطع أم يفصل.</p>
        </div>
        <span className={`status-pill ${result.status}`}>{result.status === 'protected' ? 'MCB TRIPPED' : 'MCB ARMED'}</span>
      </div>
      <div className="circuit-board">
        <div className={`lamp-visual ${result.lampLit ? 'lit' : ''}`}><span>💡</span><small>{result.lampLit ? 'ON' : 'OFF'}</small></div>
        <div className="wire-line"><span>⚡</span><i /><b>MCB {mcb?.type === 'mcb' ? `${mcb.ratedCurrent}A / ${mcb.curve}` : ''}</b><i /><b>LOAD</b><i /><span>💡</span></div>
        <div className="source-state">I = {result.measurements.current.toFixed(2)} A</div>
      </div>
      <div className="lab-controls">
        <button className="primary-action" onClick={() => setOverload(false)}>✓ حمل طبيعي</button>
        <button onClick={() => setOverload(true)}>🔥 تحميل زائد</button>
        <button onClick={reset}>↻ إعادة MCB</button>
      </div>
      <div className="measure-grid">
        <div><span>MCB</span><strong>{mcb?.type === 'mcb' ? `${mcb.ratedCurrent} A` : '—'}</strong></div>
        <div><span>Curve</span><strong>{mcb?.type === 'mcb' ? mcb.curve : '—'}</strong></div>
        <div><span>Current</span><strong>{result.measurements.current.toFixed(2)} A</strong></div>
        <div><span>State</span><strong>{result.mcbState === 'tripped' ? 'TRIPPED' : 'ARMED'}</strong></div>
      </div>
      {result.warnings.length > 0 && <div className="lab-warning">⚠️ {result.warnings[0]}</div>}
      <div className="engine-note">المسار: Source → MCB → Switch → Lamp → Neutral. عند الفصل، الـMCB يفتح المسار فعليًا في الـGraph.</div>
    </section>
  );
}

function OhmsLawLab() {
  const [mode, setMode] = useState<OhmSolveMode>('current');
  const [first, setFirst] = useState(220);
  const [second, setSecond] = useState(48.4);
  const result = solveOhmsLaw(mode, first, second);

  const labels: Record<OhmSolveMode, [string, string]> = {
    voltage: ['التيار I', 'المقاومة R'],
    current: ['الجهد V', 'المقاومة R'],
    resistance: ['الجهد V', 'التيار I'],
  };

  return (
    <section className="lab-card fundamentals-lab">
      <div className="lab-head">
        <div><span className="eyebrow">PHASE 4 — FUNDAMENTALS LAB</span><h3>قانون أوم — غيّر القيم وشاهد العلاقة لحظيًا</h3><p>المعادلة تعمل من خلال محرك مستقل: V = I × R، والقدرة P = V × I.</p></div>
      </div>
      <div className="instrument-tabs">
        {([['current','احسب التيار I'],['voltage','احسب الجهد V'],['resistance','احسب المقاومة R']] as const).map(([id,label]) => (
          <button key={id} className={mode === id ? 'active' : ''} onClick={() => { setMode(id); setFirst(id === 'current' ? 220 : id === 'voltage' ? 4.55 : 220); setSecond(id === 'resistance' ? 4.55 : 48.4); }}>{label}</button>
        ))}
      </div>
      <div className="resistor-controls">
        <label>{labels[mode][0]} <input type="number" min="0" step="0.1" value={first} onChange={e => setFirst(Number(e.target.value))} /> {mode === 'current' ? 'V' : mode === 'voltage' ? 'A' : 'V'}</label>
        <label>{labels[mode][1]} <input type="number" min="0" step="0.1" value={second} onChange={e => setSecond(Number(e.target.value))} /> {mode === 'current' || mode === 'voltage' ? 'Ω' : 'A'}</label>
      </div>
      <div className="formula-card"><span>القانون المستخدم</span><strong>{mode === 'current' ? 'I = V / R' : mode === 'voltage' ? 'V = I × R' : 'R = V / I'}</strong></div>
      <div className="measure-grid">
        <div><span>Voltage</span><strong>{result.voltage.toFixed(2)} V</strong></div>
        <div><span>Current</span><strong>{result.current.toFixed(3)} A</strong></div>
        <div><span>Resistance</span><strong>{result.resistance.toFixed(2)} Ω</strong></div>
        <div><span>Power</span><strong>{result.power.toFixed(1)} W</strong></div>
      </div>
    </section>
  );
}


function OhmGraphLab() {
  const [mode, setMode] = useState<'current-vs-voltage' | 'current-vs-resistance'>('current-vs-voltage');
  const [fixed, setFixed] = useState(48.4);
  const [max, setMax] = useState(220);
  const points = useMemo(() => generateOhmGraph(mode, fixed, mode === 'current-vs-voltage' ? 0 : 1, max), [mode, fixed, max]);
  const domain = graphDomain(points);
  const W = 720, H = 280, pad = 42;
  const sx = (x: number) => pad + ((x - domain.minX) / Math.max(domain.maxX - domain.minX, 1)) * (W - pad * 2);
  const sy = (y: number) => H - pad - ((y - domain.minY) / Math.max(domain.maxY - domain.minY, 1)) * (H - pad * 2);
  const path = points.map((p, i) => `${i ? 'L' : 'M'} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');
  const current = mode === 'current-vs-voltage' ? max / Math.max(fixed, .000001) : fixed / Math.max(max, .000001);

  return <section className="lab-card fundamentals-lab">
    <div className="lab-head"><div><span className="eyebrow">V–I–R INTERACTIVE GRAPH</span><h3>شاهد العلاقة على الرسم البياني</h3><p>في المقاومة الثابتة، زيادة الجهد ترفع التيار خطيًا. وعند الجهد الثابت، زيادة المقاومة تخفض التيار.</p></div></div>
    <div className="resistor-controls">
      <label>الرسم<select value={mode} onChange={e => setMode(e.target.value as typeof mode)}><option value="current-vs-voltage">I مقابل V</option><option value="current-vs-resistance">I مقابل R</option></select></label>
      <label>{mode === 'current-vs-voltage' ? 'المقاومة الثابتة R' : 'الجهد الثابت V'}<input type="number" min="0.1" step="0.1" value={fixed} onChange={e => setFixed(Number(e.target.value))} /> {mode === 'current-vs-voltage' ? 'Ω' : 'V'}</label>
      <label>الحد الأقصى للمحور<input type="number" min="1" step="1" value={max} onChange={e => setMax(Number(e.target.value))} /></label>
    </div>
    <div className="graph-card"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="منحنى قانون أوم">
      <line x1={pad} y1={H-pad} x2={W-pad} y2={H-pad} className="graph-axis"/><line x1={pad} y1={pad} x2={pad} y2={H-pad} className="graph-axis"/>
      {[0.25,0.5,0.75].map(t => <line key={t} x1={pad} x2={W-pad} y1={pad+(H-pad*2)*t} y2={pad+(H-pad*2)*t} className="graph-grid"/>)}
      <path d={path} className="graph-line"/>
      <circle cx={sx(mode === 'current-vs-voltage' ? max : max)} cy={sy(current)} r="5" className="graph-point"/>
      <text x={W/2} y={H-8} className="graph-label">{mode === 'current-vs-voltage' ? 'Voltage V' : 'Resistance R'}</text><text x="14" y={H/2} className="graph-label" transform={`rotate(-90 14 ${H/2})`}>Current I</text>
    </svg></div>
    <div className="measure-grid"><div><span>عند النهاية</span><strong>{current.toFixed(2)} A</strong></div><div><span>العلاقة</span><strong>{mode === 'current-vs-voltage' ? 'I ∝ V' : 'I ∝ 1/R'}</strong></div></div>
  </section>;
}

function ConductorResistanceLab() {
  const [material, setMaterial] = useState<FundamentalMaterial>('copper');
  const [length, setLength] = useState(20);
  const [area, setArea] = useState(2.5);
  const [voltage, setVoltage] = useState(220);
  const resistance = conductorResistance({ lengthMeters: length, areaMm2: area, material });
  const current = conductorCurrent({ lengthMeters: length, areaMm2: area, material, voltage });

  return (
    <section className="lab-card fundamentals-lab">
      <div className="lab-head"><div><span className="eyebrow">CONDUCTOR RESISTANCE</span><h3>العوامل المؤثرة على مقاومة الموصل</h3><p>جرّب تأثير الطول ومساحة المقطع ونوع المادة على المقاومة والتيار.</p></div></div>
      <div className="resistor-controls">
        <label>الطول L <input type="number" min="0.1" step="0.5" value={length} onChange={e => setLength(Number(e.target.value))} /> m</label>
        <label>المقطع A <input type="number" min="0.1" step="0.1" value={area} onChange={e => setArea(Number(e.target.value))} /> mm²</label>
        <label>الجهد <input type="number" min="0" step="1" value={voltage} onChange={e => setVoltage(Number(e.target.value))} /> V</label>
        <label>المادة<select value={material} onChange={e => setMaterial(e.target.value as FundamentalMaterial)}><option value="copper">نحاس</option><option value="aluminium">ألومنيوم</option></select></label>
      </div>
      <div className="formula-card"><span>العلاقة</span><strong>R = ρL / A</strong></div>
      <div className="measure-grid">
        <div><span>Resistivity ρ</span><strong>{material === 'copper' ? '0.0175' : '0.0282'}</strong></div>
        <div><span>Resistance</span><strong>{resistance.toFixed(4)} Ω</strong></div>
        <div><span>Current @ V</span><strong>{current.toFixed(2)} A</strong></div>
        <div><span>Trend</span><strong>{length > 20 && area < 2.5 ? 'R ↑↑' : length > 20 ? 'R ↑' : area > 2.5 ? 'R ↓' : 'Balanced'}</strong></div>
      </div>
      <div className="engine-note">زيادة الطول ترفع المقاومة، وزيادة مساحة المقطع تخفضها. القيم المرجعية تعليمية عند درجة حرارة تقارب 20°C.</div>
    </section>
  );
}


function GuidedSimpleCircuitLab() {
  const createGuided = () => {
    const base = createBasicLampCircuit();
    return {
      ...base,
      components: base.components.map((component) =>
        component.type === 'source' ? { ...component, enabled: false } :
        component.type === 'switch' ? { ...component, state: 'open' as const } : component,
      ),
    };
  };

  const [circuit, setCircuit] = useState<Circuit>(() => createGuided());
  const [step, setStep] = useState(1);
  const result = useMemo(() => simulateCircuit(circuit), [circuit]);
  const source = circuit.components.find((c) => c.type === 'source');
  const sw = circuit.components.find((c) => c.type === 'switch');
  const running = result.status === 'running';

  const setSource = (enabled: boolean) => {
    setCircuit(current => ({ ...current, components: current.components.map(c => c.type === 'source' ? { ...c, enabled } : c) }));
    if (enabled) setStep(s => Math.max(s, 2));
  };

  const setSwitch = (closed: boolean) => {
    setCircuit(current => ({ ...current, components: current.components.map(c => c.type === 'switch' ? { ...c, state: closed ? ('closed' as const) : ('open' as const) } : c) }));
    if (closed) setStep(s => Math.max(s, 3));
    else if (step >= 3) setStep(4);
  };

  const reset = () => { setCircuit(createGuided()); setStep(1); };
  const status = result.status === 'running' ? 'الدائرة تعمل' : result.status === 'off' ? 'المصدر مفصول' : 'الدائرة مفتوحة';
  const steps = [
    ['1', 'شغّل المصدر', 'فعّل مصدر 220V ولاحظ أن الدائرة ما زالت مفتوحة.'],
    ['2', 'أغلق المفتاح', 'أغلق المفتاح ليكتمل مسار التيار.'],
    ['3', 'راقب القياسات', 'شاهد V و I و P والمصباح أثناء التشغيل.'],
    ['4', 'افتح المفتاح', 'افتح المفتاح ولاحظ أن التيار يعود إلى صفر.'],
  ];

  return (
    <section className="lab-card guided-circuit-lab">
      <div className="lab-head">
        <div><span className="eyebrow">PHASE 4 — GUIDED CIRCUIT</span><h3>مختبر الدائرة البسيطة — خطوة بخطوة</h3><p>ابنِ الفكرة عمليًا: مصدر → فيوز → مفتاح → مصباح → Neutral، ثم راقب أثر كل تغيير.</p></div>
        <span className={`status-pill ${result.status}`}>{status}</span>
      </div>

      <div className="guided-steps">
        {steps.map(([number, title, description], index) => (
          <button key={number} className={`${step === index + 1 ? 'current' : ''} ${step > index + 1 ? 'done' : ''}`} onClick={() => setStep(index + 1)}>
            <b>{step > index + 1 ? '✓' : number}</b><span><strong>{title}</strong><small>{description}</small></span>
          </button>
        ))}
      </div>

      <div className="guided-board">
        <div className="guided-path">
          <span className="guided-node source-node">⚡<small>220V</small></span>
          <i className={source?.type === 'source' && source.enabled ? 'live' : ''} />
          <b>FUSE</b><i className={running ? 'live' : ''} />
          <button className={`guided-switch ${sw?.type === 'switch' && sw.state === 'closed' ? 'closed' : ''}`} onClick={() => setSwitch(sw?.type === 'switch' ? sw.state === 'open' : true)}>
            <span>SW</span><small>{sw?.type === 'switch' && sw.state === 'closed' ? 'CLOSED' : 'OPEN'}</small>
          </button>
          <i className={running ? 'live' : ''} />
          <span className={`guided-lamp ${result.lampLit ? 'lit' : ''}`}>💡<small>{result.lampLit ? 'ON' : 'OFF'}</small></span>
        </div>
        <div className={`current-flow ${running ? 'flowing' : ''}`} aria-label="حركة التيار">
          <span>→</span><span>→</span><span>→</span><span>→</span><span>→</span>
        </div>
        <div className="guided-actions">
          <button className="primary-action" onClick={() => setSource(!(source?.type === 'source' && source.enabled))}>{source?.type === 'source' && source.enabled ? '⏻ فصل المصدر' : '⚡ تشغيل المصدر'}</button>
          <button onClick={() => setSwitch(sw?.type === 'switch' ? sw.state === 'open' : true)}>🔘 {sw?.type === 'switch' && sw.state === 'closed' ? 'فتح المفتاح' : 'غلق المفتاح'}</button>
          <button onClick={reset}>↻ إعادة الدرس</button>
        </div>
      </div>

      <div className={`simulation-result guided-measurements ${running ? 'running' : ''}`}>
        <div><span>الجهد V</span><strong>{result.measurements.voltage.toFixed(0)} V</strong></div>
        <div><span>التيار I</span><strong>{result.measurements.current.toFixed(3)} A</strong></div>
        <div><span>القدرة P</span><strong>{result.measurements.power.toFixed(1)} W</strong></div>
        <div><span>المصباح</span><strong>{result.lampLit ? 'ON' : 'OFF'}</strong></div>
      </div>

      <div className={`guided-feedback ${step === 1 ? 'info' : step === 2 ? 'warning' : step === 3 && running ? 'success' : step === 4 && !running ? 'success' : 'info'}`}>
        <b>{step === 1 ? 'ابدأ هنا' : step === 2 ? 'الخطوة التالية' : step === 3 ? 'ماذا تلاحظ؟' : 'أحسنت'}</b>
        <span>{step === 1 ? 'شغّل المصدر. لا يوجد تيار لأن المفتاح مفتوح.' : step === 2 ? 'المصدر أصبح فعالًا؛ أغلق المفتاح حتى يكتمل المسار.' : step === 3 ? (running ? `التيار يمر الآن بقيمة ${result.measurements.current.toFixed(3)} A، والمصباح مضيء.` : 'أغلق المفتاح لتشغيل الحمل ومشاهدة القياسات.') : (!running ? 'فتح المفتاح قطع المسار، لذلك عاد التيار إلى صفر.' : 'افتح المفتاح لملاحظة تأثير الدائرة المفتوحة.')}</span>
      </div>
    </section>
  );
}

function CircuitLab() {
  const [circuit, setCircuit] = useState<Circuit>(() => createBasicLampCircuit());
  const result = useMemo(() => simulateCircuit(circuit), [circuit]);
  const source = circuit.components.find((c) => c.type === 'source');
  const fuse = circuit.components.find((c) => c.type === 'fuse');
  const sw = circuit.components.find((c) => c.type === 'switch');
  const lamp = circuit.components.find((c) => c.type === 'lamp');

  const toggleSwitch = () => {
    setCircuit((current) => ({
      ...current,
      components: current.components.map((component) =>
        component.type === 'switch'
          ? { ...component, state: component.state === 'open' ? 'closed' : 'open' }
          : component,
      ),
    }));
  };

  const togglePower = () => {
    setCircuit((current) => ({
      ...current,
      components: current.components.map((component) =>
        component.type === 'source' ? { ...component, enabled: !component.enabled } : component,
      ),
    }));
  };

  const reset = () => setCircuit(createBasicLampCircuit());

  const statusLabel: Record<typeof result.status, string> = {
    off: 'مصدر التغذية مفصول',
    'open-circuit': 'الدائرة مفتوحة',
    running: 'الدائرة تعمل',
    'short-circuit': 'قصر كهربائي',
    protected: 'الحماية فصلت الدائرة',
  };

  return (
    <section className="lab-card">
      <div className="lab-head">
        <div>
          <span className="eyebrow">PHASE 2 — ELECTRICAL CORE ENGINE</span>
          <h3>أول تجربة محاكاة: مصدر → فيوز → مفتاح → لمبة</h3>
          <p>المحرك يحسب حالة الدائرة والتيار والقدرة ويتعامل مع فتح المفتاح وتجاوز تيار الحماية.</p>
        </div>
        <span className={`status-pill ${result.status}`}>{statusLabel[result.status]}</span>
      </div>

      <div className="circuit-board">
        <div className={`lamp-visual ${result.lampLit ? 'lit' : ''}`}><span>💡</span><small>{result.lampLit ? 'ON' : 'OFF'}</small></div>
        <div className="wire-line"><span>⚡</span><i /><b>FUSE {fuse?.type === 'fuse' ? `${fuse.ratedCurrent}A` : ''}</b><i /><button onClick={toggleSwitch}>SW</button><i /><span>💡</span></div>
        <div className="source-state">220V {source?.type === 'source' && source.enabled ? '• ON' : '• OFF'}</div>
      </div>

      <div className="lab-controls">
        <button className="primary-action" onClick={togglePower}>{source?.type === 'source' && source.enabled ? '⏻ فصل المصدر' : '⚡ تشغيل المصدر'}</button>
        <button onClick={toggleSwitch}>🔘 {sw?.type === 'switch' && sw.state === 'closed' ? 'فتح المفتاح' : 'غلق المفتاح'}</button>
        <button onClick={reset}>↻ إعادة التجربة</button>
      </div>

      <div className="measure-grid">
        <div><span>Voltage</span><strong>{result.measurements.voltage.toFixed(0)} V</strong></div>
        <div><span>Current</span><strong>{result.measurements.current.toFixed(2)} A</strong></div>
        <div><span>Power</span><strong>{result.measurements.power.toFixed(0)} W</strong></div>
        <div><span>Load Resistance</span><strong>{result.measurements.loadResistance.toFixed(1)} Ω</strong></div>
      </div>

      {result.warnings.length > 0 && <div className="lab-warning">⚠️ {result.warnings[0]}</div>}
      {lamp?.type === 'lamp' && <div className="engine-note">المصباح: {lamp.lit ? 'مضيء' : 'منطفئ'} — الفيوز: {result.fuseState === 'armed' ? 'موصل' : 'مفصول'}</div>}
    </section>
  );
}



function ResidentialWiringLab() {
  const [kind, setKind] = useState<ResidentialCircuitKind>('single-lamp');
  const [toggle, setToggle] = useState(0);
  const circuit = useMemo(() => {
    const next = createResidentialCircuit(kind);
    const switches = next.components.filter(c => c.type === 'switch');
    if (kind === 'two-way-lamp') {
      const a = switches[0]; const b = switches[1];
      if (a?.type === 'switch') a.state = toggle % 2 === 0 ? 'open' : 'closed';
      if (b?.type === 'switch') b.state = toggle % 2 === 0 ? 'closed' : 'open';
    } else if (switches[0]?.type === 'switch') {
      switches[0].state = toggle % 2 === 0 ? 'open' : 'closed';
    }
    return next;
  }, [kind, toggle]);
  const result = useMemo(() => simulateCircuit(circuit), [circuit]);
  const lamps = circuit.components.filter(c => c.type === 'lamp');
  const sockets = circuit.components.filter(c => c.type === 'socket');
  const activeSockets = sockets.filter(c => c.type === 'socket' && c.energized).length;
  const titles: Record<ResidentialCircuitKind, string> = {
    'single-lamp': 'إنارة بمفتاح مفرد',
    'lamp-socket': 'مصباح + مقبس',
    'parallel-lamps': 'مصباحان على التوازي',
    'two-way-lamp': 'ديفاتوري — تحكم من نقطتين',
  };
  return <section className="lab-card residential-lab">
    <div className="lab-head"><div><span className="eyebrow">PHASE 7 — RESIDENTIAL WIRING</span><h3>معمل التمديدات السكنية</h3><p>ابنِ الدائرة السكنية وتابع الفاز والمحايد والحماية والحمل من خلال نفس محرك المحاكاة.</p></div><span className={`status-pill ${result.status}`}>{result.status === 'running' ? 'الدائرة تعمل' : result.status === 'off' ? 'المصدر مفصول' : 'تحقق من الدائرة'}</span></div>
    <div className="instrument-tabs">{(['single-lamp','lamp-socket','parallel-lamps','two-way-lamp'] as ResidentialCircuitKind[]).map(id => <button key={id} className={kind === id ? 'active' : ''} onClick={() => { setKind(id); setToggle(0); }}>{titles[id]}</button>)}</div>
    <div className="circuit-board residential-board">
      <div className="residential-path"><span>⚡ 220V</span><i/><b>MCB 16A</b><i/><span>🔘</span><i/><span>💡</span><i/><span>🔌</span><i/><span>N</span></div>
      <div className="source-state">الحالة: {result.status} — I = {Number.isFinite(result.measurements.current) ? result.measurements.current.toFixed(2) : '∞'} A</div>
    </div>
    <div className="lab-controls"><button className="primary-action" onClick={() => setToggle(v => v + 1)}>🔘 تبديل المفتاح</button><button onClick={() => setToggle(0)}>↻ إعادة الحالة</button></div>
    <div className="measure-grid"><div><span>Voltage</span><strong>{result.measurements.voltage.toFixed(0)} V</strong></div><div><span>Current</span><strong>{Number.isFinite(result.measurements.current) ? result.measurements.current.toFixed(2) : '∞'} A</strong></div><div><span>Lamps ON</span><strong>{lamps.filter(c => c.type === 'lamp' && c.lit).length}/{lamps.length}</strong></div><div><span>Sockets Energized</span><strong>{activeSockets}/{sockets.length}</strong></div></div>
    <div className="engine-note">الهدف التعليمي: الفاز يمر بالحماية والتحكم، بينما المحايد يعود إلى المصدر. في دائرة التوازي تحصل الفروع على جهد المصدر، ودائرة الديفاتوري تغيّر مسار التحكم من نقطتين.</div>
  </section>;
}

function PowerEnergyLab() {
  const [voltage, setVoltage] = useState(220);
  const [current, setCurrent] = useState(5);
  const [pf, setPf] = useState(0.8);
  const [load, setLoad] = useState<LoadKind>('inductive');
  const [hours, setHours] = useState(4);
  const [tariff, setTariff] = useState(1.5);
  const result = calculatePower({ voltage, current, powerFactor: pf, load });
  const kwh = energyKWh(result.activePowerW, hours);
  const cost = energyCost(result.activePowerW, hours, tariff);
  const qFromP = reactivePowerFromPF(result.activePowerW, pf, load);
  return <section className="lab-card power-lab">
    <div className="lab-head"><div><span className="eyebrow">PHASE 6 — POWER & ENERGY</span><h3>القدرة والطاقة ومعامل القدرة</h3><p>تجربة تفاعلية للقدرة الفعالة والمتفاعلة والظاهرية ومعامل القدرة واستهلاك الطاقة.</p></div></div>
    <div className="resistor-controls">
      <label>الجهد <input type="number" min="0" value={voltage} onChange={e=>setVoltage(Number(e.target.value))}/> V</label>
      <label>التيار <input type="number" min="0" step="0.1" value={current} onChange={e=>setCurrent(Number(e.target.value))}/> A</label>
      <label>PF <input type="number" min="0" max="1" step="0.01" value={pf} onChange={e=>setPf(Math.min(1, Math.max(0, Number(e.target.value))))}/></label>
      <label>نوع الحمل<select value={load} onChange={e=>setLoad(e.target.value as LoadKind)}><option value="resistive">مقاومي</option><option value="inductive">حثي</option><option value="capacitive">سعوي</option></select></label>
      <label>ساعات التشغيل <input type="number" min="0" step="0.1" value={hours} onChange={e=>setHours(Number(e.target.value))}/> h</label>
      <label>التعرفة <input type="number" min="0" step="0.01" value={tariff} onChange={e=>setTariff(Number(e.target.value))}/> /kWh</label>
    </div>
    <div className="measure-grid">
      <div><span>Active P</span><strong>{result.activePowerW.toFixed(1)} W</strong></div><div><span>Reactive Q</span><strong>{result.reactivePowerVAR.toFixed(1)} VAR</strong></div>
      <div><span>Apparent S</span><strong>{result.apparentPowerVA.toFixed(1)} VA</strong></div><div><span>Power Factor</span><strong>{result.powerFactor.toFixed(2)}</strong></div>
      <div><span>Phase Angle</span><strong>{result.phaseAngleDeg.toFixed(1)}°</strong></div><div><span>Energy</span><strong>{kwh.toFixed(3)} kWh</strong></div>
      <div><span>Estimated Cost</span><strong>{cost.toFixed(2)}</strong></div><div><span>Q from P/PF</span><strong>{Number.isFinite(qFromP) ? qFromP.toFixed(1) : '∞'} VAR</strong></div>
    </div>
    <div className="engine-note">S = V×I — P = S×PF — Q = √(S²−P²). الإشارة السالبة لـQ تمثل حملًا سعويًا في هذا النموذج التعليمي.</div>
  </section>;
}

function ComponentsLab() {
  const [r1, setR1] = useState(100);
  const [r2, setR2] = useState(220);
  const [network, setNetwork] = useState<'series'|'parallel'>('series');
  const [bands, setBands] = useState<ResistorBandColor[]>(['yellow','violet','red','gold']);
  const [code, setCode] = useState('472');
  const [cap1, setCap1] = useState(100e-6);
  const [cap2, setCap2] = useState(220e-6);
  const [capMode, setCapMode] = useState<'series'|'parallel'>('parallel');
  const [capV, setCapV] = useState(12);
  const [time, setTime] = useState(0.1);
  const [ind1, setInd1] = useState(0.1);
  const [ind2, setInd2] = useState(0.2);
  const [indMode, setIndMode] = useState<'series'|'parallel'>('series');
  const [freq, setFreq] = useState(50);
  const colorOptions: ResistorBandColor[] = ['black','brown','red','orange','yellow','green','blue','violet','gray','white','gold','silver'];
  const decoded = (() => { try { return decodeResistorBands(bands); } catch { return null; } })();
  const codeDecoded = (() => { try { return decodeAlphanumericResistor(code); } catch { return null; } })();
  const req = network === 'series' ? r1 + r2 : 1 / (1/r1 + 1/r2);
  const ceq = capacitorEquivalent([cap1, cap2], capMode);
  const cEnergy = capacitorEnergy(ceq, capV);
  const cChargeV = chargingVoltage(capV, 1_000, ceq, time);
  const cDischargeV = dischargingVoltage(capV, 1_000, ceq, time);
  const leq = inductorEquivalent([ind1, ind2], indMode);
  const lEnergy = inductorEnergy(leq, 2);
  const xL = inductiveReactance(leq, freq);

  return <section className="lab-card components-lab">
    <div className="lab-head"><div><span className="eyebrow">PHASE 5 — COMPONENTS LAB</span><h3>معمل المكونات: مقاومات، مكثفات وملفات</h3><p>نبدأ الآن من سلوك المكونات وقوانينها، ثم نربطها لاحقًا بمحرر الدوائر والمحاكاة.</p></div></div>
    <div className="component-lab-grid">
      <article className="component-panel"><h4>🔩 شبكة مقاومات</h4><div className="resistor-controls"><label>R1 <input type="number" min="0.1" value={r1} onChange={e=>setR1(Number(e.target.value))}/> Ω</label><label>R2 <input type="number" min="0.1" value={r2} onChange={e=>setR2(Number(e.target.value))}/> Ω</label><label>التوصيل<select value={network} onChange={e=>setNetwork(e.target.value as typeof network)}><option value="series">توالي</option><option value="parallel">توازي</option></select></label></div><div className="measure-grid"><div><span>Req</span><strong>{req.toFixed(2)} Ω</strong></div><div><span>عند 12V</span><strong>{(12/req).toFixed(3)} A</strong></div></div></article>
      <article className="component-panel"><h4>🎨 شفرة ألوان المقاومة</h4><div className="band-editor">{bands.map((band,i)=><select key={i} value={band} onChange={e=>setBands(v=>v.map((x,j)=>j===i?e.target.value as ResistorBandColor:x))}>{colorOptions.map(c=><option key={c} value={c}>{c}</option>)}</select>)}</div><div className="resistor-visual">{bands.map((b,i)=><i key={i} className={`band ${b}`} />)}</div><div className="engine-note">{decoded ? `${formatResistance(decoded.resistance)} ± ${decoded.tolerance}%` : 'تركيبة غير صحيحة'}</div></article>
      <article className="component-panel"><h4>🔢 الكود الرقمي / الأبجدي</h4><label>الكود <input value={code} onChange={e=>setCode(e.target.value)} placeholder="472 / 4R7 / 2K2" /></label><div className="formula-card"><span>القيمة</span><strong>{codeDecoded == null ? '—' : formatResistance(codeDecoded)}</strong></div><small>أمثلة تعليمية: 472 = 4.7kΩ، 4R7 = 4.7Ω، 2K2 = 2.2kΩ.</small></article>
      <article className="component-panel"><h4>🔋 المكثف</h4><div className="resistor-controls"><label>C1 <input type="number" min="0" step="0.000001" value={cap1} onChange={e=>setCap1(Number(e.target.value))}/> F</label><label>C2 <input type="number" min="0" step="0.000001" value={cap2} onChange={e=>setCap2(Number(e.target.value))}/> F</label><label>التوصيل<select value={capMode} onChange={e=>setCapMode(e.target.value as typeof capMode)}><option value="parallel">توازي</option><option value="series">توالي</option></select></label><label>الجهد<input type="number" min="0" value={capV} onChange={e=>setCapV(Number(e.target.value))}/> V</label><label>الزمن<input type="number" min="0" step="0.01" value={time} onChange={e=>setTime(Number(e.target.value))}/> s</label></div><div className="measure-grid"><div><span>Ceq</span><strong>{(ceq*1e6).toFixed(2)} µF</strong></div><div><span>Energy</span><strong>{cEnergy.toFixed(4)} J</strong></div><div><span>Charging</span><strong>{cChargeV.toFixed(2)} V</strong></div><div><span>Discharge</span><strong>{cDischargeV.toFixed(2)} V</strong></div></div></article>
      <article className="component-panel"><h4>🌀 الملف</h4><div className="resistor-controls"><label>L1 <input type="number" min="0.001" step="0.01" value={ind1} onChange={e=>setInd1(Number(e.target.value))}/> H</label><label>L2 <input type="number" min="0.001" step="0.01" value={ind2} onChange={e=>setInd2(Number(e.target.value))}/> H</label><label>التوصيل<select value={indMode} onChange={e=>setIndMode(e.target.value as typeof indMode)}><option value="series">توالي</option><option value="parallel">توازي</option></select></label><label>التردد<input type="number" min="0" value={freq} onChange={e=>setFreq(Number(e.target.value))}/> Hz</label></div><div className="measure-grid"><div><span>Leq</span><strong>{leq.toFixed(4)} H</strong></div><div><span>Energy @ 2A</span><strong>{lEnergy.toFixed(3)} J</strong></div><div><span>XL</span><strong>{xL.toFixed(2)} Ω</strong></div></div></article>
    </div>
  </section>;
}


function TroubleshootingLab() {
  const base = useMemo(() => createBasicLampCircuit(), []);
  const [fault, setFault] = useState<FaultType | 'none'>('open-wire');
  const circuit = useMemo(() => fault === 'none' ? base : injectFault(base, fault), [base, fault]);
  const result = useMemo(() => simulateCircuit(circuit), [circuit]);
  const [instrument, setInstrument] = useState<DiagnosticInstrument>('voltage');
  const [step, setStep] = useState(0);
  const [a, setA] = useState('source.L');
  const [b, setB] = useState('source.N');
  const [component, setComponent] = useState('lamp');
  const [safeIsolated, setSafeIsolated] = useState(false);

  const reading = useMemo(() => {
    if (instrument === 'voltage') return probeVoltage(circuit, result, a, b);
    if (instrument === 'continuity') return safeIsolated ? probeContinuity(circuit, result, a, b) : { instrument, value: false, unit: 'continuity' as const, valid: false, message: 'افصل التغذية أولًا قبل اختبار الاستمرارية.' };
    if (instrument === 'clamp') return probeClamp(result, component);
    return safeIsolated ? probeMegger(circuit, result, a, b) : { instrument, value: 0, unit: 'MΩ' as const, valid: false, message: 'افصل التغذية تمامًا قبل اختبار العزل.' };
  }, [instrument, circuit, result, a, b, component, safeIsolated]);

  const terminals = circuit.components.flatMap(c => c.terminals.map(t => ({ id: t.id, label: `${c.name} · ${t.name}` })));
  const display = typeof reading.value === 'boolean' ? (reading.value ? 'PASS' : 'OPEN') : Number.isFinite(reading.value) ? Number(reading.value).toFixed(3) : '∞';
  const diagnosis = explainDiagnosis(result);

  return <section className="lab-card troubleshooting-lab">
    <div className="lab-head">
      <div><span className="eyebrow">PHASE 8 — DIAGNOSTIC WORKBENCH</span><h3>مختبر التشخيص والقياس متعدد النقاط</h3><p>ضع المجسين على نقاط مختلفة، اقرأ النتيجة من نفس الـSolver، ثم استخدم الأدلة للوصول إلى العطل.</p></div>
      <span className={`status-pill ${result.status}`}>{result.status}</span>
    </div>
    <div className="diagnostic-toolbar">
      {(['none', ...faultCatalog.map(x => x.id)] as const).map(f => <button key={f} className={fault === f ? 'selected' : ''} onClick={() => setFault(f)}>{f === 'none' ? 'بدون عطل' : faultCatalog.find(x => x.id === f)?.name}</button>)}
    </div>
    <div className="diagnostic-layout">
      <div className="diagnostic-steps">
        <h4>خطة التشخيص</h4>
        {diagnosticSteps.map((item, i) => <button key={item.id} className={step === i ? 'active' : ''} onClick={() => setStep(i)}><b>{i+1}</b><span>{item.title}</span></button>)}
        <div className="engine-note">{diagnosticSteps[step].instruction}<br/><small>{diagnosticSteps[step].hint}</small></div>
      </div>
      <div className="diagnostic-meter">
        <div className="instrument-tabs">
          {([['voltage','V جهد'],['continuity','◉ استمرارية'],['clamp','⌁ Clamp'],['megger','▣ Megger']] as const).map(([id,label]) => <button key={id} className={instrument === id ? 'active' : ''} onClick={() => setInstrument(id)}>{label}</button>)}
        </div>
        <div className="diagnostic-controls">
          <label>النقطة A<select value={a} onChange={e=>setA(e.target.value)}>{terminals.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
          <label>النقطة B<select value={b} onChange={e=>setB(e.target.value)}>{terminals.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
          {instrument === 'clamp' && <label>المكوّن<select value={component} onChange={e=>setComponent(e.target.value)}>{circuit.components.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          {(instrument === 'continuity' || instrument === 'megger') && <label className="safety-toggle"><input type="checkbox" checked={safeIsolated} onChange={e=>setSafeIsolated(e.target.checked)}/> التغذية مفصولة</label>}
        </div>
        <div className="meter-display"><span>{instrument.toUpperCase()}</span><strong>{display}</strong><small>{reading.unit}</small></div>
        <div className="engine-note">{reading.message}</div>
        <div className="diagnosis-result"><b>استنتاج الحالة:</b> {diagnosis}<br/><span>{diagnosticSteps[step].expected}</span></div>
      </div>
    </div>
    <div className="safety-banner">⚠️ تدريب محاكاة فقط: افصل التغذية قبل قياس المقاومة أو الاستمرارية أو العزل، ولا تستخدم هذه القراءات بدل إجراءات السلامة الفعلية.</div>
  </section>;
}

export default function App() {
  const [dark, setDark] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className={dark ? 'app dark' : 'app'} dir="rtl">
      <header className="topbar">
        <div>
          <div className="brand-mark">⚡</div>
          <div><h1>Electrical Virtual Lab</h1><p>المعمل الافتراضي للكهرباء</p></div>
        </div>
        <div className="top-actions">
          <button onClick={() => setDark((v) => !v)} aria-label="تغيير المظهر">{dark ? '☀️' : '🌙'}</button>
          <button onClick={() => setSettingsOpen((v) => !v)} aria-label="الإعدادات">⚙️</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div><span className="eyebrow">VIRTUAL ELECTRICAL TRAINING LAB</span><h2>تعلّم الكهرباء بالتجربة، وليس بالحفظ فقط.</h2><p>من أساسيات الدائرة الكهربائية إلى تنفيذ ومحاكاة دوائر التمديدات السكنية.</p></div>
          <div className="hero-circuit" aria-hidden="true"><span>⚡</span><i /><b>MCB</b><i /><b>SW</b><i /><span>💡</span></div>
        </section>

        <OhmsLawLab />
        <ConductorResistanceLab />
        <OhmGraphLab />
        <GuidedSimpleCircuitLab />
        <ComponentsLab />
        <PowerEnergyLab />
        <ResidentialWiringLab />
        <CircuitLab />
        <ComponentWorkbench />
        <MCBIntegrationLab />
        <ResistorLab />
        <MeasurementLab />
        <FaultLab />
        <TroubleshootingLab />
        <ProtectionCableLab />

        <section className="section-heading"><div><span>LEARNING PATH</span><h3>المعمل التعليمي</h3></div><small>Phase 4 — Fundamentals Lab</small></section>
        <section className="module-grid">
          {modules.map(([icon, title, description], index) => (
            <button className="module-card" key={title}>
              <span className="module-number">{String(index + 1).padStart(2, '0')}</span><span className="module-icon">{icon}</span><strong>{title}</strong><span>{description}</span><em>{index < 2 ? 'متاح الآن ›' : 'قريبًا ›'}</em>
            </button>
          ))}
        </section>

        <section className="developer-card"><span>Developed by</span><strong>Mohamed _ Eldawly</strong></section>
      </main>

      {settingsOpen && <aside className="settings-preview"><button onClick={() => setSettingsOpen(false)}>×</button><h3>⚙️ إعدادات المسؤول</h3><p>بوابة الإعدادات المحمية بكلمة مرور — إعدادات النظام متاحة من لوحة المسؤول.</p><div className="setting-row"><span>Electrical Engine</span><b>QA Verified</b></div><div className="setting-row"><span>PWA</span><b>Enabled</b></div><div className="setting-row"><span>Developer</span><b>Mohamed _ Eldawly</b></div></aside>}
    </div>
  );
}
