import { createFileRoute } from "@tanstack/react-router";
import Decimal from "decimal.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { Scene, TopBar } from "@/components/chrome";
import { evaluate, evaluateNumber, type AngleMode } from "@/lib/math/engine";
import { formatDecimal } from "@/lib/math/format";
import {
  add, det, eigenvalues, formatMatrix, identity, inverse, mul, parseGrid, rank, rref, scale, trace, transpose,
  type Matrix,
} from "@/lib/math/matrix";

export const Route = createFileRoute("/modo-ascendido")({
  component: ModoAscendido,
});

const TABS = ["Gráfica", "Matrices", "Cálculo", "Álgebra", "Geometría", "Vectores", "Datos", "Laboratorio"] as const;

function ModoAscendido() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Gráfica");
  const [angle, setAngle] = useState<AngleMode>("DEG");
  useEffect(() => {
    const saved = localStorage.getItem("rbc-angle");
    if (saved === "RAD" || saved === "DEG") setAngle(saved);
  }, []);
  const toggle = () => {
    const next = angle === "DEG" ? "RAD" : "DEG";
    setAngle(next);
    localStorage.setItem("rbc-angle", next);
  };

  return (
    <Scene>
      <TopBar
        title="Modo ascendido"
        tools={<button type="button" className="pill pill-on" onClick={toggle}>{angle}</button>}
      />
      <div className="page-body">
        <div className="panel">
          <div className="chips" role="tablist">
            {TABS.map((name) => (
              <button key={name} type="button" className={tab === name ? "chip chip-on" : "chip"} onClick={() => setTab(name)}>
                {name}
              </button>
            ))}
          </div>
          {tab === "Gráfica" ? <GraphPanel angle={angle} /> : null}
          {tab === "Matrices" ? <MatrixPanel /> : null}
          {tab === "Cálculo" ? <CalculusPanel angle={angle} /> : null}
          {tab === "Álgebra" ? <AlgebraPanel /> : null}
          {tab === "Geometría" ? <GeoPanel /> : null}
          {tab === "Vectores" ? <VectorPanel /> : null}
          {tab === "Datos" ? <StatsPanel /> : null}
          {tab === "Laboratorio" ? <LabPanel /> : null}
        </div>
      </div>
    </Scene>
  );
}

const COLORS = ["#ff3b3b", "#f59e0b", "#7dd3fc", "#c4b5fd"];

