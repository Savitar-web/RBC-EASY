import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKey } from "react";
import { Scene, TopBar } from "@/components/chrome";
import { autoClose, evaluate, type AngleMode } from "@/lib/math/engine";
import { formatDecimal, stripFormatting } from "@/lib/math/format";
import { CATEGORIES, OPERATIONS, type SciOp } from "@/lib/math/science";
import Decimal from "decimal.js";

type Hist = {
  id: string;
  expression: string;
  result: string;
  raw: string;
  steps?: string[];
  detail?: string;
  ts: number;
};

const FNS = [
  { label: "sin", insert: "sin(" },
  { label: "cos", insert: "cos(" },
  { label: "tan", insert: "tan(" },
  { label: "asin", insert: "asin(" },
  { label: "acos", insert: "acos(" },
  { label: "atan", insert: "atan(" },
  { label: "sinh", insert: "sinh(" },
  { label: "cosh", insert: "cosh(" },
  { label: "tanh", insert: "tanh(" },
  { label: "ln", insert: "ln(" },
  { label: "log", insert: "log(" },
  { label: "log₂", insert: "log2(" },
  { label: "√", insert: "√(" },
  { label: "∛", insert: "∛(" },
  { label: "∜", insert: "∜(" },
  { label: "√ⁿ", insert: "root" },
  { label: "xʸ", insert: "^" },
  { label: "|x|", insert: "abs(" },
  { label: "n!", insert: "!" },
  { label: "π", insert: "π" },
  { label: "e", insert: "e" },
  { label: "exp", insert: "exp(" },
];

const PAD: { label: string; insert?: string; act?: string; tone: string }[] = [
  { label: "C", act: "clear", tone: "key-danger" },
  { label: "⌫", act: "back", tone: "key-warn" },
  { label: "(", insert: "(", tone: "key-op" },
  { label: ")", insert: ")", tone: "key-op" },
  { label: "7", insert: "7", tone: "key-num" },
  { label: "8", insert: "8", tone: "key-num" },
  { label: "9", insert: "9", tone: "key-num" },
  { label: "÷", insert: "÷", tone: "key-op" },
  { label: "4", insert: "4", tone: "key-num" },
  { label: "5", insert: "5", tone: "key-num" },
  { label: "6", insert: "6", tone: "key-num" },
  { label: "×", insert: "×", tone: "key-op" },
  { label: "1", insert: "1", tone: "key-num" },
  { label: "2", insert: "2", tone: "key-num" },
  { label: "3", insert: "3", tone: "key-num" },
  { label: "−", insert: "−", tone: "key-op" },
  { label: "0", insert: "0", tone: "key-num" },
  { label: ".", insert: ".", tone: "key-num" },
  { label: "%", insert: "%", tone: "key-op" },
  { label: "+", insert: "+", tone: "key-op" },
];

function loadHist(): Hist[] {
  try {
    const raw = localStorage.getItem("rbc-hist-v6");
    return raw ? (JSON.parse(raw) as Hist[]) : [];
  } catch {
    return [];
  }
}

