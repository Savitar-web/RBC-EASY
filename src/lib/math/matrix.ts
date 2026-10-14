export type Matrix = number[][];

export function clone(a: Matrix): Matrix {
  return a.map((row) => row.slice());
}

export function dims(a: Matrix): [number, number] {
  return [a.length, a[0]?.length ?? 0];
}

export function zeros(r: number, c: number): Matrix {
  return Array.from({ length: r }, () => Array.from({ length: c }, () => 0));
}

export function identity(n: number): Matrix {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}

export function transpose(a: Matrix): Matrix {
  const [r, c] = dims(a);
  const out = zeros(c, r);
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) out[j]![i] = a[i]![j]!;
  return out;
}

export function add(a: Matrix, b: Matrix, sign = 1): Matrix {
  const [r, c] = dims(a);
  const [rb, cb] = dims(b);
  if (r !== rb || c !== cb) throw new Error("Las matrices deben tener el mismo tamaño");
  return a.map((row, i) => row.map((v, j) => v + sign * b[i]![j]!));
}

export function scale(a: Matrix, k: number): Matrix {
  return a.map((row) => row.map((v) => v * k));
}

export function mul(a: Matrix, b: Matrix): Matrix {
  const [r, n] = dims(a);
  const [rb, c] = dims(b);
  if (n !== rb) throw new Error("Columnas de A deben igualar filas de B");
  const out = zeros(r, c);
  for (let i = 0; i < r; i++) {
    for (let j = 0; j < c; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += a[i]![k]! * b[k]![j]!;
      out[i]![j] = s;
    }
  }
  return out;
}

export function trace(a: Matrix): number {
  const [r, c] = dims(a);
  if (r !== c) throw new Error("La traza pide una matriz cuadrada");
  let s = 0;
  for (let i = 0; i < r; i++) s += a[i]![i]!;
  return s;
}

/** Gauss-Jordan. Returns [rref, detSignProduct] for square inputs used by det. */
function eliminate(src: Matrix, augment?: Matrix): { m: Matrix; aug?: Matrix; det: number; rank: number } {
  const m = clone(src);
  const [rows, cols] = dims(m);
  const aug = augment ? clone(augment) : undefined;
  const augCols = aug ? dims(aug)[1] : 0;
  let det = 1;
  let rank = 0;
  let pivotRow = 0;
  for (let col = 0; col < cols && pivotRow < rows; col++) {
    let best = pivotRow;
    for (let i = pivotRow + 1; i < rows; i++) {
      if (Math.abs(m[i]![col]!) > Math.abs(m[best]![col]!)) best = i;
    }
    if (Math.abs(m[best]![col]!) < 1e-12) continue;
    if (best !== pivotRow) {
      [m[best], m[pivotRow]] = [m[pivotRow]!, m[best]!];
      if (aug) [aug[best], aug[pivotRow]] = [aug[pivotRow]!, aug[best]!];
      det = -det;
    }
    const piv = m[pivotRow]![col]!;
    det *= piv;
    for (let j = col; j < cols; j++) m[pivotRow]![j]! /= piv;
    if (aug) for (let j = 0; j < augCols; j++) aug[pivotRow]![j]! /= piv;
    for (let i = 0; i < rows; i++) {
      if (i === pivotRow) continue;
      const f = m[i]![col]!;
      if (Math.abs(f) < 1e-15) continue;
      for (let j = col; j < cols; j++) m[i]![j]! -= f * m[pivotRow]![j]!;
      if (aug) for (let j = 0; j < augCols; j++) aug[i]![j]! -= f * aug[pivotRow]![j]!;
    }
    pivotRow++;
    rank++;
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) if (Math.abs(m[i]![j]!) < 1e-12) m[i]![j] = 0;
  }
  return { m, aug, det, rank };
}

export function rref(a: Matrix): Matrix {
  return eliminate(a).m;
}

export function rank(a: Matrix): number {
  return eliminate(a).rank;
}

export function det(a: Matrix): number {
  const [r, c] = dims(a);
  if (r !== c) throw new Error("El determinante pide una matriz cuadrada");
  if (r === 0) return 1;
  const { det: d, rank: rk } = eliminate(a);
  if (rk < r) return 0;
  return d;
}

export function inverse(a: Matrix): Matrix {
  const [r, c] = dims(a);
  if (r !== c) throw new Error("La inversa pide una matriz cuadrada");
  const { aug, rank: rk } = eliminate(a, identity(r));
  if (rk < r || !aug) throw new Error("La matriz es singular");
  return aug;
}

/** Characteristic polynomial eigenvalues for 2×2 exact, 3×3 via companion numeric. */
export function eigenvalues(a: Matrix): { values: number[]; note?: string } {
  const [r, c] = dims(a);
  if (r !== c) throw new Error("Los eigenvalores piden una matriz cuadrada");
  if (r === 1) return { values: [a[0]![0]!] };
  if (r === 2) {
    const tr = a[0]![0]! + a[1]![1]!;
    const d = det(a);
    const disc = tr * tr - 4 * d;
    if (disc < -1e-10) {
      const re = tr / 2;
      const im = Math.sqrt(-disc) / 2;
      return { values: [re, im], note: "Par complejo: parte real y parte imaginaria ±" };
    }
    const s = Math.sqrt(Math.max(0, disc));
    return { values: [(tr + s) / 2, (tr - s) / 2] };
  }
  if (r === 3) {
    // Cayley-Hamilton companion of λ³ - tr λ² + σ λ - det = 0, numeric Newton on derivative scan.
    const t = trace(a);
    const d = det(a);
    const a2 = mul(a, a);
    const s2 = trace(a2);
    const sigma = (t * t - s2) / 2;
    const roots: number[] = [];
    const f = (x: number) => x ** 3 - t * x ** 2 + sigma * x - d;
    const df = (x: number) => 3 * x ** 2 - 2 * t * x + sigma;
    for (let guess = -20; guess <= 20; guess += 0.5) {
      let x = guess;
      for (let k = 0; k < 30; k++) {
        const den = df(x);
        if (Math.abs(den) < 1e-12) break;
        x = x - f(x) / den;
      }
      if (Math.abs(f(x)) < 1e-6 && roots.every((r0) => Math.abs(r0 - x) > 1e-4)) roots.push(x);
      if (roots.length === 3) break;
    }
    return { values: roots.sort((p, q) => q - p), note: roots.length < 3 ? "Solo se hallaron raíces reales estables" : undefined };
  }
  throw new Error("Eigenvalores disponibles hasta 3×3");
}

export function formatMatrix(a: Matrix): string {
  return a
    .map((row) => row.map((v) => {
      if (!Number.isFinite(v)) return "—";
      const r = Math.round(v * 1e8) / 1e8;
      return String(r);
    }).join("\t"))
    .join("\n");
}

export function parseGrid(text: string, rows: number, cols: number): Matrix {
  const lines = text.trim().split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const nums = lines.length
    ? lines.map((l) => l.split(/[\s,;]+/).filter(Boolean).map(Number))
    : [];
  if (nums.length === rows && nums.every((r) => r.length === cols && r.every((n) => Number.isFinite(n)))) {
    return nums;
  }
  const flat = text.split(/[\s,;]+/).filter(Boolean).map(Number);
  if (flat.length !== rows * cols || flat.some((n) => !Number.isFinite(n))) {
    throw new Error(`Se esperaban ${rows * cols} números`);
  }
  const out = zeros(rows, cols);
  flat.forEach((n, i) => { out[Math.floor(i / cols)]![i % cols] = n; });
  return out;
}