function GraphPanel({ angle }: { angle: AngleMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [curves, setCurves] = useState([
    { expr: "sin(x)", color: COLORS[0]! },
    { expr: "x/4", color: COLORS[1]! },
  ]);
  const [draft, setDraft] = useState("cos(x)");
  const [view, setView] = useState({ x0: -10, x1: 10, y0: -6, y1: 6 });
  const [deriv, setDeriv] = useState(false);
  const [trace, setTrace] = useState("Mueve el cursor sobre la gráfica.");
  const [roots, setRoots] = useState("");
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef<{ x: number; y: number; view: typeof view } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const paint = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = wrap.clientWidth;
      const h = 320;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const v = viewRef.current;
      const X = (x: number) => ((x - v.x0) / (v.x1 - v.x0)) * w;
      const Y = (y: number) => h - ((y - v.y0) / (v.y1 - v.y0)) * h;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const xStep = niceStep((v.x1 - v.x0) / 8);
      const yStep = niceStep((v.y1 - v.y0) / 6);
      for (let x = Math.ceil(v.x0 / xStep) * xStep; x <= v.x1; x += xStep) {
        ctx.moveTo(X(x), 0);
        ctx.lineTo(X(x), h);
      }
      for (let y = Math.ceil(v.y0 / yStep) * yStep; y <= v.y1; y += yStep) {
        ctx.moveTo(0, Y(y));
        ctx.lineTo(w, Y(y));
      }
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.beginPath();
      ctx.moveTo(0, Y(0));
      ctx.lineTo(w, Y(0));
      ctx.moveTo(X(0), 0);
      ctx.lineTo(X(0), h);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "11px IBM Plex Mono, monospace";
      ctx.fillText(v.x0.toFixed(2), 6, Math.min(h - 6, Math.max(14, Y(0) - 6)));
      ctx.fillText(v.x1.toFixed(2), w - 52, Math.min(h - 6, Math.max(14, Y(0) - 6)));

      const sample = (expr: string, x: number) =>
        evaluateNumber(expr, { angle, scope: { x: new Decimal(x) } });

      curves.forEach((curve, idx) => {
        strokeCurve(ctx, w, h, v, curve.color, (x) => sample(curve.expr, x));
        if (deriv && idx === 0) {
          strokeCurve(ctx, w, h, v, "#7dd3fc", (x) => {
            const hh = (v.x1 - v.x0) / 400;
            return (sample(curve.expr, x + hh) - sample(curve.expr, x - hh)) / (2 * hh);
          });
        }
      });
    };
    paint();
    const obs = new ResizeObserver(paint);
    obs.observe(wrap);
    return () => obs.disconnect();
  }, [curves, view, angle, deriv]);

  const onMove = (clientX: number, clientY: number, rect: DOMRect) => {
    const v = viewRef.current;
    const x = v.x0 + ((clientX - rect.left) / rect.width) * (v.x1 - v.x0);
    const yPix = v.y1 - ((clientY - rect.top) / rect.height) * (v.y1 - v.y0);
    const bits = curves.map((c) => {
      try {
        const y = evaluateNumber(c.expr, { angle, scope: { x: new Decimal(x) } });
        return `${c.expr}(${formatDecimal(x)}) = ${formatDecimal(y)}`;
      } catch {
        return `${c.expr}: indefinida`;
      }
    });
    setTrace(`x = ${formatDecimal(x)} · cursor y = ${formatDecimal(yPix)} · ${bits.join(" · ")}`);
  };

  return (
    <section className="card">
      <h2>Plano cartesiano</h2>
      <p className="muted">Escribe f(x). Arrastra para mover y usa la rueda para acercar. La multiplicación implícita también vale aquí: 2sin(x).</p>
      <div className="grid-2">
        <div className="field">
          <label>Nueva curva</label>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} />
        </div>
        <div className="row-actions" style={{ alignItems: "end" }}>
          <button
            type="button"
            className="key key-eq"
            onClick={() => {
              if (!draft.trim() || curves.length >= 4) return;
              setCurves([...curves, { expr: draft.trim(), color: COLORS[curves.length % COLORS.length]! }]);
            }}
          >
            Añadir
          </button>
          <button type="button" className={deriv ? "chip chip-on" : "chip"} onClick={() => setDeriv((v) => !v)}>
            Derivada de la primera
          </button>
          <button type="button" className="chip" onClick={() => setView({ x0: -10, x1: 10, y0: -6, y1: 6 })}>Reset vista</button>
        </div>
      </div>
      <div className="chips">
        {curves.map((c, i) => (
          <button key={c.expr + i} type="button" className="chip" onClick={() => setCurves(curves.filter((_, j) => j !== i))}>
            <span className="swatch" style={{ background: c.color }} />
            {c.expr} · quitar
          </button>
        ))}
      </div>
      <div
        className="canvas-frame"
        ref={wrapRef}
        onWheel={(e) => {
          e.preventDefault();
          const factor = e.deltaY > 0 ? 1.12 : 0.88;
          const rect = e.currentTarget.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width;
          const py = (e.clientY - rect.top) / rect.height;
          setView((v) => {
            const x = v.x0 + px * (v.x1 - v.x0);
            const y = v.y1 - py * (v.y1 - v.y0);
            const nx = (v.x1 - v.x0) * factor;
            const ny = (v.y1 - v.y0) * factor;
            return { x0: x - px * nx, x1: x + (1 - px) * nx, y0: y - (1 - py) * ny, y1: y + py * ny };
          });
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, view };
          }}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            if (drag.current) {
              const dx = e.clientX - drag.current.x;
              const dy = e.clientY - drag.current.y;
              const v = drag.current.view;
              const sx = ((v.x1 - v.x0) * dx) / rect.width;
              const sy = ((v.y1 - v.y0) * dy) / rect.height;
              setView({ x0: v.x0 - sx, x1: v.x1 - sx, y0: v.y0 + sy, y1: v.y1 + sy });
            } else {
              onMove(e.clientX, e.clientY, rect);
            }
          }}
          onPointerUp={() => { drag.current = null; }}
        />
      </div>
      <p className="muted">{trace}</p>
      <div className="row-actions">
        <button
          type="button"
          className="chip"
          onClick={() => {
            const expr = curves[0]?.expr;
            if (!expr) return;
            const found: string[] = [];
            const v = viewRef.current;
            const steps = 80;
            let prevX = v.x0;
            let prevY: number | null = null;
            try { prevY = evaluateNumber(expr, { angle, scope: { x: new Decimal(prevX) } }); } catch { prevY = null; }
            for (let i = 1; i <= steps; i++) {
              const x = v.x0 + ((v.x1 - v.x0) * i) / steps;
              let y: number | null = null;
              try { y = evaluateNumber(expr, { angle, scope: { x: new Decimal(x) } }); } catch { y = null; }
              if (prevY !== null && y !== null && prevY * y <= 0) {
                let a = prevX;
                let b = x;
                for (let k = 0; k < 40; k++) {
                  const m = (a + b) / 2;
                  const fa = evaluateNumber(expr, { angle, scope: { x: new Decimal(a) } });
                  const fm = evaluateNumber(expr, { angle, scope: { x: new Decimal(m) } });
                  if (fa * fm <= 0) b = m;
                  else a = m;
                }
                found.push(formatDecimal((a + b) / 2));
              }
              prevX = x;
              prevY = y;
            }
            setRoots(found.length ? `Raíces aproximadas de ${expr}: ${found.join(", ")}` : "No hubo cambio de signo en la ventana.");
          }}
        >
          Buscar raíces
        </button>
      </div>
      {roots ? <p className="muted">{roots}</p> : null}
    </section>
  );
}

