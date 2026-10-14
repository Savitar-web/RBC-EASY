export type FieldDef = {
  key: string;
  label: string;
  unit?: string;
  defaultValue?: string;
  options?: { value: string; label: string }[];
};

export type SciOut = {
  result: number;
  unit: string;
  detail?: string;
  steps?: string[];
};

export type SciOp = {
  id: string;
  name: string;
  category: "Física" | "Electrostática" | "Química" | "Matemáticas" | "Conversiones";
  formula: string;
  description: string;
  fields: FieldDef[];
  compute: (v: Record<string, number | string>) => SciOut;
};

const K = 8.9875517923e9;
const EPS = 8.8541878128e-12;
const G = 6.6743e-11;
const c = 299792458;
const h = 6.62607015e-34;
const R = 8.314462618;
const NA = 6.02214076e23;

function num(v: Record<string, number | string>, key: string): number {
  const raw = v[key];
  const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? "").replace(",", "."));
  if (!Number.isFinite(n)) throw new Error(`Valor inválido en «${key}»`);
  return n;
}

function out(result: number, unit: string, steps: string[], detail?: string): SciOut {
  return { result, unit, steps, detail };
}

export const CATEGORIES = ["Física", "Electrostática", "Química", "Matemáticas", "Conversiones"] as const;

