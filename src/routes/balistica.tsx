import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Scene, TopBar } from "@/components/chrome";
import { formatDecimal } from "@/lib/math/format";
import {
  PRESETS, airDensity, bestAngle, rangeTable, simulate,
  type ShotInput, type ShotResult,
} from "@/lib/math/ballistics";

export const Route = createFileRoute("/balistica")({
  component: Balistica,
});

type Fields = {
  v0: string;
  angle: string;
  y0: string;
  mass: string;
  diameter: string;
  cd: string;
  altitude: string;
  temp: string;
  headwind: string;
  crosswind: string;
  g: string;
  drag: boolean;
};

const INITIAL: Fields = {
  v0: "48",
  angle: "38",
  y0: "0",
  mass: "0.25",
  diameter: "0.09",
  cd: "0.47",
  altitude: "0",
  temp: "15",
  headwind: "0",
  crosswind: "0",
  g: "9.80665",
  drag: true,
};

function Balistica() {
  const [fields, setFields] = useState<Fields>(INITIAL);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useRef<number>(0);

  const set = (key: keyof Fields, value: string | boolean) => {
    setFields((f) => ({ ...f, [key]: value }));
  };

  const shot = useMemo<ShotInput | null>(() => {
    const num = (k: keyof Fields) => Number(fields[k]);
    const values = ["v0", "angle", "y0", "mass", "diameter", "cd", "altitude", "temp", "headwind", "crosswind", "g"] as const;
    if (values.some((k) => !Number.isFinite(num(k)))) return null;
    return {
      v0: num("v0"),
      angleDeg: num("angle"),
      y0: num("y0"),
      mass: num("mass"),
      diameter: num("diameter"),
      cd: num("cd"),
      rho: airDensity(num("altitude"), num("temp")),
      headwind: num("headwind"),
      crosswind: num("crosswind"),
      g: num("g"),
      drag: fields.drag && num("cd") > 0,
    };
  }, [fields]);

  const solved = useMemo(() => {
    if (!shot) return { result: null as ShotResult | null, error: "Revisa que todos los campos sean números." };
    try {
      return { result: simulate(shot), error: "" };
    } catch (err) {
      return { result: null as ShotResult | null, error: err instanceof Error ? err.message : "No se pudo integrar" };
    }
  }, [shot]);
  const result = solved.result;
  const error = solved.error;

  useEffect(() => {
    if (!playing || !result) return;
    let start = performance.now();
    const loop = (now: number) => {
      const dur = Math.min(6000, Math.max(1800, result.tof * 900));
      const t = ((now - start) % (dur + 400)) / dur;
      setProgress(Math.min(1, t));
      if (t > 1) start = now;
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame.current);
  }, [playing, result]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result || !shot) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight || 360;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, w, h);

    const xs = result.samples.map((s) => s.x).concat(result.vacuum.map((s) => s.x));
    const ys = result.samples.map((s) => s.y).concat(result.vacuum.map((s) => s.y), [0]);
    const maxX = Math.max(1, ...xs);
    const maxY = Math.max(1, ...ys);
    const minY = Math.min(0, ...ys);
    const pad = 28;
    const X = (x: number) => pad + (x / maxX) * (w - pad * 2);
    const Y = (y: number) => h - pad - ((y - minY) / (maxY - minY)) * (h - pad * 2);

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const y = pad + ((h - pad * 2) * i) / 4;
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(pad, Y(0));
    ctx.lineTo(w - pad, Y(0));
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText("0", pad, h - 8);
    ctx.fillText(`${formatDecimal(maxX)} m`, w - 90, h - 8);
    ctx.fillText(`${formatDecimal(maxY)} m`, 8, 16);

    const drawPath = (pts: { x: number; y: number }[], color: string, dash: number[]) => {
      ctx.save();
      ctx.setLineDash(dash);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
      ctx.stroke();
      ctx.restore();
    };
    drawPath(result.vacuum, "rgba(255,255,255,0.45)", [5, 5]);
    const cut = Math.max(1, Math.floor(progress * (result.samples.length - 1)));
    drawPath(result.samples.slice(0, cut + 1), "#ff3b3b", []);
    const p = result.samples[cut]!;
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(X(p.x), Y(p.y), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(245,158,11,0.35)";
    ctx.beginPath();
    ctx.arc(X(p.x), Y(p.y), 11, 0, Math.PI * 2);
    ctx.stroke();
  }, [result, shot, progress]);

  const rows = shot && result ? rangeTable(shot, result, niceStep(result.range)) : [];

  return (
    <Scene>
      <TopBar title="Balística" />
      <div className="page-body">
        <div className="panel">
          <div className="split">
            <section className="card">
              <h2>Disparo</h2>
              <p className="muted">Modelo de arrastre cuadrático ½ Cd ρ A v², integrado con Runge-Kutta. La línea punteada es el mismo tiro en el vacío.</p>
              <div className="chips">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="chip"
                    onClick={() => setFields({
                      ...fields,
                      v0: String(preset.v0),
                      angle: String(preset.angle),
                      mass: String(preset.mass),
                      diameter: String(preset.diameter),
                      cd: String(preset.cd),
                      drag: preset.cd > 0,
                    })}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
              <div className="grid-2">
                <Field label="Velocidad" unit="m/s" value={fields.v0} onChange={(v) => set("v0", v)} />
                <Field label="Ángulo" unit="°" value={fields.angle} onChange={(v) => set("angle", v)} />
                <Field label="Altura inicial" unit="m" value={fields.y0} onChange={(v) => set("y0", v)} />
                <Field label="Masa" unit="kg" value={fields.mass} onChange={(v) => set("mass", v)} />
                <Field label="Diámetro" unit="m" value={fields.diameter} onChange={(v) => set("diameter", v)} />
                <Field label="Cd" unit="" value={fields.cd} onChange={(v) => set("cd", v)} />
                <Field label="Altitud" unit="m" value={fields.altitude} onChange={(v) => set("altitude", v)} />
                <Field label="Temperatura" unit="°C" value={fields.temp} onChange={(v) => set("temp", v)} />
                <Field label="Viento de frente" unit="m/s" value={fields.headwind} onChange={(v) => set("headwind", v)} />
                <Field label="Viento lateral" unit="m/s" value={fields.crosswind} onChange={(v) => set("crosswind", v)} />
                <Field label="Gravedad" unit="m/s²" value={fields.g} onChange={(v) => set("g", v)} />
              </div>
              <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={fields.drag} onChange={(e) => set("drag", e.target.checked)} />
                Incluir arrastre del aire
              </label>
              {shot ? <p className="muted">Densidad del aire ≈ {formatDecimal(shot.rho)} kg/m³</p> : null}
              {error ? <p className="err">{error}</p> : null}
              <div className="row-actions">
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    if (!shot) return;
                    const angle = bestAngle(shot);
                    set("angle", String(angle));
                  }}
                >
                  Ángulo de máximo alcance
                </button>
              </div>
            </section>

            <section className="card">
              <div className="legend">
                <span><i className="swatch" style={{ background: "#ff3b3b" }} />Con aire</span>
                <span><i className="swatch" style={{ background: "rgba(255,255,255,0.7)" }} />Vacío</span>
                <span><i className="swatch" style={{ background: "#f59e0b", height: 8, borderRadius: 8 }} />Proyectil</span>
              </div>
              <div className="canvas-frame">
                <canvas ref={canvasRef} style={{ height: 360 }} />
              </div>
              <div className="row-actions">
                <button type="button" className="pill" onClick={() => setPlaying((v) => !v)}>
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                  {playing ? "Pausa" : "Animar"}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1000}
                  value={Math.round(progress * 1000)}
                  onChange={(e) => {
                    setPlaying(false);
                    setProgress(Number(e.target.value) / 1000);
                  }}
                  style={{ flex: 1 }}
                />
              </div>
              {result && shot ? (
                <div className="stat-row">
                  <Stat k="Alcance" v={`${formatDecimal(result.range)} m`} />
                  <Stat k="Altura máxima" v={`${formatDecimal(result.apex)} m`} />
                  <Stat k="Tiempo de vuelo" v={`${formatDecimal(result.tof)} s`} />
                  <Stat k="Velocidad de impacto" v={`${formatDecimal(result.vImpact)} m/s`} />
                  <Stat k="Energía inicial" v={`${formatDecimal(result.energyMuzzle)} J`} />
                  <Stat k="Energía final" v={`${formatDecimal(result.energyImpact)} J`} />
                  <Stat k="Caída bajo la línea" v={`${formatDecimal(result.drop)} m`} />
                  <Stat k="Deriva" v={`${formatDecimal(result.drift)} m`} />
                  <Stat k="Momento final" v={`${formatDecimal(result.momentum)} kg·m/s`} />
                </div>
              ) : null}
            </section>
          </div>

          <section className="card">
            <h2>Tabla a lo largo del alcance</h2>
            <p className="muted">Caída respecto a la línea del cañón. mil = caída/distancia × 1000. MOA ≈ mil × 3.438.</p>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>x (m)</th><th>y (m)</th><th>caída (m)</th><th>deriva (m)</th><th>v (m/s)</th><th>E (J)</th><th>t (s)</th><th>mil</th><th>MOA</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.x}>
                      <td>{formatDecimal(row.x)}</td>
                      <td>{formatDecimal(row.y)}</td>
                      <td>{formatDecimal(row.drop)}</td>
                      <td>{formatDecimal(row.drift)}</td>
                      <td>{formatDecimal(row.v)}</td>
                      <td>{formatDecimal(row.energy)}</td>
                      <td>{formatDecimal(row.t)}</td>
                      <td>{formatDecimal(row.mils)}</td>
                      <td>{formatDecimal(row.moa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </Scene>
  );
}

function niceStep(range: number): number {
  if (range > 2000) return 200;
  if (range > 800) return 100;
  if (range > 200) return 50;
  if (range > 50) return 10;
  if (range > 20) return 5;
  return 1;
}

function Field({ label, unit, value, onChange }: { label: string; unit: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label>{label}{unit ? ` (${unit})` : ""}</label>
      <input value={value} inputMode="decimal" onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return <div className="stat"><span>{k}</span><b>{v}</b></div>;
}