function niceStep(raw: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.abs(raw) || 1)));
  const n = raw / pow;
  const m = n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10;
  return m * pow;
}

function strokeCurve(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  v: { x0: number; x1: number; y0: number; y1: number },
  color: string,
  fn: (x: number) => number,
) {
  const X = (x: number) => ((x - v.x0) / (v.x1 - v.x0)) * w;
  const Y = (y: number) => h - ((y - v.y0) / (v.y1 - v.y0)) * h;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  let pen = false;
  const n = Math.max(240, Math.floor(w));
  for (let i = 0; i <= n; i++) {
    const x = v.x0 + ((v.x1 - v.x0) * i) / n;
    let y: number;
    try { y = fn(x); } catch { pen = false; continue; }
    if (!Number.isFinite(y)) { pen = false; continue; }
    const py = Y(y);
    if (py < -80 || py > h + 80) { pen = false; continue; }
    if (!pen) ctx.moveTo(X(x), py);
    else ctx.lineTo(X(x), py);
    pen = true;
  }
  ctx.stroke();
}

function MatrixPanel() {
  const [n, setN] = useState(2);
  const [aText, setA] = useState("1 2\n3 4");
  const [bText, setB] = useState("5 6\n7 8");
  const [out, setOut] = useState("Elige una operación.");
  const run = (fn: (a: Matrix, b: Matrix) => string) => {
    try {
      setOut(fn(parseGrid(aText, n, n), parseGrid(bText, n, n)));
    } catch (err) {
      setOut(err instanceof Error ? err.message : "Error");
    }
  };
  return (
    <section className="card">
      <h2>Matrices hasta 4×4</h2>
      <p className="muted">Separadas por espacios o líneas. Determinante, inversa, forma escalonada reducida, producto, traza, rango y eigenvalores reales.</p>
      <div className="chips">
        {[1, 2, 3, 4].map((size) => (
          <button key={size} type="button" className={n === size ? "chip chip-on" : "chip"} onClick={() => {
            setN(size);
            setA(formatMatrix(identity(size)));
            setB(formatMatrix(identity(size)));
          }}>{size}×{size}</button>
        ))}
      </div>
      <div className="grid-2">
        <div className="field"><label>Matriz A</label><textarea className="area" rows={n + 1} value={aText} onChange={(e) => setA(e.target.value)} /></div>
        <div className="field"><label>Matriz B</label><textarea className="area" rows={n + 1} value={bText} onChange={(e) => setB(e.target.value)} /></div>
      </div>
      <div className="row-actions">
        <button type="button" className="chip" onClick={() => run((a) => `det A = ${fmt(det(a))}`)}>det A</button>
        <button type="button" className="chip" onClick={() => run((a) => `traza A = ${fmt(trace(a))}`)}>traza</button>
        <button type="button" className="chip" onClick={() => run((a) => `rango A = ${rank(a)}`)}>rango</button>
        <button type="button" className="chip" onClick={() => run((a) => formatMatrix(transpose(a)))}>Aᵀ</button>
        <button type="button" className="chip" onClick={() => run((a) => formatMatrix(rref(a)))}>RREF</button>
        <button type="button" className="chip" onClick={() => run((a) => formatMatrix(inverse(a)))}>A⁻¹</button>
        <button type="button" className="chip" onClick={() => run((a, b) => formatMatrix(add(a, b)))}>A+B</button>
        <button type="button" className="chip" onClick={() => run((a, b) => formatMatrix(add(a, b, -1)))}>A−B</button>
        <button type="button" className="chip" onClick={() => run((a, b) => formatMatrix(mul(a, b)))}>A·B</button>
        <button type="button" className="chip" onClick={() => run((a) => formatMatrix(scale(a, 2)))}>2A</button>
        <button type="button" className="chip" onClick={() => run((a) => {
          const ev = eigenvalues(a);
          return `λ = ${ev.values.map(fmt).join(", ")}${ev.note ? "\n" + ev.note : ""}`;
        })}>eigenvalores</button>
      </div>
      <pre className="form-result" style={{ whiteSpace: "pre-wrap" }}>{out}</pre>
    </section>
  );
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const r = Math.round(n * 1e8) / 1e8;
  return String(r);
}

