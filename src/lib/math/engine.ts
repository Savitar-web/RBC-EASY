import Decimal from "decimal.js";

Decimal.set({
  precision: 120,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -80,
  toExpPos: 100,
});

export type AngleMode = "DEG" | "RAD";

export type EvalOpts = {
  angle?: AngleMode;
  scope?: Record<string, Decimal>;
};

type Tok =
  | { t: "num"; v: string }
  | { t: "id"; v: string }
  | { t: "op"; v: string }
  | { t: "lp" }
  | { t: "rp" }
  | { t: "comma" }
  | { t: "fact" }
  | { t: "pct" };

const UNARY = new Set([
  "sin", "cos", "tan", "asin", "acos", "atan",
  "sinh", "cosh", "tanh", "ln", "log", "log2", "log10",
  "sqrt", "cbrt", "abs", "floor", "ceil", "round", "exp",
]);

function prepare(input: string): string {
  return input
    .replace(/(\d),(?=\d{3}(?:\D|$))/g, "$1")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/·/g, "*")
    .replace(/π/g, "pi")
    .replace(/∛/g, "cbrt")
    .replace(/∜/g, "root4")
    .replace(/√/g, "sqrt")
    .replace(/\s+/g, "");
}

function tokenize(src: string): Tok[] {
  const s = prepare(src);
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (/[0-9.]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[0-9.]/.test(s[j]!)) j++;
      if (s[j] === "e" || s[j] === "E") {
        let k = j + 1;
        if (s[k] === "+" || s[k] === "-") k++;
        const start = k;
        while (k < s.length && /[0-9]/.test(s[k]!)) k++;
        if (k > start) j = k;
      }
      out.push({ t: "num", v: s.slice(i, j) });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[a-zA-Z0-9_]/.test(s[j]!)) j++;
      out.push({ t: "id", v: s.slice(i, j) });
      i = j;
      continue;
    }
    if (c === "(") { out.push({ t: "lp" }); i++; continue; }
    if (c === ")") { out.push({ t: "rp" }); i++; continue; }
    if (c === ",") { out.push({ t: "comma" }); i++; continue; }
    if (c === "!") { out.push({ t: "fact" }); i++; continue; }
    if (c === "%") { out.push({ t: "pct" }); i++; continue; }
    if ("+-*/^".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
    throw new Error("Carácter no permitido");
  }
  return out;
}

function factorial(d: Decimal): Decimal {
  if (!d.isFinite() || !d.isInteger() || d.isNeg() || d.gt(400)) {
    throw new Error("Factorial: entero de 0 a 400");
  }
  let r = new Decimal(1);
  const n = d.toNumber();
  for (let i = 2; i <= n; i++) r = r.mul(i);
  return r;
}

function radIn(angle: AngleMode, x: Decimal): number {
  const n = x.toNumber();
  return angle === "DEG" ? (n * Math.PI) / 180 : n;
}

function radOut(angle: AngleMode, n: number): Decimal {
  return new Decimal(angle === "DEG" ? (n * 180) / Math.PI : n);
}

function mustFinite(d: Decimal, label = "Resultado no numérico"): Decimal {
  if (!d.isFinite()) throw new Error(label);
  return d;
}

class Parser {
  private i = 0;
  private toks: Tok[];
  private angle: AngleMode;
  private scope: Record<string, Decimal>;

  constructor(toks: Tok[], angle: AngleMode, scope: Record<string, Decimal>) {
    this.toks = toks;
    this.angle = angle;
    this.scope = scope;
  }

  private peek(): Tok | undefined {
    return this.toks[this.i];
  }

  private eat(): Tok | undefined {
    return this.toks[this.i++];
  }

  private startsAtom(): boolean {
    const t = this.peek();
    return t?.t === "num" || t?.t === "id" || t?.t === "lp";
  }

  parse(): Decimal {
    if (this.toks.length === 0) throw new Error("Expresión vacía");
    const v = this.expr();
    if (this.peek()) throw new Error("Expresión incompleta");
    return mustFinite(v);
  }

  private expr(): Decimal {
    let left = this.term();
    for (;;) {
      const t = this.peek();
      if (t?.t === "op" && (t.v === "+" || t.v === "-")) {
        this.eat();
        const right = this.term();
        left = t.v === "+" ? left.add(right) : left.sub(right);
      } else break;
    }
    return left;
  }

  private term(): Decimal {
    let left = this.power();
    for (;;) {
      const t = this.peek();
      if (t?.t === "op" && (t.v === "*" || t.v === "/")) {
        this.eat();
        const right = this.power();
        if (t.v === "*") left = left.mul(right);
        else {
          if (right.isZero()) throw new Error("División entre cero");
          left = left.div(right);
        }
      } else if (this.startsAtom()) {
        left = left.mul(this.power());
      } else break;
    }
    return left;
  }

  private power(): Decimal {
    const base = this.unary();
    const t = this.peek();
    if (t?.t === "op" && t.v === "^") {
      this.eat();
      const exp = this.power();
      try {
        return mustFinite(base.pow(exp), "Potencia inválida");
      } catch (err) {
        if (err instanceof Error && err.message === "Potencia inválida") throw err;
        throw new Error("Potencia inválida");
      }
    }
    return base;
  }

  private unary(): Decimal {
    const t = this.peek();
    if (t?.t === "op" && (t.v === "+" || t.v === "-")) {
      this.eat();
      const v = this.unary();
      return t.v === "-" ? v.neg() : v;
    }
    return this.postfix();
  }

  private postfix(): Decimal {
    let v = this.atom();
    while (this.peek()?.t === "fact" || this.peek()?.t === "pct") {
      const mark = this.eat();
      v = mark?.t === "fact" ? factorial(v) : v.div(100);
    }
    return v;
  }

