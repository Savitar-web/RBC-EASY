import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Scene, TopBar } from "@/components/chrome";
import { formatDecimal } from "@/lib/math/format";
import { CATEGORIES, convert } from "@/lib/math/units";

export const Route = createFileRoute("/conversion")({
  component: Conversion,
});

function Conversion() {
  const [catId, setCatId] = useState(CATEGORIES[0]!.id);
  const cat = CATEGORIES.find((c) => c.id === catId) ?? CATEGORIES[0]!;
  const [from, setFrom] = useState(cat.units[0]!.id);
  const [to, setTo] = useState(cat.units[Math.min(4, cat.units.length - 1)]!.id);
  const [value, setValue] = useState("1");
  const [v, setV] = useState("12");
  const [i, setI] = useState("0.5");
  const [r, setR] = useState("24");

  const pick = (id: string) => {
    const next = CATEGORIES.find((c) => c.id === id)!;
    setCatId(id);
    setFrom(next.units[0]!.id);
    setTo(next.units[Math.min(1, next.units.length - 1)]!.id);
  };

  const result = useMemo(() => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "Escribe un número.";
    try {
      return formatDecimal(convert(cat, n, from, to));
    } catch (err) {
      return err instanceof Error ? err.message : "Error";
    }
  }, [cat, value, from, to]);

  const volts = Number(i) * Number(r);
  const watts = Number(v) * Number(i);

  return (
    <Scene>
      <TopBar title="Conversión" />
      <div className="page-body">
        <div className="panel">
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" className={c.id === cat.id ? "chip chip-on" : "chip"} onClick={() => pick(c.id)}>
                {c.name}
              </button>
            ))}
          </div>
          <section className="card">
            <h2>{cat.name}</h2>
            {cat.note ? <p className="muted">{cat.note}</p> : null}
            <div className="grid-2">
              <div className="field">
                <label>Valor</label>
                <input value={value} inputMode="decimal" onChange={(e) => setValue(e.target.value)} />
              </div>
              <div className="field">
                <label>De</label>
                <select value={from} onChange={(e) => setFrom(e.target.value)}>
                  {cat.units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                </select>
              </div>
            </div>
            <div className="row-actions">
              <button
                type="button"
                className="pill"
                onClick={() => {
                  const a = from;
                  setFrom(to);
                  setTo(a);
                }}
              >
                <ArrowLeftRight size={16} /> Intercambiar
              </button>
            </div>
            <div className="field">
              <label>A</label>
              <select value={to} onChange={(e) => setTo(e.target.value)}>
                {cat.units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
              </select>
            </div>
            <div className="big">{result}</div>
            <p className="muted">{cat.units.find((u) => u.id === to)?.label}</p>
          </section>

          <section className="card">
            <h2>Ley de Ohm, al lado</h2>
            <p className="muted">No mezcla unidades de categorías distintas. Aquí V = I·R y P = V·I, en voltios, amperios y ohmios.</p>
            <div className="grid-3">
              <div className="field"><label>Voltaje V</label><input value={v} onChange={(e) => setV(e.target.value)} /></div>
              <div className="field"><label>Corriente I</label><input value={i} onChange={(e) => setI(e.target.value)} /></div>
              <div className="field"><label>Resistencia R</label><input value={r} onChange={(e) => setR(e.target.value)} /></div>
            </div>
            <div className="stat-row">
              <div className="stat"><span>V = I·R</span><b>{Number.isFinite(volts) ? formatDecimal(volts) + " V" : "—"}</b></div>
              <div className="stat"><span>P = V·I</span><b>{Number.isFinite(watts) ? formatDecimal(watts) + " W" : "—"}</b></div>
              <div className="stat"><span>R = V/I</span><b>{Number(i) ? formatDecimal(Number(v) / Number(i)) + " Ω" : "—"}</b></div>
            </div>
          </section>
        </div>
      </div>
    </Scene>
  );
}