function CalculusPanel({ angle }: { angle: AngleMode }) {
  const [expr, setExpr] = useState("x^3 - 2x");
  const [x0, setX0] = useState("1");
  const [a, setA] = useState("0");
  const [b, setB] = useState("2");
  const [n, setN] = useState("200");
  const [text, setText] = useState("Deriva en un punto o integra por trapecios.");
  const f = (x: number) => evaluateNumber(expr, { angle, scope: { x: new Decimal(x) } });
  return (
    <section className="card">
      <h2>Cálculo numérico</h2>
      <p className="muted">La derivada es una diferencia central. La integral usa trapecios. Si la expresión es un polinomio en x, también se muestra la derivada simbólica.</p>
      <div className="field"><label>f(x)</label><input value={expr} onChange={(e) => setExpr(e.target.value)} /></div>
      <div className="grid-3">
        <div className="field"><label>x₀</label><input value={x0} onChange={(e) => setX0(e.target.value)} /></div>
        <div className="field"><label>a</label><input value={a} onChange={(e) => setA(e.target.value)} /></div>
        <div className="field"><label>b</label><input value={b} onChange={(e) => setB(e.target.value)} /></div>
      </div>
      <div className="field"><label>Trapecios</label><input value={n} onChange={(e) => setN(e.target.value)} /></div>
      <div className="row-actions">
        <button type="button" className="key key-eq" onClick={() => {
          try {
            const x = Number(x0);
            const h = 1e-5;
            const d = (f(x + h) - f(x - h)) / (2 * h);
            const symbolic = polyDerivative(expr);
            setText([
              `f(${x}) = ${formatDecimal(f(x))}`,
              `f'(${x}) ≈ ${formatDecimal(d)}`,
              symbolic ? `Derivada simbólica: ${symbolic}` : "Derivada simbólica solo para polinomios con +, −, * y ^.",
            ].join("\n"));
          } catch (err) {
            setText(err instanceof Error ? err.message : "Error");
          }
        }}>Derivar</button>
        <button type="button" className="chip" onClick={() => {
          try {
            const aa = Number(a);
            const bb = Number(b);
            const nn = Math.max(2, Math.min(5000, Math.floor(Number(n))));
            if (!(bb > aa)) throw new Error("Se requiere b > a");
            const h = (bb - aa) / nn;
            let sum = 0.5 * (f(aa) + f(bb));
            for (let i = 1; i < nn; i++) sum += f(aa + i * h);
            setText(`∫ de ${aa} a ${bb} ≈ ${formatDecimal(sum * h)}\n${nn} trapecios, h = ${formatDecimal(h)}`);
          } catch (err) {
            setText(err instanceof Error ? err.message : "Error");
          }
        }}>Integrar</button>
      </div>
      <pre className="form-result" style={{ whiteSpace: "pre-wrap" }}>{text}</pre>
    </section>
  );
}

