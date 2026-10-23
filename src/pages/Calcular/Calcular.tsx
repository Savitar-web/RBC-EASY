/**
 * pages/Calcular/Calcular.tsx
 * Calculadora científica — glassmorphism, teclado grande, √∛∜, historial transparente.
 */

import {
  useCallback, useEffect, useMemo, useRef, useState,
  type CSSProperties, type ReactNode, type KeyboardEvent as RKBD,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Crosshair, ArrowLeftRight, ChartNoAxesCombined } from 'lucide-react';

type FieldDef = {
  key: string;
  label: string;
  unit?: string;
  placeholder?: string;
  type?: 'number' | 'select' | 'text';
  options?: { value: string; label: string }[];
  defaultValue?: string;
};

type SciOp = {
  id: string;
  name: string;
  category: string;
  formula: string;
  description: string;
  fields: FieldDef[];
  compute: (v: Record<string, number | string>) => {
    result: number;
    unit: string;
    detail?: string;
    steps?: string[];
  };
};

type HistoryEntry = {
  id: string;
  expression: string;
  result: string;
  ts: number;
  explanation?: string;
  steps?: string[];
  source?: 'pad' | 'science';
  opName?: string;
};

const C = {
  G: 6.6743e-11, g: 9.80665, c: 299792458, h: 6.62607015e-34, k: 1.380649e-23,
  e: 1.602176634e-19, Na: 6.02214076e23, R: 8.314462618,
  epsilon0: 8.8541878128e-12, mu0: 1.25663706212e-6, sigma: 5.670374419e-8, atm: 101325,
};

const MODULES = [
  { id: 'balistica', name: 'Balística', path: '/balistica', desc: 'Trayectorias, alcance y energía de proyectiles.', icon: '🎯' },
  { id: 'conversion', name: 'Conversión de datos', path: '/conversion', desc: 'Unidades de longitud, masa, energía, presión y temperatura.', icon: '🔄' },
  { id: 'ascendido', name: 'Modo ascendido', path: '/modo-ascendido', desc: 'Herramientas avanzadas y alta precisión.', icon: '⬆' },
] as const;

const CATEGORIES = ['Física', 'Electrostática', 'Química', 'Matemáticas', 'Conversiones'] as const;

function insertThousands(intStr: string): string {
  const digits = intStr.replace(/\D/g, '') || '0';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function shortenPeriodic(d: string): string {
  if (d.length < 8) return d;
  for (let len = 1; len <= 6; len++) {
    const p = d.slice(0, len);
    let r = 0, pos = 0;
    while (pos + len <= d.length && d.slice(pos, pos + len) === p) { r++; pos += len; }
    if (r >= 4 && pos >= d.length * 0.7) return p.repeat(4) + '…';
  }
  return d.length > 48 ? d.slice(0, 48) + '…' : d;
}
function formatDisplay(value: number | string, maxFrac = 40): string {
  if (value === '' || value == null) return '0';
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) return 'Error';
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= 1e100 || (abs > 0 && abs < 1e-80)) return value.toExponential(12);
  if (Number.isInteger(value) || Math.abs(value - Math.round(value)) < 1e-12 * Math.max(1, abs)) {
    const asStr = String(Math.round(value));
    return (asStr.startsWith('-') ? '-' : '') + insertThousands(asStr.replace('-', ''));
  }
  let str = abs >= 1e15 ? value.toFixed(0) : value.toFixed(Math.min(maxFrac, 50));
  if (str.includes('.')) str = str.replace(/\.?0+$/, '');
  const negSign = str.startsWith('-');
  if (negSign) str = str.slice(1);
  const [ip, fp = ''] = str.split('.');
  return (negSign ? '-' : '') + insertThousands(ip) + (fp ? '.' + shortenPeriodic(fp) : '');
}
function stripFormatting(s: string): string { return s.replace(/,/g, ''); }

function safeEval(expr: string, angleMode: 'DEG' | 'RAD' = 'DEG'): number {
  let s = stripFormatting(expr)
    .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/·/g, '*')
    .replace(/[{[]/g, '(').replace(/[}\]]/g, ')')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+√\(/g, (m) => `root(${fromSup(m.slice(0, -2))},`)
    .replace(/∛\(/g, 'root(3,').replace(/∜\(/g, 'root(4,').replace(/√\(/g, 'root(2,')
    .replace(/∛/g, 'root(3,').replace(/∜/g, 'root(4,').replace(/√/g, 'root(2,')
    .replace(/\^/g, '**').replace(/π/g, String(Math.PI)).replace(/\be\b/g, String(Math.E)).trim();
  if (!s) throw new Error('Expresión vacía');
  s = s.replace(/(\d|\))\s*(?=\()/g, '$1*');
  s = s.replace(/(\d|\))\s*(?=[a-zA-Z_])/g, '$1*');
  s = s.replace(/(π|e)\s*(?=\d|\()/g, '$1*');
  s = s.replace(/(\d)\s*(?=π|e\b)/g, '$1*');
  s = s.replace(/\)\s*(?=\d)/g, ')*');
  if (!/^[\d\s+\-*/().%,^a-zA-Z_]+$/.test(s.replace(/\*\*/g, ''))) throw new Error('Caracteres no permitidos');
  const toRad = angleMode === 'DEG' ? (x: number) => (x * Math.PI) / 180 : (x: number) => x;
  const fromRad = angleMode === 'DEG' ? (x: number) => (x * 180) / Math.PI : (x: number) => x;
  const fns: Record<string, (...a: number[]) => number> = {
    sqrt: Math.sqrt, cbrt: Math.cbrt,
    abs: Math.abs,
    sin: (x) => Math.sin(toRad(x)), cos: (x) => Math.cos(toRad(x)), tan: (x) => Math.tan(toRad(x)),
    asin: (x) => fromRad(Math.asin(x)), acos: (x) => fromRad(Math.acos(x)), atan: (x) => fromRad(Math.atan(x)),
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    log: Math.log10, ln: Math.log, exp: Math.exp, floor: Math.floor, ceil: Math.ceil, round: Math.round,
    fact: (n: number) => {
      if (n < 0 || !Number.isInteger(n) || n > 170) throw new Error('Factorial inválido (0–170)');
      let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
    },
    root: (x: number, n: number) => {
      if (n === 0) throw new Error('Índice 0');
      if (x < 0 && n % 2 === 0) throw new Error('Raíz par de negativo');
      return Math.sign(x) * Math.abs(x) ** (1 / n);
    },
  };
  for (const name of Object.keys(fns).sort((a, b) => b.length - a.length)) {
    s = s.replace(new RegExp('\\b' + name + '\\b', 'g'), 'fns.' + name);
  }
  // eslint-disable-next-line no-new-func
  const fn = new Function('fns', '"use strict"; return (' + s + ');');
  const result = fn(fns);
  if (typeof result !== 'number' || !Number.isFinite(result)) throw new Error('Resultado no numérico');
  return result;
}

function num(v: number | string, key: string): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.').replace(/\s/g, ''));
  if (!Number.isFinite(n)) throw new Error('Valor inválido en «' + key + '»');
  return n;
}

