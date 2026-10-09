/**
 * pages/Calcular/Calcular.tsx
 * Calculadora científica — TS válido, Electrostática/Gauss, √∛∜, historial transparente.
 */

import {
  useCallback, useEffect, useMemo, useRef, useState,
  type CSSProperties, type ReactNode, type KeyboardEvent as RKBD,
} from 'react';
import { useNavigate } from 'react-router-dom';

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
    .replace(/\^/g, '**').replace(/π/g, String(Math.PI)).replace(/\be\b/g, String(Math.E))
    .replace(/∛/g, 'cbrt').replace(/∜/g, 'root4').replace(/√/g, 'sqrt').trim();
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
    root4: (x: number) => Math.sign(x) * Math.abs(x) ** 0.25,
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
  }
];

const FN_OPENERS = ['sin(', 'cos(', 'tan(', 'ln(', 'log(', 'abs(', '√(', '∛(', '∜(', 'fact(', 'exp(', 'asin(', 'acos(', 'atan('];

export default function Calcular() {
  const navigate = useNavigate();
  const exprRef = useRef<HTMLInputElement>(null);

  const [expression, setExpression] = useState('');
  const [resultDisplay, setResultDisplay] = useState('0');
  const [guide, setGuide] = useState('Edita con el cursor · √ⁿ para raíces · Science Mode para fórmulas.');
  const [shake, setShake] = useState(false);
  const [scienceOpen, setScienceOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);
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
      if (text.endsWith('(') || FN_OPENERS.includes(text)) {
        const base = text.endsWith('(') ? text : text + '(';
        insert = base + ')';
        cursorOffset = base.length;
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
      addHistory(expression, formatted, {
        explanation: `Evaluación de «${expr}» en modo ${angleMode}.`,
        steps: [`Expresión: ${expr}`, `Modo angular: ${angleMode}`, `Resultado: ${formatted}`],
        source: 'pad',
      });
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
        `Operación: ${activeOp.name}`,
        `Fórmula: ${activeOp.formula}`,
        `Datos: ${inputSummary}`,
        `Resultado: ${withUnit}`,
      ];
      addHistory(`${activeOp.name}: ${activeOp.formula}`, withUnit, {
        explanation: `Science Mode — ${activeOp.name}. Fórmula: ${activeOp.formula}. ${activeOp.description} Entradas: ${inputSummary}. Resultado: ${withUnit}.`,
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

  const sciRow: PadBtn[] = [
    { label: 'sin', action: () => insertFn('sin('), className: 'btn-fn', title: 'Seno' },
    { label: 'cos', action: () => insertFn('cos('), className: 'btn-fn', title: 'Coseno' },
    { label: 'tan', action: () => insertFn('tan('), className: 'btn-fn', title: 'Tangente' },
    { label: 'ln', action: () => insertFn('ln('), className: 'btn-fn', title: 'Log natural' },
    { label: 'log', action: () => insertFn('log('), className: 'btn-fn', title: 'Log₁₀' },
  ];
  const sciRow2: PadBtn[] = [
    { label: 'π', action: () => insertAtCursor('π'), className: 'btn-fn' },
    { label: 'e', action: () => insertAtCursor('e'), className: 'btn-fn' },
    { label: '√ⁿ', action: () => setRootOpen(true), className: 'btn-fn', title: 'Raíz con índice' },
    { label: 'xʸ', action: () => insertAtCursor('^'), className: 'btn-fn' },
    { label: '|x|', action: () => insertFn('abs('), className: 'btn-fn' },
    { label: 'n!', action: () => insertFn('fact('), className: 'btn-fn' },
  ];
  const padButtons: PadBtn[] = [
    { label: 'C', action: clearAll, className: 'btn-danger' },
    { label: '⌫', action: backspace, className: 'btn-warn' },
    { label: '(', action: () => insertAtCursor('(', { autoClose: true }), className: 'btn-op' },
    { label: ')', action: () => insertAtCursor(')'), className: 'btn-op' },
    { label: '÷', action: () => insertAtCursor('/'), className: 'btn-op' },
    { label: '7', action: () => insertAtCursor('7') },
    { label: '8', action: () => insertAtCursor('8') },
    { label: '9', action: () => insertAtCursor('9') },
    { label: '×', action: () => insertAtCursor('*'), className: 'btn-op' },
    { label: '%', action: () => insertAtCursor('%'), className: 'btn-op' },
    { label: '4', action: () => insertAtCursor('4') },
    { label: '5', action: () => insertAtCursor('5') },
    { label: '6', action: () => insertAtCursor('6') },
    { label: '−', action: () => insertAtCursor('-'), className: 'btn-op' },
    { label: '+', action: () => insertAtCursor('+'), className: 'btn-op' },
    { label: '1', action: () => insertAtCursor('1') },
    { label: '2', action: () => insertAtCursor('2') },
    { label: '3', action: () => insertAtCursor('3') },
    { label: '0', action: () => insertAtCursor('0') },
    { label: '.', action: () => insertAtCursor('.') },
    { label: '=', action: calculate, className: 'btn-eq', span: 5 },
  ];

  const formatTime = (ts: number) => {
    try { return new Date(ts).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="calc-page">
        <header className="calc-header">
          <button type="button" className="icon-btn" onClick={() => navigate('/proyectos')} title="Volver">←</button>
          <h1 className="calc-title">Calculadora</h1>
          <div className="header-actions">
            <button type="button" className="chip-modules" onClick={() => setModulesOpen(true)}>Módulos</button>
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

            <div className="fn-block">
              <div className="fn-row">
                {sciRow.map((b, i) => (
                  <button key={i} type="button" className={`btn ${b.className ?? ''}`} onClick={b.action} title={b.title}>{b.label}</button>
                ))}
              </div>
              <div className="fn-row">
                {sciRow2.map((b, i) => (
                  <button key={i} type="button" className={`btn ${b.className ?? ''}`} onClick={b.action} title={b.title}>{b.label}</button>
                ))}
              </div>
            </div>

            <div className="pad">
              {padButtons.map((b, i) => (
                <button key={i} type="button" className={`btn ${b.className ?? ''}`}
                  style={b.span ? ({ gridColumn: `span ${b.span}` } as CSSProperties) : undefined}
                  onClick={b.action} title={b.title}>{b.label}</button>
              ))}
            </div>

            <div className="action-bar">
              <button type="button" className="btn btn-accent action-primary" onClick={() => setScienceOpen(true)}>Science Mode</button>
              <button type="button" className="btn btn-ghost" onClick={async () => {
                try { await navigator.clipboard.writeText(resultDisplay); setGuide('Copiado.'); }
                catch { setGuide('No se pudo copiar.'); }
              }}>Copiar</button>
              <button type="button" className="btn btn-ghost" onClick={async () => {
                try { const t = await navigator.clipboard.readText(); if (t) insertAtCursor(t.trim()); }
                catch { setGuide('No se pudo pegar.'); }
              }}>Pegar</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setHistory([]); setGuide('Historial borrado.'); }}>Reset</button>
            </div>
          </main>

          <aside className={`calc-history ${historyOpen ? 'open' : ''}`} aria-hidden={!historyOpen}>
            <div className="hist-head">
              <h2>Historial</h2>
              <button type="button" className="icon-btn close-hist" onClick={() => setHistoryOpen(false)} aria-label="Cerrar">✕</button>
            </div>
            <p className="hist-hint">
              <strong>Expresión</strong> → editar · <strong>Resultado</strong> → usar valor
            </p>
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
                  const n = parseInt(rootIndex, 10) || 2;
                  setRootOpen(false);
                  if (n === 2) insertFn('√(');
                  else if (n === 3) insertFn('∛(');
                  else if (n === 4) insertFn('∜(');
                  else {
                    insertAtCursor('root(', { autoClose: true });
                    setGuide(`Completa: root(valor, ${n})`);
                  }
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
                <input className="search-input" placeholder="Buscar fórmula…" value={search}
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

        {modulesOpen && (
          <div className="modal-overlay" onClick={() => setModulesOpen(false)} role="presentation">
            <div className="modal modules-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="modal-head">
                <h2>Módulos</h2>
                <button type="button" className="icon-btn" onClick={() => setModulesOpen(false)}>✕</button>
              </div>
              <p className="modules-intro">Herramientas especializadas (próximamente en TSX).</p>
              <div className="modules-grid">
                {MODULES.map((m) => (
                  <button key={m.id} type="button" className="module-card"
                    onClick={() => { setModulesOpen(false); navigate(m.path); }}>
                    <span className="module-icon">{m.icon}</span>
                    <span className="module-name">{m.name}</span>
                    <span className="module-desc">{m.desc}</span>
                    <span className="module-path">{m.path}</span>
                  </button>
                ))}
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
  background-color: var(--bg-primary, #0c0c0c);
  background-image: url('/images/backgrounds/FNP.png');
  background-size: cover; background-position: center; background-blend-mode: overlay;
  color: #fff; font-family: var(--font-main, system-ui, sans-serif);
  display: flex; flex-direction: column; overflow: hidden; position: relative;
}
.calc-page::before {
  content: ''; position: absolute; inset: 0;
  background: color-mix(in srgb, var(--bg-primary, #0c0c0c) 55%, transparent);
  pointer-events: none; z-index: 0;
}
.calc-page > * { position: relative; z-index: 1; }
.calc-header {
  display: flex; align-items: center; gap: 10px; padding: 8px 14px;
  border-bottom: 1px solid rgba(255,26,26,0.12);
  background: rgba(0,0,0,0.15) !important;
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  z-index: 20; flex-shrink: 0;
}
.calc-title {
  flex: 1; margin: 0; font-size: 1rem; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--accent, #ff1a1a);
  text-shadow: 0 0 12px rgba(255,26,26,0.4);
}
.header-actions { display: flex; gap: 6px; align-items: center; }
.icon-btn {
  width: 36px; height: 36px; border-radius: 9999px;
  border: 1px solid rgba(255,26,26,0.25); background: rgba(255,255,255,0.06);
  color: #fff; font-size: 1rem; cursor: pointer; transition: all 0.15s;
}
.icon-btn:hover { background: rgba(255,26,26,0.2); border-color: var(--accent, #ff1a1a); }
.icon-btn:active { transform: scale(0.94); }
.icon-btn.icon-active { background: rgba(255,26,26,0.25); border-color: var(--accent, #ff1a1a); }
.chip {
  padding: 5px 10px; border-radius: 9999px; border: 1px solid rgba(255,26,26,0.25);
  background: rgba(255,255,255,0.05); color: #c8c8c8; font-size: 0.75rem; font-weight: 600;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.chip:hover { border-color: var(--accent, #ff1a1a); color: #fff; }
.chip-on { background: rgba(255,26,26,0.28); border-color: var(--accent, #ff1a1a); color: #fff; }
.chip-modules {
  padding: 4px 10px; border-radius: 9999px; font-size: 0.7rem; font-weight: 600;
  cursor: pointer; color: #c8c8c8; background: rgba(26,35,126,0.35);
  border: 1px solid rgba(57,73,171,0.35); transition: all 0.15s;
}
.chip-modules:hover { color: #fff; background: rgba(40,53,147,0.5); }
.calc-body { flex: 1 1 auto; min-height: 0; max-height: 100%; display: flex; position: relative; overflow: hidden; }
.calc-main {
  flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column;
  padding: 12px 14px 16px; gap: 9px; overflow-y: auto; max-width: 520px; margin: 0 auto; width: 100%;
}
.display-card {
  background: rgba(8,8,8,0.55); border: 1px solid rgba(255,26,26,0.22);
  border-radius: 16px; padding: 14px 16px 10px; box-shadow: 0 0 20px rgba(255,26,26,0.15);
  backdrop-filter: blur(12px);
}
.display-card.shake { animation: shake 0.38s ease; }
@keyframes shake {
  0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)}
  60%{transform:translateX(-4px)} 80%{transform:translateX(4px)}
}
.display-expr-input {
  width: 100%; border: none; background: transparent;
  color: #f0f0f0 !important;
  font-size: clamp(1.05rem, 3.2vw, 1.35rem) !important;
  font-family: var(--font-mono, ui-monospace, monospace); font-weight: 500;
  text-align: right; outline: none; padding: 4px 0 8px;
  caret-color: var(--accent, #ff1a1a); letter-spacing: 0.02em; min-height: 1.6em;
}
.display-expr-input::placeholder { color: rgba(255,255,255,0.35); }
.display-expr-input:focus { color: #fff !important; }
.display-result {
  width: 100%; text-align: right; font-size: clamp(1.6rem, 5.5vw, 2.4rem);
  font-family: var(--font-mono, ui-monospace, monospace); font-weight: 650;
  color: #fff; word-break: break-all; line-height: 1.25; min-height: 1.3em;
}
.display-guide { margin: 6px 0 0; font-size: 0.72rem; color: #b0b0b0; text-align: right; line-height: 1.35; min-height: 2em; }
.fn-block { display: flex; flex-direction: column; gap: 5px; }
.fn-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(48px, 1fr)); gap: 5px; }
.pad { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.btn {
  appearance: none; border: none; border-radius: 11px; padding: 12px 5px;
  font-size: 1rem; font-weight: 650; cursor: pointer;
  background: color-mix(in srgb, var(--accent, #ff1a1a) 40%, #1a1a1a); color: #fff;
  box-shadow: 0 2px 6px rgba(255,26,26,0.2); transition: all 0.15s;
  user-select: none; -webkit-tap-highlight-color: transparent;
}
.btn:hover { background: color-mix(in srgb, var(--accent-hover, #ff4444) 50%, #222); }
.btn:active { transform: scale(0.96); }
.btn-op { background: linear-gradient(160deg, #ff9800, #e65100); }
.btn-warn { background: linear-gradient(160deg, #ff6d00, #bf360c); }
.btn-danger { background: linear-gradient(160deg, #e53935, #8e0000); }
.btn-eq { background: linear-gradient(160deg, var(--accent, #ff1a1a), #800); font-size: 1.25rem; }
.btn-fn { background: rgba(13,33,55,0.75); border: 1px solid rgba(26,74,110,0.45); font-size: 0.78rem; padding: 8px 3px; }
.btn-fn:hover { background: rgba(21,101,192,0.4); }
.btn-accent { background: linear-gradient(160deg, var(--accent, #ff1a1a), #800); padding: 10px 14px; font-size: 0.88rem; }
.btn-ghost { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,26,26,0.22); box-shadow: none; color: #c8c8c8; padding: 10px 11px; font-size: 0.82rem; }
.btn-ghost:hover { border-color: var(--accent, #ff1a1a); color: #fff; background: rgba(255,26,26,0.12); }
.action-bar { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; padding-top: 2px; }
.action-primary { flex: 1 1 auto; min-width: 110px; }
.calc-history {
  position: fixed; top: 0; right: 0; bottom: 0; width: min(310px, 88vw);
  height: 100vh; height: 100dvh; max-height: 100dvh; z-index: 60;
  display: flex; flex-direction: column;
  background: rgba(0,0,0,0.25) !important;
  border-left: 1px solid rgba(255,26,26,0.12);
  backdrop-filter: blur(20px) saturate(1.3);
  -webkit-backdrop-filter: blur(20px) saturate(1.3);
  box-shadow: -8px 0 28px rgba(0,0,0,0.35);
  transform: translateX(105%); transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
  overflow: hidden;
}
.calc-history.open { transform: translateX(0); }
.hist-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 55; animation: fadeIn 0.2s ease; }
.hist-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 12px 4px; flex-shrink: 0; background: transparent !important; }
.hist-head h2 { margin: 0; font-size: 0.88rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent, #ff1a1a); }
.hist-hint { margin: 0 12px 8px; font-size: 0.68rem; color: #9ca3af; line-height: 1.4; flex-shrink: 0; }
.hist-scroll {
  flex: 1 1 0; min-height: 0; overflow-y: auto; overflow-x: hidden;
  padding: 0 8px 24px; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
  scrollbar-width: thin; scrollbar-color: rgba(255,26,26,0.45) transparent;
}
.hist-scroll::-webkit-scrollbar { width: 5px; }
.hist-scroll::-webkit-scrollbar-thumb { background: rgba(255,26,26,0.4); border-radius: 6px; }
.hist-list { list-style: none; margin: 0; padding: 0; }
.hist-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,26,26,0.1); border-radius: 11px; padding: 9px; margin-bottom: 8px; }
.hist-meta { display: flex; justify-content: space-between; gap: 6px; margin-bottom: 4px; }
.hist-source { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent, #ff1a1a); }
.hist-time { font-size: 0.62rem; color: #9ca3af; }
.hist-expr-btn, .hist-res-btn { display: block; width: 100%; text-align: left; background: transparent; border: none; cursor: pointer; padding: 3px 2px; border-radius: 5px; }
.hist-expr-btn { font-size: 0.78rem; color: #d0d0d0; font-family: var(--font-mono, monospace); word-break: break-all; font-weight: 500; }
.hist-expr-btn:hover { background: rgba(255,26,26,0.1); color: #fff; }
.hist-res-btn { font-size: 0.92rem; font-family: var(--font-mono, monospace); font-weight: 700; color: var(--accent, #ff1a1a); margin-top: 1px; }
.hist-res-btn:hover { background: rgba(255,26,26,0.12); }
.hist-toggle { margin-top: 5px; background: none; border: none; color: #9ca3af; font-size: 0.68rem; cursor: pointer; padding: 2px 0; }
.hist-toggle:hover { color: var(--accent, #ff1a1a); }
.hist-detail { margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,26,26,0.1); animation: fadeIn 0.2s ease; }
.hist-explanation { margin: 0 0 6px; font-size: 0.72rem; color: #c8c8c8; line-height: 1.45; }
.hist-steps { margin: 0; padding-left: 16px; font-size: 0.7rem; color: #9ca3af; line-height: 1.5; }
.muted { color: #9ca3af; font-size: 0.82rem; padding: 4px 6px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 14px; animation: fadeIn 0.2s ease; }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
.modal {
  background: rgba(12,12,12,0.92); border: 1px solid rgba(255,26,26,0.22); border-radius: 18px;
  box-shadow: 0 0 36px rgba(255,26,26,0.22), 0 20px 40px rgba(0,0,0,0.5);
  width: 100%; max-height: min(90vh, 720px); display: flex; flex-direction: column;
  animation: popIn 0.26s cubic-bezier(0.16,1,0.3,1); overflow: hidden; backdrop-filter: blur(18px);
}
@keyframes popIn { from{opacity:0;transform:scale(0.95) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
.science-modal { max-width: 640px; } .op-modal { max-width: 440px; } .modules-modal { max-width: 460px; } .root-modal { max-width: 360px; }
.modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 14px 16px 6px; flex-shrink: 0; }
.modal-head h2 { margin: 4px 0 0; font-size: 1.1rem; color: #fff; }
.search-wrap { padding: 0 16px 6px; flex-shrink: 0; }
.search-input { width: 100%; padding: 10px 12px; border-radius: 11px; border: 1px solid rgba(255,26,26,0.22); background: rgba(22,22,22,0.7); color: #fff; font-size: 0.92rem; outline: none; }
.search-input:focus { border-color: var(--accent, #ff1a1a); box-shadow: 0 0 0 3px rgba(255,26,26,0.25); }
.cat-chips { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 16px 8px; flex-shrink: 0; }
.op-grid { flex: 1; overflow-y: auto; padding: 4px 12px 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; align-content: start; scrollbar-width: thin; }
.op-card { text-align: left; padding: 11px; border-radius: 11px; border: 1px solid rgba(255,26,26,0.14); background: rgba(22,22,22,0.55); color: #fff; cursor: pointer; transition: all 0.15s; display: flex; flex-direction: column; gap: 3px; }
.op-card:hover { border-color: var(--accent, #ff1a1a); background: rgba(255,26,26,0.12); transform: translateY(-2px); }
.op-cat { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent, #ff1a1a); }
.op-name { font-size: 0.84rem; font-weight: 650; line-height: 1.25; }
.op-formula { font-size: 0.7rem; font-family: var(--font-mono, monospace); color: #9ca3af; }
.formula-box { margin: 0 16px; padding: 11px 12px; border-radius: 11px; background: rgba(255,26,26,0.1); border: 1px solid rgba(255,26,26,0.18); text-align: center; }
.formula-box code { font-family: var(--font-mono, monospace); font-size: 1rem; color: var(--accent, #ff1a1a); }
.op-desc { margin: 8px 16px; font-size: 0.84rem; color: #c8c8c8; line-height: 1.4; }
.form-fields { padding: 0 16px; display: flex; flex-direction: column; gap: 9px; overflow-y: auto; max-height: 36vh; }
.field { display: flex; flex-direction: column; gap: 3px; }
.field-label { font-size: 0.78rem; color: #c8c8c8; }
.unit { color: #9ca3af; font-size: 0.72rem; }
.field input, .field select { padding: 9px 11px; border-radius: 9px; border: 1px solid rgba(255,26,26,0.2); background: rgba(22,22,22,0.7); color: #fff; font-size: 0.95rem; outline: none; }
.field input:focus, .field select:focus { border-color: var(--accent, #ff1a1a); box-shadow: 0 0 0 3px rgba(255,26,26,0.25); }
.form-error { margin: 8px 16px 0; padding: 7px 11px; border-radius: 9px; background: rgba(183,28,28,0.25); color: #ff8a80; font-size: 0.82rem; }
.form-result { margin: 10px 16px 0; padding: 12px; border-radius: 11px; background: rgba(255,26,26,0.1); border: 1px solid rgba(255,26,26,0.2); display: flex; flex-direction: column; gap: 3px; animation: popIn 0.2s ease; }
.res-val { font-size: 1.25rem; font-family: var(--font-mono, monospace); color: var(--accent, #ff1a1a); font-weight: 700; }
.res-detail { font-size: 0.78rem; color: #c8c8c8; }
.modal-actions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; padding: 12px 16px; flex-shrink: 0; border-top: 1px solid rgba(255,26,26,0.1); margin-top: 10px; }
.root-presets { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 16px 0; }
.modules-intro { margin: 0 16px 10px; font-size: 0.82rem; color: #c8c8c8; line-height: 1.4; }
.modules-grid { padding: 0 12px 16px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
.module-card { text-align: left; padding: 12px 14px; border-radius: 12px; cursor: pointer; border: 1px solid rgba(255,26,26,0.14); background: rgba(22,22,22,0.5); color: #fff; display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; transition: all 0.15s; }
.module-card:hover { border-color: var(--accent, #ff1a1a); background: rgba(255,26,26,0.1); transform: translateY(-1px); }
.module-icon { grid-row: 1 / 4; font-size: 1.5rem; align-self: center; }
.module-name { font-weight: 700; font-size: 0.95rem; }
.module-desc { font-size: 0.75rem; color: #c8c8c8; line-height: 1.3; }
.module-path { font-size: 0.68rem; font-family: var(--font-mono, monospace); color: var(--accent, #ff1a1a); opacity: 0.85; }
@media (max-width: 768px) {
  .calc-main { max-width: 100%; padding: 10px; }
  .pad { gap: 5px; } .btn { padding: 11px 3px; font-size: 0.92rem; }
  .btn-fn { font-size: 0.72rem; padding: 7px 2px; }
  .op-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 400px) { .op-grid { grid-template-columns: 1fr; } .fn-row { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 900px) {
  .calc-history {
    position: relative; transform: none; width: 290px; flex-shrink: 0; box-shadow: none;
    height: 100%; max-height: 100%;
    border-left: 1px solid rgba(255,26,26,0.12);
    background: rgba(0,0,0,0.18) !important;
  }
  .calc-history:not(.open) { display: none; }
  .calc-history.open { display: flex; transform: none; }
  .hist-backdrop { display: none; }
  .close-hist { display: none; }
}
`;