function polyDerivative(expr: string): string | null {
  const compact = expr.replace(/\s+/g, "");
  if (!/^[0-9x+\-*.^()]+$/.test(compact)) return null;
  if (compact.includes("(")) return null;
  const terms = compact.replace(/-/g, "+-").split("+").filter(Boolean);
  const parts: string[] = [];
  for (const term of terms) {
    const m = term.match(/^(-?\d*\.?\d*)?\*?x(?:\^(\d+))?$/) || term.match(/^(-?\d*\.?\d*)$/);
    if (!m) return null;
    if (!term.includes("x")) continue;
    const coefRaw = m[1];
    const coef = coefRaw === undefined || coefRaw === "" || coefRaw === "-" ? (coefRaw === "-" ? -1 : 1) : Number(coefRaw);
    const pow = m[2] ? Number(m[2]) : 1;
    const nc = coef * pow;
    if (nc === 0) continue;
    const np = pow - 1;
    const body = np === 0 ? `${nc}` : np === 1 ? `${nc}*x` : `${nc}*x^${np}`;
    parts.push(body);
  }
  return parts.join(" + ").replace(/\+ -/g, "- ") || "0";
}

function AlgebraPanel() {
  const [a, setA] = useState("1");
  const [b, setB] = useState("-3");
  const [c, setC] = useState("2");
  const [sys, setSys] = useState("2 1 -1 8\n-3 -1 2 -11\n-2 1 2 -3");
  const [text, setText] = useState("Completa los coeficientes.");
  return (
    <section className="card">
      <h2>Álgebra</h2>
      <h3>ax² + bx + c = 0</h3>
      <div className="grid-3">
        <div className="field"><label>a</label><input value={a} onChange={(e) => setA(e.target.value)} /></div>
        <div className="field"><label>b</label><input value={b} onChange={(e) => setB(e.target.value)} /></div>
        <div className="field"><label>c</label><input value={c} onChange={(e) => setC(e.target.value)} /></div>
      </div>
      <button type="button" className="chip" onClick={() => {
        const aa = Number(a); const bb = Number(b); const cc = Number(c);
        if (!aa) { setText("a no puede ser 0"); return; }
        const d = bb * bb - 4 * aa * cc;
        if (d < 0) setText(`Δ = ${d}. Raíces complejas:\n${-bb / (2 * aa)} ± ${Math.sqrt(-d) / (2 * Math.abs(aa))} i`);
        else {
          const r1 = (-bb + Math.sqrt(d)) / (2 * aa);
          const r2 = (-bb - Math.sqrt(d)) / (2 * aa);
          setText(`Δ = ${fmt(d)}\nx₁ = ${fmt(r1)}\nx₂ = ${fmt(r2)}`);
        }
      }}>Resolver cuadrática</button>
      <h3 style={{ marginTop: 16 }}>Sistema 3×3</h3>
      <p className="muted">Tres líneas con a b c | término independiente.</p>
      <textarea className="area" rows={4} value={sys} onChange={(e) => setSys(e.target.value)} />
      <button type="button" className="chip" onClick={() => {
        try {
          const rows = sys.trim().split(/\n+/).map((line) => line.split(/[\s,|]+/).filter(Boolean).map(Number));
          if (rows.length !== 3 || rows.some((r) => r.length !== 4 || r.some((n) => !Number.isFinite(n)))) {
            throw new Error("Se esperan 3 filas de 4 números");
          }
          const A = rows.map((r) => r.slice(0, 3));
          const rhs = rows.map((r) => [r[3]!]);
          const sol = mul(inverse(A), rhs);
          setText(`x = ${fmt(sol[0]![0]!)}\ny = ${fmt(sol[1]![0]!)}\nz = ${fmt(sol[2]![0]!)}`);
        } catch (err) {
          setText(err instanceof Error ? err.message : "Sistema singular o mal escrito");
        }
      }}>Resolver sistema</button>
      <pre className="form-result" style={{ whiteSpace: "pre-wrap" }}>{text}</pre>
    </section>
  );
}