  private atom(): Decimal {
    const t = this.eat();
    if (!t) throw new Error("Expresión incompleta");
    if (t.t === "num") {
      if (t.v === "." || t.v.split(".").length > 2) throw new Error("Número inválido");
      return new Decimal(t.v);
    }
    if (t.t === "lp") {
      const v = this.expr();
      const close = this.eat();
      if (close?.t !== "rp") throw new Error("Falta un paréntesis");
      return v;
    }
    if (t.t === "id") return this.ident(t.v);
    throw new Error("Expresión incompleta");
  }

  private ident(name: string): Decimal {
    if (name === "pi") return Decimal.acos(-1);
    if (name === "e") return new Decimal(Math.E);
    if (name === "tau") return Decimal.acos(-1).mul(2);
    if (name === "root4") return this.call1((x) => mustFinite(x.abs().pow("0.25").mul(x.isNeg() ? -1 : 1)));
    if (name === "nroot" || name === "root") return this.callRoot();
    if (name === "mod") return this.call2((a, b) => {
      if (b.isZero()) throw new Error("Módulo entre cero");
      return a.mod(b);
    });
    if (UNARY.has(name)) return this.call1((x) => this.applyUnary(name, x));
    if (Object.prototype.hasOwnProperty.call(this.scope, name)) {
      return this.scope[name]!;
    }
    throw new Error(`Desconocido: ${name}`);
  }

  private call1(fn: (x: Decimal) => Decimal): Decimal {
    const lp = this.eat();
    if (lp?.t !== "lp") throw new Error("Falta un paréntesis");
    const arg = this.expr();
    const rp = this.eat();
    if (rp?.t !== "rp") throw new Error("Falta un paréntesis");
    return fn(arg);
  }

  private call2(fn: (a: Decimal, b: Decimal) => Decimal): Decimal {
    const lp = this.eat();
    if (lp?.t !== "lp") throw new Error("Falta un paréntesis");
    const a = this.expr();
    const comma = this.eat();
    if (comma?.t !== "comma") throw new Error("Faltan argumentos");
    const b = this.expr();
    const rp = this.eat();
    if (rp?.t !== "rp") throw new Error("Falta un paréntesis");
    return fn(a, b);
  }

  private callRoot(): Decimal {
    const lp = this.eat();
    if (lp?.t !== "lp") throw new Error("Falta un paréntesis");
    const x = this.expr();
    const comma = this.eat();
    if (comma?.t !== "comma") throw new Error("La raíz pide valor e índice: root(x, n)");
    const n = this.expr();
    const rp = this.eat();
    if (rp?.t !== "rp") throw new Error("Falta un paréntesis");
    if (n.isZero()) throw new Error("El índice no puede ser 0");
    if (x.isNeg() && n.isInteger() && n.mod(2).isZero()) throw new Error("Raíz par de un negativo");
    return mustFinite(x.abs().pow(new Decimal(1).div(n)).mul(x.isNeg() ? -1 : 1));
  }

  private applyUnary(name: string, x: Decimal): Decimal {
    const n = x.toNumber();
    switch (name) {
      case "sqrt":
        if (x.isNeg()) throw new Error("Raíz cuadrada de un negativo");
        return x.sqrt();
      case "cbrt":
        return Decimal.cbrt(x);
      case "abs":
        return x.abs();
      case "floor":
        return x.floor();
      case "ceil":
        return x.ceil();
      case "round":
        return x.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
      case "exp":
        return mustFinite(x.exp());
      case "ln":
        if (x.lte(0)) throw new Error("Logaritmo de un no positivo");
        return x.ln();
      case "log":
      case "log10":
        if (x.lte(0)) throw new Error("Logaritmo de un no positivo");
        return Decimal.log10(x);
      case "log2":
        if (x.lte(0)) throw new Error("Logaritmo de un no positivo");
        return Decimal.log2(x);
      case "sin":
        return new Decimal(Math.sin(radIn(this.angle, x)));
      case "cos":
        return new Decimal(Math.cos(radIn(this.angle, x)));
      case "tan":
        return mustFinite(new Decimal(Math.tan(radIn(this.angle, x))), "Tangente indefinida");
      case "asin":
        if (x.abs().gt(1)) throw new Error("asin fuera de rango");
        return radOut(this.angle, Math.asin(n));
      case "acos":
        if (x.abs().gt(1)) throw new Error("acos fuera de rango");
        return radOut(this.angle, Math.acos(n));
      case "atan":
        return radOut(this.angle, Math.atan(n));
      case "sinh":
        return new Decimal(Math.sinh(n));
      case "cosh":
        return new Decimal(Math.cosh(n));
      case "tanh":
        return new Decimal(Math.tanh(n));
      default:
        throw new Error(`Desconocido: ${name}`);
    }
  }
}

export function evaluate(input: string, opts: EvalOpts = {}): Decimal {
  const toks = tokenize(input);
  return new Parser(toks, opts.angle ?? "DEG", opts.scope ?? {}).parse();
}

export function evaluateNumber(input: string, opts: EvalOpts = {}): number {
  return evaluate(input, opts).toNumber();
}

/** Insert a closing parenthesis when the user opens a function. */
export function autoClose(token: string): { text: string; cursor: number } {
  const openers = ["(", "sin(", "cos(", "tan(", "asin(", "acos(", "atan(", "sinh(", "cosh(", "tanh(", "ln(", "log(", "log2(", "√(", "∛(", "∜(", "abs(", "exp(", "floor(", "ceil(", "round("];
  if (openers.includes(token) || token.endsWith("(")) {
    return { text: token + ")", cursor: token.length };
  }
  return { text: token, cursor: token.length };
}