const OPERATIONS: SciOp[] = [
  {
    id: 'fuerza',
    name: 'Fuerza (2.a Ley de Newton)',
    category: 'Física',
    formula: 'F = m · a',
    description: 'Fuerza neta = masa × aceleración. Unidad: Newton (N).',
    fields: [
      { key: 'm', label: 'Masa', unit: 'kg' },
      { key: 'a', label: 'Aceleración', unit: 'm/s²' }
    ],
    compute: (v) => { return { result: num(v.m, 'm') * num(v.a, 'a'), unit: 'N' }; },
  },
  {
    id: 'aceleracion',
    name: 'Aceleración',
    category: 'Física',
    formula: 'a = (v − v₀) / t',
    description: 'Cambio de velocidad por unidad de tiempo.',
    fields: [
      { key: 'v', label: 'Velocidad final', unit: 'm/s' },
      { key: 'v0', label: 'Velocidad inicial', unit: 'm/s', defaultValue: '0' },
      { key: 't', label: 'Tiempo', unit: 's' }
    ],
    compute: (v) => { const t = num(v.t, 't'); if (t === 0) throw new Error('El tiempo no puede ser 0'); return { result: (num(v.v, 'v') - num(v.v0, 'v0')) / t, unit: 'm/s²' }; },
  },
  {
    id: 'masa',
    name: 'Masa',
    category: 'Física',
    formula: 'm = F / a',
    description: 'Masa a partir de fuerza y aceleración.',
    fields: [
      { key: 'F', label: 'Fuerza', unit: 'N' },
      { key: 'a', label: 'Aceleración', unit: 'm/s²' }
    ],
    compute: (v) => { const a = num(v.a, 'a'); if (a === 0) throw new Error('a no puede ser 0'); return { result: num(v.F, 'F') / a, unit: 'kg' }; },
  },
  {
    id: 'energia-cinetica',
    name: 'Energía Cinética',
    category: 'Física',
    formula: 'Ec = ½ m v²',
    description: 'Energía debida al movimiento.',
    fields: [
      { key: 'm', label: 'Masa', unit: 'kg' },
      { key: 'v', label: 'Velocidad', unit: 'm/s' }
    ],
    compute: (v) => { return { result: 0.5 * num(v.m, 'm') * num(v.v, 'v') ** 2, unit: 'J' }; },
  },
  {
    id: 'energia-potencial-g',
    name: 'Energía Potencial Gravitatoria',
    category: 'Física',
    formula: 'Ep = m g h',
    description: 'Energía por posición en campo gravitatorio.',
    fields: [
      { key: 'm', label: 'Masa', unit: 'kg' },
      { key: 'h', label: 'Altura', unit: 'm' },
      { key: 'g', label: 'g', unit: 'm/s²', defaultValue: '9.80665' }
    ],
    compute: (v) => { return { result: num(v.m, 'm') * num(v.g, 'g') * num(v.h, 'h'), unit: 'J' }; },
  },
  {
    id: 'energia-elastica',
    name: 'Energía Potencial Elástica',
    category: 'Física',
    formula: 'Ee = ½ k x²',
    description: 'Energía almacenada en un resorte.',
    fields: [
      { key: 'k', label: 'Constante k', unit: 'N/m' },
      { key: 'x', label: 'Deformación', unit: 'm' }
    ],
    compute: (v) => { return { result: 0.5 * num(v.k, 'k') * num(v.x, 'x') ** 2, unit: 'J' }; },
  },
  {
    id: 'trabajo',
    name: 'Trabajo',
    category: 'Física',
    formula: 'W = F d cos(θ)',
    description: 'Trabajo mecánico de una fuerza.',
    fields: [
      { key: 'F', label: 'Fuerza', unit: 'N' },
      { key: 'd', label: 'Desplazamiento', unit: 'm' },
      { key: 'theta', label: 'Ángulo', unit: '°', defaultValue: '0' }
    ],
    compute: (v) => { return { result: num(v.F, 'F') * num(v.d, 'd') * Math.cos((num(v.theta, 'θ') * Math.PI) / 180), unit: 'J' }; },
  },
  {
    id: 'potencia',
    name: 'Potencia',
    category: 'Física',
    formula: 'P = W / t',
    description: 'Trabajo por unidad de tiempo.',
    fields: [
      { key: 'W', label: 'Trabajo', unit: 'J' },
      { key: 't', label: 'Tiempo', unit: 's' }
    ],
    compute: (v) => { const t = num(v.t, 't'); if (t === 0) throw new Error('t no puede ser 0'); return { result: num(v.W, 'W') / t, unit: 'W' }; },
  },
  {
    id: 'presion',
    name: 'Presión',
    category: 'Física',
    formula: 'P = F / A',
    description: 'Fuerza por unidad de área.',
    fields: [
      { key: 'F', label: 'Fuerza', unit: 'N' },
      { key: 'A', label: 'Área', unit: 'm²' }
    ],
    compute: (v) => { const A = num(v.A, 'A'); if (A === 0) throw new Error('A no puede ser 0'); return { result: num(v.F, 'F') / A, unit: 'Pa' }; },
  },
  {
    id: 'velocidad',
    name: 'Velocidad media',
    category: 'Física',
    formula: 'v = d / t',
    description: 'Distancia entre tiempo.',
    fields: [
      { key: 'd', label: 'Distancia', unit: 'm' },
      { key: 't', label: 'Tiempo', unit: 's' }
    ],
    compute: (v) => { const t = num(v.t, 't'); if (t === 0) throw new Error('t no puede ser 0'); return { result: num(v.d, 'd') / t, unit: 'm/s' }; },
  },
  {
    id: 'distancia-mru',
    name: 'Distancia (MRU)',
    category: 'Física',
    formula: 'd = v t',
    description: 'Distancia en movimiento rectilíneo uniforme.',
    fields: [
      { key: 'v', label: 'Velocidad', unit: 'm/s' },
      { key: 't', label: 'Tiempo', unit: 's' }
    ],
    compute: (v) => { return { result: num(v.v, 'v') * num(v.t, 't'), unit: 'm' }; },
  },
  {
    id: 'mua',
    name: 'MUA (desplazamiento)',
    category: 'Física',
    formula: 'd = v₀t + ½at²',
    description: 'Desplazamiento con aceleración constante.',
    fields: [
      { key: 'v0', label: 'Velocidad inicial', unit: 'm/s', defaultValue: '0' },
      { key: 'a', label: 'Aceleración', unit: 'm/s²' },
      { key: 't', label: 'Tiempo', unit: 's' }
    ],
    compute: (v) => { const t = num(v.t, 't'); return { result: num(v.v0, 'v0') * t + 0.5 * num(v.a, 'a') * t * t, unit: 'm' }; },
  },
  {
    id: 'gravitacion',
    name: 'Ley de Gravitación Universal',
    category: 'Física',
    formula: 'F = G m₁ m₂ / r²',
    description: 'Fuerza atractiva entre dos masas.',
    fields: [
      { key: 'm1', label: 'Masa 1', unit: 'kg' },
      { key: 'm2', label: 'Masa 2', unit: 'kg' },
      { key: 'r', label: 'Distancia', unit: 'm' }
    ],
    compute: (v) => { const r = num(v.r, 'r'); if (r === 0) throw new Error('r no puede ser 0'); return { result: (C.G * num(v.m1, 'm1') * num(v.m2, 'm2')) / (r * r), unit: 'N' }; },
  },
  {
    id: 'hooke',
    name: 'Ley de Hooke',
    category: 'Física',
    formula: 'F = −k x',
    description: 'Fuerza restauradora de un resorte.',
    fields: [
      { key: 'k', label: 'Constante k', unit: 'N/m' },
      { key: 'x', label: 'Deformación', unit: 'm' }
    ],
    compute: (v) => { return { result: -num(v.k, 'k') * num(v.x, 'x'), unit: 'N' }; },
  },
  {
    id: 'centripeta',
    name: 'Aceleración Centrípeta',
    category: 'Física',
    formula: 'a = v² / r',
    description: 'Aceleración hacia el centro en MCU.',
    fields: [
      { key: 'v', label: 'Velocidad', unit: 'm/s' },
      { key: 'r', label: 'Radio', unit: 'm' }
    ],
    compute: (v) => { const r = num(v.r, 'r'); if (r === 0) throw new Error('r no puede ser 0'); return { result: (num(v.v, 'v') ** 2) / r, unit: 'm/s²' }; },
  },
  {
    id: 'ohm',
    name: 'Ley de Ohm',
    category: 'Física',
    formula: 'V = I R',
    description: 'Relación voltaje-corriente-resistencia.',
    fields: [
      { key: 'I', label: 'Corriente', unit: 'A' },
      { key: 'R', label: 'Resistencia', unit: 'Ω' }
    ],
    compute: (v) => { return { result: num(v.I, 'I') * num(v.R, 'R'), unit: 'V' }; },
  },
  {
    id: 'coulomb',
    name: 'Ley de Coulomb',
    category: 'Física',
    formula: 'F = k q₁ q₂ / r²',
    description: 'Fuerza entre dos cargas puntuales. k = 8.99×10⁹.',
    fields: [
      { key: 'q1', label: 'Carga 1', unit: 'C' },
      { key: 'q2', label: 'Carga 2', unit: 'C' },
      { key: 'r', label: 'Distancia', unit: 'm' }
    ],
    compute: (v) => { const r = num(v.r, 'r'); if (r === 0) throw new Error('r no puede ser 0'); return { result: (8.9875517923e9 * num(v.q1, 'q1') * num(v.q2, 'q2')) / (r * r), unit: 'N' }; },
  },
  {
    id: 'momento-lineal',
    name: 'Momento Lineal',
    category: 'Física',
    formula: 'p = m v',
    description: 'Cantidad de movimiento.',
    fields: [
      { key: 'm', label: 'Masa', unit: 'kg' },
      { key: 'v', label: 'Velocidad', unit: 'm/s' }
    ],
    compute: (v) => { return { result: num(v.m, 'm') * num(v.v, 'v'), unit: 'kg·m/s' }; },
  },
  {
    id: 'impulso',
    name: 'Impulso',
    category: 'Física',
    formula: 'J = F Δt',
    description: 'Impulso = fuerza × tiempo.',
    fields: [
      { key: 'F', label: 'Fuerza', unit: 'N' },
      { key: 'dt', label: 'Δt', unit: 's' }
    ],
    compute: (v) => { return { result: num(v.F, 'F') * num(v.dt, 'Δt'), unit: 'N·s' }; },
  },
  {
    id: 'peso',
    name: 'Peso',
    category: 'Física',
    formula: 'W = m g',
    description: 'Peso cerca de la superficie terrestre.',
    fields: [
      { key: 'm', label: 'Masa', unit: 'kg' },
      { key: 'g', label: 'g', unit: 'm/s²', defaultValue: '9.80665' }
    ],
    compute: (v) => { return { result: num(v.m, 'm') * num(v.g, 'g'), unit: 'N' }; },
  },
  {
    id: 'densidad',
    name: 'Densidad',
    category: 'Física',
    formula: 'ρ = m / V',
    description: 'Masa por unidad de volumen.',
    fields: [
      { key: 'm', label: 'Masa', unit: 'kg' },
      { key: 'V', label: 'Volumen', unit: 'm³' }
    ],
    compute: (v) => { const V = num(v.V, 'V'); if (V === 0) throw new Error('V no puede ser 0'); return { result: num(v.m, 'm') / V, unit: 'kg/m³' }; },
  },
  {
    id: 'stefan',
    name: 'Ley de Stefan-Boltzmann',
    category: 'Física',
    formula: 'P = σ A T⁴',
    description: 'Potencia radiada por cuerpo negro.',
    fields: [
      { key: 'A', label: 'Área', unit: 'm²' },
      { key: 'T', label: 'Temperatura', unit: 'K' }
    ],
    compute: (v) => { return { result: C.sigma * num(v.A, 'A') * num(v.T, 'T') ** 4, unit: 'W' }; },
  },
  {
    id: 'ideal-gas-p',
    name: 'Gases Ideales (P)',
    category: 'Física',
    formula: 'P = nRT / V',
    description: 'Presión de un gas ideal.',
    fields: [
      { key: 'n', label: 'Moles', unit: 'mol' },
      { key: 'T', label: 'Temperatura', unit: 'K' },
      { key: 'V', label: 'Volumen', unit: 'm³' }
    ],
    compute: (v) => { const V = num(v.V, 'V'); if (V === 0) throw new Error('V no puede ser 0'); return { result: (num(v.n, 'n') * C.R * num(v.T, 'T')) / V, unit: 'Pa' }; },
  },
  {
    id: 'torque',
    name: 'Torque',
    category: 'Física',
    formula: 'τ = F d sin(θ)',
    description: 'Momento de una fuerza.',
    fields: [
      { key: 'F', label: 'Fuerza', unit: 'N' },
      { key: 'd', label: 'Brazo', unit: 'm' },
      { key: 'theta', label: 'Ángulo', unit: '°', defaultValue: '90' }
    ],
    compute: (v) => { return { result: num(v.F, 'F') * num(v.d, 'd') * Math.sin((num(v.theta, 'θ') * Math.PI) / 180), unit: 'N·m' }; },
  },
  {
    id: 'periodo-mcu',
    name: 'Periodo (MCU)',
    category: 'Física',
    formula: 'T = 2πr / v',
    description: 'Tiempo de una vuelta completa.',
    fields: [
      { key: 'r', label: 'Radio', unit: 'm' },
      { key: 'v', label: 'Velocidad', unit: 'm/s' }
    ],
    compute: (v) => { const vel = num(v.v, 'v'); if (vel === 0) throw new Error('v no puede ser 0'); return { result: (2 * Math.PI * num(v.r, 'r')) / vel, unit: 's' }; },
  },
  {
    id: 'frecuencia-mcu',
    name: 'Frecuencia (MCU)',
    category: 'Física',
    formula: 'f = 1 / T',
    description: 'Vueltas por segundo.',
    fields: [
      { key: 'T', label: 'Periodo', unit: 's' }
    ],
    compute: (v) => { const T = num(v.T, 'T'); if (T === 0) throw new Error('T no puede ser 0'); return { result: 1 / T, unit: 'Hz' }; },
  },
  {
    id: 'escape',
    name: 'Velocidad de Escape',
    category: 'Física',
    formula: 'v = √(2GM / r)',
    description: 'Velocidad mínima para escapar del campo gravitatorio.',
    fields: [
      { key: 'M', label: 'Masa', unit: 'kg' },
      { key: 'r', label: 'Radio', unit: 'm' }
    ],
    compute: (v) => { const r = num(v.r, 'r'); if (r <= 0) throw new Error('r > 0'); return { result: Math.sqrt((2 * C.G * num(v.M, 'M')) / r), unit: 'm/s' }; },
  },
  {
    id: 'fotones',
    name: 'Energía de un Fotón',
    category: 'Física',
    formula: 'E = h f',
    description: 'Energía de un fotón de frecuencia f.',
    fields: [
      { key: 'f', label: 'Frecuencia', unit: 'Hz' }
    ],
    compute: (v) => { return { result: C.h * num(v.f, 'f'), unit: 'J' }; },
  },
  {
    id: 'de-broglie',
    name: 'Longitud de Onda de Broglie',
    category: 'Física',
    formula: 'λ = h / p',
    description: 'Longitud de onda asociada a momento p.',
    fields: [
      { key: 'p', label: 'Momento', unit: 'kg·m/s' }
    ],
    compute: (v) => { const p = num(v.p, 'p'); if (p === 0) throw new Error('p no puede ser 0'); return { result: C.h / p, unit: 'm' }; },
  },
  {
    id: 'snell',
    name: 'Ley de Snell',
    category: 'Física',
    formula: 'n₁ sin θ₁ = n₂ sin θ₂',
    description: 'Ángulo de refracción θ₂.',
    fields: [
      { key: 'n1', label: 'n₁', defaultValue: '1' },
      { key: 'n2', label: 'n₂' },
      { key: 'theta1', label: 'θ₁', unit: '°' }
    ],
    compute: (v) => { const n2 = num(v.n2, 'n2'); if (n2 === 0) throw new Error('n₂ no puede ser 0'); const s = (num(v.n1, 'n1') / n2) * Math.sin((num(v.theta1, 'θ1') * Math.PI) / 180); if (Math.abs(s) > 1) throw new Error('Reflexión total interna'); return { result: (Math.asin(s) * 180) / Math.PI, unit: '°' }; },
  },
  {
    id: 'celsius-kelvin',
    name: '°C ↔ K',
    category: 'Física',
    formula: 'K = °C + 273.15',
    description: 'Conversión Celsius-Kelvin.',
    fields: [
      { key: 'dir', label: 'Dirección', type: 'select', defaultValue: 'c2k', options: [{ value: 'c2k', label: '°C → K' }, { value: 'k2c', label: 'K → °C' }] },
      { key: 't', label: 'Temperatura' }
    ],
    compute: (v) => { const t = num(v.t, 't'); if (v.dir === 'k2c') return { result: t - 273.15, unit: '°C' }; return { result: t + 273.15, unit: 'K' }; },
  },
  {
    id: 'celsius-fahrenheit',
    name: '°C ↔ °F',
    category: 'Física',
    formula: '°F = °C·9/5 + 32',
    description: 'Conversión Celsius-Fahrenheit.',
    fields: [
      { key: 'dir', label: 'Dirección', type: 'select', defaultValue: 'c2f', options: [{ value: 'c2f', label: '°C → °F' }, { value: 'f2c', label: '°F → °C' }] },
      { key: 't', label: 'Temperatura' }
    ],
    compute: (v) => { const t = num(v.t, 't'); if (v.dir === 'f2c') return { result: ((t - 32) * 5) / 9, unit: '°C' }; return { result: (t * 9) / 5 + 32, unit: '°F' }; },
  },
  {
    id: 'calor',
    name: 'Calor (Q = mcΔT)',
    category: 'Física',
    formula: 'Q = m c ΔT',
    description: 'Calor para cambiar temperatura.',
    fields: [
      { key: 'm', label: 'Masa', unit: 'kg' },
      { key: 'c', label: 'Calor específico', unit: 'J/(kg·K)' },
      { key: 'dT', label: 'ΔT', unit: 'K' }
    ],
    compute: (v) => { return { result: num(v.m, 'm') * num(v.c, 'c') * num(v.dT, 'ΔT'), unit: 'J' }; },
  },
  {
    id: 'resistencia-serie',
    name: 'Resistencias en Serie',
    category: 'Física',
    formula: 'R = R₁ + R₂ + R₃',
    description: 'Equivalente en serie.',
    fields: [
      { key: 'r1', label: 'R₁', unit: 'Ω' },
      { key: 'r2', label: 'R₂', unit: 'Ω', defaultValue: '0' },
      { key: 'r3', label: 'R₃', unit: 'Ω', defaultValue: '0' }
    ],
    compute: (v) => { return { result: num(v.r1, 'R1') + num(v.r2, 'R2') + num(v.r3, 'R3'), unit: 'Ω' }; },
  },
  {
    id: 'resistencia-paralelo',
    name: 'Resistencias en Paralelo',
    category: 'Física',
    formula: '1/R = 1/R₁ + 1/R₂',
    description: 'Equivalente en paralelo (2).',
    fields: [
      { key: 'r1', label: 'R₁', unit: 'Ω' },
      { key: 'r2', label: 'R₂', unit: 'Ω' }
    ],
    compute: (v) => { const r1 = num(v.r1, 'R1'); const r2 = num(v.r2, 'R2'); if (r1 === 0 || r2 === 0) throw new Error('R no puede ser 0'); return { result: (r1 * r2) / (r1 + r2), unit: 'Ω' }; },
  },
  {
    id: 'campo-b-hilo',
    name: 'Campo B (hilo recto)',
    category: 'Física',
    formula: 'B = μ₀ I / (2πr)',
    description: 'Campo magnético de un hilo recto.',
    fields: [
      { key: 'I', label: 'Corriente', unit: 'A' },
      { key: 'r', label: 'Distancia', unit: 'm' }
    ],
    compute: (v) => { const r = num(v.r, 'r'); if (r === 0) throw new Error('r no puede ser 0'); return { result: (C.mu0 * num(v.I, 'I')) / (2 * Math.PI * r), unit: 'T' }; },
  },
  {
    id: 'energia-reposo',
    name: 'Energía en Reposo',
    category: 'Física',
    formula: 'E = m c²',
    description: 'Energía en reposo (Einstein).',
    fields: [
      { key: 'm', label: 'Masa', unit: 'kg' }
    ],
    compute: (v) => { return { result: num(v.m, 'm') * C.c * C.c, unit: 'J' }; },
  },
  {
    id: 'gauss-flujo',
    name: 'Ley de Gauss (flujo)',
    category: 'Electrostática',
    formula: 'Φ = Qenc / ε₀',
    description: 'Flujo eléctrico a través de una superficie gaussiana cerrada.',
    fields: [
      { key: 'Q', label: 'Carga encerrada', unit: 'C' }
    ],
    compute: (v) => { return { result: num(v.Q, 'Q') / C.epsilon0, unit: 'N·m²/C' }; },
  },
  {
    id: 'gauss-carga',
    name: 'Carga desde flujo',
    category: 'Electrostática',
    formula: 'Qenc = ε₀ Φ',
    description: 'Carga encerrada a partir del flujo eléctrico.',
    fields: [
      { key: 'Phi', label: 'Flujo Φ', unit: 'N·m²/C' }
    ],
    compute: (v) => { return { result: C.epsilon0 * num(v.Phi, 'Φ'), unit: 'C' }; },
  },
  {
    id: 'campo-esfera-fuera',
    name: 'Campo E (fuera de esfera)',
    category: 'Electrostática',
    formula: 'E = kQ / r²',
    description: 'Campo eléctrico fuera de una distribución esférica de carga.',
    fields: [
      { key: 'Q', label: 'Carga Q', unit: 'C' },
      { key: 'r', label: 'Distancia r', unit: 'm' }
    ],
    compute: (v) => { const r = num(v.r, 'r'); if (r === 0) throw new Error('r no puede ser 0'); return { result: (8.9875517923e9 * num(v.Q, 'Q')) / (r * r), unit: 'N/C' }; },
  },
  {
    id: 'carga-desde-E',
    name: 'Carga desde E y r',
    category: 'Electrostática',
    formula: 'Q = E r² / k',
    description: 'Carga a partir del campo y la distancia (fuera).',
    fields: [
      { key: 'E', label: 'Campo E', unit: 'N/C' },
      { key: 'r', label: 'Distancia r', unit: 'm' }
    ],
    compute: (v) => { return { result: (num(v.E, 'E') * num(v.r, 'r') ** 2) / 8.9875517923e9, unit: 'C' }; },
  },
  {
    id: 'densidad-volumetrica',
    name: 'Densidad volumétrica ρ',
    category: 'Electrostática',
    formula: 'ρ = Q / [(4/3)πR³]',
    description: 'Densidad de carga uniforme en esfera sólida.',
    fields: [
      { key: 'Q', label: 'Carga Q', unit: 'C' },
      { key: 'R', label: 'Radio R', unit: 'm' }
    ],
    compute: (v) => { const R = num(v.R, 'R'); if (R === 0) throw new Error('R no puede ser 0'); return { result: num(v.Q, 'Q') / ((4 / 3) * Math.PI * R ** 3), unit: 'C/m³' }; },
  },
  {
    id: 'campo-esfera-dentro',
    name: 'Campo E (dentro de esfera)',
    category: 'Electrostática',
    formula: 'E = k Q r / R³',
    description: 'Campo dentro de esfera aislante de carga uniforme.',
    fields: [
      { key: 'Q', label: 'Carga total Q', unit: 'C' },
      { key: 'r', label: 'Distancia r', unit: 'm' },
      { key: 'R', label: 'Radio R', unit: 'm' }
    ],
    compute: (v) => { const R = num(v.R, 'R'); if (R === 0) throw new Error('R no puede ser 0'); return { result: (8.9875517923e9 * num(v.Q, 'Q') * num(v.r, 'r')) / (R ** 3), unit: 'N/C' }; },
  },
  {
    id: 'flujo-cara-cubo',
    name: 'Flujo por cara de un cubo',
    category: 'Electrostática',
    formula: 'Φcara = (Q + 6q) / (6 ε₀)',
    description: 'Carga Q en el centro y carga q en cada cara → flujo por una cara.',
    fields: [
      { key: 'Q', label: 'Carga central Q', unit: 'C' },
      { key: 'q', label: 'Carga en cada cara q', unit: 'C' }
    ],
    compute: (v) => { const Qenc = num(v.Q, 'Q') + 6 * num(v.q, 'q'); return { result: Qenc / (6 * C.epsilon0), unit: 'N·m²/C' }; },
  },
  {
    id: 'densidad-cascaron',
    name: 'Densidad cascarón grueso',
    category: 'Electrostática',
    formula: 'ρ = Q / [(4/3)π(R₂³−R₁³)]',
    description: 'Densidad de carga en cascarón esférico grueso no conductor.',
    fields: [
      { key: 'Q', label: 'Carga Q', unit: 'C' },
      { key: 'R1', label: 'Radio interior R₁', unit: 'm' },
      { key: 'R2', label: 'Radio exterior R₂', unit: 'm' }
    ],
    compute: (v) => { const R1 = num(v.R1, 'R1'); const R2 = num(v.R2, 'R2'); const den = (4 / 3) * Math.PI * (R2 ** 3 - R1 ** 3); if (den === 0) throw new Error('R₂ debe ser > R₁'); return { result: num(v.Q, 'Q') / den, unit: 'C/m³' }; },
  },
  {
    id: 'campo-cascaron-interior',
    name: 'E en cascarón (R₁<r<R₂)',
    category: 'Electrostática',
    formula: 'E = kQ(r³−R₁³)/[r²(R₂³−R₁³)]',
    description: 'Campo en la región interior del cascarón grueso no conductor.',
    fields: [
      { key: 'Q', label: 'Carga Q', unit: 'C' },
      { key: 'r', label: 'Distancia r', unit: 'm' },
      { key: 'R1', label: 'R₁', unit: 'm' },
      { key: 'R2', label: 'R₂', unit: 'm' }
    ],
    compute: (v) => { const r = num(v.r, 'r'); const R1 = num(v.R1, 'R1'); const R2 = num(v.R2, 'R2'); if (r === 0) throw new Error('r no puede ser 0'); const den = r * r * (R2 ** 3 - R1 ** 3); if (den === 0) throw new Error('Denominador 0'); return { result: (8.9875517923e9 * num(v.Q, 'Q') * (r ** 3 - R1 ** 3)) / den, unit: 'N/C' }; },
  },
  {
    id: 'campo-cascarones',
    name: 'E dos cascarones metálicos',
    category: 'Electrostática',
    formula: 'E según región (r, R, q)',
    description: 'Cascarones concéntricos: interior E=0; entre ellos E=kq/r²; exterior E=−kq/r² (cargas +q y −q).',
    fields: [
      { key: 'region', label: 'Región', type: 'select', defaultValue: 'entre', options: [{ value: 'dentro', label: 'r < R (interior)' }, { value: 'entre', label: 'R < r < 2R' }, { value: 'fuera', label: 'r > 2R' }] },
      { key: 'q', label: 'Carga q', unit: 'C' },
      { key: 'r', label: 'Distancia r', unit: 'm' }
    ],
    compute: (v) => { const region = String(v.region); if (region === 'dentro') return { result: 0, unit: 'N/C', detail: 'E = 0 (conductor)' }; const r = num(v.r, 'r'); if (r === 0) throw new Error('r no puede ser 0'); const E = (8.9875517923e9 * num(v.q, 'q')) / (r * r); if (region === 'fuera') return { result: -E, unit: 'N/C', detail: 'E = −kq/r²' }; return { result: E, unit: 'N/C', detail: 'E = kq/r²' }; },
  },
  {
    id: 'flujo-cubo-campo',
    name: 'Flujo en cubo (campo no uniforme)',
    category: 'Electrostática',
    formula: 'Φ = a⁴[b + (c−d)/2]',
    description: 'Cubo de lado a con E = (b x³ + c x y²) î + (d x² y) ĵ. Flujo total y carga.',
    fields: [
      { key: 'a', label: 'Lado a', unit: 'm' },
      { key: 'b', label: 'Coef. b' },
      { key: 'c', label: 'Coef. c' },
      { key: 'd', label: 'Coef. d' }
    ],
    compute: (v) => { const a = num(v.a, 'a'); const Phi = (a ** 4) * (num(v.b, 'b') + (num(v.c, 'c') - num(v.d, 'd')) / 2); return { result: Phi, unit: 'N·m²/C', detail: 'Qenc = ε₀Φ = ' + (C.epsilon0 * Phi) }; },
  },
  {
    id: 'campo-plano',
    name: 'Campo de plano infinito',
    category: 'Electrostática',
    formula: 'E = σ / (2 ε₀)',
    description: 'Campo de una lámina infinita con densidad superficial σ.',
    fields: [
      { key: 'sigma', label: 'Densidad σ', unit: 'C/m²' }
    ],
    compute: (v) => { return { result: Math.abs(num(v.sigma, 'σ')) / (2 * C.epsilon0), unit: 'N/C' }; },
  },
  {
    id: 'campo-linea',
    name: 'Campo de línea infinita',
    category: 'Electrostática',
    formula: 'E = 2kλ / r',
    description: 'Campo de una línea infinita con densidad lineal λ.',
    fields: [
      { key: 'lambda', label: 'Densidad λ', unit: 'C/m' },
      { key: 'r', label: 'Distancia r', unit: 'm' }
    ],
    compute: (v) => { const r = num(v.r, 'r'); if (r === 0) throw new Error('r no puede ser 0'); return { result: (2 * 8.9875517923e9 * num(v.lambda, 'λ')) / r, unit: 'N/C' }; },
  },
  {
    id: 'potencial-punto',
    name: 'Potencial de carga puntual',
    category: 'Electrostática',
    formula: 'V = kQ / r',
    description: 'Potencial eléctrico de una carga puntual (V∞=0).',
    fields: [
      { key: 'Q', label: 'Carga Q', unit: 'C' },
      { key: 'r', label: 'Distancia r', unit: 'm' }
    ],
    compute: (v) => { const r = num(v.r, 'r'); if (r === 0) throw new Error('r no puede ser 0'); return { result: (8.9875517923e9 * num(v.Q, 'Q')) / r, unit: 'V' }; },
  },
  {
    id: 'energia-dos-cargas',
    name: 'Energía potencial (2 cargas)',
    category: 'Electrostática',
    formula: 'U = k q₁ q₂ / r',
    description: 'Energía potencial del sistema de dos cargas.',
    fields: [
      { key: 'q1', label: 'Carga 1', unit: 'C' },
      { key: 'q2', label: 'Carga 2', unit: 'C' },
      { key: 'r', label: 'Distancia', unit: 'm' }
    ],
    compute: (v) => { const r = num(v.r, 'r'); if (r === 0) throw new Error('r no puede ser 0'); return { result: (8.9875517923e9 * num(v.q1, 'q1') * num(v.q2, 'q2')) / r, unit: 'J' }; },
  },
  {
    id: 'capacitancia-plano',
    name: 'Capacitancia plano-paralelo',
    category: 'Electrostática',
    formula: 'C = ε₀ A / d',
    description: 'Capacitancia de un condensador de placas paralelas.',
    fields: [
      { key: 'A', label: 'Área', unit: 'm²' },
      { key: 'd', label: 'Separación', unit: 'm' }
    ],
    compute: (v) => { const d = num(v.d, 'd'); if (d === 0) throw new Error('d no puede ser 0'); return { result: (C.epsilon0 * num(v.A, 'A')) / d, unit: 'F' }; },
  },
  {
    id: 'moles',
    name: 'Número de Moles',
    category: 'Química',
    formula: 'n = m / M',
    description: 'Moles a partir de masa y masa molar.',
    fields: [
      { key: 'm', label: 'Masa', unit: 'g' },
      { key: 'M', label: 'Masa molar', unit: 'g/mol' }
    ],
    compute: (v) => { const M = num(v.M, 'M'); if (M === 0) throw new Error('M no puede ser 0'); return { result: num(v.m, 'm') / M, unit: 'mol' }; },
  },
  {
    id: 'molaridad',
    name: 'Molaridad',
    category: 'Química',
    formula: 'M = n / V',
    description: 'Moles de soluto por litro.',
    fields: [
      { key: 'n', label: 'Moles', unit: 'mol' },
      { key: 'V', label: 'Volumen', unit: 'L' }
    ],
    compute: (v) => { const V = num(v.V, 'V'); if (V === 0) throw new Error('V no puede ser 0'); return { result: num(v.n, 'n') / V, unit: 'mol/L' }; },
  },
  {
    id: 'molalidad',
    name: 'Molalidad',
    category: 'Química',
    formula: 'm = n / kg',
    description: 'Moles por kg de disolvente.',
    fields: [
      { key: 'n', label: 'Moles', unit: 'mol' },
      { key: 'kg', label: 'Disolvente', unit: 'kg' }
    ],
    compute: (v) => { const kg = num(v.kg, 'kg'); if (kg === 0) throw new Error('kg no puede ser 0'); return { result: num(v.n, 'n') / kg, unit: 'mol/kg' }; },
  },
  {
    id: 'ph',
    name: 'pH desde [H+]',
    category: 'Química',
    formula: 'pH = −log₁₀[H+]',
    description: 'pH a partir de [H+].',
    fields: [
      { key: 'H', label: '[H+]', unit: 'mol/L' }
    ],
    compute: (v) => { const H = num(v.H, 'H'); if (H <= 0) throw new Error('[H+] > 0'); return { result: -Math.log10(H), unit: '' }; },
  },
  {
    id: 'poh',
    name: 'pOH desde [OH-]',
    category: 'Química',
    formula: 'pOH = −log₁₀[OH-]',
    description: 'pOH a partir de [OH-].',
    fields: [
      { key: 'OH', label: '[OH-]', unit: 'mol/L' }
    ],
    compute: (v) => { const OH = num(v.OH, 'OH'); if (OH <= 0) throw new Error('[OH-] > 0'); return { result: -Math.log10(OH), unit: '' }; },
  },
  {
    id: 'dilucion',
    name: 'Dilución',
    category: 'Química',
    formula: 'C1 V1 = C2 V2',
    description: 'Concentración final tras diluir.',
    fields: [
      { key: 'C1', label: 'C1' },
      { key: 'V1', label: 'V1' },
      { key: 'V2', label: 'V2' }
    ],
    compute: (v) => { const V2 = num(v.V2, 'V2'); if (V2 === 0) throw new Error('V2 no puede ser 0'); return { result: (num(v.C1, 'C1') * num(v.V1, 'V1')) / V2, unit: '' }; },
  },
  {
    id: 'rendimiento',
    name: 'Rendimiento %',
    category: 'Química',
    formula: '%R = (real/teórico)·100',
    description: 'Rendimiento porcentual.',
    fields: [
      { key: 'real', label: 'Real' },
      { key: 'teo', label: 'Teórico' }
    ],
    compute: (v) => { const teo = num(v.teo, 'teo'); if (teo === 0) throw new Error('Teórico 0'); return { result: (num(v.real, 'real') / teo) * 100, unit: '%' }; },
  },
  {
    id: 'avogadro',
    name: 'Partículas (Avogadro)',
    category: 'Química',
    formula: 'N = n · NA',
    description: 'Número de partículas.',
    fields: [
      { key: 'n', label: 'Moles', unit: 'mol' }
    ],
    compute: (v) => { return { result: num(v.n, 'n') * C.Na, unit: 'partículas' }; },
  },
  {
    id: 'ley-boyle',
    name: 'Ley de Boyle',
    category: 'Química',
    formula: 'P1 V1 = P2 V2',
    description: 'Presión final a T constante.',
    fields: [
      { key: 'P1', label: 'P1', unit: 'Pa' },
      { key: 'V1', label: 'V1', unit: 'L' },
      { key: 'V2', label: 'V2', unit: 'L' }
    ],
    compute: (v) => { const V2 = num(v.V2, 'V2'); if (V2 === 0) throw new Error('V2 no puede ser 0'); return { result: (num(v.P1, 'P1') * num(v.V1, 'V1')) / V2, unit: 'Pa' }; },
  },
  {
    id: 'ley-charles',
    name: 'Ley de Charles',
    category: 'Química',
    formula: 'V1/T1 = V2/T2',
    description: 'Temperatura final a P constante.',
    fields: [
      { key: 'V1', label: 'V1', unit: 'L' },
      { key: 'T1', label: 'T1', unit: 'K' },
      { key: 'V2', label: 'V2', unit: 'L' }
    ],
    compute: (v) => { const V1 = num(v.V1, 'V1'); if (V1 === 0) throw new Error('V1 no puede ser 0'); return { result: (num(v.V2, 'V2') * num(v.T1, 'T1')) / V1, unit: 'K' }; },
  },
  {
    id: 'ppm',
    name: 'ppm',
    category: 'Química',
    formula: 'ppm = (ms/mt)·10⁶',
    description: 'Partes por millón en masa.',
    fields: [
      { key: 'ms', label: 'Masa soluto', unit: 'g' },
      { key: 'mt', label: 'Masa total', unit: 'g' }
    ],
    compute: (v) => { const mt = num(v.mt, 'mt'); if (mt === 0) throw new Error('mt 0'); return { result: (num(v.ms, 'ms') / mt) * 1e6, unit: 'ppm' }; },
  },
  {
    id: 'ka-ph',
    name: 'pH desde Ka',
    category: 'Química',
    formula: '[H+] ≈ √(Ka·C)',
    description: 'Ácido débil monoprotico.',
    fields: [
      { key: 'Ka', label: 'Ka' },
      { key: 'C', label: 'C', unit: 'mol/L' }
    ],
    compute: (v) => { const Ka = num(v.Ka, 'Ka'); const C = num(v.C, 'C'); if (Ka <= 0 || C <= 0) throw new Error('Ka y C > 0'); const H = Math.sqrt(Ka * C); return { result: -Math.log10(H), unit: '', detail: '[H+] ≈ ' + H.toExponential(4) }; },
  },
  {
    id: 'gibbs',
    name: 'Energía Libre de Gibbs',
    category: 'Química',
    formula: 'ΔG = ΔH − T ΔS',
    description: 'Cambio de energía libre.',
    fields: [
      { key: 'dH', label: 'ΔH', unit: 'J/mol' },
      { key: 'T', label: 'T', unit: 'K' },
      { key: 'dS', label: 'ΔS', unit: 'J/(mol·K)' }
    ],
    compute: (v) => { return { result: num(v.dH, 'dH') - num(v.T, 'T') * num(v.dS, 'dS'), unit: 'J/mol' }; },
  },
  {
    id: 'beer',
    name: 'Beer-Lambert',
    category: 'Química',
    formula: 'A = ε · l · c',
    description: 'Absorbancia.',
    fields: [
      { key: 'eps', label: 'ε', unit: 'L/(mol·cm)' },
      { key: 'l', label: 'Camino', unit: 'cm' },
      { key: 'c', label: 'c', unit: 'mol/L' }
    ],
    compute: (v) => { return { result: num(v.eps, 'eps') * num(v.l, 'l') * num(v.c, 'c'), unit: 'A' }; },
  },
  {
    id: 'fraccion-molar',
    name: 'Fracción Molar',
    category: 'Química',
    formula: 'χA = nA/(nA+nB)',
    description: 'Fracción molar de A.',
    fields: [
      { key: 'na', label: 'Moles A', unit: 'mol' },
      { key: 'nb', label: 'Moles B', unit: 'mol' }
    ],
    compute: (v) => { const t = num(v.na, 'na') + num(v.nb, 'nb'); if (t === 0) throw new Error('Suma 0'); return { result: num(v.na, 'na') / t, unit: '' }; },
  },
  {
    id: 'normalidad',
    name: 'Normalidad',
    category: 'Química',
    formula: 'N = eq / V',
    description: 'Equivalentes por litro.',
    fields: [
      { key: 'eq', label: 'Equivalentes' },
      { key: 'V', label: 'Volumen', unit: 'L' }
    ],
    compute: (v) => { const V = num(v.V, 'V'); if (V === 0) throw new Error('V 0'); return { result: num(v.eq, 'eq') / V, unit: 'eq/L' }; },
  },
  {
    id: 'porcentaje-masa',
    name: '% en masa',
    category: 'Química',
    formula: '%m = (ms/mt)·100',
    description: 'Porcentaje en masa.',
    fields: [
      { key: 'ms', label: 'Soluto', unit: 'g' },
      { key: 'mt', label: 'Total', unit: 'g' }
    ],
    compute: (v) => { const mt = num(v.mt, 'mt'); if (mt === 0) throw new Error('mt 0'); return { result: (num(v.ms, 'ms') / mt) * 100, unit: '%' }; },
  },
  {
    id: 'gas-ideal-n',
    name: 'Moles (gas ideal)',
    category: 'Química',
    formula: 'n = PV / RT',
    description: 'Moles de gas ideal.',
    fields: [
      { key: 'P', label: 'P', unit: 'Pa' },
      { key: 'V', label: 'V', unit: 'm³' },
      { key: 'T', label: 'T', unit: 'K' }
    ],
    compute: (v) => { const T = num(v.T, 'T'); if (T === 0) throw new Error('T 0'); return { result: (num(v.P, 'P') * num(v.V, 'V')) / (C.R * T), unit: 'mol' }; },
  },
  {
    id: 'nernst',
    name: 'Nernst',
    category: 'Química',
    formula: 'E = E° − (0.059/n) log Q',
    description: 'Potencial de celda a 25 °C.',
    fields: [
      { key: 'E0', label: 'E°', unit: 'V' },
      { key: 'n', label: 'n (e−)' },
      { key: 'Q', label: 'Q' }
    ],
    compute: (v) => { const n = num(v.n, 'n'); if (n === 0) throw new Error('n 0'); return { result: num(v.E0, 'E0') - (0.059 / n) * Math.log10(num(v.Q, 'Q')), unit: 'V' }; },
  },
  {
    id: 'henry',
    name: 'Ley de Henry',
    category: 'Química',
    formula: 'C = k · P',
    description: 'Gas disuelto vs presión parcial.',
    fields: [
      { key: 'k', label: 'k', unit: 'mol/(L·atm)' },
      { key: 'P', label: 'P', unit: 'atm' }
    ],
    compute: (v) => { return { result: num(v.k, 'k') * num(v.P, 'P'), unit: 'mol/L' }; },
  },
  {
    id: 'area-circulo',
    name: 'Área del Círculo',
    category: 'Matemáticas',
    formula: 'A = π r²',
    description: 'Área de un círculo.',
    fields: [
      { key: 'r', label: 'Radio' }
    ],
    compute: (v) => { return { result: Math.PI * num(v.r, 'r') ** 2, unit: 'u²' }; },
  },
  {
    id: 'perimetro-circulo',
    name: 'Perímetro del Círculo',
    category: 'Matemáticas',
    formula: 'P = 2 π r',
    description: 'Circunferencia.',
    fields: [
      { key: 'r', label: 'Radio' }
    ],
    compute: (v) => { return { result: 2 * Math.PI * num(v.r, 'r'), unit: 'u' }; },
  },
  {
    id: 'area-triangulo',
    name: 'Área del Triángulo',
    category: 'Matemáticas',
    formula: 'A = (b h)/2',
    description: 'Área con base y altura.',
    fields: [
      { key: 'b', label: 'Base' },
      { key: 'h', label: 'Altura' }
    ],
    compute: (v) => { return { result: (num(v.b, 'b') * num(v.h, 'h')) / 2, unit: 'u²' }; },
  },
  {
    id: 'area-rectangulo',
    name: 'Área del Rectángulo',
    category: 'Matemáticas',
    formula: 'A = b h',
    description: 'Área de un rectángulo.',
    fields: [
      { key: 'b', label: 'Base' },
      { key: 'h', label: 'Altura' }
    ],
    compute: (v) => { return { result: num(v.b, 'b') * num(v.h, 'h'), unit: 'u²' }; },
  },
  {
    id: 'area-trapecio',
    name: 'Área del Trapecio',
    category: 'Matemáticas',
    formula: 'A = (B+b)h/2',
    description: 'Área del trapecio.',
    fields: [
      { key: 'B', label: 'Base mayor' },
      { key: 'b', label: 'Base menor' },
      { key: 'h', label: 'Altura' }
    ],
    compute: (v) => { return { result: ((num(v.B, 'B') + num(v.b, 'b')) * num(v.h, 'h')) / 2, unit: 'u²' }; },
  },
  {
    id: 'vol-esfera',
    name: 'Volumen de la Esfera',
    category: 'Matemáticas',
    formula: 'V = (4/3) π r³',
    description: 'Volumen de una esfera.',
    fields: [
      { key: 'r', label: 'Radio' }
    ],
    compute: (v) => { return { result: (4 / 3) * Math.PI * num(v.r, 'r') ** 3, unit: 'u³' }; },
  },
  {
    id: 'vol-cilindro',
    name: 'Volumen del Cilindro',
    category: 'Matemáticas',
    formula: 'V = π r² h',
    description: 'Volumen de un cilindro.',
    fields: [
      { key: 'r', label: 'Radio' },
      { key: 'h', label: 'Altura' }
    ],
    compute: (v) => { return { result: Math.PI * num(v.r, 'r') ** 2 * num(v.h, 'h'), unit: 'u³' }; },
  },
  {
    id: 'vol-cono',
    name: 'Volumen del Cono',
    category: 'Matemáticas',
    formula: 'V = (1/3) π r² h',
    description: 'Volumen de un cono.',
    fields: [
      { key: 'r', label: 'Radio' },
      { key: 'h', label: 'Altura' }
    ],
    compute: (v) => { return { result: (1 / 3) * Math.PI * num(v.r, 'r') ** 2 * num(v.h, 'h'), unit: 'u³' }; },
  },
  {
    id: 'pitagoras',
    name: 'Teorema de Pitágoras',
    category: 'Matemáticas',
    formula: 'c = √(a² + b²)',
    description: 'Hipotenusa.',
    fields: [
      { key: 'a', label: 'Cateto a' },
      { key: 'b', label: 'Cateto b' }
    ],
    compute: (v) => { return { result: Math.sqrt(num(v.a, 'a') ** 2 + num(v.b, 'b') ** 2), unit: 'u' }; },
  },
  {
    id: 'interes-compuesto',
    name: 'Interés Compuesto',
    category: 'Matemáticas',
    formula: 'A = P(1+r/n)^(n t)',
    description: 'Capital final compuesto.',
    fields: [
      { key: 'P', label: 'Capital' },
      { key: 'r', label: 'Tasa (decimal)', placeholder: '0.05' },
      { key: 'n', label: 'Periodos/año', defaultValue: '12' },
      { key: 't', label: 'Años' }
    ],
    compute: (v) => { const n = num(v.n, 'n'); if (n === 0) throw new Error('n 0'); return { result: num(v.P, 'P') * (1 + num(v.r, 'r') / n) ** (n * num(v.t, 't')), unit: '' }; },
  },
  {
    id: 'mcd',
    name: 'MCD',
    category: 'Matemáticas',
    formula: 'MCD(a, b)',
    description: 'Máximo común divisor.',
    fields: [
      { key: 'a', label: 'a' },
      { key: 'b', label: 'b' }
    ],
    compute: (v) => { let a = Math.abs(Math.trunc(num(v.a, 'a'))); let b = Math.abs(Math.trunc(num(v.b, 'b'))); while (b) { const t = b; b = a % b; a = t; } return { result: a, unit: '' }; },
  },
  {
    id: 'mcm',
    name: 'MCM',
    category: 'Matemáticas',
    formula: 'MCM = |a b| / MCD',
    description: 'Mínimo común múltiplo.',
    fields: [
      { key: 'a', label: 'a' },
      { key: 'b', label: 'b' }
    ],
    compute: (v) => { let a = Math.abs(Math.trunc(num(v.a, 'a'))); let b = Math.abs(Math.trunc(num(v.b, 'b'))); const a0 = a, b0 = b; while (b) { const t = b; b = a % b; a = t; } if (a === 0) throw new Error('MCD 0'); return { result: Math.abs(a0 * b0) / a, unit: '' }; },
  },
  {
    id: 'raiz-n',
    name: 'Raíz de índice n',
    category: 'Matemáticas',
    formula: 'ⁿ√x',
    description: 'Raíz n-ésima.',
    fields: [
      { key: 'x', label: 'Radicando' },
      { key: 'n', label: 'Índice', defaultValue: '2' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); const n = num(v.n, 'n'); if (n === 0) throw new Error('Índice 0'); if (x < 0 && n % 2 === 0) throw new Error('Raíz par de negativo'); return { result: Math.sign(x) * Math.abs(x) ** (1 / n), unit: '' }; },
  },
  {
    id: 'combinaciones',
    name: 'Combinaciones C(n,k)',
    category: 'Matemáticas',
    formula: 'C(n,k) = n!/(k!(n−k)!)',
    description: 'Combinaciones sin repetición.',
    fields: [
      { key: 'n', label: 'n' },
      { key: 'k', label: 'k' }
    ],
    compute: (v) => { const n = Math.trunc(num(v.n, 'n')); const k = Math.trunc(num(v.k, 'k')); if (k < 0 || n < 0 || k > n) throw new Error('Inválido'); let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return { result: Math.round(r), unit: '' }; },
  },
  {
    id: 'permutaciones',
    name: 'Permutaciones P(n,k)',
    category: 'Matemáticas',
    formula: 'P(n,k) = n!/(n−k)!',
    description: 'Permutaciones sin repetición.',
    fields: [
      { key: 'n', label: 'n' },
      { key: 'k', label: 'k' }
    ],
    compute: (v) => { const n = Math.trunc(num(v.n, 'n')); const k = Math.trunc(num(v.k, 'k')); if (k < 0 || n < 0 || k > n) throw new Error('Inválido'); let r = 1; for (let i = 0; i < k; i++) r *= (n - i); return { result: r, unit: '' }; },
  },
  {
    id: 'distancia-2d',
    name: 'Distancia 2D',
    category: 'Matemáticas',
    formula: 'd = √[(x2−x1)²+(y2−y1)²]',
    description: 'Distancia en el plano.',
    fields: [
      { key: 'x1', label: 'x1' },
      { key: 'y1', label: 'y1' },
      { key: 'x2', label: 'x2' },
      { key: 'y2', label: 'y2' }
    ],
    compute: (v) => { return { result: Math.sqrt((num(v.x2,'x2')-num(v.x1,'x1'))**2 + (num(v.y2,'y2')-num(v.y1,'y1'))**2), unit: 'u' }; },
  },
  {
    id: 'cuadratica',
    name: 'Ecuación Cuadrática (x+)',
    category: 'Matemáticas',
    formula: 'x = (−b+√(b²−4ac))/(2a)',
    description: 'Raíz con +sqrt.',
    fields: [
      { key: 'a', label: 'a' },
      { key: 'b', label: 'b' },
      { key: 'c', label: 'c' }
    ],
    compute: (v) => { const a = num(v.a, 'a'); if (a === 0) throw new Error('a 0'); const disc = num(v.b,'b')**2 - 4*a*num(v.c,'c'); if (disc < 0) throw new Error('Disc. negativo'); return { result: (-num(v.b,'b') + Math.sqrt(disc)) / (2*a), unit: '' }; },
  },
  {
    id: 'regla-tres',
    name: 'Regla de Tres',
    category: 'Matemáticas',
    formula: 'a/b = c/x → x',
    description: 'Regla de tres simple.',
    fields: [
      { key: 'a', label: 'a' },
      { key: 'b', label: 'b' },
      { key: 'c', label: 'c' }
    ],
    compute: (v) => { const a = num(v.a, 'a'); if (a === 0) throw new Error('a 0'); return { result: (num(v.b, 'b') * num(v.c, 'c')) / a, unit: '' }; },
  },
  {
    id: 'porcentaje',
    name: 'Porcentaje',
    category: 'Matemáticas',
    formula: 'x% de y',
    description: 'Calcular porcentaje.',
    fields: [
      { key: 'x', label: '%' },
      { key: 'y', label: 'Valor' }
    ],
    compute: (v) => { return { result: (num(v.y, 'y') * num(v.x, 'x')) / 100, unit: '' }; },
  },
  {
    id: 'pa-termino',
    name: 'Término n (P.A.)',
    category: 'Matemáticas',
    formula: 'an = a1+(n−1)d',
    description: 'Progresión aritmética.',
    fields: [
      { key: 'a1', label: 'a1' },
      { key: 'd', label: 'd' },
      { key: 'n', label: 'n' }
    ],
    compute: (v) => { return { result: num(v.a1, 'a1') + (num(v.n, 'n') - 1) * num(v.d, 'd'), unit: '' }; },
  },
  {
    id: 'pa-suma',
    name: 'Suma P.A.',
    category: 'Matemáticas',
    formula: 'Sn = n/2·(2a1+(n−1)d)',
    description: 'Suma de P.A.',
    fields: [
      { key: 'a1', label: 'a1' },
      { key: 'd', label: 'd' },
      { key: 'n', label: 'n' }
    ],
    compute: (v) => { const n = num(v.n, 'n'); return { result: (n / 2) * (2 * num(v.a1, 'a1') + (n - 1) * num(v.d, 'd')), unit: '' }; },
  },
  {
    id: 'log-base',
    name: 'Log cambio de base',
    category: 'Matemáticas',
    formula: 'log_b(a) = ln a / ln b',
    description: 'Logaritmo en base b.',
    fields: [
      { key: 'a', label: 'a' },
      { key: 'b', label: 'Base b' }
    ],
    compute: (v) => { const b = num(v.b, 'b'); if (b <= 0 || b === 1) throw new Error('Base inválida'); const a = num(v.a, 'a'); if (a <= 0) throw new Error('a > 0'); return { result: Math.log(a) / Math.log(b), unit: '' }; },
  },
  {
    id: 'factorial-sci',
    name: 'Factorial',
    category: 'Matemáticas',
    formula: 'n!',
    description: 'Factorial (0–170).',
    fields: [
      { key: 'n', label: 'n' }
    ],
    compute: (v) => { const n = Math.trunc(num(v.n, 'n')); if (n < 0 || n > 170) throw new Error('0–170'); let r = 1; for (let i = 2; i <= n; i++) r *= i; return { result: r, unit: '' }; },
  },
  {
    id: 'pendiente',
    name: 'Pendiente',
    category: 'Matemáticas',
    formula: 'm = (y2−y1)/(x2−x1)',
    description: 'Pendiente entre dos puntos.',
    fields: [
      { key: 'x1', label: 'x1' },
      { key: 'y1', label: 'y1' },
      { key: 'x2', label: 'x2' },
      { key: 'y2', label: 'y2' }
    ],
    compute: (v) => { const dx = num(v.x2,'x2') - num(v.x1,'x1'); if (dx === 0) throw new Error('dx 0'); return { result: (num(v.y2,'y2') - num(v.y1,'y1')) / dx, unit: '' }; },
  },
  {
    id: 'bar-pa',
    name: 'bar ↔ Pa',
    category: 'Conversiones',
    formula: '1 bar = 10⁵ Pa',
    description: 'Presión bar-Pa.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'bar2pa', options: [{ value: 'bar2pa', label: 'bar → Pa' }, { value: 'pa2bar', label: 'Pa → bar' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'pa2bar') return { result: x / 1e5, unit: 'bar' }; return { result: x * 1e5, unit: 'Pa' }; },
  },
  {
    id: 'atm-pa',
    name: 'atm ↔ Pa',
    category: 'Conversiones',
    formula: '1 atm = 101325 Pa',
    description: 'Atmósferas-Pa.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'atm2pa', options: [{ value: 'atm2pa', label: 'atm → Pa' }, { value: 'pa2atm', label: 'Pa → atm' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'pa2atm') return { result: x / C.atm, unit: 'atm' }; return { result: x * C.atm, unit: 'Pa' }; },
  },
  {
    id: 'kg-lb',
    name: 'kg ↔ lb',
    category: 'Conversiones',
    formula: '1 kg ≈ 2.20462 lb',
    description: 'Kilogramos-libras.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'kg2lb', options: [{ value: 'kg2lb', label: 'kg → lb' }, { value: 'lb2kg', label: 'lb → kg' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'lb2kg') return { result: x / 2.20462, unit: 'kg' }; return { result: x * 2.20462, unit: 'lb' }; },
  },
  {
    id: 'km-mi',
    name: 'km ↔ mi',
    category: 'Conversiones',
    formula: '1 mi ≈ 1.60934 km',
    description: 'Kilómetros-millas.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'km2mi', options: [{ value: 'km2mi', label: 'km → mi' }, { value: 'mi2km', label: 'mi → km' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'mi2km') return { result: x * 1.60934, unit: 'km' }; return { result: x / 1.60934, unit: 'mi' }; },
  },
  {
    id: 'ms-kmh',
    name: 'm/s ↔ km/h',
    category: 'Conversiones',
    formula: '1 m/s = 3.6 km/h',
    description: 'Velocidad.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'ms2kmh', options: [{ value: 'ms2kmh', label: 'm/s → km/h' }, { value: 'kmh2ms', label: 'km/h → m/s' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'kmh2ms') return { result: x / 3.6, unit: 'm/s' }; return { result: x * 3.6, unit: 'km/h' }; },
  },
  {
    id: 'rad-deg',
    name: 'rad ↔ °',
    category: 'Conversiones',
    formula: 'π rad = 180°',
    description: 'Radianes-grados.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'rad2deg', options: [{ value: 'rad2deg', label: 'rad → °' }, { value: 'deg2rad', label: '° → rad' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'deg2rad') return { result: (x * Math.PI) / 180, unit: 'rad' }; return { result: (x * 180) / Math.PI, unit: '°' }; },
  },
  {
    id: 'joule-cal',
    name: 'J ↔ cal',
    category: 'Conversiones',
    formula: '1 cal ≈ 4.184 J',
    description: 'Julios-calorías.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'j2cal', options: [{ value: 'j2cal', label: 'J → cal' }, { value: 'cal2j', label: 'cal → J' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'cal2j') return { result: x * 4.184, unit: 'J' }; return { result: x / 4.184, unit: 'cal' }; },
  },
  {
    id: 'inches-cm',
    name: 'in ↔ cm',
    category: 'Conversiones',
    formula: '1 in = 2.54 cm',
    description: 'Pulgadas-cm.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'in2cm', options: [{ value: 'in2cm', label: 'in → cm' }, { value: 'cm2in', label: 'cm → in' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'cm2in') return { result: x / 2.54, unit: 'in' }; return { result: x * 2.54, unit: 'cm' }; },
  },
  {
    id: 'hp-w',
    name: 'hp ↔ W',
    category: 'Conversiones',
    formula: '1 hp ≈ 745.7 W',
    description: 'Caballos-vatios.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'hp2w', options: [{ value: 'hp2w', label: 'hp → W' }, { value: 'w2hp', label: 'W → hp' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'w2hp') return { result: x / 745.7, unit: 'hp' }; return { result: x * 745.7, unit: 'W' }; },
  },
  {
    id: 'ev-j',
    name: 'eV ↔ J',
    category: 'Conversiones',
    formula: '1 eV = 1.602×10⁻¹⁹ J',
    description: 'Electronvoltios.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'ev2j', options: [{ value: 'ev2j', label: 'eV → J' }, { value: 'j2ev', label: 'J → eV' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'j2ev') return { result: x / C.e, unit: 'eV' }; return { result: x * C.e, unit: 'J' }; },
  },
  {
    id: 'litros-m3',
    name: 'L ↔ m³',
    category: 'Conversiones',
    formula: '1 m³ = 1000 L',
    description: 'Volumen.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'l2m', options: [{ value: 'l2m', label: 'L → m³' }, { value: 'm2l', label: 'm³ → L' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'm2l') return { result: x * 1000, unit: 'L' }; return { result: x / 1000, unit: 'm³' }; },
  },
  {
    id: 'n-lbf',
    name: 'N ↔ lbf',
    category: 'Conversiones',
    formula: '1 lbf ≈ 4.44822 N',
    description: 'Newtons-libras fuerza.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'n2lbf', options: [{ value: 'n2lbf', label: 'N → lbf' }, { value: 'lbf2n', label: 'lbf → N' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'lbf2n') return { result: x * 4.44822, unit: 'N' }; return { result: x / 4.44822, unit: 'lbf' }; },
  },
  {
    id: 'bernoulli',
    name: 'Ecuación de Bernoulli',
    category: 'Física',
    formula: 'P + ½ρv² + ρgh',
    description: 'Suma de presión, energía cinética y potencial por unidad de volumen.',
    fields: [
      { key: 'P', label: 'Presión', unit: 'Pa' },
      { key: 'rho', label: 'Densidad ρ', unit: 'kg/m³' },
      { key: 'v', label: 'Velocidad', unit: 'm/s' },
      { key: 'h', label: 'Altura', unit: 'm' },
      { key: 'g', label: 'g', unit: 'm/s²', defaultValue: '9.80665' }
    ],
    compute: (v) => { const rho = num(v.rho, 'ρ'); return { result: num(v.P, 'P') + 0.5 * rho * num(v.v, 'v') ** 2 + rho * num(v.g, 'g') * num(v.h, 'h'), unit: 'Pa' }; },
  },
  {
    id: 'continuidad',
    name: 'Ecuación de continuidad',
    category: 'Física',
    formula: 'A₁v₁ = A₂v₂',
    description: 'Velocidad en la sección 2 de un fluido incompresible.',
    fields: [
      { key: 'A1', label: 'Área 1', unit: 'm²' },
      { key: 'v1', label: 'Velocidad 1', unit: 'm/s' },
      { key: 'A2', label: 'Área 2', unit: 'm²' }
    ],
    compute: (v) => { const A2 = num(v.A2, 'A2'); if (A2 === 0) throw new Error('A₂ no puede ser 0'); return { result: (num(v.A1, 'A1') * num(v.v1, 'v1')) / A2, unit: 'm/s' }; },
  },
  {
    id: 'hidrostatica',
    name: 'Presión hidrostática',
    category: 'Física',
    formula: 'P = ρ g h',
    description: 'Presión debida a una columna de fluido.',
    fields: [
      { key: 'rho', label: 'Densidad ρ', unit: 'kg/m³' },
      { key: 'h', label: 'Profundidad', unit: 'm' },
      { key: 'g', label: 'g', unit: 'm/s²', defaultValue: '9.80665' }
    ],
    compute: (v) => ({ result: num(v.rho, 'ρ') * num(v.g, 'g') * num(v.h, 'h'), unit: 'Pa' }),
  },
  {
    id: 'arquimedes',
    name: 'Empuje de Arquímedes',
    category: 'Física',
    formula: 'E = ρ g V',
    description: 'Fuerza de flotación igual al peso del fluido desalojado.',
    fields: [
      { key: 'rho', label: 'Densidad del fluido', unit: 'kg/m³', defaultValue: '1000' },
      { key: 'V', label: 'Volumen sumergido', unit: 'm³' },
      { key: 'g', label: 'g', unit: 'm/s²', defaultValue: '9.80665' }
    ],
    compute: (v) => ({ result: num(v.rho, 'ρ') * num(v.g, 'g') * num(v.V, 'V'), unit: 'N' }),
  },
  {
    id: 'inercia-cilindro',
    name: 'Inercia de cilindro (eje)',
    category: 'Física',
    formula: 'I = ½ m r²',
    description: 'Momento de inercia de un cilindro sólido respecto a su eje.',
    fields: [
      { key: 'm', label: 'Masa', unit: 'kg' },
      { key: 'r', label: 'Radio', unit: 'm' }
    ],
    compute: (v) => ({ result: 0.5 * num(v.m, 'm') * num(v.r, 'r') ** 2, unit: 'kg·m²' }),
  },
  {
    id: 'inercia-esfera',
    name: 'Inercia de esfera sólida',
    category: 'Física',
    formula: 'I = ⅖ m r²',
    description: 'Momento de inercia de una esfera sólida respecto a un diámetro.',
    fields: [
      { key: 'm', label: 'Masa', unit: 'kg' },
      { key: 'r', label: 'Radio', unit: 'm' }
    ],
    compute: (v) => ({ result: 0.4 * num(v.m, 'm') * num(v.r, 'r') ** 2, unit: 'kg·m²' }),
  },
  {
    id: 'energia-rot',
    name: 'Energía cinética rotacional',
    category: 'Física',
    formula: 'E = ½ I ω²',
    description: 'Energía asociada a la rotación.',
    fields: [
      { key: 'I', label: 'Inercia I', unit: 'kg·m²' },
      { key: 'w', label: 'Velocidad angular ω', unit: 'rad/s' }
    ],
    compute: (v) => ({ result: 0.5 * num(v.I, 'I') * num(v.w, 'ω') ** 2, unit: 'J' }),
  },
  {
    id: 'omega',
    name: 'Velocidad angular',
    category: 'Física',
    formula: 'ω = 2π f',
    description: 'Velocidad angular a partir de la frecuencia.',
    fields: [{ key: 'f', label: 'Frecuencia', unit: 'Hz' }],
    compute: (v) => ({ result: 2 * Math.PI * num(v.f, 'f'), unit: 'rad/s' }),
  },
  {
    id: 'alfa',
    name: 'Aceleración angular',
    category: 'Física',
    formula: 'α = Δω / Δt',
    description: 'Cambio de velocidad angular por unidad de tiempo.',
    fields: [
      { key: 'w', label: 'ω final', unit: 'rad/s' },
      { key: 'w0', label: 'ω inicial', unit: 'rad/s', defaultValue: '0' },
      { key: 't', label: 'Tiempo', unit: 's' }
    ],
    compute: (v) => { const t = num(v.t, 't'); if (t === 0) throw new Error('t no puede ser 0'); return { result: (num(v.w, 'ω') - num(v.w0, 'ω0')) / t, unit: 'rad/s²' }; },
  },
  {
    id: 'momento-angular',
    name: 'Momento angular',
    category: 'Física',
    formula: 'L = I ω',
    description: 'Momento angular de un cuerpo rígido.',
    fields: [
      { key: 'I', label: 'Inercia I', unit: 'kg·m²' },
      { key: 'w', label: 'ω', unit: 'rad/s' }
    ],
    compute: (v) => ({ result: num(v.I, 'I') * num(v.w, 'ω'), unit: 'kg·m²/s' }),
  },
  {
    id: 'potencia-vi',
    name: 'Potencia eléctrica (VI)',
    category: 'Física',
    formula: 'P = V I',
    description: 'Potencia en un elemento de circuito.',
    fields: [
      { key: 'V', label: 'Voltaje', unit: 'V' },
      { key: 'I', label: 'Corriente', unit: 'A' }
    ],
    compute: (v) => ({ result: num(v.V, 'V') * num(v.I, 'I'), unit: 'W' }),
  },
  {
    id: 'potencia-i2r',
    name: 'Potencia disipada (I²R)',
    category: 'Física',
    formula: 'P = I² R',
    description: 'Potencia convertida en calor en una resistencia.',
    fields: [
      { key: 'I', label: 'Corriente', unit: 'A' },
      { key: 'R', label: 'Resistencia', unit: 'Ω' }
    ],
    compute: (v) => ({ result: num(v.I, 'I') ** 2 * num(v.R, 'R'), unit: 'W' }),
  },
  {
    id: 'resistividad',
    name: 'Resistencia por resistividad',
    category: 'Física',
    formula: 'R = ρ L / A',
    description: 'Resistencia de un conductor uniforme.',
    fields: [
      { key: 'rho', label: 'Resistividad ρ', unit: 'Ω·m' },
      { key: 'L', label: 'Longitud', unit: 'm' },
      { key: 'A', label: 'Área', unit: 'm²' }
    ],
    compute: (v) => { const A = num(v.A, 'A'); if (A === 0) throw new Error('A no puede ser 0'); return { result: (num(v.rho, 'ρ') * num(v.L, 'L')) / A, unit: 'Ω' }; },
  },
  {
    id: 'lorentz',
    name: 'Fuerza de Lorentz (magnética)',
    category: 'Física',
    formula: 'F = |q| v B sinθ',
    description: 'Fuerza sobre una carga en un campo magnético.',
    fields: [
      { key: 'q', label: 'Carga', unit: 'C' },
      { key: 'v', label: 'Velocidad', unit: 'm/s' },
      { key: 'B', label: 'Campo B', unit: 'T' },
      { key: 'theta', label: 'Ángulo', unit: '°', defaultValue: '90' }
    ],
    compute: (v) => ({ result: Math.abs(num(v.q, 'q')) * num(v.v, 'v') * num(v.B, 'B') * Math.sin((num(v.theta, 'θ') * Math.PI) / 180), unit: 'N' }),
  },
  {
    id: 'lc',
    name: 'Frecuencia de resonancia LC',
    category: 'Física',
    formula: 'f = 1 / (2π√(LC))',
    description: 'Frecuencia natural de un circuito LC ideal.',
    fields: [
      { key: 'L', label: 'Inductancia', unit: 'H' },
      { key: 'C', label: 'Capacitancia', unit: 'F' }
    ],
    compute: (v) => { const p = num(v.L, 'L') * num(v.C, 'C'); if (p <= 0) throw new Error('LC debe ser > 0'); return { result: 1 / (2 * Math.PI * Math.sqrt(p)), unit: 'Hz' }; },
  },
  {
    id: 'tau-rc',
    name: 'Constante de tiempo RC',
    category: 'Física',
    formula: 'τ = R C',
    description: 'Tiempo característico de carga o descarga.',
    fields: [
      { key: 'R', label: 'Resistencia', unit: 'Ω' },
      { key: 'C', label: 'Capacitancia', unit: 'F' }
    ],
    compute: (v) => ({ result: num(v.R, 'R') * num(v.C, 'C'), unit: 's' }),
  },
  {
    id: 'lambda',
    name: 'Longitud de onda',
    category: 'Física',
    formula: 'λ = v / f',
    description: 'Longitud de onda. Usa v = c si es luz en el vacío.',
    fields: [
      { key: 'v', label: 'Velocidad', unit: 'm/s', defaultValue: '299792458' },
      { key: 'f', label: 'Frecuencia', unit: 'Hz' }
    ],
    compute: (v) => { const f = num(v.f, 'f'); if (f === 0) throw new Error('f no puede ser 0'); return { result: num(v.v, 'v') / f, unit: 'm' }; },
  },
  {
    id: 'indice-refraccion',
    name: 'Índice de refracción',
    category: 'Física',
    formula: 'n = c / v',
    description: 'Índice absoluto de un medio.',
    fields: [{ key: 'v', label: 'Velocidad en el medio', unit: 'm/s' }],
    compute: (v) => { const vel = num(v.v, 'v'); if (vel === 0) throw new Error('v no puede ser 0'); return { result: C.c / vel, unit: '' }; },
  },
  {
    id: 'wien',
    name: 'Ley de Wien',
    category: 'Física',
    formula: 'λ_max T = 2.897×10⁻³',
    description: 'Longitud de onda del pico de emisión de un cuerpo negro.',
    fields: [{ key: 'T', label: 'Temperatura', unit: 'K' }],
    compute: (v) => { const T = num(v.T, 'T'); if (T === 0) throw new Error('T no puede ser 0'); return { result: 2.897e-3 / T, unit: 'm' }; },
  },
  {
    id: 'frenado',
    name: 'Distancia de frenado',
    category: 'Física',
    formula: 'd = v² / (2a)',
    description: 'Distancia para detenerse con desaceleración constante a.',
    fields: [
      { key: 'v', label: 'Velocidad', unit: 'm/s' },
      { key: 'a', label: 'Desaceleración', unit: 'm/s²' }
    ],
    compute: (v) => { const a = num(v.a, 'a'); if (a === 0) throw new Error('a no puede ser 0'); return { result: (num(v.v, 'v') ** 2) / (2 * Math.abs(a)), unit: 'm' }; },
  },
  {
    id: 'sigma-esfera',
    name: 'Densidad superficial (esfera)',
    category: 'Electrostática',
    formula: 'σ = Q / (4πR²)',
    description: 'Densidad superficial uniforme sobre una esfera.',
    fields: [
      { key: 'Q', label: 'Carga Q', unit: 'C' },
      { key: 'R', label: 'Radio R', unit: 'm' }
    ],
    compute: (v) => { const R = num(v.R, 'R'); if (R === 0) throw new Error('R no puede ser 0'); return { result: num(v.Q, 'Q') / (4 * Math.PI * R * R), unit: 'C/m²' }; },
  },
  {
    id: 'potencial-esfera',
    name: 'Potencial de esfera conductora',
    category: 'Electrostática',
    formula: 'V = kQ / R',
    description: 'Potencial en la superficie (y en el interior) de una esfera conductora.',
    fields: [
      { key: 'Q', label: 'Carga Q', unit: 'C' },
      { key: 'R', label: 'Radio R', unit: 'm' }
    ],
    compute: (v) => { const R = num(v.R, 'R'); if (R === 0) throw new Error('R no puede ser 0'); return { result: (8.9875517923e9 * num(v.Q, 'Q')) / R, unit: 'V' }; },
  },
  {
    id: 'campo-conductor',
    name: 'Campo dentro de un conductor',
    category: 'Electrostática',
    formula: 'E = 0',
    description: 'En equilibrio electrostático el campo en el interior de un conductor es cero. El flujo y la carga neta interior también lo son.',
    fields: [{ key: 'nota', label: 'Confirmación (escribe 1)', defaultValue: '1' }],
    compute: () => ({ result: 0, unit: 'N/C', detail: 'E = 0 en el interior. Φ = 0 y Qenc = 0.' }),
  },
  {
    id: 'flujo-esfera-q',
    name: 'Flujo de una esfera con carga Q',
    category: 'Electrostática',
    formula: 'Φ = Q / ε₀',
    description: 'El flujo total no depende del radio: solo de la carga encerrada.',
    fields: [{ key: 'Q', label: 'Carga Q', unit: 'C' }],
    compute: (v) => ({ result: num(v.Q, 'Q') / C.epsilon0, unit: 'N·m²/C', detail: 'Gauss: ∮E·dA = Qenc/ε₀' }),
  },
  {
    id: 'cap-esfera',
    name: 'Capacitancia de esfera aislada',
    category: 'Electrostática',
    formula: 'C = 4π ε₀ R',
    description: 'Capacitancia de un conductor esférico aislado.',
    fields: [{ key: 'R', label: 'Radio R', unit: 'm' }],
    compute: (v) => ({ result: 4 * Math.PI * C.epsilon0 * num(v.R, 'R'), unit: 'F' }),
  },
  {
    id: 'energia-capacitor',
    name: 'Energía de un capacitor',
    category: 'Electrostática',
    formula: 'U = ½ C V²',
    description: 'Energía almacenada en un condensador.',
    fields: [
      { key: 'C', label: 'Capacitancia', unit: 'F' },
      { key: 'V', label: 'Voltaje', unit: 'V' }
    ],
    compute: (v) => ({ result: 0.5 * num(v.C, 'C') * num(v.V, 'V') ** 2, unit: 'J' }),
  },
  {
    id: 'cap-serie',
    name: 'Capacitores en serie',
    category: 'Electrostática',
    formula: '1/C = 1/C₁ + 1/C₂',
    description: 'Capacitancia equivalente de dos condensadores en serie.',
    fields: [
      { key: 'c1', label: 'C₁', unit: 'F' },
      { key: 'c2', label: 'C₂', unit: 'F' }
    ],
    compute: (v) => { const c1 = num(v.c1, 'C1'); const c2 = num(v.c2, 'C2'); if (c1 === 0 || c2 === 0) throw new Error('C no puede ser 0'); return { result: (c1 * c2) / (c1 + c2), unit: 'F' }; },
  },
  {
    id: 'cap-paralelo',
    name: 'Capacitores en paralelo',
    category: 'Electrostática',
    formula: 'C = C₁ + C₂ + C₃',
    description: 'Capacitancia equivalente en paralelo.',
    fields: [
      { key: 'c1', label: 'C₁', unit: 'F' },
      { key: 'c2', label: 'C₂', unit: 'F', defaultValue: '0' },
      { key: 'c3', label: 'C₃', unit: 'F', defaultValue: '0' }
    ],
    compute: (v) => ({ result: num(v.c1, 'C1') + num(v.c2, 'C2') + num(v.c3, 'C3'), unit: 'F' }),
  },
  {
    id: 'densidad-energia-e',
    name: 'Densidad de energía del campo',
    category: 'Electrostática',
    formula: 'u = ½ ε₀ E²',
    description: 'Energía por unidad de volumen almacenada en un campo eléctrico.',
    fields: [{ key: 'E', label: 'Campo E', unit: 'N/C' }],
    compute: (v) => ({ result: 0.5 * C.epsilon0 * num(v.E, 'E') ** 2, unit: 'J/m³' }),
  },
  {
    id: 'voltaje-uniforme',
    name: 'Potencial en campo uniforme',
    category: 'Electrostática',
    formula: 'V = E d',
    description: 'Diferencia de potencial entre dos puntos separados una distancia d paralela a E.',
    fields: [
      { key: 'E', label: 'Campo E', unit: 'N/C' },
      { key: 'd', label: 'Distancia', unit: 'm' }
    ],
    compute: (v) => ({ result: num(v.E, 'E') * num(v.d, 'd'), unit: 'V' }),
  },
  {
    id: 'dipolo',
    name: 'Momento dipolar',
    category: 'Electrostática',
    formula: 'p = q d',
    description: 'Momento de un dipolo eléctrico.',
    fields: [
      { key: 'q', label: 'Carga q', unit: 'C' },
      { key: 'd', label: 'Separación', unit: 'm' }
    ],
    compute: (v) => ({ result: Math.abs(num(v.q, 'q')) * num(v.d, 'd'), unit: 'C·m' }),
  },
  {
    id: 'campo-dipolo-axial',
    name: 'Campo de dipolo (eje)',
    category: 'Electrostática',
    formula: 'E ≈ 2 k p / r³',
    description: 'Campo en el eje de un dipolo, lejos del dipolo (r ≫ d).',
    fields: [
      { key: 'p', label: 'Momento p', unit: 'C·m' },
      { key: 'r', label: 'Distancia r', unit: 'm' }
    ],
    compute: (v) => { const r = num(v.r, 'r'); if (r === 0) throw new Error('r no puede ser 0'); return { result: (2 * 8.9875517923e9 * num(v.p, 'p')) / (r ** 3), unit: 'N/C' }; },
  },
  {
    id: 'fuerza-placas',
    name: 'Fuerza entre placas',
    category: 'Electrostática',
    formula: 'F = ½ ε₀ A E²',
    description: 'Atracción entre las placas de un condensador de campo uniforme.',
    fields: [
      { key: 'A', label: 'Área', unit: 'm²' },
      { key: 'E', label: 'Campo E', unit: 'N/C' }
    ],
    compute: (v) => ({ result: 0.5 * C.epsilon0 * num(v.A, 'A') * num(v.E, 'E') ** 2, unit: 'N' }),
  },
  {
    id: 'gauss-linea',
    name: 'Gauss: línea infinita',
    category: 'Electrostática',
    formula: 'E = λ / (2π ε₀ r)',
    description: 'Campo de una línea infinita. Equivale a E = 2kλ/r.',
    fields: [
      { key: 'lambda', label: 'Densidad λ', unit: 'C/m' },
      { key: 'r', label: 'Distancia r', unit: 'm' }
    ],
    compute: (v) => { const r = num(v.r, 'r'); if (r === 0) throw new Error('r no puede ser 0'); return { result: num(v.lambda, 'λ') / (2 * Math.PI * C.epsilon0 * r), unit: 'N/C' }; },
  },
  {
    id: 'arrhenius',
    name: 'Ecuación de Arrhenius',
    category: 'Química',
    formula: 'k = A e^(−Ea/RT)',
    description: 'Constante de velocidad en función de la temperatura.',
    fields: [
      { key: 'A', label: 'Factor A' },
      { key: 'Ea', label: 'Ea', unit: 'J/mol' },
      { key: 'T', label: 'Temperatura', unit: 'K' }
    ],
    compute: (v) => { const T = num(v.T, 'T'); if (T === 0) throw new Error('T no puede ser 0'); return { result: num(v.A, 'A') * Math.exp(-num(v.Ea, 'Ea') / (C.R * T)), unit: '' }; },
  },
  {
    id: 'semivida',
    name: 'Semivida (1.er orden)',
    category: 'Química',
    formula: 't½ = ln(2) / k',
    description: 'Tiempo de vida media de una reacción de primer orden.',
    fields: [{ key: 'k', label: 'Constante k', unit: '1/s' }],
    compute: (v) => { const k = num(v.k, 'k'); if (k === 0) throw new Error('k no puede ser 0'); return { result: Math.LN2 / k, unit: 's' }; },
  },
  {
    id: 'henderson',
    name: 'Henderson–Hasselbalch',
    category: 'Química',
    formula: 'pH = pKa + log([A⁻]/[HA])',
    description: 'pH de una disolución amortiguadora.',
    fields: [
      { key: 'pKa', label: 'pKa' },
      { key: 'A', label: '[A⁻]', unit: 'mol/L' },
      { key: 'HA', label: '[HA]', unit: 'mol/L' }
    ],
    compute: (v) => { const HA = num(v.HA, 'HA'); const A = num(v.A, 'A'); if (HA <= 0 || A <= 0) throw new Error('Concentraciones > 0'); return { result: num(v.pKa, 'pKa') + Math.log10(A / HA), unit: '' }; },
  },
  {
    id: 'pka',
    name: 'pKa desde Ka',
    category: 'Química',
    formula: 'pKa = −log₁₀(Ka)',
    description: 'Constante de acidez en escala logarítmica.',
    fields: [{ key: 'Ka', label: 'Ka' }],
    compute: (v) => { const Ka = num(v.Ka, 'Ka'); if (Ka <= 0) throw new Error('Ka > 0'); return { result: -Math.log10(Ka), unit: '' }; },
  },
  {
    id: 'crioscopico',
    name: 'Descenso crioscópico',
    category: 'Química',
    formula: 'ΔT = Kf · m · i',
    description: 'Disminución del punto de congelación.',
    fields: [
      { key: 'Kf', label: 'Kf', unit: '°C·kg/mol' },
      { key: 'm', label: 'Molalidad', unit: 'mol/kg' },
      { key: 'i', label: 'Factor i', defaultValue: '1' }
    ],
    compute: (v) => ({ result: num(v.Kf, 'Kf') * num(v.m, 'm') * num(v.i, 'i'), unit: '°C' }),
  },
  {
    id: 'ebulloscopico',
    name: 'Aumento ebulloscópico',
    category: 'Química',
    formula: 'ΔT = Kb · m · i',
    description: 'Aumento del punto de ebullición.',
    fields: [
      { key: 'Kb', label: 'Kb', unit: '°C·kg/mol' },
      { key: 'm', label: 'Molalidad', unit: 'mol/kg' },
      { key: 'i', label: 'Factor i', defaultValue: '1' }
    ],
    compute: (v) => ({ result: num(v.Kb, 'Kb') * num(v.m, 'm') * num(v.i, 'i'), unit: '°C' }),
  },
  {
    id: 'osmotica',
    name: 'Presión osmótica',
    category: 'Química',
    formula: 'π = i M R T',
    description: 'Presión osmótica de una disolución.',
    fields: [
      { key: 'i', label: 'Factor i', defaultValue: '1' },
      { key: 'M', label: 'Molaridad', unit: 'mol/L' },
      { key: 'T', label: 'Temperatura', unit: 'K' }
    ],
    compute: (v) => ({ result: num(v.i, 'i') * num(v.M, 'M') * 0.082057 * num(v.T, 'T'), unit: 'atm', detail: 'R = 0.082057 L·atm/(mol·K)' }),
  },
  {
    id: 'densidad-gas',
    name: 'Densidad de gas ideal',
    category: 'Química',
    formula: 'ρ = P M / (R T)',
    description: 'Densidad de un gas ideal. M en kg/mol da kg/m³.',
    fields: [
      { key: 'P', label: 'Presión', unit: 'Pa' },
      { key: 'M', label: 'Masa molar', unit: 'kg/mol' },
      { key: 'T', label: 'Temperatura', unit: 'K' }
    ],
    compute: (v) => { const T = num(v.T, 'T'); if (T === 0) throw new Error('T no puede ser 0'); return { result: (num(v.P, 'P') * num(v.M, 'M')) / (C.R * T), unit: 'kg/m³' }; },
  },
  {
    id: 'delta-g-k',
    name: 'ΔG° desde K',
    category: 'Química',
    formula: 'ΔG° = −RT ln K',
    description: 'Energía libre estándar a partir de la constante de equilibrio.',
    fields: [
      { key: 'K', label: 'K' },
      { key: 'T', label: 'Temperatura', unit: 'K', defaultValue: '298.15' }
    ],
    compute: (v) => { const K = num(v.K, 'K'); if (K <= 0) throw new Error('K > 0'); return { result: -C.R * num(v.T, 'T') * Math.log(K), unit: 'J/mol' }; },
  },
  {
    id: 'k-desde-g',
    name: 'K desde ΔG°',
    category: 'Química',
    formula: 'K = e^(−ΔG°/RT)',
    description: 'Constante de equilibrio a partir de ΔG°.',
    fields: [
      { key: 'dG', label: 'ΔG°', unit: 'J/mol' },
      { key: 'T', label: 'Temperatura', unit: 'K', defaultValue: '298.15' }
    ],
    compute: (v) => { const T = num(v.T, 'T'); if (T === 0) throw new Error('T no puede ser 0'); return { result: Math.exp(-num(v.dG, 'ΔG') / (C.R * T)), unit: '' }; },
  },
  {
    id: 'masa-moles',
    name: 'Masa desde moles',
    category: 'Química',
    formula: 'm = n M',
    description: 'Masa de una muestra a partir de los moles.',
    fields: [
      { key: 'n', label: 'Moles', unit: 'mol' },
      { key: 'M', label: 'Masa molar', unit: 'g/mol' }
    ],
    compute: (v) => ({ result: num(v.n, 'n') * num(v.M, 'M'), unit: 'g' }),
  },
  {
    id: 'ley-velocidad',
    name: 'Ley de velocidad',
    category: 'Química',
    formula: 'v = k [A]^m [B]^n',
    description: 'Velocidad inicial de una reacción.',
    fields: [
      { key: 'k', label: 'k' },
      { key: 'A', label: '[A]', unit: 'mol/L' },
      { key: 'm', label: 'Orden m', defaultValue: '1' },
      { key: 'B', label: '[B]', unit: 'mol/L', defaultValue: '1' },
      { key: 'n', label: 'Orden n', defaultValue: '0' }
    ],
    compute: (v) => ({ result: num(v.k, 'k') * num(v.A, 'A') ** num(v.m, 'm') * num(v.B, 'B') ** num(v.n, 'n'), unit: 'mol/(L·s)' }),
  },
  {
    id: 'porcentaje-v',
    name: '% en volumen',
    category: 'Química',
    formula: '%v = (Vs/Vt)·100',
    description: 'Porcentaje en volumen de una disolución.',
    fields: [
      { key: 'vs', label: 'Volumen soluto' },
      { key: 'vt', label: 'Volumen total' }
    ],
    compute: (v) => { const vt = num(v.vt, 'vt'); if (vt === 0) throw new Error('Vt no puede ser 0'); return { result: (num(v.vs, 'vs') / vt) * 100, unit: '%' }; },
  },
  {
    id: 'area-elipse',
    name: 'Área de la elipse',
    category: 'Matemáticas',
    formula: 'A = π a b',
    description: 'Área de una elipse de semiejes a y b.',
    fields: [
      { key: 'a', label: 'Semieje a' },
      { key: 'b', label: 'Semieje b' }
    ],
    compute: (v) => ({ result: Math.PI * num(v.a, 'a') * num(v.b, 'b'), unit: 'u²' }),
  },
  {
    id: 'sup-esfera',
    name: 'Superficie de la esfera',
    category: 'Matemáticas',
    formula: 'S = 4 π r²',
    description: 'Área de la superficie esférica.',
    fields: [{ key: 'r', label: 'Radio' }],
    compute: (v) => ({ result: 4 * Math.PI * num(v.r, 'r') ** 2, unit: 'u²' }),
  },
  {
    id: 'vol-piramide',
    name: 'Volumen de pirámide',
    category: 'Matemáticas',
    formula: 'V = ⅓ B h',
    description: 'Volumen de una pirámide o cono a partir del área de la base.',
    fields: [
      { key: 'B', label: 'Área de la base' },
      { key: 'h', label: 'Altura' }
    ],
    compute: (v) => ({ result: (num(v.B, 'B') * num(v.h, 'h')) / 3, unit: 'u³' }),
  },
  {
    id: 'sector',
    name: 'Área de sector circular',
    category: 'Matemáticas',
    formula: 'A = (θ/360) π r²',
    description: 'Sector de ángulo central θ en grados.',
    fields: [
      { key: 'r', label: 'Radio' },
      { key: 'theta', label: 'Ángulo', unit: '°' }
    ],
    compute: (v) => ({ result: (num(v.theta, 'θ') / 360) * Math.PI * num(v.r, 'r') ** 2, unit: 'u²' }),
  },
  {
    id: 'cosenos',
    name: 'Ley de cosenos',
    category: 'Matemáticas',
    formula: 'c² = a² + b² − 2ab cos C',
    description: 'Lado c opuesto al ángulo C.',
    fields: [
      { key: 'a', label: 'Lado a' },
      { key: 'b', label: 'Lado b' },
      { key: 'C', label: 'Ángulo C', unit: '°' }
    ],
    compute: (v) => { const a = num(v.a, 'a'); const b = num(v.b, 'b'); const c2 = a * a + b * b - 2 * a * b * Math.cos((num(v.C, 'C') * Math.PI) / 180); if (c2 < 0) throw new Error('Resultado no real'); return { result: Math.sqrt(c2), unit: 'u' }; },
  },
  {
    id: 'senos',
    name: 'Ley de senos (lado)',
    category: 'Matemáticas',
    formula: 'a / sin A = b / sin B',
    description: 'Calcula el lado a conocidos A, b y B.',
    fields: [
      { key: 'A', label: 'Ángulo A', unit: '°' },
      { key: 'b', label: 'Lado b' },
      { key: 'B', label: 'Ángulo B', unit: '°' }
    ],
    compute: (v) => { const sB = Math.sin((num(v.B, 'B') * Math.PI) / 180); if (sB === 0) throw new Error('sin B = 0'); return { result: (num(v.b, 'b') * Math.sin((num(v.A, 'A') * Math.PI) / 180)) / sB, unit: 'u' }; },
  },
  {
    id: 'media',
    name: 'Media aritmética (hasta 4)',
    category: 'Matemáticas',
    formula: 'x̄ = Σx / n',
    description: 'Promedio. Deja en blanco los valores que no uses (se ignoran si están vacíos: usa 0 solo si quieres contarlo). Cuenta siempre los 4 campos.',
    fields: [
      { key: 'a', label: 'x1', defaultValue: '0' },
      { key: 'b', label: 'x2', defaultValue: '0' },
      { key: 'c', label: 'x3', defaultValue: '0' },
      { key: 'd', label: 'x4', defaultValue: '0' },
      { key: 'n', label: 'Cantidad n', defaultValue: '4' }
    ],
    compute: (v) => { const n = num(v.n, 'n'); if (n === 0) throw new Error('n no puede ser 0'); return { result: (num(v.a, 'x1') + num(v.b, 'x2') + num(v.c, 'x3') + num(v.d, 'x4')) / n, unit: '' }; },
  },
  {
    id: 'media-geometrica',
    name: 'Media geométrica (2)',
    category: 'Matemáticas',
    formula: 'G = √(a·b)',
    description: 'Media geométrica de dos números positivos.',
    fields: [
      { key: 'a', label: 'a' },
      { key: 'b', label: 'b' }
    ],
    compute: (v) => { const p = num(v.a, 'a') * num(v.b, 'b'); if (p < 0) throw new Error('Producto negativo'); return { result: Math.sqrt(p), unit: '' }; },
  },
  {
    id: 'interes-simple',
    name: 'Interés simple',
    category: 'Matemáticas',
    formula: 'I = P r t',
    description: 'Interés simple. r en decimal (5% = 0.05).',
    fields: [
      { key: 'P', label: 'Capital' },
      { key: 'r', label: 'Tasa decimal', placeholder: '0.05' },
      { key: 't', label: 'Tiempo' }
    ],
    compute: (v) => ({ result: num(v.P, 'P') * num(v.r, 'r') * num(v.t, 't'), unit: '' }),
  },
  {
    id: 'cambio-porcentual',
    name: 'Cambio porcentual',
    category: 'Matemáticas',
    formula: 'Δ% = (nuevo − inicial) / inicial · 100',
    description: 'Variación porcentual entre dos valores.',
    fields: [
      { key: 'a', label: 'Valor inicial' },
      { key: 'b', label: 'Valor nuevo' }
    ],
    compute: (v) => { const a = num(v.a, 'a'); if (a === 0) throw new Error('Inicial no puede ser 0'); return { result: ((num(v.b, 'b') - a) / a) * 100, unit: '%' }; },
  },
  {
    id: 'diagonales',
    name: 'Diagonales de un polígono',
    category: 'Matemáticas',
    formula: 'D = n(n−3)/2',
    description: 'Número de diagonales de un polígono de n lados.',
    fields: [{ key: 'n', label: 'Lados n' }],
    compute: (v) => ({ result: (num(v.n, 'n') * (num(v.n, 'n') - 3)) / 2, unit: '' }),
  },
  {
    id: 'suma-geometrica',
    name: 'Suma de progresión geométrica',
    category: 'Matemáticas',
    formula: 'S = a (rⁿ − 1) / (r − 1)',
    description: 'Suma de n términos. Si r = 1, S = a·n.',
    fields: [
      { key: 'a', label: 'Primer término a' },
      { key: 'r', label: 'Razón r' },
      { key: 'n', label: 'Términos n' }
    ],
    compute: (v) => { const r = num(v.r, 'r'); const n = num(v.n, 'n'); const a = num(v.a, 'a'); if (r === 1) return { result: a * n, unit: '' }; return { result: (a * (r ** n - 1)) / (r - 1), unit: '' }; },
  },
  {
    id: 'binomio',
    name: 'Cuadrado de un binomio',
    category: 'Matemáticas',
    formula: '(a + b)² = a² + 2ab + b²',
    description: 'Desarrollo del cuadrado de la suma.',
    fields: [
      { key: 'a', label: 'a' },
      { key: 'b', label: 'b' }
    ],
    compute: (v) => { const a = num(v.a, 'a'); const b = num(v.b, 'b'); return { result: a * a + 2 * a * b + b * b, unit: '' }; },
  },
  {
    id: 'recta',
    name: 'Valor de una recta',
    category: 'Matemáticas',
    formula: 'y = m x + b',
    description: 'Ordenada de una recta en el punto x.',
    fields: [
      { key: 'm', label: 'Pendiente m' },
      { key: 'x', label: 'x' },
      { key: 'b', label: 'Ordenada b', defaultValue: '0' }
    ],
    compute: (v) => ({ result: num(v.m, 'm') * num(v.x, 'x') + num(v.b, 'b'), unit: '' }),
  },
  {
    id: 'heron',
    name: 'Área por Herón',
    category: 'Matemáticas',
    formula: '√[s(s−a)(s−b)(s−c)]',
    description: 'Área de un triángulo conocidos los tres lados.',
    fields: [
      { key: 'a', label: 'Lado a' },
      { key: 'b', label: 'Lado b' },
      { key: 'c', label: 'Lado c' }
    ],
    compute: (v) => { const a = num(v.a, 'a'); const b = num(v.b, 'b'); const c = num(v.c, 'c'); const s = (a + b + c) / 2; const k = s * (s - a) * (s - b) * (s - c); if (k < 0) throw new Error('No forman un triángulo'); return { result: Math.sqrt(k), unit: 'u²' }; },
  },
  {
    id: 'yd-m',
    name: 'yd ↔ m',
    category: 'Conversiones',
    formula: '1 yd = 0.9144 m',
    description: 'Yardas y metros.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'yd2m', options: [{ value: 'yd2m', label: 'yd → m' }, { value: 'm2yd', label: 'm → yd' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'm2yd') return { result: x / 0.9144, unit: 'yd' }; return { result: x * 0.9144, unit: 'm' }; },
  },
  {
    id: 'ft-m',
    name: 'ft ↔ m',
    category: 'Conversiones',
    formula: '1 ft = 0.3048 m',
    description: 'Pies y metros.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'ft2m', options: [{ value: 'ft2m', label: 'ft → m' }, { value: 'm2ft', label: 'm → ft' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'm2ft') return { result: x / 0.3048, unit: 'ft' }; return { result: x * 0.3048, unit: 'm' }; },
  },
  {
    id: 'oz-g',
    name: 'oz ↔ g',
    category: 'Conversiones',
    formula: '1 oz ≈ 28.3495 g',
    description: 'Onzas (avoirdupois) y gramos.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'oz2g', options: [{ value: 'oz2g', label: 'oz → g' }, { value: 'g2oz', label: 'g → oz' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'g2oz') return { result: x / 28.3495, unit: 'oz' }; return { result: x * 28.3495, unit: 'g' }; },
  },
  {
    id: 'gal-l',
    name: 'gal (US) ↔ L',
    category: 'Conversiones',
    formula: '1 gal ≈ 3.78541 L',
    description: 'Galón estadounidense y litros.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'gal2l', options: [{ value: 'gal2l', label: 'gal → L' }, { value: 'l2gal', label: 'L → gal' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'l2gal') return { result: x / 3.78541, unit: 'gal' }; return { result: x * 3.78541, unit: 'L' }; },
  },
  {
    id: 'kcal-kj',
    name: 'kcal ↔ kJ',
    category: 'Conversiones',
    formula: '1 kcal = 4.184 kJ',
    description: 'Kilocalorías y kilojulios.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'kcal2kj', options: [{ value: 'kcal2kj', label: 'kcal → kJ' }, { value: 'kj2kcal', label: 'kJ → kcal' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'kj2kcal') return { result: x / 4.184, unit: 'kcal' }; return { result: x * 4.184, unit: 'kJ' }; },
  },
  {
    id: 'torr-pa',
    name: 'Torr ↔ Pa',
    category: 'Conversiones',
    formula: '1 Torr = 133.322 Pa',
    description: 'Torr (mmHg) y pascales.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 't2p', options: [{ value: 't2p', label: 'Torr → Pa' }, { value: 'p2t', label: 'Pa → Torr' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'p2t') return { result: x / 133.322, unit: 'Torr' }; return { result: x * 133.322, unit: 'Pa' }; },
  },
  {
    id: 'nudo-ms',
    name: 'kn ↔ m/s',
    category: 'Conversiones',
    formula: '1 kn = 0.514444 m/s',
    description: 'Nudos y metros por segundo.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'k2m', options: [{ value: 'k2m', label: 'kn → m/s' }, { value: 'm2k', label: 'm/s → kn' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'm2k') return { result: x / 0.514444, unit: 'kn' }; return { result: x * 0.514444, unit: 'm/s' }; },
  },
  {
    id: 'mph-kmh',
    name: 'mph ↔ km/h',
    category: 'Conversiones',
    formula: '1 mph ≈ 1.60934 km/h',
    description: 'Millas por hora y kilómetros por hora.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'm2k', options: [{ value: 'm2k', label: 'mph → km/h' }, { value: 'k2m', label: 'km/h → mph' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'k2m') return { result: x / 1.60934, unit: 'mph' }; return { result: x * 1.60934, unit: 'km/h' }; },
  },
  {
    id: 'ha-m2',
    name: 'ha ↔ m²',
    category: 'Conversiones',
    formula: '1 ha = 10 000 m²',
    description: 'Hectáreas y metros cuadrados.',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'h2m', options: [{ value: 'h2m', label: 'ha → m²' }, { value: 'm2h', label: 'm² → ha' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'm2h') return { result: x / 10000, unit: 'ha' }; return { result: x * 10000, unit: 'm²' }; },
  },
  {
    id: 'bytes',
    name: 'B ↔ KiB ↔ MiB',
    category: 'Conversiones',
    formula: '1 KiB = 1024 B',
    description: 'Bytes binarios (1024).',
    fields: [
      { key: 'dir', label: 'Dir', type: 'select', defaultValue: 'b2k', options: [{ value: 'b2k', label: 'B → KiB' }, { value: 'k2b', label: 'KiB → B' }, { value: 'b2m', label: 'B → MiB' }, { value: 'm2b', label: 'MiB → B' }] },
      { key: 'x', label: 'Valor' }
    ],
    compute: (v) => { const x = num(v.x, 'x'); if (v.dir === 'k2b') return { result: x * 1024, unit: 'B' }; if (v.dir === 'b2m') return { result: x / (1024 * 1024), unit: 'MiB' }; if (v.dir === 'm2b') return { result: x * 1024 * 1024, unit: 'B' }; return { result: x / 1024, unit: 'KiB' }; },
  }
];