function numInput(label: string, value: string, set: (v: string) => void) {
  return (
    <div className="field">
      <label>{label}</label>
      <input value={value} onChange={(e) => set(e.target.value)} inputMode="decimal" />
    </div>
  );
}

function GeoPanel() {
  const [p, setP] = useState(["0", "0", "3", "4", "3", "0"]);
  const set = (i: number, v: string) => setP(p.map((n, idx) => (idx === i ? v : n)));
  const [r, setR] = useState("1");
  const nums = p.map(Number);
  const ready = nums.every((n) => Number.isFinite(n));
  const info = useMemo(() => {
    if (!ready) return "Coordenadas inválidas.";
    const [x1, y1, x2, y2, x3, y3] = nums as [number, number, number, number, number, number];
    const d12 = Math.hypot(x2 - x1, y2 - y1);
    const d23 = Math.hypot(x3 - x2, y3 - y2);
    const d31 = Math.hypot(x1 - x3, y1 - y3);
    const mid = [(x1 + x2) / 2, (y1 + y2) / 2];
    const slope = x2 === x1 ? "vertical" : fmt((y2 - y1) / (x2 - x1));
    const area = Math.abs((x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) / 2);
    const angle = (a: number, b: number, c: number) => Math.acos(Math.min(1, Math.max(-1, (b * b + c * c - a * a) / (2 * b * c)))) * 180 / Math.PI;
    const radius = Number(r);
    return [
      `Distancia P1–P2 = ${fmt(d12)}`,
      `Punto medio = (${fmt(mid[0]!)}, ${fmt(mid[1]!)})`,
      `Pendiente P1P2 = ${slope}`,
      `Lados: ${fmt(d12)}, ${fmt(d23)}, ${fmt(d31)}`,
      `Perímetro = ${fmt(d12 + d23 + d31)}`,
      `Área (cordón) = ${fmt(area)}`,
      Number.isFinite(angle(d23, d12, d31)) ? `Ángulos ≈ ${fmt(angle(d23, d31, d12))}°, ${fmt(angle(d31, d12, d23))}°, ${fmt(angle(d12, d23, d31))}°` : "",
      radius > 0 ? `Círculo de radio ${radius}: área ${fmt(Math.PI * radius * radius)}, circunferencia ${fmt(2 * Math.PI * radius)}` : "",
    ].filter(Boolean).join("\n");
  }, [ready, nums, r]);
  return (
    <section className="card">
      <h2>Geometría</h2>
      <p className="muted">Dos puntos describen el segmento. El tercero cierra un triángulo.</p>
      <div className="grid-3">
        {["x₁", "y₁", "x₂", "y₂", "x₃", "y₃"].map((label, i) => (
          <div key={label}>{numInput(label, p[i]!, (v) => set(i, v))}</div>
        ))}
      </div>
      {numInput("Radio de círculo auxiliar", r, setR)}
      <pre className="form-result" style={{ whiteSpace: "pre-wrap" }}>{info}</pre>
    </section>
  );
}