export function Calculadora() {
  const exprRef = useRef<HTMLInputElement>(null);
  const [expression, setExpression] = useState("");
  const [committed, setCommitted] = useState("0");
  const [rawAns, setRawAns] = useState("0");
  const [guide, setGuide] = useState("Toca la expresión para mover el cursor. √ⁿ pide índice. n% = n/100.");
  const [shake, setShake] = useState(false);
  const [angle, setAngle] = useState<AngleMode>("DEG");
  const [history, setHistory] = useState<Hist[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [memory, setMemory] = useState("0");
  const [scienceOpen, setScienceOpen] = useState(false);
  const [rootOpen, setRootOpen] = useState(false);
  const [rootIndex, setRootIndex] = useState("3");
  const [cat, setCat] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<SciOp | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [formErr, setFormErr] = useState("");
  const [formRes, setFormRes] = useState<{ text: string; detail?: string } | null>(null);
  const [openSteps, setOpenSteps] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadHist());
    const mem = localStorage.getItem("rbc-mem-v6");
    const ang = localStorage.getItem("rbc-angle");
    if (mem) setMemory(mem);
    if (ang === "RAD" || ang === "DEG") setAngle(ang);
  }, []);
  useEffect(() => {
    localStorage.setItem("rbc-hist-v6", JSON.stringify(history.slice(0, 80)));
  }, [history]);
  useEffect(() => {
    localStorage.setItem("rbc-mem-v6", memory);
    localStorage.setItem("rbc-angle", angle);
  }, [memory, angle]);

  const preview = useMemo(() => {
    if (!expression.trim()) return { text: committed, ok: true as const };
    try {
      const value = evaluate(expression, { angle, scope: { ans: new Decimal(rawAns || "0") } });
      return { text: formatDecimal(value), raw: value.toString(), ok: true as const };
    } catch (err) {
      return { text: committed, ok: false as const, message: err instanceof Error ? err.message : "Expresión inválida" };
    }
  }, [expression, angle, committed, rawAns]);

  const insert = (token: string) => {
    if (token === "root") {
      setRootOpen(true);
      return;
    }
    const el = exprRef.current;
    const start = el?.selectionStart ?? expression.length;
    const end = el?.selectionEnd ?? expression.length;
    const closed = autoClose(token);
    const next = expression.slice(0, start) + closed.text + expression.slice(end);
    setExpression(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + closed.cursor;
      el?.setSelectionRange(pos, pos);
    });
  };

  const backspace = () => {
    const el = exprRef.current;
    if (!el) {
      setExpression((p) => p.slice(0, -1));
      return;
    }
    const start = el.selectionStart ?? expression.length;
    const end = el.selectionEnd ?? expression.length;
    if (start !== end) {
      setExpression(expression.slice(0, start) + expression.slice(end));
      requestAnimationFrame(() => el.setSelectionRange(start, start));
    } else if (start > 0) {
      setExpression(expression.slice(0, start - 1) + expression.slice(end));
      requestAnimationFrame(() => el.setSelectionRange(start - 1, start - 1));
    }
  };

  const fail = (message: string) => {
    setGuide(message);
    setShake(true);
    window.setTimeout(() => setShake(false), 360);
  };

  const commit = () => {
    const expr = expression.trim();
    if (!expr) return;
    try {
      const value = evaluate(expr, { angle, scope: { ans: new Decimal(rawAns || "0") } });
      const formatted = formatDecimal(value);
      const raw = value.toString();
      setCommitted(formatted);
      setRawAns(raw);
      setGuide(`${expr}  →  ${formatted}`);
      setHistory((h) => [
        {
          id: `${Date.now()}`,
          expression: expr,
          result: formatted,
          raw,
          ts: Date.now(),
          steps: [`Expresión: ${expr}`, `Modo: ${angle}`, `Resultado exacto: ${raw}`, `Pantalla: ${formatted}`],
          detail: "Multiplicación implícita: 2(3), 2√(4) y 2sin(30) se leen como producto. n% = n/100. n! es factorial.",
        },
        ...h,
      ].slice(0, 80));
    } catch (err) {
      fail(err instanceof Error ? err.message : "Expresión inválida");
    }
  };

  const onPad = (key: (typeof PAD)[number]) => {
    if (key.act === "clear") {
      setExpression("");
      setGuide("Pantalla limpia. La memoria se conserva.");
      exprRef.current?.focus();
      return;
    }
    if (key.act === "back") {
      backspace();
      return;
    }
    if (key.insert) insert(key.insert);
  };

  const pushHist = (entry: Hist) => setHistory((h) => [entry, ...h].slice(0, 80));

  const memoryValue = () => {
    try {
      return evaluate(memory || "0").toString();
    } catch {
      return "0";
    }
  };

  const onMemory = (kind: "MC" | "MR" | "M+" | "M-" | "ANS") => {
    if (kind === "MC") {
      setMemory("0");
      setGuide("Memoria en cero.");
      return;
    }
    if (kind === "MR") {
      insert(memoryValue());
      return;
    }
    if (kind === "ANS") {
      insert(rawAns || "0");
      return;
    }
    try {
      const current = preview.ok && expression.trim() && "raw" in preview && preview.raw ? preview.raw : rawAns;
      const base = new Decimal(memoryValue());
      const next = kind === "M+" ? base.add(current) : base.sub(current);
      setMemory(next.toString());
      setGuide(`Memoria = ${formatDecimal(next)}`);
    } catch (err) {
      fail(err instanceof Error ? err.message : "No se pudo usar la memoria");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return OPERATIONS.filter((op) => {
      if (cat && op.category !== cat) return false;
      if (!q) return true;
      return (op.name + op.formula + op.description + op.category).toLowerCase().includes(q);
    });
  }, [cat, query]);

  const openOp = (op: SciOp) => {
    const defaults: Record<string, string> = {};
    op.fields.forEach((f) => {
      defaults[f.key] = f.defaultValue ?? (f.options?.[0]?.value ?? "");
    });
    setForm(defaults);
    setFormErr("");
    setFormRes(null);
    setActive(op);
  };

  const runOp = () => {
    if (!active) return;
    try {
      const res = active.compute(form);
      const formatted = formatDecimal(res.result);
      const text = res.unit ? `${formatted} ${res.unit}` : formatted;
      setFormRes({ text, detail: res.detail });
      setCommitted(text);
      setRawAns(String(res.result));
      setExpression(String(res.result));
      const inputs = active.fields.map((f) => `${f.label} = ${form[f.key] || "—"}`).join("; ");
      pushHist({
        id: `${Date.now()}`,
        expression: `${active.name}: ${active.formula}`,
        result: text,
        raw: String(res.result),
        ts: Date.now(),
        steps: res.steps ?? [active.formula, inputs, text],
        detail: `${active.description}${res.detail ? " " + res.detail : ""} Datos: ${inputs || "sin entradas"}.`,
      });
      setGuide(`${active.name} → ${text}`);
      setFormErr("");
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : "Error");
      setFormRes(null);
    }
  };

  const onExprKey = (e: ReactKey<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    }
  };

  return (
    <Scene>
      <TopBar
        title="Calculadora"
        tools={
          <>
            <button
              type="button"
              className={historyOpen ? "pill pill-on" : "pill"}
              onClick={() => setHistoryOpen((v) => !v)}
            >
              Historial
            </button>
            <button type="button" className="pill pill-on" onClick={() => setAngle((a) => (a === "DEG" ? "RAD" : "DEG"))}>
              {angle}
            </button>
          </>
        }
      />
      <main className="calc-main">
        <section className={shake ? "readout shake" : "readout"}>
          <input
            ref={exprRef}
            className="expr"
            value={expression}
            aria-label="Expresión"
            placeholder="0"
            inputMode="text"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setExpression(e.target.value)}
            onKeyDown={onExprKey}
          />
          <div className="result">{preview.text}</div>
          <p className="guide">{!preview.ok && expression.trim() ? preview.message : guide}</p>
        </section>

        <div className="scroller" aria-label="Funciones">
          {FNS.map((fn) => (
            <button key={fn.label} type="button" className="key key-fn" onClick={() => insert(fn.insert)}>
              {fn.label}
            </button>
          ))}
        </div>

        <div className="mem-row">
          {(["MC", "MR", "M+", "M−", "ANS"] as const).map((label) => (
            <button
              key={label}
              type="button"
              className="key key-mem"
              onClick={() => onMemory(label === "M−" ? "M-" : label)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="actions">
          <button type="button" className="key key-science" onClick={() => setScienceOpen(true)}>
            Science Mode
          </button>
          <button
            type="button"
            className="key key-ghost"
            onClick={() => {
              void navigator.clipboard?.writeText(stripFormatting(preview.text));
              setGuide("Resultado copiado.");
            }}
          >
            Copiar
          </button>
          <button
            type="button"
            className="key key-ghost"
            onClick={() => {
              void navigator.clipboard?.readText().then((text) => {
                if (text) insert(text.trim());
              }).catch(() => setGuide("El navegador bloqueó el pegado."));
            }}
          >
            Pegar
          </button>
          <button
            type="button"
            className="key key-ghost"
            onClick={() => {
              setExpression("");
              setCommitted("0");
              setRawAns("0");
              setGuide("Reset: expresión, resultado y ANS. La memoria sigue.");
            }}
          >
            Reset
          </button>
        </div>

        <div className="pad">
          {PAD.map((key) => (
            <button key={key.label} type="button" className={`key ${key.tone}`} onClick={() => onPad(key)}>
              {key.label}
            </button>
          ))}
          <button type="button" className="key key-eq" style={{ gridColumn: "1 / -1" }} onClick={commit}>
            =
          </button>
        </div>
      </main>

      {historyOpen ? (
        <>
          <button type="button" className="drawer-scrim" aria-label="Cerrar historial" onClick={() => setHistoryOpen(false)} />
          <aside className="drawer" aria-label="Historial">
            <div className="drawer-head">
              <div>
                <strong>Historial</strong>
                <p>Expresión para editarla. Resultado para volver a usarlo.</p>
              </div>
              <button type="button" className="icon-btn" aria-label="Cerrar" onClick={() => setHistoryOpen(false)}>
                ×
              </button>
            </div>
            <div className="drawer-scroll">
              {history.length === 0 ? <p className="muted">Sin cálculos todavía.</p> : null}
              {history.map((item) => (
                <article key={item.id} className="hist-card">
                  <button
                    type="button"
                    className="hist-expr"
                    onClick={() => {
                      setExpression(item.expression);
                      setHistoryOpen(false);
                      requestAnimationFrame(() => exprRef.current?.focus());
                    }}
                  >
                    {item.expression}
                  </button>
                  <button
                    type="button"
                    className="hist-res"
                    onClick={() => {
                      setExpression(item.raw);
                      setCommitted(item.result);
                      setRawAns(item.raw);
                      setHistoryOpen(false);
                    }}
                  >
                    {item.result}
                  </button>
                  <div className="hist-meta">{new Date(item.ts).toLocaleString()}</div>
                  {item.detail ? <p className="muted">{item.detail}</p> : null}
                  {item.steps ? (
                    <button type="button" className="chip" onClick={() => setOpenSteps(openSteps === item.id ? null : item.id)}>
                      {openSteps === item.id ? "Ocultar procedimiento" : "Ver procedimiento"}
                    </button>
                  ) : null}
                  {openSteps === item.id && item.steps ? (
                    <ol className="steps">
                      {item.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  ) : null}
                </article>
              ))}
            </div>
          </aside>
        </>
      ) : null}

      {rootOpen ? (
        <div className="modal-back" onClick={() => setRootOpen(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Índice de la raíz">
            <div className="modal-head">
              <strong>Índice de la raíz</strong>
              <div className="spacer" />
              <button type="button" className="icon-btn" onClick={() => setRootOpen(false)} aria-label="Cerrar">×</button>
            </div>
            <div className="modal-body">
              <p className="muted">Se inserta root( valor , índice ). El cursor queda en el valor. Ejemplo: root(32, 5) = 2.</p>
              <div className="chips">
                {["2", "3", "4", "5", "n"].map((n) => (
                  <button key={n} type="button" className={rootIndex === n ? "chip chip-on" : "chip"} onClick={() => setRootIndex(n === "n" ? "" : n)}>
                    {n === "2" ? "√" : n === "3" ? "∛" : n === "4" ? "∜" : n === "n" ? "otro" : `ⁿ√ n=${n}`}
                  </button>
                ))}
              </div>
              <div className="field">
                <label>Índice n</label>
                <input value={rootIndex} onChange={(e) => setRootIndex(e.target.value)} inputMode="decimal" />
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="key key-eq"
                onClick={() => {
                  const n = rootIndex.trim() || "2";
                  const el = exprRef.current;
                  const start = el?.selectionStart ?? expression.length;
                  const end = el?.selectionEnd ?? expression.length;
                  const text = `root(, ${n})`;
                  setExpression(expression.slice(0, start) + text + expression.slice(end));
                  setRootOpen(false);
                  requestAnimationFrame(() => {
                    el?.focus();
                    const pos = start + "root(".length;
                    el?.setSelectionRange(pos, pos);
                  });
                }}
              >
                Insertar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {scienceOpen ? (
        <div className="modal-back" onClick={() => { setScienceOpen(false); setActive(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Science Mode">
            <div className="modal-head">
              <strong>{active ? active.name : "Science Mode"}</strong>
              <div className="spacer" />
              {active ? (
                <button type="button" className="pill" onClick={() => setActive(null)}>Lista</button>
              ) : null}
              <button type="button" className="icon-btn" aria-label="Cerrar" onClick={() => { setScienceOpen(false); setActive(null); }}>×</button>
            </div>
            <div className="modal-body">
              {active ? (
                <div className="fields">
                  <p className="muted" style={{ fontFamily: "var(--font-mono)", color: "#ffb4b4" }}>{active.formula}</p>
                  <p className="muted">{active.description}</p>
                  {active.fields.length === 0 ? <p className="muted">Este caso ya trae los datos del problema. Pulsa calcular.</p> : null}
                  {active.fields.map((f) => (
                    <div className="field" key={f.key}>
                      <label>{f.label}{f.unit ? ` (${f.unit})` : ""}</label>
                      {f.options ? (
                        <select value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                          {f.options.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={form[f.key] ?? ""}
                          inputMode="decimal"
                          onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        />
                      )}
                    </div>
                  ))}
                  {formErr ? <p className="err">{formErr}</p> : null}
                  {formRes ? (
                    <div className="form-result">
                      <div>{formRes.text}</div>
                      {formRes.detail ? <div className="muted">{formRes.detail}</div> : null}
                    </div>
                  ) : null}
                  <button type="button" className="key key-eq" onClick={runOp}>Calcular</button>
                </div>
              ) : (
                <>
                  <input className="search" placeholder="Buscar fórmula" value={query} onChange={(e) => setQuery(e.target.value)} />
                  <div className="chips">
                    <button type="button" className={!cat ? "chip chip-on" : "chip"} onClick={() => setCat(null)}>Todas</button>
                    {CATEGORIES.map((c) => (
                      <button key={c} type="button" className={cat === c ? "chip chip-on" : "chip"} onClick={() => setCat(c)}>{c}</button>
                    ))}
                  </div>
                  <div className="op-grid">
                    {filtered.map((op) => (
                      <button key={op.id} type="button" className="op-card" onClick={() => openOp(op)}>
                        <b>{op.name}</b>
                        <small>{op.formula}</small>
                        <p>{op.description}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Scene>
  );
}