const FN_OPENERS = ['sin(', 'cos(', 'tan(', 'ln(', 'log(', 'abs(', 'fact(', 'exp(', 'asin(', 'acos(', 'atan(', 'sinh(', 'cosh(', 'tanh('];
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
function toSup(n: number): string {
  return String(Math.max(2, Math.floor(n))).replace(/\d/g, (d) => SUP[Number(d)]);
}
function fromSup(s: string): string {
  return s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => String(SUP.indexOf(c)));
}
function explainPad(expr: string, result: string, angle: 'DEG' | 'RAD'): { explanation: string; steps: string[] } {
  const steps = [
    `1. Se tomó la expresión escrita: ${expr}.`,
    `2. Modo angular: ${angle}. sin, cos y tan leen el ángulo en ${angle === 'DEG' ? 'grados' : 'radianes'}.`,
    '3. Un número junto a un paréntesis, una llave, un corchete o una función se multiplica. Ejemplo: 5(2) = 10.',
    '4. Primero se resuelven agrupaciones () {} [], luego potencias y raíces, después × ÷, y al final + −.',
  ];
  if (/[√∛∜]|[⁰¹²³⁴⁵⁶⁷⁸⁹]√/.test(expr)) steps.push('5. Cada raíz usa el índice escrito antes del símbolo √. Sin índice, √ es índice 2.');
  if (/\^/.test(expr)) steps.push('Las potencias se calculan de derecha a izquierda: 2^3^2 = 2^(3^2).');
  if (/sin|cos|tan|asin|acos|atan/i.test(expr)) steps.push(`Las razones trigonométricas se evaluaron en ${angle}.`);
  steps.push(`Resultado: ${result}.`);
  return {
    explanation: `Se evaluó «${expr}» en modo ${angle}. El motor respetó el orden de las operaciones, cerró las agrupaciones y aplicó multiplicación implícita. Resultado: ${result}.`,
    steps,
  };
}