function VectorPanel() {
  const [p, setP] = useState(["1", "2", "3", "4", "-1", "2"]);
  const set = (i: number, v: string) => setP(p.map((n, idx) => (idx === i ? v : n)));
  const [a1, a2, a3, b1, b2, b3] = p.map(Number);
  let text = "Vector inválido.";
  if ([a1, a2, a3, b1, b2, b3].every((n) => Number.isFinite(n))) {
    const dot = a1! * b1! + a2! * b2! + a3! * b3!;
    const cross = [a2! * b3! - a3! * b2!, a3! * b1! - a1! * b3!, a1! * b2! - a2! * b1!];
    const ma = Math.hypot(a1!, a2!, a3!);
    const mb = Math.hypot(b1!, b2!, b3!);
    const ang = ma && mb ? Math.acos(Math.min(1, Math.max(-1, dot / (ma * mb)))) * 180 / Math.PI : 0;
    const proj = mb ? dot / (mb * mb) : 0;
    text = [
      `|a| = ${fmt(ma)}    |b| = ${fmt(mb)}`,
      `a·b = ${fmt(dot)}`,
      `a×b = (${fmt(cross[0]!)}, ${fmt(cross[1]!)}, ${fmt(cross[2]!)})`,
      `|a×b| = ${fmt(Math.hypot(...cross))}`,
      `ángulo = ${fmt(ang)}°`,
      `proyección de a sobre b = ${fmt(proj)} b = (${fmt(proj * b1!)}, ${fmt(proj * b2!)}, ${fmt(proj * b3!)})`,
    ].join("\n");
  }
  return (
    <section className="card">
      <h2>Vectores en R³</h2>
      <div className="grid-3">
        {["ax", "ay", "az", "bx", "by", "bz"].map((label, i) => (
          <div key={label}>{numInput(label, p[i]!, (v) => set(i, v))}</div>
        ))}
      </div>
      <pre className="form-result" style={{ whiteSpace: "pre-wrap" }}>{text}</pre>
    </section>
  );
}