export const OPERATIONS: SciOp[] = [
  {
    id: "newton",
    name: "Segunda ley de Newton",
    category: "Física",
    formula: "F = m · a",
    description: "Fuerza neta igual a masa por aceleración.",
    fields: [
      { key: "m", label: "Masa", unit: "kg" },
      { key: "a", label: "Aceleración", unit: "m/s²" },
    ],
    compute: (v) => {
      const m = num(v, "m");
      const a = num(v, "a");
      return out(m * a, "N", [`m = ${m} kg`, `a = ${a} m/s²`, `F = m·a = ${m * a} N`]);
    },
  },
  {
    id: "kin-v",
    name: "Velocidad final (MRUA)",
    category: "Física",
    formula: "v = v₀ + a·t",
    description: "Cinemática con aceleración constante.",
    fields: [
      { key: "v0", label: "Velocidad inicial", unit: "m/s", defaultValue: "0" },
      { key: "a", label: "Aceleración", unit: "m/s²" },
      { key: "t", label: "Tiempo", unit: "s" },
    ],
    compute: (v) => out(num(v, "v0") + num(v, "a") * num(v, "t"), "m/s", ["v = v₀ + a t"]),
  },
  {
    id: "kin-x",
    name: "Posición (MRUA)",
    category: "Física",
    formula: "x = x₀ + v₀t + ½at²",
    description: "Desplazamiento con aceleración constante.",
    fields: [
      { key: "x0", label: "Posición inicial", unit: "m", defaultValue: "0" },
      { key: "v0", label: "Velocidad inicial", unit: "m/s", defaultValue: "0" },
      { key: "a", label: "Aceleración", unit: "m/s²" },
      { key: "t", label: "Tiempo", unit: "s" },
    ],
    compute: (v) => {
      const t = num(v, "t");
      const r = num(v, "x0") + num(v, "v0") * t + 0.5 * num(v, "a") * t * t;
      return out(r, "m", ["x = x₀ + v₀t + ½ a t²"]);
    },
  },
  {
    id: "ke",
    name: "Energía cinética",
    category: "Física",
    formula: "K = ½ m v²",
    description: "Energía asociada al movimiento de traslación.",
    fields: [
      { key: "m", label: "Masa", unit: "kg" },
      { key: "v", label: "Velocidad", unit: "m/s" },
    ],
    compute: (v) => {
      const m = num(v, "m");
      const vel = num(v, "v");
      return out(0.5 * m * vel * vel, "J", ["K = ½ m v²"]);
    },
  },
  {
    id: "pe",
    name: "Energía potencial gravitatoria",
    category: "Física",
    formula: "U = m g h",
    description: "Cerca de la superficie, con g constante.",
    fields: [
      { key: "m", label: "Masa", unit: "kg" },
      { key: "h", label: "Altura", unit: "m" },
      { key: "g", label: "g", unit: "m/s²", defaultValue: "9.80665" },
    ],
    compute: (v) => out(num(v, "m") * num(v, "g") * num(v, "h"), "J", ["U = m g h"]),
  },
  {
    id: "work",
    name: "Trabajo",
    category: "Física",
    formula: "W = F · d · cosθ",
    description: "Trabajo de una fuerza constante. θ en grados.",
    fields: [
      { key: "F", label: "Fuerza", unit: "N" },
      { key: "d", label: "Desplazamiento", unit: "m" },
      { key: "th", label: "Ángulo", unit: "°", defaultValue: "0" },
    ],
    compute: (v) => {
      const r = num(v, "F") * num(v, "d") * Math.cos((num(v, "th") * Math.PI) / 180);
      return out(r, "J", ["W = F d cosθ", "θ se convierte a radianes"]);
    },
  },
  {
    id: "power",
    name: "Potencia media",
    category: "Física",
    formula: "P = W / t = F·v",
    description: "Rapidez con la que se transfiere energía.",
    fields: [
      { key: "W", label: "Trabajo o energía", unit: "J" },
      { key: "t", label: "Tiempo", unit: "s" },
    ],
    compute: (v) => {
      const t = num(v, "t");
      if (t === 0) throw new Error("El tiempo no puede ser 0");
      return out(num(v, "W") / t, "W", ["P = W / t"]);
    },
  },
  {
    id: "momentum",
    name: "Cantidad de movimiento",
    category: "Física",
    formula: "p = m v",
    description: "Momento lineal.",
    fields: [
      { key: "m", label: "Masa", unit: "kg" },
      { key: "v", label: "Velocidad", unit: "m/s" },
    ],
    compute: (v) => out(num(v, "m") * num(v, "v"), "kg·m/s", ["p = m v"]),
  },
  {
    id: "impulse",
    name: "Impulso",
    category: "Física",
    formula: "J = F·Δt = Δp",
    description: "Cambio de momento producido por una fuerza media.",
    fields: [
      { key: "F", label: "Fuerza media", unit: "N" },
      { key: "t", label: "Intervalo", unit: "s" },
    ],
    compute: (v) => out(num(v, "F") * num(v, "t"), "N·s", ["J = F Δt"]),
  },
  {
    id: "pressure",
    name: "Presión",
    category: "Física",
    formula: "P = F / A",
    description: "Fuerza perpendicular por unidad de área.",
    fields: [
      { key: "F", label: "Fuerza", unit: "N" },
      { key: "A", label: "Área", unit: "m²" },
    ],
    compute: (v) => {
      const A = num(v, "A");
      if (A === 0) throw new Error("El área no puede ser 0");
      return out(num(v, "F") / A, "Pa", ["P = F / A"]);
    },
  },
  {
    id: "density",
    name: "Densidad",
    category: "Física",
    formula: "ρ = m / V",
    description: "Masa por unidad de volumen.",
    fields: [
      { key: "m", label: "Masa", unit: "kg" },
      { key: "V", label: "Volumen", unit: "m³" },
    ],
    compute: (v) => {
      const V = num(v, "V");
      if (V === 0) throw new Error("El volumen no puede ser 0");
      return out(num(v, "m") / V, "kg/m³", ["ρ = m / V"]);
    },
  },
  {
    id: "hooke",
    name: "Ley de Hooke",
    category: "Física",
    formula: "F = k · x",
    description: "Fuerza restauradora de un resorte ideal.",
    fields: [
      { key: "k", label: "Constante", unit: "N/m" },
      { key: "x", label: "Deformación", unit: "m" },
    ],
    compute: (v) => out(num(v, "k") * num(v, "x"), "N", ["F = k x"]),
  },
  {
    id: "gravity",
    name: "Gravitación de Newton",
    category: "Física",
    formula: "F = G m₁ m₂ / r²",
    description: "Fuerza entre dos masas puntuales.",
    fields: [
      { key: "m1", label: "Masa 1", unit: "kg" },
      { key: "m2", label: "Masa 2", unit: "kg" },
      { key: "r", label: "Distancia", unit: "m" },
    ],
    compute: (v) => {
      const r = num(v, "r");
      if (r === 0) throw new Error("r no puede ser 0");
      const F = (G * num(v, "m1") * num(v, "m2")) / (r * r);
      return out(F, "N", [`G = ${G}`, "F = G m₁ m₂ / r²"]);
    },
  },
  {
    id: "escape",
    name: "Velocidad de escape",
    category: "Física",
    formula: "v = √(2GM / r)",
    description: "Velocidad mínima para alejarse sin más empuje.",
    fields: [
      { key: "M", label: "Masa del cuerpo", unit: "kg" },
      { key: "r", label: "Radio", unit: "m" },
    ],
    compute: (v) => {
      const r = num(v, "r");
      if (r <= 0) throw new Error("r debe ser positivo");
      return out(Math.sqrt((2 * G * num(v, "M")) / r), "m/s", ["v = √(2GM/r)"]);
    },
  },
  {
    id: "centrip",
    name: "Aceleración centrípeta",
    category: "Física",
    formula: "a = v² / r",
    description: "Aceleración hacia el centro de una trayectoria circular.",
    fields: [
      { key: "v", label: "Velocidad", unit: "m/s" },
      { key: "r", label: "Radio", unit: "m" },
    ],
    compute: (v) => {
      const r = num(v, "r");
      if (r === 0) throw new Error("r no puede ser 0");
      const vel = num(v, "v");
      return out((vel * vel) / r, "m/s²", ["a = v² / r"]);
    },
  },
  {
    id: "pendulum",
    name: "Péndulo simple",
    category: "Física",
    formula: "T = 2π √(L/g)",
    description: "Periodo para ángulos pequeños.",
    fields: [
      { key: "L", label: "Longitud", unit: "m" },
      { key: "g", label: "g", unit: "m/s²", defaultValue: "9.80665" },
    ],
    compute: (v) => {
      const g = num(v, "g");
      const L = num(v, "L");
      if (g <= 0 || L < 0) throw new Error("L y g deben ser positivos");
      return out(2 * Math.PI * Math.sqrt(L / g), "s", ["T = 2π √(L/g)"]);
    },
  },
  {
    id: "ohm",
    name: "Ley de Ohm",
    category: "Física",
    formula: "V = I · R",
    description: "Caída de potencial en un resistor óhmico.",
    fields: [
      { key: "I", label: "Corriente", unit: "A" },
      { key: "R", label: "Resistencia", unit: "Ω" },
    ],
    compute: (v) => out(num(v, "I") * num(v, "R"), "V", ["V = I R"]),
  },
  {
    id: "pelec",
    name: "Potencia eléctrica",
    category: "Física",
    formula: "P = V · I = I² R",
    description: "Usa V e I. Si omites V, calcula con I²R.",
    fields: [
      { key: "V", label: "Voltaje", unit: "V", defaultValue: "" },
      { key: "I", label: "Corriente", unit: "A" },
      { key: "R", label: "Resistencia", unit: "Ω", defaultValue: "" },
    ],
    compute: (v) => {
      const hasV = String(v.V ?? "") !== "";
      const I = num(v, "I");
      if (hasV) return out(num(v, "V") * I, "W", ["P = V I"]);
      return out(I * I * num(v, "R"), "W", ["P = I² R"]);
    },
  },
  {
    id: "wave",
    name: "Velocidad de onda",
    category: "Física",
    formula: "v = f · λ",
    description: "Relación frecuencia–longitud de onda.",
    fields: [
      { key: "f", label: "Frecuencia", unit: "Hz" },
      { key: "lam", label: "Longitud de onda", unit: "m" },
    ],
    compute: (v) => out(num(v, "f") * num(v, "lam"), "m/s", ["v = f λ"]),
  },
  {
    id: "photon",
    name: "Energía de un fotón",
    category: "Física",
    formula: "E = h f = h c / λ",
    description: "Deja f o λ en blanco según el dato que tengas. El otro puede ir en 0.",
    fields: [
      { key: "f", label: "Frecuencia", unit: "Hz", defaultValue: "0" },
      { key: "lam", label: "Longitud de onda", unit: "m", defaultValue: "0" },
    ],
    compute: (v) => {
      const f = num(v, "f");
      const lam = num(v, "lam");
      if (f > 0) return out(h * f, "J", ["E = h f", `h = ${h}`]);
      if (lam > 0) return out((h * c) / lam, "J", ["E = h c / λ"]);
      throw new Error("Indica frecuencia o longitud de onda");
    },
  },
  {
    id: "snell",
    name: "Ley de Snell",
    category: "Física",
    formula: "n₁ sinθ₁ = n₂ sinθ₂",
    description: "Despeja θ₂ en grados.",
    fields: [
      { key: "n1", label: "n₁", defaultValue: "1" },
      { key: "th1", label: "θ₁", unit: "°" },
      { key: "n2", label: "n₂", defaultValue: "1.333" },
    ],
    compute: (v) => {
      const s = (num(v, "n1") * Math.sin((num(v, "th1") * Math.PI) / 180)) / num(v, "n2");
      if (Math.abs(s) > 1) throw new Error("Reflexión total interna: sinθ₂ > 1");
      const th = (Math.asin(s) * 180) / Math.PI;
      return out(th, "°", ["sinθ₂ = n₁ sinθ₁ / n₂", "θ₂ = arcsin(…)"]);
    },
  },
  {
    id: "bernoulli",
    name: "Bernoulli (misma altura)",
    category: "Física",
    formula: "P + ½ρv² = const",
    description: "Despeja P₂ cuando la altura no cambia.",
    fields: [
      { key: "P1", label: "P₁", unit: "Pa" },
      { key: "rho", label: "Densidad", unit: "kg/m³" },
      { key: "v1", label: "v₁", unit: "m/s" },
      { key: "v2", label: "v₂", unit: "m/s" },
    ],
    compute: (v) => {
      const rho = num(v, "rho");
      const P2 = num(v, "P1") + 0.5 * rho * (num(v, "v1") ** 2 - num(v, "v2") ** 2);
      return out(P2, "Pa", ["P₂ = P₁ + ½ρ (v₁² − v₂²)"]);
    },
  },
  {
    id: "heat",
    name: "Calor sensible",
    category: "Física",
    formula: "Q = m c ΔT",
    description: "Energía para cambiar la temperatura sin cambio de fase.",
    fields: [
      { key: "m", label: "Masa", unit: "kg" },
      { key: "c", label: "Calor específico", unit: "J/(kg·K)" },
      { key: "dT", label: "ΔT", unit: "K" },
    ],
    compute: (v) => out(num(v, "m") * num(v, "c") * num(v, "dT"), "J", ["Q = m c ΔT"]),
  },
  {
    id: "torque",
    name: "Torque",
    category: "Física",
    formula: "τ = r F sinθ",
    description: "Momento de una fuerza. θ en grados.",
    fields: [
      { key: "r", label: "Brazo", unit: "m" },
      { key: "F", label: "Fuerza", unit: "N" },
      { key: "th", label: "Ángulo", unit: "°", defaultValue: "90" },
    ],
    compute: (v) => out(num(v, "r") * num(v, "F") * Math.sin((num(v, "th") * Math.PI) / 180), "N·m", ["τ = r F sinθ"]),
  },
  {
    id: "esfera-solida",
    name: "Esfera sólida aislante",
    category: "Electrostática",
    formula: "ρ = Q / (4/3 π R³) ;  E = kQ/r²  o  kQr/R³",
    description: "Carga uniforme. Fuera de la esfera el campo es el de una carga puntual; dentro crece lineal con r. Referencia típica: ρ ≈ 2.59×10⁻⁷ C/m³ y E ≈ 1.956×10³ N/C con los datos del problema.",
    fields: [
      { key: "Q", label: "Carga Q", unit: "C" },
      { key: "R", label: "Radio R", unit: "m" },
      { key: "r", label: "Distancia r", unit: "m" },
    ],
    compute: (v) => {
      const Q = num(v, "Q");
      const R = num(v, "R");
      const r = num(v, "r");
      if (R <= 0 || r < 0) throw new Error("R debe ser positivo y r no negativo");
      const rho = Q / ((4 / 3) * Math.PI * R ** 3);
      const inside = r < R;
      const E = inside ? (K * Q * r) / R ** 3 : (K * Q) / (r * r || 1);
      if (!inside && r === 0) throw new Error("r exterior no puede ser 0");
      return out(E, "N/C", [
        `ρ = Q / ((4/3) π R³) = ${rho} C/m³`,
        inside ? "r < R → E = k Q r / R³" : "r ≥ R → E = k Q / r²",
        `k = ${K}`,
      ], `ρ = ${rho} C/m³ · región ${inside ? "interior" : "exterior"}`);
    },
  },
  {
    id: "q-desde-e",
    name: "Carga desde el campo exterior",
    category: "Electrostática",
    formula: "Q = E r² / k",
    description: "Despeje de la ley de Coulomb para una carga puntual o el exterior de una esfera.",
    fields: [
      { key: "E", label: "Campo E", unit: "N/C" },
      { key: "r", label: "Distancia r", unit: "m" },
    ],
    compute: (v) => out((num(v, "E") * num(v, "r") ** 2) / K, "C", ["Q = E r² / k"]),
  },
  {
    id: "cubo-carga",
    name: "Carga dentro de un cubo",
    category: "Electrostática",
    formula: "Φ = Qenc/ε₀ ;  Φcara = Φ/6",
    description: "Si la carga total encerrada es Q + 6q y el campo es simétrico, cada cara lleva un sexto del flujo. Referencia: Φcara ≈ −1.32×10⁵ N·m²/C.",
    fields: [
      { key: "Q", label: "Carga central Q", unit: "C" },
      { key: "q", label: "Carga q de cada contribución", unit: "C" },
    ],
    compute: (v) => {
      const Qenc = num(v, "Q") + 6 * num(v, "q");
      const phi = Qenc / EPS;
      const face = phi / 6;
      return out(face, "N·m²/C", [
        `Qenc = Q + 6q = ${Qenc} C`,
        `Φ = Qenc / ε₀ = ${phi}`,
        "Φcara = Φ / 6",
        `ε₀ = ${EPS}`,
      ], `Φ total = ${phi} N·m²/C`);
    },
  },
  {
    id: "gauss-phi-q",
    name: "Gauss: flujo y carga",
    category: "Electrostática",
    formula: "Φ = Qenc / ε₀",
    description: "Ley de Gauss en forma integral. El resultado es el flujo.",
    fields: [{ key: "Q", label: "Carga encerrada", unit: "C" }],
    compute: (v) => out(num(v, "Q") / EPS, "N·m²/C", ["Φ = Qenc / ε₀"]),
  },
  {
    id: "gauss-q-phi",
    name: "Gauss: carga desde el flujo",
    category: "Electrostática",
    formula: "Qenc = ε₀ Φ",
    description: "Úsala con los flujos de los casos de divergencia: 4π/3, 184/35, 4π, 12π/5 o 2π.",
    fields: [{ key: "phi", label: "Flujo Φ", unit: "N·m²/C" }],
    compute: (v) => out(EPS * num(v, "phi"), "C", ["Qenc = ε₀ Φ"]),
  },
  {
    id: "caso-4pi3",
    name: "Caso: esfera unitaria ∇·E",
    category: "Electrostática",
    formula: "Φ = ∭(∇·E) dV = 4π/3",
    description: "Esfera unitaria cuyo divergente integra 4π/3. Q = ε₀ Φ ≈ 3.71×10⁻¹¹ C.",
    fields: [],
    compute: () => {
      const phi = (4 * Math.PI) / 3;
      return out(EPS * phi, "C", [`Φ = 4π/3 = ${phi}`, "Q = ε₀ Φ"], `Φ ≈ ${phi} N·m²/C`);
    },
  },
  {
    id: "caso-184",
    name: "Caso: cilindro parabólico",
    category: "Electrostática",
    formula: "Φ = 184/35",
    description: "Integral de la divergencia sobre el cilindro parabólico del problema. Q ≈ 4.65×10⁻¹¹ C.",
    fields: [],
    compute: () => {
      const phi = 184 / 35;
      return out(EPS * phi, "C", [`Φ = 184/35 = ${phi}`, "Q = ε₀ Φ"], `Φ = ${phi} N·m²/C`);
    },
  },
  {
    id: "caso-hemisferio",
    name: "Caso: hemisferio",
    category: "Electrostática",
    formula: "Φ = 4π",
    description: "Hemisferio del problema de divergencia. Q ≈ 1.11×10⁻¹⁰ C.",
    fields: [],
    compute: () => {
      const phi = 4 * Math.PI;
      return out(EPS * phi, "C", ["Φ = 4π", "Q = ε₀ Φ"], `Φ = ${phi} N·m²/C`);
    },
  },
  {
    id: "caso-12pi5",
    name: "Caso: esfera unitaria 12π/5",
    category: "Electrostática",
    formula: "Φ = 12π/5",
    description: "Segunda esfera unitaria. Q ≈ 6.69×10⁻¹¹ C.",
    fields: [],
    compute: () => {
      const phi = (12 * Math.PI) / 5;
      return out(EPS * phi, "C", ["Φ = 12π/5", "Q = ε₀ Φ"], `Φ = ${phi} N·m²/C`);
    },
  },
  {
    id: "caso-2pi",
    name: "Caso: superficie cilíndrica",
    category: "Electrostática",
    formula: "Φ = 2π",
    description: "Flujo de la superficie cilíndrica del problema. Φ ≈ 6.28 N·m²/C.",
    fields: [],
    compute: () => out(2 * Math.PI, "N·m²/C", ["Φ = 2π", "∇·E integrado sobre el volumen"]),
  },
  {
    id: "cubo-simbolico",
    name: "Cubo de lado a",
    category: "Electrostática",
    formula: "Φ = a⁴ [ b + (c − d)/2 ]",
    description: "Flujo total por las caras cuando Ex, Ey, Ez son lineales en las coordenadas. Q = ε₀ Φ.",
    fields: [
      { key: "a", label: "Lado a", unit: "m", defaultValue: "1" },
      { key: "b", label: "Coeficiente b", defaultValue: "1" },
      { key: "c", label: "Coeficiente c", defaultValue: "1" },
      { key: "d", label: "Coeficiente d", defaultValue: "0" },
    ],
    compute: (v) => {
      const a = num(v, "a");
      const phi = a ** 4 * (num(v, "b") + (num(v, "c") - num(v, "d")) / 2);
      return out(phi, "N·m²/C", [
        "Φ = Φx + Φy + Φz",
        "Φ = a⁴ [ b + (c − d)/2 ]",
        `Qenc = ε₀ Φ = ${EPS * phi} C`,
      ]);
    },
  },
  {
    id: "cascarones",
    name: "Dos cascarones metálicos concéntricos",
    category: "Electrostática",
    formula: "E = 0  |  kq/r²  |  −kq/r²",
    description: "Carga +q en el cascarón interior de radio R y −q en el exterior de radio 2R. El campo depende de la región.",
    fields: [
      { key: "q", label: "Carga q", unit: "C" },
      { key: "R", label: "Radio interior R", unit: "m" },
      { key: "r", label: "Distancia r", unit: "m" },
    ],
    compute: (v) => {
      const q = num(v, "q");
      const R = num(v, "R");
      const r = num(v, "r");
      if (R <= 0 || r < 0) throw new Error("Radios inválidos");
      let E = 0;
      let region = "r < R → E = 0 (interior del conductor hueco / cavidad de Gauss)";
      if (r > R && r < 2 * R) {
        E = (K * q) / (r * r);
        region = "R < r < 2R → E = k q / r²";
      } else if (r > 2 * R) {
        E = (-K * q) / (r * r);
        region = "r > 2R → E = −k q / r²";
      } else if (r === R || r === 2 * R) {
        region = "Sobre el conductor ideal el campo no está definido como un solo valor; se reporta el límite interior de esa superficie.";
      }
      return out(E, "N/C", [region, "Φ = Qenc / ε₀ en cada superficie gaussiana"], region);
    },
  },
  {
    id: "cascaron-grueso",
    name: "Cascarón esférico grueso",
    category: "Electrostática",
    formula: "ρ = Q / ((4/3)π(R₂³−R₁³))",
    description: "Aislante con carga uniforme entre R₁ y R₂. E = 0 dentro del hueco; en el material usa la carga encerrada proporcional al volumen; fuera es kQ/r².",
    fields: [
      { key: "Q", label: "Carga total Q", unit: "C" },
      { key: "R1", label: "R₁", unit: "m" },
      { key: "R2", label: "R₂", unit: "m" },
      { key: "r", label: "r", unit: "m" },
    ],
    compute: (v) => {
      const Q = num(v, "Q");
      const R1 = num(v, "R1");
      const R2 = num(v, "R2");
      const r = num(v, "r");
      if (!(R2 > R1) || R1 < 0) throw new Error("Se requiere R₂ > R₁ ≥ 0");
      const rho = Q / ((4 / 3) * Math.PI * (R2 ** 3 - R1 ** 3));
      let E = 0;
      let region = "r < R₁ → E = 0";
      if (r > R1 && r < R2) {
        E = (K * Q * (r ** 3 - R1 ** 3)) / (r ** 2 * (R2 ** 3 - R1 ** 3));
        region = "R₁ < r < R₂ → E = kQ (r³ − R₁³) / [r² (R₂³ − R₁³)]";
      } else if (r >= R2) {
        E = (K * Q) / (r * r);
        region = "r ≥ R₂ → E = kQ / r²";
      }
      return out(E, "N/C", [`ρ = ${rho} C/m³`, region], `ρ = ${rho} C/m³`);
    },
  },
  {
    id: "coulomb",
    name: "Fuerza de Coulomb",
    category: "Electrostática",
    formula: "F = k |q₁ q₂| / r²",
    description: "Magnitud de la fuerza entre dos cargas puntuales. k = 1/(4πε₀).",
    fields: [
      { key: "q1", label: "q₁", unit: "C" },
      { key: "q2", label: "q₂", unit: "C" },
      { key: "r", label: "r", unit: "m" },
    ],
    compute: (v) => {
      const r = num(v, "r");
      if (r === 0) throw new Error("r no puede ser 0");
      const F = (K * Math.abs(num(v, "q1") * num(v, "q2"))) / (r * r);
      const sign = num(v, "q1") * num(v, "q2") < 0 ? "atractiva" : "repulsiva";
      return out(F, "N", ["F = k |q₁ q₂| / r²", `k = ${K}`], `Sentido: ${sign}`);
    },
  },
  {
    id: "potencial",
    name: "Potencial de una carga puntual",
    category: "Electrostática",
    formula: "V = k q / r",
    description: "Potencial con cero en el infinito.",
    fields: [
      { key: "q", label: "q", unit: "C" },
      { key: "r", label: "r", unit: "m" },
    ],
    compute: (v) => {
      const r = num(v, "r");
      if (r === 0) throw new Error("r no puede ser 0");
      return out((K * num(v, "q")) / r, "V", ["V = k q / r"]);
    },
  },
  {
    id: "capacitor",
    name: "Capacitor de placas paralelas",
    category: "Electrostática",
    formula: "C = ε₀ A / d",
    description: "Capacitancia en el vacío. Energía U = ½ C V² si indicas V.",
    fields: [
      { key: "A", label: "Área", unit: "m²" },
      { key: "d", label: "Separación", unit: "m" },
      { key: "V", label: "Voltaje (opcional)", unit: "V", defaultValue: "" },
    ],
    compute: (v) => {
      const d = num(v, "d");
      if (d === 0) throw new Error("d no puede ser 0");
      const C = (EPS * num(v, "A")) / d;
      const hasV = String(v.V ?? "") !== "";
      if (!hasV) return out(C, "F", ["C = ε₀ A / d"]);
      const V = num(v, "V");
      return out(0.5 * C * V * V, "J", ["C = ε₀ A / d", "U = ½ C V²"], `C = ${C} F`);
    },
  },
  {
    id: "molaridad",
    name: "Molaridad",
    category: "Química",
    formula: "M = n / V",
    description: "Moles de soluto por litro de disolución.",
    fields: [
      { key: "n", label: "Moles", unit: "mol" },
      { key: "V", label: "Volumen", unit: "L" },
    ],
    compute: (v) => {
      const V = num(v, "V");
      if (V === 0) throw new Error("V no puede ser 0");
      return out(num(v, "n") / V, "mol/L", ["M = n / V"]);
    },
  },
  {
    id: "dilucion",
    name: "Dilución",
    category: "Química",
    formula: "M₁ V₁ = M₂ V₂",
    description: "Despeja M₂. El soluto no cambia, solo el volumen.",
    fields: [
      { key: "M1", label: "M₁", unit: "mol/L" },
      { key: "V1", label: "V₁", unit: "L" },
      { key: "V2", label: "V₂", unit: "L" },
    ],
    compute: (v) => {
      const V2 = num(v, "V2");
      if (V2 === 0) throw new Error("V₂ no puede ser 0");
      return out((num(v, "M1") * num(v, "V1")) / V2, "mol/L", ["M₂ = M₁ V₁ / V₂"]);
    },
  },
  {
    id: "ph",
    name: "pH y pOH",
    category: "Química",
    formula: "pH = −log₁₀[H⁺]",
    description: "También devuelve pOH = 14 − pH a 25 °C.",
    fields: [{ key: "h", label: "[H⁺]", unit: "mol/L" }],
    compute: (v) => {
      const h = num(v, "h");
      if (h <= 0) throw new Error("[H⁺] debe ser positiva");
      const ph = -Math.log10(h);
      return out(ph, "", ["pH = −log₁₀[H⁺]", `pOH ≈ ${14 - ph}`], `pOH ≈ ${14 - ph}`);
    },
  },
  {
    id: "hendersson",
    name: "Henderson–Hasselbalch",
    category: "Química",
    formula: "pH = pKa + log₁₀([A⁻]/[HA])",
    description: "Amortiguador de un ácido débil y su base conjugada.",
    fields: [
      { key: "pka", label: "pKa" },
      { key: "a", label: "[A⁻]", unit: "mol/L" },
      { key: "ha", label: "[HA]", unit: "mol/L" },
    ],
    compute: (v) => {
      const ha = num(v, "ha");
      const a = num(v, "a");
      if (ha <= 0 || a <= 0) throw new Error("Las concentraciones deben ser positivas");
      return out(num(v, "pka") + Math.log10(a / ha), "", ["pH = pKa + log([A⁻]/[HA])"]);
    },
  },
  {
    id: "gas",
    name: "Gas ideal",
    category: "Química",
    formula: "P V = n R T",
    description: "Despeja la presión. T en kelvin. R = 8.314 J/(mol·K).",
    fields: [
      { key: "n", label: "Moles", unit: "mol" },
      { key: "T", label: "Temperatura", unit: "K" },
      { key: "V", label: "Volumen", unit: "m³" },
    ],
    compute: (v) => {
      const V = num(v, "V");
      if (V === 0) throw new Error("V no puede ser 0");
      return out((num(v, "n") * R * num(v, "T")) / V, "Pa", [`R = ${R}`, "P = n R T / V"]);
    },
  },
  {
    id: "boyle",
    name: "Ley de Boyle",
    category: "Química",
    formula: "P₁ V₁ = P₂ V₂",
    description: "Gas ideal a temperatura constante. Despeja P₂.",
    fields: [
      { key: "P1", label: "P₁", unit: "Pa" },
      { key: "V1", label: "V₁", unit: "m³" },
      { key: "V2", label: "V₂", unit: "m³" },
    ],
    compute: (v) => {
      const V2 = num(v, "V2");
      if (V2 === 0) throw new Error("V₂ no puede ser 0");
      return out((num(v, "P1") * num(v, "V1")) / V2, "Pa", ["P₂ = P₁ V₁ / V₂"]);
    },
  },
  {
    id: "arrhenius",
    name: "Arrhenius",
    category: "Química",
    formula: "k = A e^(−Ea/RT)",
    description: "Constante cinética. Ea en J/mol, T en kelvin.",
    fields: [
      { key: "A", label: "Factor A", unit: "1/s" },
      { key: "Ea", label: "Ea", unit: "J/mol" },
      { key: "T", label: "T", unit: "K" },
    ],
    compute: (v) => {
      const T = num(v, "T");
      if (T === 0) throw new Error("T no puede ser 0");
      const k = num(v, "A") * Math.exp(-num(v, "Ea") / (R * T));
      return out(k, "1/s", ["k = A exp(−Ea / R T)"]);
    },
  },
  {
    id: "halflife",
    name: "Vida media",
    category: "Química",
    formula: "N = N₀ (1/2)^(t/t½)",
    description: "Decaimiento de primer orden o radiactivo.",
    fields: [
      { key: "N0", label: "N₀" },
      { key: "t", label: "Tiempo", unit: "s" },
      { key: "th", label: "Vida media", unit: "s" },
    ],
    compute: (v) => {
      const th = num(v, "th");
      if (th === 0) throw new Error("La vida media no puede ser 0");
      return out(num(v, "N0") * 0.5 ** (num(v, "t") / th), "", ["N = N₀ · 2^(−t/t½)"]);
    },
  },
  {
    id: "moles-masa",
    name: "Moles desde la masa",
    category: "Química",
    formula: "n = m / M",
    description: "Masa molar M en g/mol y masa en gramos.",
    fields: [
      { key: "m", label: "Masa", unit: "g" },
      { key: "M", label: "Masa molar", unit: "g/mol" },
    ],
    compute: (v) => {
      const M = num(v, "M");
      if (M === 0) throw new Error("M no puede ser 0");
      const n = num(v, "m") / M;
      return out(n, "mol", ["n = m / M", `moléculas ≈ ${n * NA}`], `N ≈ ${n * NA}`);
    },
  },
  {
    id: "heron",
    name: "Área de un triángulo (Herón)",
    category: "Matemáticas",
    formula: "√[s(s−a)(s−b)(s−c)]",
    description: "s es el semiperímetro.",
    fields: [
      { key: "a", label: "Lado a" },
      { key: "b", label: "Lado b" },
      { key: "c", label: "Lado c" },
    ],
    compute: (v) => {
      const a = num(v, "a");
      const b = num(v, "b");
      const c0 = num(v, "c");
      const s = (a + b + c0) / 2;
      const prod = s * (s - a) * (s - b) * (s - c0);
      if (prod < 0) throw new Error("Esos lados no forman un triángulo");
      return out(Math.sqrt(prod), "", [`s = ${s}`, "Área = √[s(s−a)(s−b)(s−c)]"]);
    },
  },
  {
    id: "quadratic",
    name: "Ecuación cuadrática",
    category: "Matemáticas",
    formula: "x = (−b ± √(b²−4ac)) / 2a",
    description: "Devuelve la raíz con el signo que elijas. El detalle trae la otra y el discriminante.",
    fields: [
      { key: "a", label: "a", defaultValue: "1" },
      { key: "b", label: "b" },
      { key: "c", label: "c" },
      {
        key: "sign",
        label: "Raíz",
        options: [
          { value: "1", label: "+ √" },
          { value: "-1", label: "− √" },
        ],
        defaultValue: "1",
      },
    ],
    compute: (v) => {
      const a = num(v, "a");
      const b = num(v, "b");
      const c0 = num(v, "c");
      if (a === 0) throw new Error("a no puede ser 0");
      const d = b * b - 4 * a * c0;
      if (d < 0) throw new Error(`Discriminante negativo (${d}): raíces complejas`);
      const r1 = (-b + Math.sqrt(d)) / (2 * a);
      const r2 = (-b - Math.sqrt(d)) / (2 * a);
      const pick = num(v, "sign") < 0 ? r2 : r1;
      return out(pick, "", [`Δ = ${d}`, `x₁ = ${r1}`, `x₂ = ${r2}`], `La otra raíz es ${pick === r1 ? r2 : r1}`);
    },
  },
  {
    id: "distance",
    name: "Distancia en el plano",
    category: "Matemáticas",
    formula: "√[(x₂−x₁)² + (y₂−y₁)²]",
    description: "Distancia euclídea entre dos puntos.",
    fields: [
      { key: "x1", label: "x₁", defaultValue: "0" },
      { key: "y1", label: "y₁", defaultValue: "0" },
      { key: "x2", label: "x₂" },
      { key: "y2", label: "y₂" },
    ],
    compute: (v) => out(Math.hypot(num(v, "x2") - num(v, "x1"), num(v, "y2") - num(v, "y1")), "", ["d = √(Δx² + Δy²)"]),
  },
  {
    id: "ncr",
    name: "Combinaciones",
    category: "Matemáticas",
    formula: "C(n, k) = n! / (k! (n−k)!)",
    description: "Grupos sin importar el orden. n y k enteros, 0 ≤ k ≤ n ≤ 500.",
    fields: [
      { key: "n", label: "n" },
      { key: "k", label: "k" },
    ],
    compute: (v) => {
      const n = num(v, "n");
      const k = num(v, "k");
      if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || n < k || n > 500) {
        throw new Error("n y k enteros, 0 ≤ k ≤ n ≤ 500");
      }
      let r = 1;
      for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
      return out(r, "", ["Se multiplica (n−k+i)/i para evitar factoriales enormes"]);
    },
  },
  {
    id: "interest",
    name: "Interés compuesto",
    category: "Matemáticas",
    formula: "A = P (1 + r/n)^(n t)",
    description: "Monto final. r es la tasa anual en decimal (0.08 = 8 %).",
    fields: [
      { key: "P", label: "Capital" },
      { key: "r", label: "Tasa anual", defaultValue: "0.08" },
      { key: "n", label: "Capitalizaciones al año", defaultValue: "12" },
      { key: "t", label: "Años" },
    ],
    compute: (v) => {
      const n = num(v, "n");
      if (n === 0) throw new Error("n no puede ser 0");
      const A = num(v, "P") * (1 + num(v, "r") / n) ** (n * num(v, "t"));
      return out(A, "", ["A = P (1 + r/n)^(n t)"]);
    },
  },
  {
    id: "logbase",
    name: "Cambio de base",
    category: "Matemáticas",
    formula: "log_b(x) = ln x / ln b",
    description: "Logaritmo en cualquier base positiva distinta de 1.",
    fields: [
      { key: "x", label: "Argumento" },
      { key: "b", label: "Base", defaultValue: "2" },
    ],
    compute: (v) => {
      const x = num(v, "x");
      const b = num(v, "b");
      if (x <= 0 || b <= 0 || b === 1) throw new Error("x > 0 y base positiva distinta de 1");
      return out(Math.log(x) / Math.log(b), "", ["log_b(x) = ln x / ln b"]);
    },
  },
  {
    id: "series-a",
    name: "Suma aritmética",
    category: "Matemáticas",
    formula: "S = n/2 · (2a + (n−1)d)",
    description: "Suma de n términos de una progresión aritmética.",
    fields: [
      { key: "a", label: "Primer término" },
      { key: "d", label: "Diferencia" },
      { key: "n", label: "Cantidad de términos" },
    ],
    compute: (v) => {
      const n = num(v, "n");
      return out((n / 2) * (2 * num(v, "a") + (n - 1) * num(v, "d")), "", ["S = n/2 · (2a + (n−1)d)"]);
    },
  },
  {
    id: "pythagoras",
    name: "Pitágoras",
    category: "Matemáticas",
    formula: "c = √(a² + b²)",
    description: "Hipotenusa de un triángulo rectángulo.",
    fields: [
      { key: "a", label: "Cateto a" },
      { key: "b", label: "Cateto b" },
    ],
    compute: (v) => out(Math.hypot(num(v, "a"), num(v, "b")), "", ["c = √(a² + b²)"]),
  },
  {
    id: "circle",
    name: "Círculo",
    category: "Matemáticas",
    formula: "A = π r² ;  C = 2 π r",
    description: "El resultado principal es el área. El detalle incluye la circunferencia.",
    fields: [{ key: "r", label: "Radio" }],
    compute: (v) => {
      const r = num(v, "r");
      return out(Math.PI * r * r, "", ["A = π r²", `C = ${2 * Math.PI * r}`], `Circunferencia = ${2 * Math.PI * r}`);
    },
  },
  {
    id: "sphere",
    name: "Esfera",
    category: "Matemáticas",
    formula: "V = 4/3 π r³",
    description: "Volumen. El detalle trae el área superficial 4πr².",
    fields: [{ key: "r", label: "Radio" }],
    compute: (v) => {
      const r = num(v, "r");
      return out((4 / 3) * Math.PI * r ** 3, "", ["V = 4/3 π r³", `S = ${4 * Math.PI * r * r}`], `Área = ${4 * Math.PI * r * r}`);
    },
  },
  {
    id: "c-to-f",
    name: "Celsius a Fahrenheit",
    category: "Conversiones",
    formula: "°F = °C · 9/5 + 32",
    description: "Temperatura.",
    fields: [{ key: "c", label: "Celsius", unit: "°C" }],
    compute: (v) => out(num(v, "c") * 9 / 5 + 32, "°F", ["F = C · 9/5 + 32"]),
  },
  {
    id: "kmh-ms",
    name: "km/h a m/s",
    category: "Conversiones",
    formula: "m/s = (km/h) / 3.6",
    description: "Velocidad. Para el catálogo completo usa el módulo Conversión.",
    fields: [{ key: "v", label: "Velocidad", unit: "km/h" }],
    compute: (v) => out(num(v, "v") / 3.6, "m/s", ["÷ 3.6"]),
  },
  {
    id: "deg-rad",
    name: "Grados a radianes",
    category: "Conversiones",
    formula: "rad = ° · π/180",
    description: "Ángulo.",
    fields: [{ key: "d", label: "Grados", unit: "°" }],
    compute: (v) => out((num(v, "d") * Math.PI) / 180, "rad", ["rad = ° π / 180"]),
  },
  {
    id: "ev-j",
    name: "Electronvoltios a joules",
    category: "Conversiones",
    formula: "J = eV · e",
    description: "e = 1.602176634×10⁻¹⁹ C.",
    fields: [{ key: "eV", label: "Energía", unit: "eV" }],
    compute: (v) => out(num(v, "eV") * 1.602176634e-19, "J", ["J = eV · 1.602176634e−19"]),
  },
];