export default function Calcular() {
  const navigate = useNavigate();
  const exprRef = useRef<HTMLInputElement>(null);

  const [expression, setExpression] = useState('');
  const [resultDisplay, setResultDisplay] = useState('0');
  const [guide, setGuide] = useState('· Science Mode para fórmulas.');
  const [shake, setShake] = useState(false);
  const [scienceOpen, setScienceOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);
  const [floating, setFloating] = useState(false);
  const floatOutside = async () => {
    const desktop = (window as unknown as { rbcDesktop?: { openFloat?: () => Promise<unknown> } }).rbcDesktop;
    if (desktop?.openFloat) {
      await desktop.openFloat();
      setGuide('Ventana flotante abierta fuera del navegador.');
      return;
    }
    const pip = (window as unknown as { documentPictureInPicture?: { requestWindow: (o: { width: number; height: number }) => Promise<Window> } }).documentPictureInPicture;
    if (pip) {
      const win = await pip.requestWindow({ width: 460, height: 760 });
      win.document.body.style.margin = '0';
      win.document.body.style.background = '#07070c';
      const frame = win.document.createElement('iframe');
      frame.src = `${location.origin}/calcular?float=1`;
      frame.style.cssText = 'border:0;width:100%;height:100vh';
      win.document.body.appendChild(frame);
      setGuide('Calculadora flotando encima de otras ventanas.');
      return;
    }
    const popup = window.open(`${location.origin}/calcular?float=1`, 'rbc-float', 'popup=yes,width=460,height=760');
    if (popup) {
      setGuide('Ventana flotante abierta.');
      return;
    }
    setFloating(true);
    setGuide('Flotando dentro de la página. En Chrome o Edge puede salir fuera.');
  };
  const [floatPos, setFloatPos] = useState({ x: 24, y: 24 });
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const [rootOpen, setRootOpen] = useState(false);
  const [rootIndex, setRootIndex] = useState('2');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeOp, setActiveOp] = useState<SciOp | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [formResult, setFormResult] = useState<{ result: string; unit: string; detail?: string } | null>(null);
  const [search, setSearch] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [angleMode, setAngleMode] = useState<'DEG' | 'RAD'>('DEG');
  const [expandedHist, setExpandedHist] = useState<string | null>(null);
  const [memory, setMemory] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('rbc-calc-history-v4');
      if (raw) setHistory(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem('rbc-calc-history-v4', JSON.stringify(history.slice(0, 80))); } catch { /* ignore */ }
  }, [history]);

  const addHistory = useCallback((expression: string, result: string, extra?: Partial<HistoryEntry>) => {
    setHistory((h) => [{
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      expression, result, ts: Date.now(),
      explanation: extra?.explanation, steps: extra?.steps,
      source: extra?.source ?? 'pad', opName: extra?.opName,
    }, ...h].slice(0, 80));
  }, []);

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 380); };

  const insertAtCursor = (text: string, opts?: { autoClose?: boolean }) => {
    const el = exprRef.current;
    const start = el?.selectionStart ?? expression.length;
    const end = el?.selectionEnd ?? expression.length;
    let insert = text;
    let cursorOffset = text.length;
    if (opts?.autoClose !== false) {
      if (text.endsWith('(') || text.endsWith('{') || text.endsWith('[')) {
        const close = text.endsWith('{') ? '}' : text.endsWith('[') ? ']' : ')';
        insert = text + close;
        cursorOffset = text.length;
      }
    }
    const next = expression.slice(0, start) + insert + expression.slice(end);
    setExpression(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + cursorOffset;
      el.setSelectionRange(pos, pos);
    });
  };

  const clearAll = () => {
    setExpression(''); setResultDisplay('0'); setGuide('Pantalla limpia.');
    exprRef.current?.focus();
  };

  const backspace = () => {
    const el = exprRef.current;
    if (!el) { setExpression((p) => p.slice(0, -1)); return; }
    const start = el.selectionStart ?? expression.length;
    const end = el.selectionEnd ?? expression.length;
    if (start === end && start > 0) {
      const next = expression.slice(0, start - 1) + expression.slice(end);
      setExpression(next);
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start - 1, start - 1); });
    } else if (start !== end) {
      const next = expression.slice(0, start) + expression.slice(end);
      setExpression(next);
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start, start); });
    }
  };

  const calculate = () => {
    try {
      const expr = expression.trim();
      if (!expr) return;
      const value = safeEval(expr, angleMode);
      const formatted = formatDisplay(value);
      setResultDisplay(formatted);
      const lesson = explainPad(expr, formatted, angleMode);
      addHistory(expression, formatted, { ...lesson, source: 'pad' });
      setGuide(`${expr}  →  ${formatted}`);
    } catch (e) {
      triggerShake();
      setGuide(e instanceof Error ? e.message : 'Expresión inválida');
    }
  };

  const onExprKeyDown = (e: RKBD<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); calculate(); }
  };

  const insertFn = (fn: string) => {
    insertAtCursor(fn.endsWith('(') ? fn : fn + '(', { autoClose: true });
  };

  const openOp = (op: SciOp) => {
    const defaults: Record<string, string> = {};
    op.fields.forEach((f) => { defaults[f.key] = f.defaultValue ?? ''; });
    setFormValues(defaults); setFormError(''); setFormResult(null); setActiveOp(op);
  };

  const runOp = () => {
    if (!activeOp) return;
    try {
      const out = activeOp.compute(formValues);
      const formatted = formatDisplay(out.result);
      const withUnit = out.unit ? `${formatted} ${out.unit}` : formatted;
      setFormResult({ result: formatted, unit: out.unit, detail: out.detail });
      setResultDisplay(withUnit);
      setExpression(formatted);
      const inputSummary = activeOp.fields
        .map((f) => `${f.label}${f.unit ? ' (' + f.unit + ')' : ''} = ${formValues[f.key] ?? '—'}`)
        .join('; ');
      const steps = out.steps ?? [
        `1. Operación elegida: ${activeOp.name} (${activeOp.category}).`,
        `2. Fórmula: ${activeOp.formula}.`,
        `3. Qué significa: ${activeOp.description}`,
        `4. Datos introducidos: ${inputSummary}.`,
        `5. Se sustituyeron los datos en la fórmula y se operó en ese orden.`,
        `6. Resultado: ${withUnit}.`,
      ];
      addHistory(`${activeOp.name}: ${activeOp.formula}`, withUnit, {
        explanation: `Science Mode — ${activeOp.name}. Se usó ${activeOp.formula}. ${activeOp.description} Con los datos ${inputSummary} se obtuvo ${withUnit}.`,
        steps, source: 'science', opName: activeOp.name,
      });
      setGuide(`${activeOp.name} → ${withUnit}`);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error');
      setFormResult(null);
    }
  };

  const loadExpression = (expr: string) => {
    setExpression(expr);
    setGuide('Expresión cargada. Edita con el cursor.');
    setHistoryOpen(false);
    requestAnimationFrame(() => {
      exprRef.current?.focus();
      exprRef.current?.setSelectionRange(expr.length, expr.length);
    });
  };

  const loadResult = (res: string) => {
    const numeric = res.replace(/,/g, '').match(/-?[\d.]+(?:e[+-]?\d+)?/i);
    const value = numeric ? numeric[0] : stripFormatting(res);
    setExpression(value);
    setResultDisplay(res);
    setGuide('Resultado cargado.');
    setHistoryOpen(false);
    requestAnimationFrame(() => {
      exprRef.current?.focus();
      exprRef.current?.setSelectionRange(value.length, value.length);
    });
  };

  const filteredOps = useMemo(() => {
    const q = search.trim().toLowerCase();
    return OPERATIONS.filter((op) => {
      if (activeCategory && op.category !== activeCategory) return false;
      if (!q) return true;
      return op.name.toLowerCase().includes(q) || op.formula.toLowerCase().includes(q) ||
        op.description.toLowerCase().includes(q) || op.category.toLowerCase().includes(q);
    });
  }, [search, activeCategory]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (activeOp || scienceOpen || modulesOpen || rootOpen) return;
      const t = e.target as HTMLElement | null;
      if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.tagName === 'SELECT') return;
      if (/^[0-9.]$/.test(e.key)) { e.preventDefault(); insertAtCursor(e.key); }
      else if (['+', '-', '*', '/', '%', '(', ')'].includes(e.key)) { e.preventDefault(); insertAtCursor(e.key); }
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); calculate(); }
      else if (e.key === 'Backspace') { e.preventDefault(); backspace(); }
      else if (e.key === 'Escape') { e.preventDefault(); clearAll(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expression, activeOp, scienceOpen, modulesOpen, rootOpen, angleMode]);

  type PadBtn = { label: ReactNode; action: () => void; className?: string; span?: number; title?: string };

  const sciFns: PadBtn[] = [
    { label: 'sin', action: () => insertFn('sin('), className: 'btn-fn', title: 'Seno' },
    { label: 'cos', action: () => insertFn('cos('), className: 'btn-fn', title: 'Coseno' },
    { label: 'tan', action: () => insertFn('tan('), className: 'btn-fn', title: 'Tangente' },
    { label: 'asin', action: () => insertFn('asin('), className: 'btn-fn', title: 'Arcoseno' },
    { label: 'acos', action: () => insertFn('acos('), className: 'btn-fn', title: 'Arcocoseno' },
    { label: 'atan', action: () => insertFn('atan('), className: 'btn-fn', title: 'Arcotangente' },
    { label: 'sinh', action: () => insertFn('sinh('), className: 'btn-fn', title: 'Seno hiperbólico' },
    { label: 'cosh', action: () => insertFn('cosh('), className: 'btn-fn', title: 'Coseno hiperbólico' },
    { label: 'tanh', action: () => insertFn('tanh('), className: 'btn-fn', title: 'Tangente hiperbólica' },
    { label: 'ln', action: () => insertFn('ln('), className: 'btn-fn', title: 'Log natural' },
    { label: 'log', action: () => insertFn('log('), className: 'btn-fn', title: 'Log₁₀' },
    { label: '√ⁿ', action: () => setRootOpen(true), className: 'btn-fn', title: 'Raíz: elige el índice' },
    { label: 'xʸ', action: () => insertAtCursor('^'), className: 'btn-fn', title: 'Exponente' },
    { label: '{', action: () => insertAtCursor('{', { autoClose: true }), className: 'btn-fn', title: 'Llave' },
    { label: '}', action: () => insertAtCursor('}'), className: 'btn-fn', title: 'Cerrar llave' },
    { label: '[', action: () => insertAtCursor('[', { autoClose: true }), className: 'btn-fn', title: 'Corchete' },
    { label: ']', action: () => insertAtCursor(']'), className: 'btn-fn', title: 'Cerrar corchete' },
    { label: '|x|', action: () => insertFn('abs('), className: 'btn-fn' },
    { label: 'n!', action: () => insertFn('fact('), className: 'btn-fn' },
    { label: 'π', action: () => insertAtCursor('π'), className: 'btn-fn' },
    { label: 'e', action: () => insertAtCursor('e'), className: 'btn-fn' },
    { label: 'exp', action: () => insertFn('exp('), className: 'btn-fn' },
  ];
  const padButtons: PadBtn[] = [
    { label: 'C', action: clearAll, className: 'btn-danger' },
    { label: '⌫', action: backspace, className: 'btn-warn' },
    { label: '(', action: () => insertAtCursor('(', { autoClose: true }), className: 'btn-op' },
    { label: ')', action: () => insertAtCursor(')'), className: 'btn-op' },
    { label: '7', action: () => insertAtCursor('7') },
    { label: '8', action: () => insertAtCursor('8') },
    { label: '9', action: () => insertAtCursor('9') },
    { label: '÷', action: () => insertAtCursor('/'), className: 'btn-op' },
    { label: '4', action: () => insertAtCursor('4') },
    { label: '5', action: () => insertAtCursor('5') },
    { label: '6', action: () => insertAtCursor('6') },
    { label: '×', action: () => insertAtCursor('*'), className: 'btn-op' },
    { label: '1', action: () => insertAtCursor('1') },
    { label: '2', action: () => insertAtCursor('2') },
    { label: '3', action: () => insertAtCursor('3') },
    { label: '−', action: () => insertAtCursor('-'), className: 'btn-op' },
    { label: '0', action: () => insertAtCursor('0') },
    { label: '.', action: () => insertAtCursor('.') },
    { label: '%', action: () => insertAtCursor('%'), className: 'btn-op' },
    { label: '+', action: () => insertAtCursor('+'), className: 'btn-op' },
  ];

  const formatTime = (ts: number) => {
    try { return new Date(ts).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  return (
    <>
      <style>{CSS}</style>
      <div
        className={`calc-page${floating ? ' is-float' : ''}`}
        style={floating ? { left: floatPos.x, top: floatPos.y } : undefined}
      >
        <header
          className="calc-header"
          onPointerDown={(e) => {
            if (!floating) return;
            const t = e.target as HTMLElement;
            if (t.closest('button')) return;
            drag.current = { dx: e.clientX - floatPos.x, dy: e.clientY - floatPos.y };
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            setFloatPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy });
          }}
          onPointerUp={() => { drag.current = null; }}
        >
          <button type="button" className="icon-btn" onClick={() => navigate('/proyectos')} title="Volver">←</button>
          <h1 className="calc-title">Calculadora</h1>
          <div className="header-actions">
            <div className="menu-wrap">
              <button type="button" className="chip-modules" onClick={() => setModulesOpen((s) => !s)} aria-expanded={modulesOpen}>
                Módulos ▾
              </button>
              {modulesOpen && (
                <div className="drop-menu" role="menu">
                  {MODULES.map((m) => (
                    <button key={m.id} type="button" onClick={() => { setModulesOpen(false); navigate(m.path); }}>
                      <strong>{m.id==='balistica'?<Crosshair size={20}/>:m.id==='conversion'?<ArrowLeftRight size={20}/>:<ChartNoAxesCombined size={20}/>} {m.name}</strong>
                      <span>{m.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className={`chip ${floating ? 'chip-on' : ''}`}
              onClick={() => { void floatOutside(); }} title="Flotar fuera de la página">{floating ? 'Anclar' : 'Flotar'}</button>
            <button type="button" className={`chip ${angleMode === 'DEG' ? 'chip-on' : ''}`}
              onClick={() => setAngleMode((m) => (m === 'DEG' ? 'RAD' : 'DEG'))}>{angleMode}</button>
            <button type="button" className={`icon-btn ${historyOpen ? 'icon-active' : ''}`}
              onClick={() => setHistoryOpen((s) => !s)} title="Historial" aria-label="Historial">
              {historyOpen ? '✕' : '☰'}
            </button>
          </div>
        </header>

        <div className="calc-body">
          <main className="calc-main">
            <div className={`display-card ${shake ? 'shake' : ''}`}>
              <input
                ref={exprRef}
                className="display-expr-input"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                onKeyDown={onExprKeyDown}
                placeholder="0"
                spellCheck={false}
                autoComplete="off"
                inputMode="text"
                aria-label="Expresión editable"
              />
              <div className="display-result">{resultDisplay}</div>
              <p className="display-guide">{guide}</p>
            </div>

            <div className="mem-row" aria-label="Memoria">
              <button type="button" className="btn btn-mem" title="Borrar memoria" onClick={() => { setMemory(0); setGuide('Memoria borrada.'); }}>MC</button>
              <button type="button" className="btn btn-mem" title="Recuperar memoria" onClick={() => { insertAtCursor(String(memory)); setGuide('Memoria recuperada.'); }}>MR</button>
              <button type="button" className="btn btn-mem" title="Sumar resultado a la memoria" onClick={() => {
                const n = parseFloat((stripFormatting(resultDisplay).match(/-?[\d.]+(?:e[+-]?\d+)?/i) || ['0'])[0]);
                if (Number.isFinite(n)) { setMemory((m) => m + n); setGuide('M+  ' + formatDisplay(memory + n)); }
              }}>M+</button>
              <button type="button" className="btn btn-mem" title="Restar resultado de la memoria" onClick={() => {
                const n = parseFloat((stripFormatting(resultDisplay).match(/-?[\d.]+(?:e[+-]?\d+)?/i) || ['0'])[0]);
                if (Number.isFinite(n)) { setMemory((m) => m - n); setGuide('M−  ' + formatDisplay(memory - n)); }
              }}>M−</button>
              <button type="button" className="btn btn-mem" title="Insertar último resultado" onClick={() => {
                const raw = history[0]?.result || resultDisplay;
                const m = stripFormatting(raw).match(/-?[\d.]+(?:e[+-]?\d+)?/i);
                insertAtCursor(m ? m[0] : '0');
              }}>ANS</button>
            </div>
            <div className="fn-scroll" aria-label="Funciones">
              {sciFns.map((b, i) => (
                <button key={i} type="button" className={`btn ${b.className ?? ''}`} onClick={b.action} title={b.title}>{b.label}</button>
              ))}
            </div>

            <div className="pad">
              {padButtons.map((b, i) => (
                <button key={i} type="button" className={`btn ${b.className ?? ''}`}
                  style={b.span ? ({ gridColumn: `span ${b.span}` } as CSSProperties) : undefined}
                  onClick={b.action} title={b.title}>{b.label}</button>
              ))}
            </div>

            <div className="dock">
              <button type="button" className="btn btn-accent" onClick={() => setScienceOpen(true)}>Science</button>
              <button type="button" className="btn btn-ghost" onClick={async () => {
                try { await navigator.clipboard.writeText(resultDisplay); setGuide('Copiado.'); }
                catch { setGuide('No se pudo copiar.'); }
              }}>Copiar</button>
              <button type="button" className="btn btn-ghost" onClick={async () => {
                try { const t = await navigator.clipboard.readText(); if (t) insertAtCursor(t.trim()); }
                catch { setGuide('No se pudo pegar.'); }
              }}>Pegar</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setHistory([]); setGuide('Historial borrado.'); }}>Reset</button>
              <button type="button" className="btn btn-eq" onClick={calculate}>=</button>
            </div>
          </main>

          <aside className={`calc-history ${historyOpen ? 'open' : ''}`} aria-hidden={!historyOpen}>
            <div className="hist-head">
              <h2>Historial</h2>
              <button type="button" className="icon-btn close-hist" onClick={() => setHistoryOpen(false)} aria-label="Cerrar">✕</button>
            </div>
            <p className="hist-hint">Toca la expresión para editarla. Toca el resultado para volver a usarlo. Abre el procedimiento para ver cómo se resolvió.</p>
            <div className="hist-scroll">
              {history.length === 0 && <p className="muted">Sin cálculos todavía.</p>}
              <ul className="hist-list">
                {history.map((h) => (
                  <li key={h.id} className="hist-card">
                    <div className="hist-meta">
                      <span className="hist-source">{h.source === 'science' ? (h.opName ?? 'Ciencia') : 'Pad'}</span>
                      <span className="hist-time">{formatTime(h.ts)}</span>
                    </div>
                    <button type="button" className="hist-expr-btn" onClick={() => loadExpression(h.expression)}>{h.expression}</button>
                    <button type="button" className="hist-res-btn" onClick={() => loadResult(h.result)}>= {h.result}</button>
                    {(h.explanation || (h.steps && h.steps.length > 0)) && (
                      <button type="button" className="hist-toggle"
                        onClick={() => setExpandedHist((id) => (id === h.id ? null : h.id))}>
                        {expandedHist === h.id ? 'Ocultar procedimiento ▲' : 'Ver procedimiento ▼'}
                      </button>
                    )}
                    {expandedHist === h.id && (
                      <div className="hist-detail">
                        {h.explanation && <p className="hist-explanation">{h.explanation}</p>}
                        {h.steps && h.steps.length > 0 && (
                          <ol className="hist-steps">{h.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
          {historyOpen && <div className="hist-backdrop" onClick={() => setHistoryOpen(false)} role="presentation" />}
        </div>

        {rootOpen && (
          <div className="modal-overlay" onClick={() => setRootOpen(false)} role="presentation">
            <div className="modal root-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="modal-head">
                <h2>Raíz de índice n</h2>
                <button type="button" className="icon-btn" onClick={() => setRootOpen(false)}>✕</button>
              </div>
              <p className="op-desc">Índice 2 = √, 3 = ∛, 4 = ∜. Luego escribe el radicando.</p>
              <div className="form-fields">
                <label className="field">
                  <span className="field-label">Índice n</span>
                  <input type="text" inputMode="numeric" value={rootIndex}
                    onChange={(e) => setRootIndex(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (document.getElementById('root-insert-btn') as HTMLButtonElement)?.click()} />
                </label>
              </div>
              <div className="root-presets">
                {[2, 3, 4, 5, 6, 10].map((n) => (
                  <button key={n} type="button" className="chip" onClick={() => setRootIndex(String(n))}>
                    {n === 2 ? '√' : n === 3 ? '∛' : n === 4 ? '∜' : `${n}√`}
                  </button>
                ))}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setRootOpen(false)}>Cancelar</button>
                <button type="button" id="root-insert-btn" className="btn btn-accent" onClick={() => {
                  const n = Math.max(2, parseInt(rootIndex, 10) || 2);
                  setRootOpen(false);
                  const token = n === 2 ? '√(' : n === 3 ? '∛(' : n === 4 ? '∜(' : `${toSup(n)}√(`;
                  insertFn(token);
                  setGuide(`Raíz de índice ${n}. Escribe el radicando dentro del símbolo.`);
                }}>Insertar</button>
              </div>
            </div>
          </div>
        )}

        {scienceOpen && (
          <div className="modal-overlay" onClick={() => !activeOp && setScienceOpen(false)} role="presentation">
            <div className="modal science-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="modal-head">
                <h2>Science Mode</h2>
                <button type="button" className="icon-btn" onClick={() => setScienceOpen(false)}>✕</button>
              </div>
              <div className="search-wrap">
                <span className="search-icon" aria-hidden>⌕</span>
                <input className="search-input" placeholder="Buscar fórmula, magnitud o categoría…" value={search}
                  onChange={(e) => setSearch(e.target.value)} autoFocus />
              </div>
              <div className="cat-chips">
                <button type="button" className={`chip ${!activeCategory ? 'chip-on' : ''}`} onClick={() => setActiveCategory(null)}>Todas</button>
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" className={`chip ${activeCategory === c ? 'chip-on' : ''}`}
                    onClick={() => setActiveCategory(c)}>{c}</button>
                ))}
              </div>
              <div className="op-grid">
                {filteredOps.length === 0 && <p className="muted">No hay resultados.</p>}
                {filteredOps.map((op) => (
                  <button key={op.id} type="button" className="op-card" onClick={() => openOp(op)}>
                    <span className="op-cat">{op.category}</span>
                    <span className="op-name">{op.name}</span>
                    <span className="op-formula">{op.formula}</span>
                    <span className="op-desc">{op.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeOp && (
          <div className="modal-overlay" onClick={() => setActiveOp(null)} role="presentation">
            <div className="modal op-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="modal-head">
                <div>
                  <span className="op-cat">{activeOp.category}</span>
                  <h2>{activeOp.name}</h2>
                </div>
                <button type="button" className="icon-btn" onClick={() => setActiveOp(null)}>✕</button>
              </div>
              <div className="formula-box"><code>{activeOp.formula}</code></div>
              <p className="op-desc">{activeOp.description}</p>
              <div className="form-fields">
                {activeOp.fields.map((f) => (
                  <label key={f.key} className="field">
                    <span className="field-label">{f.label}{f.unit ? <span className="unit"> ({f.unit})</span> : null}</span>
                    {f.type === 'select' && f.options ? (
                      <select value={formValues[f.key] ?? ''} onChange={(e) => setFormValues((s) => ({ ...s, [f.key]: e.target.value }))}>
                        {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <input type="text" inputMode="decimal"
                        placeholder={f.placeholder ?? '0'} value={formValues[f.key] ?? ''}
                        onChange={(e) => setFormValues((s) => ({ ...s, [f.key]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && runOp()} />
                    )}
                  </label>
                ))}
              </div>
              {formError && <p className="form-error">{formError}</p>}
              {formResult && (
                <div className="form-result">
                  <span className="res-val">{formResult.result}{formResult.unit ? ` ${formResult.unit}` : ''}</span>
                  {formResult.detail && <span className="res-detail">{formResult.detail}</span>}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setActiveOp(null)}>Cancelar</button>
                <button type="button" className="btn btn-accent" onClick={runOp}>Calcular</button>
                {formResult && (
                  <button type="button" className="btn btn-ghost" onClick={() => { setActiveOp(null); setScienceOpen(false); }}>Usar resultado</button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}



const CSS = `
*, *::before, *::after { box-sizing: border-box; }
.calc-page {
  height: 100vh; height: 100dvh; max-height: 100dvh;
  background: #07070c url('/images/backgrounds/sTP.png') center/cover no-repeat;
  color: #f6f6f8;
  font-family: var(--font-main, system-ui, sans-serif);
  display: flex; flex-direction: column; overflow: hidden; position: relative;
}
.calc-page::before {
  content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background: linear-gradient(180deg, rgba(0,0,0,.62), rgba(0,0,0,.42) 38%, rgba(0,0,0,.66));
}
.calc-page > * { position: relative; z-index: 1; }
.calc-header {
  height: 56px; flex: 0 0 56px; display: flex; align-items: center; gap: 8px;
  padding: 0 10px; z-index: 20;
  background: rgba(8,8,10,.38); backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.calc-title {
  flex: 1; margin: 0; font-size: .92rem; font-weight: 700; letter-spacing: .16em;
  text-transform: uppercase; color: #ff2a2a; white-space: nowrap;
}
.header-actions { display: flex; gap: 8px; align-items: center; }
.menu-wrap { position: relative; }
.icon-btn, .chip, .chip-modules {
  appearance: none; border: 1px solid rgba(255,255,255,.16);
  background: rgba(18,18,22,.82); color: #f4f4f5; border-radius: 999px;
  min-height: 36px; padding: 0 12px; font-size: .78rem; font-weight: 650; cursor: pointer;
}
.icon-btn { width: 36px; padding: 0; }
.chip-on, .icon-btn.icon-active {
  background: linear-gradient(180deg, #ff3b3b, #9f1230); border-color: transparent; color: #fff;
}
.drop-menu {
  position: absolute; top: calc(100% + 8px); right: 0; width: min(280px, 78vw);
  padding: 8px; border-radius: 16px; background: rgba(12,12,14,.94);
  border: 1px solid rgba(255,255,255,.12); box-shadow: 0 18px 40px rgba(0,0,0,.45);
  display: flex; flex-direction: column; gap: 4px; z-index: 40;
}
.drop-menu button {
  text-align: left; border: 0; border-radius: 12px; padding: 10px 12px;
  background: rgba(255,255,255,.04); color: inherit; cursor: pointer;
}
.drop-menu strong { display: block; font-size: .92rem; }
.drop-menu span { display: block; color: #b7b7c2; font-size: .75rem; margin-top: 2px; }
.drop-menu button:hover { outline: 1px solid rgba(225,29,46,.7); }
.calc-body { flex: 1; min-height: 0; display: flex; position: relative; overflow: hidden; justify-content: center; }
.calc-main {
  flex: 0 1 480px; width: min(480px, 100%); min-height: 0; margin: 0 auto;
  display: grid;
  grid-template-rows: auto 48px 58px minmax(0, 1fr) 52px;
  gap: 8px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
}
.display-card {
  background: rgba(8,8,10,.78); border: 1px solid rgba(255,255,255,.14);
  border-radius: 22px; padding: 12px 14px 10px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
}
.display-card.shake { animation: shake .35s ease; }
@keyframes shake {
  0%{transform:translateX(0)} 25%{transform:translateX(-5px)} 50%{transform:translateX(5px)}
  75%{transform:translateX(-5px)} 100%{transform:translateX(0)}
}
.display-expr-input {
  width: 100%; border: 0; background: transparent; color: #fff;
  font-family: var(--font-mono, ui-monospace, monospace); font-size: 1.2rem;
  text-align: right; outline: none; caret-color: #ff3b3b; padding: 0;
}
.display-result {
  margin-top: 4px; text-align: right; font-family: var(--font-mono, ui-monospace, monospace);
  font-weight: 600; font-size: clamp(1.7rem, 5vw, 2.45rem); letter-spacing: -.03em;
  line-height: 1.15; word-break: break-all; color: #fff;
}
.display-guide {
  margin: 6px 0 0; text-align: right; color: #d0d0d8; font-size: .75rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.fn-scroll {
  display: flex; gap: 8px; overflow-x: auto; overscroll-behavior-x: contain;
  scrollbar-width: none; min-height: 48px; align-items: center;
  margin-bottom: 14px;
}
.calc-page.is-float {
  position: fixed; z-index: 80; width: min(460px, calc(100vw - 16px));
  height: min(760px, calc(100dvh - 16px)); border-radius: 22px; overflow: hidden;
  box-shadow: 0 24px 70px rgba(0,0,0,.55); border: 1px solid rgba(255,42,42,.4);
}
.calc-page.is-float .calc-header { cursor: grab; }
.fn-scroll::-webkit-scrollbar { display: none; }
.mem-row, .dock, .pad { display: grid; gap: 6px; min-height: 0; }
.mem-row { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.mem-row .btn { height: 36px; min-height: 36px; max-height: 36px; font-size: .78rem; }
.dock {
  grid-template-columns: 1.3fr repeat(3, minmax(0, .8fr)) 1.1fr;
  align-items: stretch;
}
.dock .btn { height: 100%; min-height: 0; max-height: none; font-size: .82rem; border-radius: 14px; }
.pad {
  min-height: 0;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(5, minmax(0, 1fr));
}
.btn {
  appearance: none; border: 1px solid rgba(255,255,255,.1); border-radius: 16px;
  color: #f7f7f8; font: inherit; font-weight: 650; font-size: 1.05rem;
  min-height: 0; height: 100%; padding: 0 6px; cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.16), 0 8px 14px rgba(0,0,0,.28);
  transition: transform .12s ease; user-select: none; touch-action: manipulation;
}
.btn:active { transform: scale(.97); }
.btn:focus-visible { outline: 2px solid #ff5a5a; outline-offset: 2px; }
.pad .btn:not(.btn-op):not(.btn-danger):not(.btn-warn):not(.btn-eq):not(.btn-fn):not(.btn-mem) {
  background: linear-gradient(180deg, #32323a, #17171b);
}
.btn-op { background: linear-gradient(180deg, #f6b24a, #c2410c); color: #1a0c04; }
.btn-fn {
  background: linear-gradient(180deg, #24507f, #102743); color: #e7f1ff;
  font-size: .95rem; flex: 0 0 auto; min-width: 64px; height: 44px; min-height: 44px;
}
.btn-mem { background: linear-gradient(180deg, #3c3c46, #222228); font-size: .92rem; }
.btn-danger { background: linear-gradient(180deg, #b42323, #6f1218); }
.btn-warn { background: linear-gradient(180deg, #9a3412, #7c2d12); }
.btn-eq { background: linear-gradient(180deg, #ff3b3b, #9f1230); font-size: 1.35rem; }
.btn-ghost {
  background: rgba(20,20,24,.88); box-shadow: none; font-size: .78rem; font-weight: 650;
}
.btn-accent {
  background: linear-gradient(180deg, #ff3b3b, #9f1230); font-size: .82rem;
}
.calc-history {
  position: fixed; top: 56px; right: 0; bottom: 0; width: min(380px, 100%);
  z-index: 7; display: flex; flex-direction: column;
  background: rgba(10,10,12,.72); backdrop-filter: blur(22px);
  border-left: 1px solid rgba(255,255,255,.1);
  transform: translateX(105%); transition: transform .28s ease;
}
.calc-history.open { transform: translateX(0); }
.hist-backdrop { position: fixed; inset: 56px 0 0 0; background: rgba(0,0,0,.28); z-index: 6; border: 0; }
.hist-head { display: flex; align-items: center; justify-content: space-between; padding: 12px; }
.hist-head h2 { margin: 0; color: #ff2a2a; letter-spacing: .12em; text-transform: uppercase; font-size: .84rem; }
.hist-hint, .muted { color: #b7b7c2; font-size: .78rem; padding: 0 12px; }
.hist-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 12px 16px; }
.hist-list { list-style: none; margin: 0; padding: 0; }
.hist-card { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 10px; margin-bottom: 8px; }
.hist-expr-btn, .hist-res-btn, .hist-toggle { display: block; width: 100%; text-align: left; background: transparent; border: 0; color: inherit; padding: 3px 0; font: inherit; cursor: pointer; }
.hist-expr-btn { font-family: var(--font-mono, ui-monospace, monospace); font-size: .86rem; color: #fff; }
.hist-res-btn { font-family: var(--font-mono, ui-monospace, monospace); color: #ffb4b4; font-size: .95rem; }
.hist-meta { color: #b7b7c2; font-size: .72rem; display: flex; justify-content: space-between; }
.hist-source { color: #ff4d4d; }
.hist-detail, .hist-steps { color: #ddd; font-size: .75rem; }
.modal-overlay { position: fixed; inset: 0; z-index: 30; background: rgba(0,0,0,.62); display: grid; place-items: center; padding: 16px; }
.modal { width: min(920px, 100%); height: min(820px, calc(100dvh - 24px)); display: flex; flex-direction: column; background: linear-gradient(180deg, rgba(18,18,22,.97), rgba(10,10,12,.96)); border: 1px solid rgba(255,42,42,.35); border-radius: 24px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.55); }
.root-modal { height: auto; max-height: calc(100dvh - 32px); width: min(440px, 100%); }
.modal-head { display: flex; align-items: center; gap: 8px; padding: 16px 18px; border-bottom: 1px solid rgba(255,42,42,.22); background: rgba(255,42,42,.06); }
.modal-head h2, .modal h2 { margin: 0; flex: 1; color: #ff2a2a; letter-spacing: .08em; text-transform: uppercase; font-size: 1.02rem; }
.search-wrap { position: relative; padding: 14px 18px 6px; }
.search-icon { position: absolute; left: 32px; top: 27px; color: #ff4d4d; font-size: 1.1rem; }
.search-input, .field input, .field select {
  width: 100%; border-radius: 14px; border: 1px solid rgba(255,255,255,.16);
  background: #111116; color: #fff; font: inherit; padding: 12px 14px 12px 38px; outline: none;
}
.field input, .field select { padding-left: 14px; }
.search-input:focus, .field input:focus, .field select:focus { border-color: #ff2a2a; box-shadow: 0 0 0 3px rgba(255,42,42,.18); }
.cat-chips { display: flex; gap: 8px; overflow-x: auto; padding: 10px 18px; scrollbar-width: none; }
.op-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 6px 18px 18px; overflow: auto; min-height: 0; flex: 1; }
.op-card { text-align: left; display: flex; flex-direction: column; gap: 6px; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,.1); background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02)); color: #fff; cursor: pointer; }
.op-card:hover { border-color: #ff2a2a; transform: translateY(-1px); }
.op-cat { align-self: flex-start; font-size: .68rem; letter-spacing: .08em; text-transform: uppercase; color: #ffb4b4; border: 1px solid rgba(255,42,42,.4); border-radius: 999px; padding: 3px 8px; }
.op-name { font-weight: 720; font-size: .98rem; }
.op-formula { color: #fff; font-family: var(--font-mono, ui-monospace, monospace); font-size: .84rem; background: rgba(255,42,42,.1); border-radius: 10px; padding: 6px 8px; }
.op-desc, .form-error, .res-detail { color: #d0d0d8; font-size: .8rem; }
.formula-box { margin: 14px 18px 0; padding: 12px 14px; border-radius: 14px; background: rgba(255,42,42,.08); border: 1px solid rgba(255,42,42,.28); }
.formula-box code { font-size: 1.05rem; color: #fff; }
.form-fields { display: flex; flex-direction: column; gap: 10px; padding: 12px 18px; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: .78rem; color: #d0d0d8; }
.form-error { margin: 0 18px; padding: 8px 12px; border-radius: 12px; background: rgba(183,28,28,.28); color: #ffb4ab; }
.form-result { margin: 12px 18px 0; padding: 16px; border-radius: 16px; background: rgba(225,29,46,.12); border: 1px solid rgba(225,29,46,.28); }
.res-val { font-size: 1.5rem; color: #ff4d4d; font-weight: 740; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; padding: 14px 18px; border-top: 1px solid rgba(255,255,255,.08); }
.hist-card { background: rgba(12,12,14,.72); border: 1px solid rgba(255,255,255,.1); border-radius: 16px; padding: 12px; margin-bottom: 10px; }
.hist-explanation { margin: 8px 0 0; color: #ececf2; font-size: .8rem; line-height: 1.45; }
.hist-steps { margin: 8px 0 0; padding-left: 18px; color: #d7d7e0; font-size: .78rem; line-height: 1.4; }
.hist-toggle { color: #ffb4b4; font-size: .75rem; }
.root-presets { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 14px 0; }
.science-modal { display: flex; flex-direction: column; }
.close-hist { background: transparent; border: 0; color: #fff; cursor: pointer; font-size: 1.1rem; }
@media (max-width: 720px) { .op-grid { grid-template-columns: 1fr; } .calc-title { font-size: .78rem; letter-spacing: .08em; } }
@media (min-width: 980px) {
  .calc-body:has(.calc-history.open) { justify-content: flex-start; }
  .calc-history { position: relative; top: auto; right: auto; bottom: auto; transform: none; width: 340px; height: 100%; }
  .calc-history:not(.open) { display: none; }
  .calc-history.open { display: flex; }
  .hist-backdrop, .close-hist { display: none; }
}
`;