function StatsPanel() {
  const [raw, setRaw] = useState("4, 8, 6, 5, 3, 9, 8");
  const nums = raw.split(/[\s,;]+/).map(Number).filter((n) => Number.isFinite(n));
  const info = useMemo(() => {
    if (nums.length === 0) return null;
    const sorted = [...nums].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const mid = n % 2 ? sorted[(n - 1) / 2]! : (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2;
    const vary = sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / (n > 1 ? n - 1 : 1);
    return { n, sum, mean, mid, min: sorted[0]!, max: sorted[n - 1]!, stdev: Math.sqrt(vary) };
  }, [nums]);
  return (
    <section className="card">
      <h2>Estadística</h2>
      <p className="muted">Pega una lista. La desviación es muestral (n − 1).</p>
      <textarea className="area" rows={4} value={raw} onChange={(e) => setRaw(e.target.value)} />
      {info ? (
        <div className="stat-row">
          <Stat k="n" v={String(info.n)} />
          <Stat k="Suma" v={fmt(info.sum)} />
          <Stat k="Media" v={fmt(info.mean)} />
          <Stat k="Mediana" v={fmt(info.mid)} />
          <Stat k="Mín" v={fmt(info.min)} />
          <Stat k="Máx" v={fmt(info.max)} />
          <Stat k="Desv. estándar" v={fmt(info.stdev)} />
        </div>
      ) : <p className="muted">No hay números.</p>}
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return <div className="stat"><span>{k}</span><b>{v}</b></div>;
}

function LabPanel() {
  return (
    <div className="lab-grid">
      <Mini title="MCD y mcm" hint="Enteros." render={(a, b) => {
        const x = Math.abs(Math.trunc(a));
        const y = Math.abs(Math.trunc(b));
        const g = gcd(x, y);
        return `mcd = ${g}\nmcm = ${g ? (x / g) * y : 0}`;
      }} />
      <Mini title="nCr y nPr" hint="n y k enteros." render={(n, k) => {
        if (k < 0 || n < k || !Number.isInteger(n) || !Number.isInteger(k)) return "0 ≤ k ≤ n, enteros.";
        let c = 1;
        for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
        let p = 1;
        for (let i = 0; i < k; i++) p *= n - i;
        return `C(${n}, ${k}) = ${c}\nP(${n}, ${k}) = ${p}`;
      }} />
      <BaseCard />
      <Mini title="Polar ↔ rectangular" hint="r y θ en grados, o usa x, y abajo no: aquí a = r, b = θ°." render={(r, th) => {
        const rad = (th * Math.PI) / 180;
        return `x = ${fmt(r * Math.cos(rad))}\ny = ${fmt(r * Math.sin(rad))}`;
      }} />
      <InterestCard />
      <CosineCard />
    </div>
  );
}

function Mini({ title, hint, render }: { title: string; hint: string; render: (a: number, b: number) => string }) {
  const [a, setA] = useState("12");
  const [b, setB] = useState("18");
  const [text, setText] = useState("");
  return (
    <section className="card">
      <h3>{title}</h3>
      <p className="muted">{hint}</p>
      <div className="grid-2">
        {numInput("a", a, setA)}
        {numInput("b", b, setB)}
      </div>
      <button type="button" className="chip" onClick={() => setText(render(Number(a), Number(b)))}>Calcular</button>
      {text ? <pre className="form-result" style={{ whiteSpace: "pre-wrap" }}>{text}</pre> : null}
    </section>
  );
}

function CosineCard() {
  const [a, setA] = useState("5");
  const [b, setB] = useState("7");
  const [ang, setAng] = useState("60");
  const rad = (Number(ang) * Math.PI) / 180;
  const c = Math.sqrt(Math.max(0, Number(a) ** 2 + Number(b) ** 2 - 2 * Number(a) * Number(b) * Math.cos(rad)));
  return (
    <section className="card">
      <h3>Ley de cosenos</h3>
      <p className="muted">c² = a² + b² − 2ab cos C. C es el ángulo entre a y b, en grados.</p>
      <div className="grid-3">
        {numInput("lado a", a, setA)}
        {numInput("lado b", b, setB)}
        {numInput("ángulo C °", ang, setAng)}
      </div>
      <div className="big">{Number.isFinite(c) ? formatDecimal(c) : "—"}</div>
    </section>
  );
}

function gcd(a: number, b: number): number {
  while (b) { const t = b; b = a % b; a = t; }
  return a;
}

function BaseCard() {
  const [value, setValue] = useState("255");
  const [from, setFrom] = useState("10");
  const [text, setText] = useState("");
  return (
    <section className="card">
      <h3>Bases 2, 8, 10 y 16</h3>
      <div className="field"><label>Número</label><input value={value} onChange={(e) => setValue(e.target.value.trim())} /></div>
      <div className="chips">
        {["2", "8", "10", "16"].map((b) => (
          <button key={b} type="button" className={from === b ? "chip chip-on" : "chip"} onClick={() => setFrom(b)}>desde base {b}</button>
        ))}
      </div>
      <button type="button" className="chip" onClick={() => {
        const n = parseInt(value, Number(from));
        if (!Number.isFinite(n)) { setText("No es un entero en esa base."); return; }
        setText(`bin ${n.toString(2)}\noct ${n.toString(8)}\ndec ${n.toString(10)}\nhex ${n.toString(16).toUpperCase()}`);
      }}>Convertir</button>
      {text ? <pre className="form-result" style={{ whiteSpace: "pre-wrap" }}>{text}</pre> : null}
    </section>
  );
}

function InterestCard() {
  const [p, setP] = useState("1000");
  const [rate, setRate] = useState("8");
  const [years, setYears] = useState("5");
  const [per, setPer] = useState("12");
  const amount = Number(p) * (1 + Number(rate) / 100 / Number(per)) ** (Number(per) * Number(years));
  return (
    <section className="card">
      <h3>Interés compuesto</h3>
      <div className="grid-2">
        {numInput("Capital", p, setP)}
        {numInput("Tasa % anual", rate, setRate)}
        {numInput("Años", years, setYears)}
        {numInput("Veces al año", per, setPer)}
      </div>
      <div className="big">{Number.isFinite(amount) ? formatDecimal(amount) : "—"}</div>
    </section>
  );
}
