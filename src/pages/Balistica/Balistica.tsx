/**
 * pages/Balistica/Balistica.tsx
 * Laboratorio balístico — diseño oscuro con rojo, fondo MA.png.
 * Ruta: /balistica
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom'; 

type System = 'metric' | 'imperial';
type Sample = { t: number; x: number; y: number; z: number; v: number };
type Shot = {
  v0: number; angle: number; y0: number; mass: number; diameter: number; cd: number;
  rho: number; headwind: number; crosswind: number; g: number; drag: boolean;
};
type Preset = { id: string; name: string; v0: number; angle: number; mass: number; diameter: number; cd: number; note: string };

const G = 9.80665;
const PRESETS: Preset[] = [
  { id: 'demo', name: 'Esfera', v0: 48, angle: 38, mass: 0.25, diameter: 0.09, cd: 0.47, note: 'Didáctica. El arrastre se ve frente al vacío.' },
  { id: 'bb', name: 'Balín 4.5', v0: 180, angle: 1.2, mass: 0.00053, diameter: 0.0045, cd: 0.47, note: 'Masa baja: el aire manda pronto.' },
  { id: 'pistol', name: '9×19', v0: 360, angle: 0.15, mass: 0.008, diameter: 0.009, cd: 0.23, note: 'Trayectoria tensa.' },
  { id: 'rifle', name: '5.56', v0: 940, angle: 0.12, mass: 0.004, diameter: 0.00569, cd: 0.28, note: 'Alta velocidad inicial.' },
  { id: 'arrow', name: 'Flecha', v0: 70, angle: 8, mass: 0.024, diameter: 0.009, cd: 1.4, note: 'Cd alto por plumas.' },
  { id: 'baseball', name: 'Béisbol', v0: 40, angle: 32, mass: 0.145, diameter: 0.074, cd: 0.35, note: 'Lanzamiento largo.' },
  { id: 'golf', name: 'Golf', v0: 70, angle: 14, mass: 0.0459, diameter: 0.0427, cd: 0.25, note: 'Ángulo bajo y rápido.' },
  { id: 'mortar', name: 'Mortero', v0: 120, angle: 62, mass: 4.2, diameter: 0.081, cd: 0.32, note: 'Tiro curvo.' },
  { id: 'vacuum', name: 'Vacío', v0: 40, angle: 45, mass: 1, diameter: 0.05, cd: 0, note: 'Alcance ideal v²/g.' },
];

function n(v: string, fallback = 0): number {
  const x = Number(String(v).replace(',', '.'));
  return Number.isFinite(x) ? x : fallback;
}
function fmt(x: number, d = 4): string {
  if (!Number.isFinite(x)) return '—';
  const abs = Math.abs(x);
  if (x !== 0 && (abs >= 1e7 || abs < 1e-4)) return x.toExponential(3);
  return String(Number(x.toPrecision(d + 2)));
}
function airDensity(alt: number, tempC: number): number {
  return 1.225 * Math.exp(-Math.max(-200, Math.min(alt, 12000)) / 8500) * (288.15 / (tempC + 273.15));
}

function simulate(shot: Shot): { air: Sample[]; vacuum: Sample[]; range: number; apex: number; tof: number; vImpact: number; drift: number } {
  const th = (shot.angle * Math.PI) / 180;
  const area = Math.PI * (shot.diameter / 2) ** 2;
  const k = shot.drag && shot.mass > 0 ? (0.5 * shot.cd * shot.rho * area) / shot.mass : 0;
  const dt = shot.v0 > 400 ? 0.002 : 0.008;
  let x = 0, y = shot.y0, z = 0;
  let vx = shot.v0 * Math.cos(th);
  let vy = shot.v0 * Math.sin(th);
  let vz = 0;
  const air: Sample[] = [{ t: 0, x, y, z, v: shot.v0 }];
  let apex = y;
  let t = 0;
  for (let i = 0; i < 20000 && y >= 0 && t < 120; i++) {
    const vrx = vx + shot.headwind;
    const vrz = vz - shot.crosswind;
    const speed = Math.hypot(vrx, vy, vrz);
    const drag = k > 0 && speed > 1e-8 ? k * speed : 0;
    const ax = -drag * vrx;
    const ay = -drag * vy - shot.g;
    const az = -drag * vrz;
    vx += ax * dt; vy += ay * dt; vz += az * dt;
    x += vx * dt; y += vy * dt; z += vz * dt;
    t += dt;
    if (y > apex) apex = y;
    if (i % 3 === 0) air.push({ t, x, y, z, v: Math.hypot(vx, vy, vz) });
  }
  const last = air[air.length - 1];
  const vacuum: Sample[] = [];
  const tVac = shot.v0 * Math.sin(th) / shot.g + Math.sqrt(Math.max(0, (shot.v0 * Math.sin(th)) ** 2 + 2 * shot.g * shot.y0)) / shot.g;
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const tv = (tVac * i) / steps;
    const xv = shot.v0 * Math.cos(th) * tv;
    const yv = shot.y0 + shot.v0 * Math.sin(th) * tv - 0.5 * shot.g * tv * tv;
    vacuum.push({ t: tv, x: xv, y: Math.max(0, yv), z: 0, v: Math.hypot(shot.v0 * Math.cos(th), shot.v0 * Math.sin(th) - shot.g * tv) });
  }
  return { air, vacuum, range: last?.x ?? 0, apex, tof: last?.t ?? 0, vImpact: last?.v ?? 0, drift: last?.z ?? 0 };
}

export default function Balistica() {
  const navigate = useNavigate();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [system, setSystem] = useState<System>('metric');
  const [preset, setPreset] = useState('demo');
  const [menu, setMenu] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [form, setForm] = useState({
    v0: '48', angle: '38', y0: '0', mass: '0.25', diameter: '90', cd: '0.47',
    alt: '0', temp: '15', head: '0', cross: '0', g: '9.80665', twist: '7', length: '23',
    sight: '40', zero: '100',
  });
  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));
  const metric = system === 'metric';

  const apply = (p: Preset) => {
    setPreset(p.id);
    setForm((s) => ({
      ...s,
      v0: String(p.v0),
      angle: String(p.angle),
      mass: String(p.mass),
      diameter: String(p.diameter * 1000),
      cd: String(p.cd),
    }));
  };

  const shot = useMemo<Shot>(() => ({
    v0: n(form.v0, 40),
    angle: n(form.angle, 30),
    y0: n(form.y0, 0),
    mass: Math.max(1e-6, n(form.mass, 0.1)),
    diameter: Math.max(1e-4, n(form.diameter, 10) / 1000),
    cd: Math.max(0, n(form.cd, 0.3)),
    rho: airDensity(n(form.alt, 0), n(form.temp, 15)),
    headwind: n(form.head, 0),
    crosswind: n(form.cross, 0),
    g: Math.max(0.1, n(form.g, G)),
    drag: n(form.cd, 0) > 0,
  }), [form]);

  const sim = useMemo(() => simulate(shot), [shot]);
  const energy = 0.5 * shot.mass * shot.v0 ** 2;
  const energyHit = 0.5 * shot.mass * sim.vImpact ** 2;
  const momentum = shot.mass * shot.v0;
  const sd = shot.mass / (shot.diameter ** 2);
  const bc = shot.cd > 0 ? sd / shot.cd : Infinity;
  const twist = n(form.twist, 7);
  const spin = twist > 0 ? (shot.v0 / (twist * 0.0254)) * 60 : 0;
  const terminal = shot.cd > 0 ? Math.sqrt((2 * shot.mass * shot.g) / (shot.rho * shot.cd * Math.PI * (shot.diameter / 2) ** 2)) : Infinity;
  const vacuumRange = (shot.v0 ** 2 * Math.sin((2 * shot.angle * Math.PI) / 180)) / shot.g;
  const vacuumApex = shot.y0 + (shot.v0 * Math.sin((shot.angle * Math.PI) / 180)) ** 2 / (2 * shot.g);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const w = c.width;
    const h = c.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(8,8,10,.55)';
    ctx.fillRect(0, 0, w, h);
    const xs = [...sim.air.map((p) => p.x), ...sim.vacuum.map((p) => p.x)];
    const ys = [...sim.air.map((p) => p.y), ...sim.vacuum.map((p) => p.y)];
    const maxX = Math.max(10, ...xs);
    const maxY = Math.max(4, ...ys);
    const pad = 28;
    const sx = (x: number) => pad + (x / maxX) * (w - pad * 2);
    const sy = (y: number) => h - pad - (y / maxY) * (h - pad * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath(); ctx.moveTo(pad, h - pad); ctx.lineTo(w - pad, h - pad); ctx.stroke();
    const draw = (pts: Sample[], color: string, dash: number[]) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.setLineDash(dash);
      ctx.beginPath();
      pts.forEach((p, i) => i ? ctx.lineTo(sx(p.x), sy(p.y)) : ctx.moveTo(sx(p.x), sy(p.y)));
      ctx.stroke();
      ctx.restore();
    };
    draw(sim.vacuum, 'rgba(255,255,255,.55)', [6, 5]);
    const cut = Math.max(1, Math.floor(sim.air.length * progress));
    draw(sim.air.slice(0, cut), '#ff2a2a', []);
    const p = sim.air[Math.min(sim.air.length - 1, cut - 1)];
    if (p) {
      ctx.fillStyle = '#f5b942';
      ctx.beginPath();
      ctx.arc(sx(p.x), sy(p.y), 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f4f4f8';
    ctx.font = '12px system-ui';
    ctx.fillText('roja: aire   blanca: vacío   ámbar: proyectil', pad, 18);
  }, [sim, progress]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setProgress((p) => {
        const next = p + dt * 0.35 * speed;
        if (next >= 1) { setPlaying(false); return 1; }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  const cards = [
    ['Alcance con aire', `${fmt(sim.range)} m`],
    ['Alcance en vacío', `${fmt(vacuumRange)} m`],
    ['Altura máxima', `${fmt(sim.apex)} m`],
    ['Altura en vacío', `${fmt(vacuumApex)} m`],
    ['Tiempo de vuelo', `${fmt(sim.tof)} s`],
    ['Velocidad de impacto', `${fmt(sim.vImpact)} m/s`],
    ['Energía de boca', `${fmt(energy)} J`],
    ['Energía de impacto', `${fmt(energyHit)} J`],
    ['Momento', `${fmt(momentum)} kg·m/s`],
    ['Deriva por viento', `${fmt(sim.drift)} m`],
    ['Densidad del aire', `${fmt(shot.rho, 3)} kg/m³`],
    ['Velocidad terminal', `${fmt(terminal)} m/s`],
    ['Densidad seccional', `${fmt(sd)} kg/m²`],
    ['BC aproximado', `${fmt(bc)}`],
    ['Giro estimado', `${fmt(spin, 0)} rpm`],
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="bl">
        <header className="bl-head">
          <button type="button" className="icon" onClick={() => navigate('/calcular')} aria-label="Volver">←</button>
          <div>
            <h1>Balística</h1>
            <p>Trayectoria, energía, deriva y animación.</p>
          </div>
          <div className="menu-wrap">
            <button type="button" className="chip" onClick={() => setMenu((s) => !s)}>Módulos ▾</button>
            {menu && (
              <div className="drop">
                <button type="button" onClick={() => navigate('/calcular')}>Calculadora</button>
                <button type="button" onClick={() => navigate('/balistica')}>Balística</button>
                <button type="button" onClick={() => navigate('/conversion')}>Conversión</button>
                <button type="button" onClick={() => navigate('/modo-ascendido')}>Modo ascendido</button>
              </div>
            )}
          </div>
          <button type="button" className={metric ? 'chip on' : 'chip'} onClick={() => setSystem(metric ? 'imperial' : 'metric')}>{metric ? 'SI' : 'Imperial'}</button>
        </header>
        <main className="bl-main">
          <section className="col">
            <article className="panel">
              <h2>Presets</h2>
              <div className="chips">
                {PRESETS.map((p) => (
                  <button key={p.id} type="button" className={preset === p.id ? 'chip on' : 'chip'} onClick={() => apply(p)}>{p.name}</button>
                ))}
              </div>
              <p className="note">{PRESETS.find((p) => p.id === preset)?.note}</p>
            </article>
            <article className="panel">
              <h2>Proyectil</h2>
              <div className="grid">
                <label>Velocidad ({metric ? 'm/s' : 'ft/s'})<input value={form.v0} onChange={(e) => set('v0', e.target.value)} /></label>
                <label>Ángulo (°)<input value={form.angle} onChange={(e) => set('angle', e.target.value)} /></label>
                <label>Masa (kg)<input value={form.mass} onChange={(e) => set('mass', e.target.value)} /></label>
                <label>Diámetro (mm)<input value={form.diameter} onChange={(e) => set('diameter', e.target.value)} /></label>
                <label>Cd<input value={form.cd} onChange={(e) => set('cd', e.target.value)} /></label>
                <label>Altura de salida (m)<input value={form.y0} onChange={(e) => set('y0', e.target.value)} /></label>
              </div>
            </article>
            <article className="panel">
              <h2>Ambiente y arma</h2>
              <div className="grid">
                <label>Altitud (m)<input value={form.alt} onChange={(e) => set('alt', e.target.value)} /></label>
                <label>Temperatura (°C)<input value={form.temp} onChange={(e) => set('temp', e.target.value)} /></label>
                <label>Viento de frente (m/s)<input value={form.head} onChange={(e) => set('head', e.target.value)} /></label>
                <label>Viento lateral (m/s)<input value={form.cross} onChange={(e) => set('cross', e.target.value)} /></label>
                <label>g (m/s²)<input value={form.g} onChange={(e) => set('g', e.target.value)} /></label>
                <label>Paso de estría (in)<input value={form.twist} onChange={(e) => set('twist', e.target.value)} /></label>
                <label>Longitud (mm)<input value={form.length} onChange={(e) => set('length', e.target.value)} /></label>
                <label>Altura de mira (mm)<input value={form.sight} onChange={(e) => set('sight', e.target.value)} /></label>
                <label>Cero (m)<input value={form.zero} onChange={(e) => set('zero', e.target.value)} /></label>
              </div>
            </article>
          </section>
          <section className="col">
            <article className="panel stage">
              <div className="stage-bar">
                <h2>Trayectoria</h2>
                <div className="tools">
                  <button type="button" className="go" onClick={() => { setProgress(0); setPlaying(true); }}>{playing ? 'En vuelo' : 'Animar'}</button>
                  <button type="button" className="ghost" onClick={() => setPlaying((p) => !p)}>{playing ? 'Pausa' : 'Reanudar'}</button>
                  <button type="button" className="ghost" onClick={() => setProgress(1)}>Fin</button>
                </div>
              </div>
              <canvas ref={canvas} width={900} height={420} />
              <label className="slider">Velocidad de la animación
                <input type="range" min="0.4" max="3" step="0.1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
              </label>
            </article>
            <article className="panel">
              <h2>Lecturas</h2>
              <div className="cards">
                {cards.map(([k, v]) => (
                  <div key={k} className="card"><span>{k}</span><strong>{v}</strong></div>
                ))}
              </div>
            </article>
          </section>
        </main>
      </div>
    </>
  );
}

const CSS = `
.bl{min-height:100vh;min-height:100dvh;color:#f6f6f8;font-family:var(--font-main,system-ui,sans-serif);background:#07070c url('/images/backgrounds/MA.png') center/cover no-repeat fixed;position:relative}
.bl::before{content:'';position:fixed;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.62),rgba(0,0,0,.42) 38%,rgba(0,0,0,.66))}
.bl-head,.bl-main{position:relative;z-index:1}
.bl-head{display:flex;align-items:center;gap:12px;padding:14px 16px;position:sticky;top:0;background:rgba(8,8,10,.55);border-bottom:1px solid rgba(255,26,26,.35);backdrop-filter:blur(18px)}
.menu-wrap{position:relative}
.drop{position:absolute;top:calc(100% + 8px);right:0;width:220px;padding:6px;border-radius:14px;background:rgba(12,12,14,.96);border:1px solid rgba(255,26,26,.35);display:flex;flex-direction:column;gap:4px;z-index:30}
.drop button{text-align:left;border:0;border-radius:10px;padding:10px;background:rgba(255,255,255,.04);color:#fff;cursor:pointer}
.bl-head h1{margin:0;font-size:1.05rem;letter-spacing:.18em;text-transform:uppercase;color:#ff1a1a;text-shadow:0 0 16px rgba(255,26,26,.45)}
.bl-head p{margin:2px 0 0;color:#d0d0d8;font-size:.78rem}
.bl-head div{flex:1}
.icon,.chip,.ghost,.go{border:1px solid #2a2a32;color:#f4f4f8;cursor:pointer;background:linear-gradient(180deg,#2c2c34,#121216)}
.icon{width:42px;height:42px;border-radius:14px;font-size:1.15rem}
.chip,.ghost,.go{border-radius:999px;padding:8px 12px;font-size:.78rem;font-weight:700}
.chip.on,.go{background:linear-gradient(180deg,#ff3b3b,#9f1230);border-color:#ff8a8a;color:#fff}
.bl-main{max-width:1280px;margin:0 auto;padding:16px 14px 40px;display:grid;grid-template-columns:minmax(320px,.9fr) minmax(360px,1.1fr);gap:14px;align-items:start}
.col{display:flex;flex-direction:column;gap:14px}
.panel{border-radius:22px;padding:16px;background:rgba(10,10,12,.72);border:1px solid rgba(255,26,26,.28);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 16px 40px rgba(0,0,0,.35)}
.panel h2{margin:0 0 10px;font-size:1rem;letter-spacing:.08em;text-transform:uppercase;color:#ff4d4d}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.note{margin:10px 0 0;color:#d0d0d8;font-size:.82rem}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
label{display:flex;flex-direction:column;gap:6px;font-size:.75rem;color:#d0d0d8;font-weight:650}
input{width:100%;box-sizing:border-box;border-radius:12px;padding:11px;color:#fff;font-size:.95rem;border:1px solid rgba(255,255,255,.16);background:#111116;outline:none}
input:focus{border-color:#ff1a1a;box-shadow:0 0 0 3px rgba(255,26,26,.22)}
.stage canvas{width:100%;height:auto;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:#07070c}
.stage-bar,.tools{display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap}
.slider{margin-top:10px}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.card{padding:10px 12px;border-radius:14px;background:#121216;border:1px solid #2a2a32;display:flex;flex-direction:column;gap:4px}
.card span{font-size:.72rem;color:#c8c8d2}
.card strong{font-size:1rem;font-variant-numeric:tabular-nums}
@media(max-width:980px){.bl-main{grid-template-columns:1fr}.grid,.cards{grid-template-columns:1fr}.bl-head p{display:none}}
`;