/**
 * pages/Calcular/Calcular.tsx
 * Calculadora científica completa — pantalla completa, responsive, modales,
 * animaciones, temas del ecosistema RBC, historial, guía y +80 funciones.
 *
 * Copia este archivo a: src/pages/Calcular/Calcular.tsx
 * Y registra la ruta en App.tsx:
 *   import Calcular from './pages/Calcular/Calcular';
 *   <Route path="/calcular" element={<Calcular />} />
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════════
   TIPOS
═══════════════════════════════════════════════════════════════ */

type FieldDef = {
  key: string;
  label: string;
  unit?: string;
  placeholder?: string;
  type?: 'number' | 'select';
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
  /** Devuelve { result, unit, detail? } o lanza Error */
  compute: (v: Record<string, number | string>) => { result: number; unit: string; detail?: string };
};

type HistoryEntry = {
  id: string;
  expression: string;
  result: string;
  ts: number;
};

/* ═══════════════════════════════════════════════════════════════
   CONSTANTES FÍSICAS
═══════════════════════════════════════════════════════════════ */

const C = {
  G: 6.6743e-11, // m³/kg·s²
  g: 9.80665, // m/s²
  c: 299792458, // m/s
  h: 6.62607015e-34, // J·s
  k: 1.380649e-23, // J/K
  e: 1.602176634e-19, // C
  Na: 6.02214076e23, // 1/mol
  R: 8.314462618, // J/mol·K
  epsilon0: 8.8541878128e-12, // F/m
  mu0: 1.25663706212e-6, // H/m
  sigma: 5.670374419e-8, // W/m²·K⁴
  atm: 101325, // Pa
  pi: Math.PI,
};

/* ═══════════════════════════════════════════════════════════════
   UTILIDADES
═══════════════════════════════════════════════════════════════ */

function formatNum(n: number, maxDigits = 12): string {
  if (!Number.isFinite(n)) return 'Error';
  if (Math.abs(n) !== 0 && (Math.abs(n) < 1e-6 || Math.abs(n) >= 1e12)) {
    return n.toExponential(6);
  }
  const s = n.toPrecision(maxDigits);
  return parseFloat(s).toString();
}

/** Evaluador seguro de expresiones aritméticas (+ - * / % ^ () y funciones) */
function safeEval(expr: string): number {
  let s = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\^/g, '**')
    .replace(/π/g, String(Math.PI))
    .replace(/\be\b/g, String(Math.E))
    .replace(/√/g, 'sqrt')
    .trim();

  if (!s) throw new Error('Vacío');

  // Solo caracteres permitidos
  if (!/^[\d\s+\-*/().%,^a-zA-Z_]+$/.test(s.replace(/\*\*/g, ''))) {
    throw new Error('Caracteres no permitidos');
  }

  // Funciones matemáticas permitidas
  const fns: Record<string, (...a: number[]) => number> = {
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    log: Math.log10,
    ln: Math.log,
    exp: Math.exp,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    fact: (n: number) => {
      if (n < 0 || !Number.isInteger(n) || n > 170) throw new Error('Factorial inválido');
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    },
  };

  // Reemplazar nombres de función por llamadas a fns
  const names = Object.keys(fns).sort((a, b) => b.length - a.length);
  for (const name of names) {
    s = s.replace(new RegExp(`\\b${name}\\b`, 'g'), `fns.${name}`);
  }

  // eslint-disable-next-line no-new-func
  const fn = new Function('fns', `"use strict"; return (${s});`);
  const result = fn(fns);
  if (typeof result !== 'number' || !Number.isFinite(result)) throw new Error('Resultado inválido');
  return result;
}

function num(v: number | string, key: string): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  if (!Number.isFinite(n)) throw new Error(`Valor inválido en «${key}»`);
  return n;
}

/* ═══════════════════════════════════════════════════════════════
   CATÁLOGO DE OPERACIONES CIENTÍFICAS
═══════════════════════════════════════════════════════════════ */

const OPERATIONS: SciOp[] = [
  /* ── Física: Mecánica ── */
  {
    id: 'fuerza',
    name: 'Fuerza (2ª Ley de Newton)',
    category: 'Física',
    formula: 'F = m · a',
    description: 'Fuerza neta igual a masa por aceleración. Unidad: Newton (N = kg·m/s²).',
    fields: [
      { key: 'm', label: 'Masa', unit: 'kg', placeholder: 'ej. 10' },
      { key: 'a', label: 'Aceleración', unit: 'm/s²', placeholder: 'ej. 9.81' },
    ],
    compute: (v) => ({ result: num(v.m, 'm') * num(v.a, 'a'), unit: 'N' }),
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
      { key: 't', label: 'Tiempo', unit: 's' },
    ],
    compute: (v) => {
      const t = num(v.t, 't');
      if (t === 0) throw new Error('El tiempo no puede ser 0');
      return { result: (num(v.v, 'v') - num(v.v0, 'v0')) / t, unit: 'm/s²' };
    },
  },
  {
    id: 'masa',
    name: 'Masa',
    category: 'Física',
    formula: 'm = F / a',
    description: 'Masa a partir de fuerza y aceleración.',
    fields: [
      { key: 'F', label: 'Fuerza', unit: 'N' },
      { key: 'a', label: 'Aceleración', unit: 'm/s²' },
    ],
    compute: (v) => {
      const a = num(v.a, 'a');
      if (a === 0) throw new Error('La aceleración no puede ser 0');
      return { result: num(v.F, 'F') / a, unit: 'kg' };
    },
  },
  {
    id: 'energia-cinetica',
    name: 'Energía Cinética',
    category: 'Física',
    formula: 'Ec = ½ · m · v²',
    description: 'Energía debida al movimiento.',
    fields: [
      { key: 'm', label: 'Masa', unit: 'kg' },
      { key: 'v', label: 'Velocidad', unit: 'm/s' },
    ],
    compute: (v) => ({ result: 0.5 * num(v.m, 'm') * num(v.v, 'v') ** 2, unit: 'J' }),
  },
  {
    id: 'energia-potencial-g',
    name: 'Energía Potencial Gravitatoria',
    category: 'Física',
    formula: 'Ep = m · g · h',
    description: 'Energía por posición en un campo gravitatorio (cerca de la superficie).',
    fields: [
      { key: 'm', label: 'Masa', unit: 'kg' },
      { key: 'h', label: 'Altura', unit: 'm' },
      { key: 'g', label: 'g', unit: 'm/s²', defaultValue: '9.80665' },
    ],
    compute: (v) => ({ result: num(v.m, 'm') * num(v.g, 'g') * num(v.h, 'h'), unit: 'J' }),
  },
  {
    id: 'energia-elastica',
    name: 'Energía Potencial Elástica',
    category: 'Física',
    formula: 'Ee = ½ · k · x²',
    description: 'Energía almacenada en un resorte (Ley de Hooke).',
    fields: [
      { key: 'k', label: 'Constante elástica', unit: 'N/m' },
      { key: 'x', label: 'Deformación', unit: 'm' },
    ],
    compute: (v) => ({ result: 0.5 * num(v.k, 'k') * num(v.x, 'x') ** 2, unit: 'J' }),
  },
  {
    id: 'trabajo',
    name: 'Trabajo',
    category: 'Física',
    formula: 'W = F · d · cos(θ)',
    description: 'Trabajo mecánico realizado por una fuerza.',
    fields: [
      { key: 'F', label: 'Fuerza', unit: 'N' },
      { key: 'd', label: 'Desplazamiento', unit: 'm' },
      { key: 'theta', label: 'Ángulo', unit: '°', defaultValue: '0' },
    ],
    compute: (v) => ({
      result: num(v.F, 'F') * num(v.d, 'd') * Math.cos((num(v.theta, 'θ') * Math.PI) / 180),
      unit: 'J',
    }),
  },
  {
    id: 'potencia',
    name: 'Potencia',
    category: 'Física',
    formula: 'P = W / t',
    description: 'Trabajo por unidad de tiempo. 1 W = 1 J/s.',
    fields: [
      { key: 'W', label: 'Trabajo', unit: 'J' },
      { key: 't', label: 'Tiempo', unit: 's' },
    ],
    compute: (v) => {
      const t = num(v.t, 't');
      if (t === 0) throw new Error('El tiempo no puede ser 0');
      return { result: num(v.W, 'W') / t, unit: 'W' };
    },
  },
  {
    id: 'presion',
    name: 'Presión',
    category: 'Física',
    formula: 'P = F / A',
    description: 'Fuerza perpendicular por unidad de área. 1 Pa = 1 N/m².',
    fields: [
      { key: 'F', label: 'Fuerza', unit: 'N' },
      { key: 'A', label: 'Área', unit: 'm²' },
    ],
    compute: (v) => {
      const A = num(v.A, 'A');
      if (A === 0) throw new Error('El área no puede ser 0');
      return { result: num(v.F, 'F') / A, unit: 'Pa' };
    },
  },
  {
    id: 'velocidad',
    name: 'Velocidad media',
    category: 'Física',
    formula: 'v = d / t',
    description: 'Distancia recorrida entre tiempo.',
    fields: [
      { key: 'd', label: 'Distancia', unit: 'm' },
      { key: 't', label: 'Tiempo', unit: 's' },
    ],
    compute: (v) => {
      const t = num(v.t, 't');
      if (t === 0) throw new Error('El tiempo no puede ser 0');
      return { result: num(v.d, 'd') / t, unit: 'm/s' };
    },
  },
  {
    id: 'distancia',
    name: 'Distancia (MRU)',
    category: 'Física',
    formula: 'd = v · t',
    description: 'Distancia en movimiento rectilíneo uniforme.',
    fields: [
      { key: 'v', label: 'Velocidad', unit: 'm/s' },
      { key: 't', label: 'Tiempo', unit: 's' },
    ],
    compute: (v) => ({ result: num(v.v, 'v') * num(v.t, 't'), unit: 'm' }),
  },
  {
    id: 'mua',
    name: 'Movimiento Uniformemente Acelerado',
    category: 'Física',
    formula: 'd = v₀·t + ½·a·t²',
    description: 'Desplazamiento con aceleración constante.',
    fields: [
      { key: 'v0', label: 'Velocidad inicial', unit: 'm/s', defaultValue: '0' },
      { key: 'a', label: 'Aceleración', unit: 'm/s²' },
      { key: 't', label: 'Tiempo', unit: 's' },
    ],
    compute: (v) => {
      const t = num(v.t, 't');
      return { result: num(v.v0, 'v0') * t + 0.5 * num(v.a, 'a') * t * t, unit: 'm' };
    },
  },
  {
    id: 'gravitacion',
    name: 'Ley de Gravitación Universal',
    category: 'Física',
    formula: 'F = G · m₁ · m₂ / r²',
    description: 'Fuerza atractiva entre dos masas. G = 6.6743×10⁻¹¹.',
    fields: [
      { key: 'm1', label: 'Masa 1', unit: 'kg' },
      { key: 'm2', label: 'Masa 2', unit: 'kg' },
      { key: 'r', label: 'Distancia', unit: 'm' },
    ],
    compute: (v) => {
      const r = num(v.r, 'r');
      if (r === 0) throw new Error('La distancia no puede ser 0');
      return { result: (C.G * num(v.m1, 'm1') * num(v.m2, 'm2')) / (r * r), unit: 'N' };
    },
  },
  {
    id: 'hooke',
    name: 'Ley de Hooke',
    category: 'Física',
    formula: 'F = −k · x',
    description: 'Fuerza restauradora de un resorte ideal.',
    fields: [
      { key: 'k', label: 'Constante k', unit: 'N/m' },
      { key: 'x', label: 'Deformación', unit: 'm' },
    ],
    compute: (v) => ({ result: -num(v.k, 'k') * num(v.x, 'x'), unit: 'N' }),
  },
  {
    id: 'circular',
    name: 'Velocidad Angular / Lineal',
    category: 'Física',
    formula: 'v = ω · r',
    description: 'Relación entre velocidad lineal y angular en movimiento circular.',
    fields: [
      { key: 'omega', label: 'Velocidad angular ω', unit: 'rad/s' },
      { key: 'r', label: 'Radio', unit: 'm' },
    ],
    compute: (v) => ({ result: num(v.omega, 'ω') * num(v.r, 'r'), unit: 'm/s' }),
  },
  {
    id: 'centripeta',
    name: 'Aceleración Centrípeta',
    category: 'Física',
    formula: 'a = v² / r',
    description: 'Aceleración hacia el centro en movimiento circular.',
    fields: [
      { key: 'v', label: 'Velocidad', unit: 'm/s' },
      { key: 'r', label: 'Radio', unit: 'm' },
    ],
    compute: (v) => {
      const r = num(v.r, 'r');
      if (r === 0) throw new Error('El radio no puede ser 0');
      return { result: (num(v.v, 'v') ** 2) / r, unit: 'm/s²' };
    },
  },

  /* ── Física: Termodinámica / Ondas ── */
  {
    id: 'celsius-kelvin',
    name: 'Temperatura °C ↔ K',
    category: 'Física',
    formula: 'K = °C + 273.15',
    description: 'Conversión entre Celsius y Kelvin.',
    fields: [
      {
        key: 'dir',
        label: 'Dirección',
        type: 'select',
        options: [
          { value: 'c2k', label: '°C → K' },
          { value: 'k2c', label: 'K → °C' },
        ],
        defaultValue: 'c2k',
      },
      { key: 't', label: 'Temperatura', unit: '' },
    ],
    compute: (v) => {
      const t = num(v.t, 't');
      if (v.dir === 'k2c') return { result: t - 273.15, unit: '°C' };
      return { result: t + 273.15, unit: 'K' };
    },
  },
  {
    id: 'celsius-fahrenheit',
    name: 'Temperatura °C ↔ °F',
    category: 'Física',
    formula: '°F = °C · 9/5 + 32',
    description: 'Conversión entre Celsius y Fahrenheit.',
    fields: [
      {
        key: 'dir',
        label: 'Dirección',
        type: 'select',
        options: [
          { value: 'c2f', label: '°C → °F' },
          { value: 'f2c', label: '°F → °C' },
        ],
        defaultValue: 'c2f',
      },
      { key: 't', label: 'Temperatura', unit: '' },
    ],
    compute: (v) => {
      const t = num(v.t, 't');
      if (v.dir === 'f2c') return { result: ((t - 32) * 5) / 9, unit: '°C' };
      return { result: (t * 9) / 5 + 32, unit: '°F' };
    },
  },
  {
    id: 'calor',
    name: 'Calor Específico (Q)',
    category: 'Física',
    formula: 'Q = m · c · ΔT',
    description: 'Calor necesario para cambiar la temperatura de una masa.',
    fields: [
      { key: 'm', label: 'Masa', unit: 'kg' },
      { key: 'c', label: 'Calor específico', unit: 'J/(kg·K)' },
      { key: 'dT', label: 'ΔT', unit: 'K o °C' },
    ],
    compute: (v) => ({ result: num(v.m, 'm') * num(v.c, 'c') * num(v.dT, 'ΔT'), unit: 'J' }),
  },
  {
    id: 'stefan',
    name: 'Ley de Stefan-Boltzmann',
    category: 'Física',
    formula: 'P = σ · A · T⁴',
    description: 'Potencia radiada por un cuerpo negro. σ = 5.67×10⁻⁸.',
    fields: [
      { key: 'A', label: 'Área', unit: 'm²' },
      { key: 'T', label: 'Temperatura', unit: 'K' },
    ],
    compute: (v) => ({ result: C.sigma * num(v.A, 'A') * num(v.T, 'T') ** 4, unit: 'W' }),
  },
  {
    id: 'ideal-gas',
    name: 'Gases Ideales (PV = nRT)',
    category: 'Física',
    formula: 'P · V = n · R · T',
    description: 'Calcula la presión a partir de n, T y V. R = 8.314 J/mol·K.',
    fields: [
      { key: 'n', label: 'Moles n', unit: 'mol' },
      { key: 'T', label: 'Temperatura', unit: 'K' },
      { key: 'V', label: 'Volumen', unit: 'm³' },
    ],
    compute: (v) => {
      const V = num(v.V, 'V');
      if (V === 0) throw new Error('El volumen no puede ser 0');
      return { result: (num(v.n, 'n') * C.R * num(v.T, 'T')) / V, unit: 'Pa' };
    },
  },
  {
    id: 'boyle',
    name: 'Ley de Boyle',
    category: 'Física',
    formula: 'P₁·V₁ = P₂·V₂ → V₂',
    description: 'Proceso isótermo: calcula V₂.',
    fields: [
      { key: 'P1', label: 'P₁', unit: 'Pa' },
      { key: 'V1', label: 'V₁', unit: 'm³' },
      { key: 'P2', label: 'P₂', unit: 'Pa' },
    ],
    compute: (v) => {
      const P2 = num(v.P2, 'P2');
      if (P2 === 0) throw new Error('P₂ no puede ser 0');
      return { result: (num(v.P1, 'P1') * num(v.V1, 'V1')) / P2, unit: 'm³' };
    },
  },
  {
    id: 'ondas',
    name: 'Velocidad de Onda',
    category: 'Física',
    formula: 'v = f · λ',
    description: 'Velocidad de una onda = frecuencia × longitud de onda.',
    fields: [
      { key: 'f', label: 'Frecuencia', unit: 'Hz' },
      { key: 'lambda', label: 'Longitud de onda λ', unit: 'm' },
    ],
    compute: (v) => ({ result: num(v.f, 'f') * num(v.lambda, 'λ'), unit: 'm/s' }),
  },
  {
    id: 'doppler',
    name: 'Efecto Doppler (aproximado)',
    category: 'Física',
    formula: "f' = f · (v ± vo) / (v ± vs)",
    description: 'Frecuencia percibida. vo y vs positivos si se acercan.',
    fields: [
      { key: 'f', label: 'Frecuencia fuente', unit: 'Hz' },
      { key: 'v', label: 'Velocidad del medio', unit: 'm/s', defaultValue: '343' },
      { key: 'vo', label: 'Vel. observador', unit: 'm/s', defaultValue: '0' },
      { key: 'vs', label: 'Vel. fuente', unit: 'm/s', defaultValue: '0' },
    ],
    compute: (v) => {
      const vel = num(v.v, 'v');
      const vs = num(v.vs, 'vs');
      if (vel - vs === 0) throw new Error('Denominador cero');
      return { result: (num(v.f, 'f') * (vel + num(v.vo, 'vo'))) / (vel - vs), unit: 'Hz' };
    },
  },

  /* ── Física: Electromagnetismo ── */
  {
    id: 'ohm',
    name: 'Ley de Ohm',
    category: 'Física',
    formula: 'V = I · R',
    description: 'Relación entre voltaje, corriente y resistencia.',
    fields: [
      { key: 'I', label: 'Corriente I', unit: 'A' },
      { key: 'R', label: 'Resistencia R', unit: 'Ω' },
    ],
    compute: (v) => ({ result: num(v.I, 'I') * num(v.R, 'R'), unit: 'V' }),
  },
  {
    id: 'potencia-elec',
    name: 'Potencia Eléctrica',
    category: 'Física',
    formula: 'P = V · I',
    description: 'Potencia en un circuito eléctrico simple.',
    fields: [
      { key: 'V', label: 'Voltaje', unit: 'V' },
      { key: 'I', label: 'Corriente', unit: 'A' },
    ],
    compute: (v) => ({ result: num(v.V, 'V') * num(v.I, 'I'), unit: 'W' }),
  },
  {
    id: 'coulomb',
    name: 'Ley de Coulomb',
    category: 'Física',
    formula: 'F = k · |q₁·q₂| / r²',
    description: 'Fuerza entre cargas puntuales. k = 1/(4πε₀) ≈ 8.99×10⁹.',
    fields: [
      { key: 'q1', label: 'Carga q₁', unit: 'C' },
      { key: 'q2', label: 'Carga q₂', unit: 'C' },
      { key: 'r', label: 'Distancia', unit: 'm' },
    ],
    compute: (v) => {
      const r = num(v.r, 'r');
      if (r === 0) throw new Error('Distancia no puede ser 0');
      const k = 1 / (4 * Math.PI * C.epsilon0);
      return { result: (k * Math.abs(num(v.q1, 'q1') * num(v.q2, 'q2'))) / (r * r), unit: 'N' };
    },
  },
  {
    id: 'campo-e',
    name: 'Campo Eléctrico (carga puntual)',
    category: 'Física',
    formula: 'E = k · |q| / r²',
    description: 'Intensidad del campo eléctrico.',
    fields: [
      { key: 'q', label: 'Carga', unit: 'C' },
      { key: 'r', label: 'Distancia', unit: 'm' },
    ],
    compute: (v) => {
      const r = num(v.r, 'r');
      if (r === 0) throw new Error('Distancia no puede ser 0');
      const k = 1 / (4 * Math.PI * C.epsilon0);
      return { result: (k * Math.abs(num(v.q, 'q'))) / (r * r), unit: 'N/C' };
    },
  },
  {
    id: 'capacitancia',
    name: 'Capacitancia',
    category: 'Física',
    formula: 'C = Q / V',
    description: 'Capacidad de un capacitor.',
    fields: [
      { key: 'Q', label: 'Carga Q', unit: 'C' },
      { key: 'V', label: 'Voltaje V', unit: 'V' },
    ],
    compute: (v) => {
      const V = num(v.V, 'V');
      if (V === 0) throw new Error('V no puede ser 0');
      return { result: num(v.Q, 'Q') / V, unit: 'F' };
    },
  },
  {
    id: 'joule',
    name: 'Ley de Joule (calor)',
    category: 'Física',
    formula: 'Q = I² · R · t',
    description: 'Calor disipado por resistencia.',
    fields: [
      { key: 'I', label: 'Corriente', unit: 'A' },
      { key: 'R', label: 'Resistencia', unit: 'Ω' },
      { key: 't', label: 'Tiempo', unit: 's' },
    ],
    compute: (v) => ({ result: num(v.I, 'I') ** 2 * num(v.R, 'R') * num(v.t, 't'), unit: 'J' }),
  },
  {
    id: 'resistores-serie',
    name: 'Resistencias en Serie',
    category: 'Física',
    formula: 'Req = R₁ + R₂ + R₃',
    description: 'Suma de resistencias en serie (hasta 3).',
    fields: [
      { key: 'R1', label: 'R₁', unit: 'Ω' },
      { key: 'R2', label: 'R₂', unit: 'Ω', defaultValue: '0' },
      { key: 'R3', label: 'R₃', unit: 'Ω', defaultValue: '0' },
    ],
    compute: (v) => ({
      result: num(v.R1, 'R1') + num(v.R2, 'R2') + num(v.R3, 'R3'),
      unit: 'Ω',
    }),
  },
  {
    id: 'resistores-paralelo',
    name: 'Resistencias en Paralelo',
    category: 'Física',
    formula: '1/Req = 1/R₁ + 1/R₂',
    description: 'Dos resistencias en paralelo.',
    fields: [
      { key: 'R1', label: 'R₁', unit: 'Ω' },
      { key: 'R2', label: 'R₂', unit: 'Ω' },
    ],
    compute: (v) => {
      const r1 = num(v.R1, 'R1');
      const r2 = num(v.R2, 'R2');
      if (r1 === 0 || r2 === 0) throw new Error('Resistencias no pueden ser 0');
      return { result: (r1 * r2) / (r1 + r2), unit: 'Ω' };
    },
  },

  /* ── Química ── */
  {
    id: 'molaridad',
    name: 'Concentración Molar',
    category: 'Química',
    formula: 'M = n / V',
    description: 'Moles de soluto por litro de solución.',
    fields: [
      { key: 'n', label: 'Moles de soluto', unit: 'mol' },
      { key: 'V', label: 'Volumen', unit: 'L' },
    ],
    compute: (v) => {
      const V = num(v.V, 'V');
      if (V === 0) throw new Error('Volumen no puede ser 0');
      return { result: num(v.n, 'n') / V, unit: 'mol/L' };
    },
  },
  {
    id: 'moles',
    name: 'Número de Moles',
    category: 'Química',
    formula: 'n = m / M',
    description: 'Moles a partir de masa y masa molar.',
    fields: [
      { key: 'm', label: 'Masa', unit: 'g' },
      { key: 'M', label: 'Masa molar', unit: 'g/mol' },
    ],
    compute: (v) => {
      const M = num(v.M, 'M');
      if (M === 0) throw new Error('Masa molar no puede ser 0');
      return { result: num(v.m, 'm') / M, unit: 'mol' };
    },
  },
  {
    id: 'masa-molar',
    name: 'Masa a partir de moles',
    category: 'Química',
    formula: 'm = n · M',
    description: 'Masa = moles × masa molar.',
    fields: [
      { key: 'n', label: 'Moles', unit: 'mol' },
      { key: 'M', label: 'Masa molar', unit: 'g/mol' },
    ],
    compute: (v) => ({ result: num(v.n, 'n') * num(v.M, 'M'), unit: 'g' }),
  },
  {
    id: 'ph',
    name: 'pH a partir de [H⁺]',
    category: 'Química',
    formula: 'pH = −log₁₀[H⁺]',
    description: 'Potencial de hidrógeno de una solución acuosa.',
    fields: [{ key: 'H', label: '[H⁺]', unit: 'mol/L' }],
    compute: (v) => {
      const H = num(v.H, 'H');
      if (H <= 0) throw new Error('[H⁺] debe ser > 0');
      return { result: -Math.log10(H), unit: '' };
    },
  },
  {
    id: 'poh',
    name: 'pOH a partir de [OH⁻]',
    category: 'Química',
    formula: 'pOH = −log₁₀[OH⁻]',
    description: 'A 25 °C: pH + pOH = 14.',
    fields: [{ key: 'OH', label: '[OH⁻]', unit: 'mol/L' }],
    compute: (v) => {
      const OH = num(v.OH, 'OH');
      if (OH <= 0) throw new Error('[OH⁻] debe ser > 0');
      return { result: -Math.log10(OH), unit: '' };
    },
  },
  {
    id: 'dilucion',
    name: 'Dilución (C₁V₁ = C₂V₂)',
    category: 'Química',
    formula: 'C₂ = C₁·V₁ / V₂',
    description: 'Concentración final tras diluir.',
    fields: [
      { key: 'C1', label: 'C₁', unit: 'mol/L' },
      { key: 'V1', label: 'V₁', unit: 'L' },
      { key: 'V2', label: 'V₂ final', unit: 'L' },
    ],
    compute: (v) => {
      const V2 = num(v.V2, 'V2');
      if (V2 === 0) throw new Error('V₂ no puede ser 0');
      return { result: (num(v.C1, 'C1') * num(v.V1, 'V1')) / V2, unit: 'mol/L' };
    },
  },
  {
    id: 'avogadro',
    name: 'Número de partículas (Avogadro)',
    category: 'Química',
    formula: 'N = n · Nₐ',
    description: 'Nₐ = 6.022×10²³ partículas/mol.',
    fields: [{ key: 'n', label: 'Moles', unit: 'mol' }],
    compute: (v) => ({ result: num(v.n, 'n') * C.Na, unit: 'partículas' }),
  },
  {
    id: 'densidad',
    name: 'Densidad',
    category: 'Química',
    formula: 'ρ = m / V',
    description: 'Masa por unidad de volumen.',
    fields: [
      { key: 'm', label: 'Masa', unit: 'kg' },
      { key: 'V', label: 'Volumen', unit: 'm³' },
    ],
    compute: (v) => {
      const V = num(v.V, 'V');
      if (V === 0) throw new Error('Volumen no puede ser 0');
      return { result: num(v.m, 'm') / V, unit: 'kg/m³' };
    },
  },

  /* ── Matemáticas: Geometría ── */
  {
    id: 'area-triangulo',
    name: 'Área del Triángulo',
    category: 'Matemáticas',
    formula: 'A = (b · h) / 2',
    description: 'Área a partir de base y altura.',
    fields: [
      { key: 'b', label: 'Base', unit: 'u' },
      { key: 'h', label: 'Altura', unit: 'u' },
    ],
    compute: (v) => ({ result: (num(v.b, 'b') * num(v.h, 'h')) / 2, unit: 'u²' }),
  },
  {
    id: 'area-triangulo-heron',
    name: 'Área Triángulo (Herón)',
    category: 'Matemáticas',
    formula: 'A = √[s(s−a)(s−b)(s−c)]',
    description: 's = (a+b+c)/2. Requiere desigualdad triangular.',
    fields: [
      { key: 'a', label: 'Lado a', unit: 'u' },
      { key: 'b', label: 'Lado b', unit: 'u' },
      { key: 'c', label: 'Lado c', unit: 'u' },
    ],
    compute: (v) => {
      const a = num(v.a, 'a');
      const b = num(v.b, 'b');
      const c = num(v.c, 'c');
      const s = (a + b + c) / 2;
      const area2 = s * (s - a) * (s - b) * (s - c);
      if (area2 < 0) throw new Error('No cumple desigualdad triangular');
      return { result: Math.sqrt(area2), unit: 'u²' };
    },
  },
  {
    id: 'area-rectangulo',
    name: 'Área del Rectángulo',
    category: 'Matemáticas',
    formula: 'A = a · b',
    description: 'Producto de los lados.',
    fields: [
      { key: 'a', label: 'Lado a', unit: 'u' },
      { key: 'b', label: 'Lado b', unit: 'u' },
    ],
    compute: (v) => ({ result: num(v.a, 'a') * num(v.b, 'b'), unit: 'u²' }),
  },
  {
    id: 'area-circulo',
    name: 'Área del Círculo',
    category: 'Matemáticas',
    formula: 'A = π · r²',
    description: 'Área de un círculo de radio r.',
    fields: [{ key: 'r', label: 'Radio', unit: 'u' }],
    compute: (v) => ({ result: Math.PI * num(v.r, 'r') ** 2, unit: 'u²' }),
  },
  {
    id: 'circunferencia',
    name: 'Circunferencia',
    category: 'Matemáticas',
    formula: 'C = 2 · π · r',
    description: 'Perímetro de un círculo.',
    fields: [{ key: 'r', label: 'Radio', unit: 'u' }],
    compute: (v) => ({ result: 2 * Math.PI * num(v.r, 'r'), unit: 'u' }),
  },
  {
    id: 'vol-cubo',
    name: 'Volumen del Cubo',
    category: 'Matemáticas',
    formula: 'V = a³',
    description: 'Volumen de un cubo de arista a.',
    fields: [{ key: 'a', label: 'Arista', unit: 'u' }],
    compute: (v) => ({ result: num(v.a, 'a') ** 3, unit: 'u³' }),
  },
  {
    id: 'vol-esfera',
    name: 'Volumen de la Esfera',
    category: 'Matemáticas',
    formula: 'V = (4/3) · π · r³',
    description: 'Volumen de una esfera de radio r.',
    fields: [{ key: 'r', label: 'Radio', unit: 'u' }],
    compute: (v) => ({ result: (4 / 3) * Math.PI * num(v.r, 'r') ** 3, unit: 'u³' }),
  },
  {
    id: 'vol-cilindro',
    name: 'Volumen del Cilindro',
    category: 'Matemáticas',
    formula: 'V = π · r² · h',
    description: 'Volumen de un cilindro recto.',
    fields: [
      { key: 'r', label: 'Radio', unit: 'u' },
      { key: 'h', label: 'Altura', unit: 'u' },
    ],
    compute: (v) => ({ result: Math.PI * num(v.r, 'r') ** 2 * num(v.h, 'h'), unit: 'u³' }),
  },
  {
    id: 'vol-cono',
    name: 'Volumen del Cono',
    category: 'Matemáticas',
    formula: 'V = (1/3) · π · r² · h',
    description: 'Volumen de un cono circular recto.',
    fields: [
      { key: 'r', label: 'Radio', unit: 'u' },
      { key: 'h', label: 'Altura', unit: 'u' },
    ],
    compute: (v) => ({ result: (1 / 3) * Math.PI * num(v.r, 'r') ** 2 * num(v.h, 'h'), unit: 'u³' }),
  },
  {
    id: 'hipotenusa',
    name: 'Hipotenusa (Pitágoras)',
    category: 'Matemáticas',
    formula: 'c = √(a² + b²)',
    description: 'Hipotenusa de un triángulo rectángulo.',
    fields: [
      { key: 'a', label: 'Cateto a', unit: 'u' },
      { key: 'b', label: 'Cateto b', unit: 'u' },
    ],
    compute: (v) => ({ result: Math.sqrt(num(v.a, 'a') ** 2 + num(v.b, 'b') ** 2), unit: 'u' }),
  },
  {
    id: 'distancia-2d',
    name: 'Distancia entre 2 puntos (2D)',
    category: 'Matemáticas',
    formula: 'd = √[(x₂−x₁)² + (y₂−y₁)²]',
    description: 'Distancia euclídea en el plano.',
    fields: [
      { key: 'x1', label: 'x₁', unit: '' },
      { key: 'y1', label: 'y₁', unit: '' },
      { key: 'x2', label: 'x₂', unit: '' },
      { key: 'y2', label: 'y₂', unit: '' },
    ],
    compute: (v) => ({
      result: Math.sqrt((num(v.x2, 'x2') - num(v.x1, 'x1')) ** 2 + (num(v.y2, 'y2') - num(v.y1, 'y1')) ** 2),
      unit: 'u',
    }),
  },

  /* ── Matemáticas: Álgebra / Estadística ── */
  {
    id: 'porcentaje',
    name: 'Porcentaje',
    category: 'Matemáticas',
    formula: 'parte = total · (p / 100)',
    description: 'Calcula el valor correspondiente a un porcentaje.',
    fields: [
      { key: 'total', label: 'Total', unit: '' },
      { key: 'p', label: 'Porcentaje', unit: '%' },
    ],
    compute: (v) => ({ result: (num(v.total, 'total') * num(v.p, 'p')) / 100, unit: '' }),
  },
  {
    id: 'regla-tres',
    name: 'Regla de Tres Directa',
    category: 'Matemáticas',
    formula: 'x = (b · c) / a',
    description: 'Si a → b, entonces c → x.',
    fields: [
      { key: 'a', label: 'a', unit: '' },
      { key: 'b', label: 'b', unit: '' },
      { key: 'c', label: 'c', unit: '' },
    ],
    compute: (v) => {
      const a = num(v.a, 'a');
      if (a === 0) throw new Error('a no puede ser 0');
      return { result: (num(v.b, 'b') * num(v.c, 'c')) / a, unit: '' };
    },
  },
  {
    id: 'media',
    name: 'Media Aritmética',
    category: 'Matemáticas',
    formula: 'x̄ = (x₁+…+xₙ) / n',
    description: 'Introduce números separados por comas o espacios.',
    fields: [{ key: 'vals', label: 'Valores', unit: '', placeholder: '1, 2, 3, 4' }],
    compute: (v) => {
      const parts = String(v.vals)
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map((x) => parseFloat(x.replace(',', '.')));
      if (!parts.length || parts.some((p) => !Number.isFinite(p))) throw new Error('Valores inválidos');
      return { result: parts.reduce((a, b) => a + b, 0) / parts.length, unit: '', detail: `n = ${parts.length}` };
    },
  },
  {
    id: 'mediana',
    name: 'Mediana',
    category: 'Matemáticas',
    formula: 'Valor central ordenado',
    description: 'Introduce números separados por comas o espacios.',
    fields: [{ key: 'vals', label: 'Valores', unit: '', placeholder: '5, 1, 3, 2, 4' }],
    compute: (v) => {
      const parts = String(v.vals)
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map((x) => parseFloat(x.replace(',', '.')))
        .sort((a, b) => a - b);
      if (!parts.length || parts.some((p) => !Number.isFinite(p))) throw new Error('Valores inválidos');
      const mid = Math.floor(parts.length / 2);
      const med = parts.length % 2 ? parts[mid] : (parts[mid - 1] + parts[mid]) / 2;
      return { result: med, unit: '', detail: `n = ${parts.length}` };
    },
  },
  {
    id: 'desv-std',
    name: 'Desviación Estándar (muestra)',
    category: 'Matemáticas',
    formula: 's = √[Σ(x−x̄)² / (n−1)]',
    description: 'Desviación estándar muestral. Números separados por comas.',
    fields: [{ key: 'vals', label: 'Valores', unit: '', placeholder: '2, 4, 4, 4, 5, 5, 7, 9' }],
    compute: (v) => {
      const parts = String(v.vals)
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map((x) => parseFloat(x.replace(',', '.')));
      if (parts.length < 2 || parts.some((p) => !Number.isFinite(p))) throw new Error('Se necesitan ≥ 2 valores');
      const mean = parts.reduce((a, b) => a + b, 0) / parts.length;
      const var_ = parts.reduce((a, b) => a + (b - mean) ** 2, 0) / (parts.length - 1);
      return { result: Math.sqrt(var_), unit: '', detail: `x̄ = ${formatNum(mean)}` };
    },
  },
  {
    id: 'factorial',
    name: 'Factorial',
    category: 'Matemáticas',
    formula: 'n! = 1·2·…·n',
    description: 'Solo enteros no negativos (máx. 170).',
    fields: [{ key: 'n', label: 'n', unit: '' }],
    compute: (v) => {
      const n = num(v.n, 'n');
      if (!Number.isInteger(n) || n < 0 || n > 170) throw new Error('n debe ser entero 0–170');
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return { result: r, unit: '' };
    },
  },
  {
    id: 'combinaciones',
    name: 'Combinaciones C(n, k)',
    category: 'Matemáticas',
    formula: 'C(n,k) = n! / (k!·(n−k)!)',
    description: 'Número de formas de elegir k elementos de n.',
    fields: [
      { key: 'n', label: 'n', unit: '' },
      { key: 'k', label: 'k', unit: '' },
    ],
    compute: (v) => {
      const n = num(v.n, 'n');
      const k = num(v.k, 'k');
      if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n)
        throw new Error('n, k enteros con 0 ≤ k ≤ n');
      let r = 1;
      for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
      return { result: Math.round(r), unit: '' };
    },
  },
  {
    id: 'permutaciones',
    name: 'Permutaciones P(n, k)',
    category: 'Matemáticas',
    formula: 'P(n,k) = n! / (n−k)!',
    description: 'Variaciones ordinarias de n elementos tomados de k en k.',
    fields: [
      { key: 'n', label: 'n', unit: '' },
      { key: 'k', label: 'k', unit: '' },
    ],
    compute: (v) => {
      const n = num(v.n, 'n');
      const k = num(v.k, 'k');
      if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n)
        throw new Error('n, k enteros con 0 ≤ k ≤ n');
      let r = 1;
      for (let i = 0; i < k; i++) r *= n - i;
      return { result: r, unit: '' };
    },
  },
  {
    id: 'ecuacion-cuadratica',
    name: 'Ecuación Cuadrática',
    category: 'Matemáticas',
    formula: 'ax² + bx + c = 0',
    description: 'Raíces reales mediante fórmula general.',
    fields: [
      { key: 'a', label: 'a', unit: '', defaultValue: '1' },
      { key: 'b', label: 'b', unit: '' },
      { key: 'c', label: 'c', unit: '' },
    ],
    compute: (v) => {
      const a = num(v.a, 'a');
      const b = num(v.b, 'b');
      const c = num(v.c, 'c');
      if (a === 0) throw new Error('a no puede ser 0');
      const d = b * b - 4 * a * c;
      if (d < 0) throw new Error('Discriminante negativo (raíces complejas)');
      const r1 = (-b + Math.sqrt(d)) / (2 * a);
      const r2 = (-b - Math.sqrt(d)) / (2 * a);
      return { result: r1, unit: '', detail: `x₁ = ${formatNum(r1)} · x₂ = ${formatNum(r2)}` };
    },
  },
  {
    id: 'random',
    name: 'Número Aleatorio',
    category: 'Matemáticas',
    formula: 'min ≤ x ≤ max',
    description: 'Entero aleatorio inclusivo entre min y max.',
    fields: [
      { key: 'min', label: 'Mínimo', unit: '', defaultValue: '1' },
      { key: 'max', label: 'Máximo', unit: '', defaultValue: '100' },
    ],
    compute: (v) => {
      const min = Math.ceil(num(v.min, 'min'));
      const max = Math.floor(num(v.max, 'max'));
      if (max < min) throw new Error('max debe ser ≥ min');
      return { result: Math.floor(Math.random() * (max - min + 1)) + min, unit: '' };
    },
  },
  {
    id: 'logaritmo',
    name: 'Logaritmo (cualquier base)',
    category: 'Matemáticas',
    formula: 'log_b(x) = ln(x) / ln(b)',
    description: 'Logaritmo de x en base b.',
    fields: [
      { key: 'x', label: 'x', unit: '' },
      { key: 'b', label: 'Base b', unit: '', defaultValue: '10' },
    ],
    compute: (v) => {
      const x = num(v.x, 'x');
      const b = num(v.b, 'b');
      if (x <= 0 || b <= 0 || b === 1) throw new Error('x > 0 y base > 0 ≠ 1');
      return { result: Math.log(x) / Math.log(b), unit: '' };
    },
  },
  {
    id: 'potencia',
    name: 'Potencia xʸ',
    category: 'Matemáticas',
    formula: 'xʸ',
    description: 'Eleva x a la potencia y.',
    fields: [
      { key: 'x', label: 'Base x', unit: '' },
      { key: 'y', label: 'Exponente y', unit: '' },
    ],
    compute: (v) => ({ result: num(v.x, 'x') ** num(v.y, 'y'), unit: '' }),
  },
  {
    id: 'raiz-n',
    name: 'Raíz n-ésima',
    category: 'Matemáticas',
    formula: 'ⁿ√x = x^(1/n)',
    description: 'Raíz de índice n de x.',
    fields: [
      { key: 'x', label: 'x', unit: '' },
      { key: 'n', label: 'Índice n', unit: '', defaultValue: '2' },
    ],
    compute: (v) => {
      const x = num(v.x, 'x');
      const n = num(v.n, 'n');
      if (n === 0) throw new Error('Índice no puede ser 0');
      if (x < 0 && n % 2 === 0) throw new Error('Raíz par de negativo');
      return { result: Math.sign(x) * Math.abs(x) ** (1 / n), unit: '' };
    },
  },

  /* ── Conversiones rápidas ── */
  {
    id: 'kmh-ms',
    name: 'km/h ↔ m/s',
    category: 'Conversiones',
    formula: '1 km/h = 1/3.6 m/s',
    description: 'Conversión de velocidad.',
    fields: [
      {
        key: 'dir',
        label: 'Dirección',
        type: 'select',
        options: [
          { value: 'kmh2ms', label: 'km/h → m/s' },
          { value: 'ms2kmh', label: 'm/s → km/h' },
        ],
        defaultValue: 'kmh2ms',
      },
      { key: 'v', label: 'Velocidad', unit: '' },
    ],
    compute: (v) => {
      const vel = num(v.v, 'v');
      if (v.dir === 'ms2kmh') return { result: vel * 3.6, unit: 'km/h' };
      return { result: vel / 3.6, unit: 'm/s' };
    },
  },
  {
    id: 'm-km',
    name: 'm ↔ km',
    category: 'Conversiones',
    formula: '1 km = 1000 m',
    description: 'Conversión de longitud.',
    fields: [
      {
        key: 'dir',
        label: 'Dirección',
        type: 'select',
        options: [
          { value: 'm2km', label: 'm → km' },
          { value: 'km2m', label: 'km → m' },
        ],
        defaultValue: 'm2km',
      },
      { key: 'x', label: 'Valor', unit: '' },
    ],
    compute: (v) => {
      const x = num(v.x, 'x');
      if (v.dir === 'km2m') return { result: x * 1000, unit: 'm' };
      return { result: x / 1000, unit: 'km' };
    },
  },
  {
    id: 'kg-lb',
    name: 'kg ↔ lb',
    category: 'Conversiones',
    formula: '1 kg ≈ 2.20462 lb',
    description: 'Conversión de masa.',
    fields: [
      {
        key: 'dir',
        label: 'Dirección',
        type: 'select',
        options: [
          { value: 'kg2lb', label: 'kg → lb' },
          { value: 'lb2kg', label: 'lb → kg' },
        ],
        defaultValue: 'kg2lb',
      },
      { key: 'x', label: 'Valor', unit: '' },
    ],
    compute: (v) => {
      const x = num(v.x, 'x');
      if (v.dir === 'lb2kg') return { result: x / 2.20462, unit: 'kg' };
      return { result: x * 2.20462, unit: 'lb' };
    },
  },
  {
    id: 'c-f-k',
    name: 'Energía: J ↔ cal ↔ eV',
    category: 'Conversiones',
    formula: '1 cal = 4.184 J · 1 eV = 1.602×10⁻¹⁹ J',
    description: 'Conversiones de energía.',
    fields: [
      {
        key: 'from',
        label: 'Desde',
        type: 'select',
        options: [
          { value: 'J', label: 'Joule (J)' },
          { value: 'cal', label: 'Caloría (cal)' },
          { value: 'eV', label: 'Electronvoltio (eV)' },
        ],
        defaultValue: 'J',
      },
      {
        key: 'to',
        label: 'Hasta',
        type: 'select',
        options: [
          { value: 'J', label: 'Joule (J)' },
          { value: 'cal', label: 'Caloría (cal)' },
          { value: 'eV', label: 'Electronvoltio (eV)' },
        ],
        defaultValue: 'cal',
      },
      { key: 'x', label: 'Valor', unit: '' },
    ],
    compute: (v) => {
      const x = num(v.x, 'x');
      const toJ: Record<string, number> = { J: 1, cal: 4.184, eV: C.e };
      const j = x * toJ[String(v.from)];
      const out = j / toJ[String(v.to)];
      return { result: out, unit: String(v.to) };
    },
  },
];

const CATEGORIES = ['Física', 'Química', 'Matemáticas', 'Conversiones'] as const;

/* ═══════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════════ */

export default function Calcular() {
  const navigate = useNavigate();
  const screenRef = useRef<HTMLInputElement>(null);

  const [expression, setExpression] = useState('');
  const [display, setDisplay] = useState('0');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [guide, setGuide] = useState('Pulsa Science Mode para fórmulas científicas con explicación completa.');
  const [shake, setShake] = useState(false);
  const [scienceOpen, setScienceOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeOp, setActiveOp] = useState<SciOp | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [formResult, setFormResult] = useState<{ result: string; unit: string; detail?: string } | null>(null);
  const [search, setSearch] = useState('');
  const [showHistory, setShowHistory] = useState(true);
  const [angleMode, setAngleMode] = useState<'DEG' | 'RAD'>('DEG');

  /* ── Historial persistente ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('rbc-calc-history');
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('rbc-calc-history', JSON.stringify(history.slice(0, 50)));
    } catch {
      /* ignore */
    }
  }, [history]);

  const addHistory = useCallback((expression: string, result: string) => {
    setHistory((h) => [{ id: `${Date.now()}-${Math.random()}`, expression, result, ts: Date.now() }, ...h].slice(0, 50));
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 350);
  };

  /* ── Teclado numérico ── */
  const append = (val: string) => {
    setExpression((prev) => {
      const next = prev === '0' && /\d/.test(val) ? val : prev + val;
      setDisplay(next || '0');
      return next;
    });
  };

  const clearAll = () => {
    setExpression('');
    setDisplay('0');
    setGuide('Pantalla limpia.');
  };

  const backspace = () => {
    setExpression((prev) => {
      const next = prev.slice(0, -1);
      setDisplay(next || '0');
      return next;
    });
  };

  const calculate = () => {
    try {
      let expr = expression;
      if (!expr.trim()) return;
      // Grados → radianes para trig si hace falta (las funciones del eval usan rad)
      if (angleMode === 'DEG') {
        expr = expr
          .replace(/\bsin\(/g, 'sin(π/180*')
          .replace(/\bcos\(/g, 'cos(π/180*')
          .replace(/\btan\(/g, 'tan(π/180*');
      }
      const result = safeEval(expr);
      const formatted = formatNum(result);
      setDisplay(formatted);
      setExpression(formatted);
      addHistory(expression, formatted);
      setGuide(`${expression} = ${formatted}`);
    } catch {
      triggerShake();
      setGuide('Expresión inválida. Revisa paréntesis y operadores.');
    }
  };

  const insertFn = (fn: string) => {
    append(fn);
    screenRef.current?.focus();
  };

  /* ── Ciencia: abrir operación ── */
  const openOp = (op: SciOp) => {
    const defaults: Record<string, string> = {};
    op.fields.forEach((f) => {
      defaults[f.key] = f.defaultValue ?? '';
    });
    setFormValues(defaults);
    setFormError('');
    setFormResult(null);
    setActiveOp(op);
  };

  const runOp = () => {
    if (!activeOp) return;
    try {
      const out = activeOp.compute(formValues);
      const formatted = formatNum(out.result);
      setFormResult({ result: formatted, unit: out.unit, detail: out.detail });
      setDisplay(formatted);
      setExpression(formatted);
      addHistory(`${activeOp.name}: ${activeOp.formula}`, `${formatted}${out.unit ? ' ' + out.unit : ''}`);
      setGuide(`${activeOp.name} → ${formatted}${out.unit ? ' ' + out.unit : ''}${out.detail ? ' · ' + out.detail : ''}`);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error en el cálculo');
      setFormResult(null);
    }
  };

  const filteredOps = useMemo(() => {
    const q = search.trim().toLowerCase();
    return OPERATIONS.filter((op) => {
      if (activeCategory && op.category !== activeCategory) return false;
      if (!q) return true;
      return (
        op.name.toLowerCase().includes(q) ||
        op.formula.toLowerCase().includes(q) ||
        op.description.toLowerCase().includes(q) ||
        op.category.toLowerCase().includes(q)
      );
    });
  }, [search, activeCategory]);

  /* ── Atajos de teclado ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (activeOp || scienceOpen) return;
      const k = e.key;
      if (/^[0-9.]$/.test(k)) {
        e.preventDefault();
        append(k);
      } else if (['+', '-', '*', '/', '%', '(', ')'].includes(k)) {
        e.preventDefault();
        append(k);
      } else if (k === 'Enter' || k === '=') {
        e.preventDefault();
        calculate();
      } else if (k === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (k === 'Escape') {
        e.preventDefault();
        clearAll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expression, activeOp, scienceOpen, angleMode]);

  /* ── Botones del pad ── */
  const padButtons: { label: ReactNode; action: () => void; className?: string; span?: number }[] = [
    { label: 'C', action: clearAll, className: 'btn-danger' },
    { label: '⌫', action: backspace, className: 'btn-warn' },
    { label: '(', action: () => append('('), className: 'btn-warn' },
    { label: ')', action: () => append(')'), className: 'btn-warn' },
    { label: '÷', action: () => append('/'), className: 'btn-op' },

    { label: '7', action: () => append('7') },
    { label: '8', action: () => append('8') },
    { label: '9', action: () => append('9') },
    { label: '×', action: () => append('*'), className: 'btn-op' },
    { label: '%', action: () => append('%'), className: 'btn-op' },

    { label: '4', action: () => append('4') },
    { label: '5', action: () => append('5') },
    { label: '6', action: () => append('6') },
    { label: '−', action: () => append('-'), className: 'btn-op' },
    { label: '√', action: () => insertFn('sqrt('), className: 'btn-fn' },

    { label: '1', action: () => append('1') },
    { label: '2', action: () => append('2') },
    { label: '3', action: () => append('3') },
    { label: '+', action: () => append('+'), className: 'btn-op' },
    { label: 'xʸ', action: () => append('^'), className: 'btn-fn' },

    { label: '0', action: () => append('0'), span: 2 },
    { label: '.', action: () => append('.') },
    { label: '=', action: calculate, className: 'btn-eq', span: 2 },
  ];

  const sciQuick: { label: string; action: () => void }[] = [
    { label: 'sin', action: () => insertFn('sin(') },
    { label: 'cos', action: () => insertFn('cos(') },
    { label: 'tan', action: () => insertFn('tan(') },
    { label: 'ln', action: () => insertFn('ln(') },
    { label: 'log', action: () => insertFn('log(') },
    { label: 'π', action: () => append('π') },
    { label: 'e', action: () => append('e') },
    { label: '!', action: () => insertFn('fact(') },
    { label: '|x|', action: () => insertFn('abs(') },
    { label: 'exp', action: () => insertFn('exp(') },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="calc-page">
        {/* Header */}
        <header className="calc-header">
          <button type="button" className="icon-btn" onClick={() => navigate('/proyectos')} title="Volver">
            ←
          </button>
          <h1 className="calc-title">Calculadora</h1>
          <div className="header-actions">
            <button
              type="button"
              className={`chip ${angleMode === 'DEG' ? 'chip-on' : ''}`}
              onClick={() => setAngleMode((m) => (m === 'DEG' ? 'RAD' : 'DEG'))}
              title="Modo angular"
            >
              {angleMode}
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowHistory((s) => !s)}
              title="Historial"
            >
              {showHistory ? '◫' : '◧'}
            </button>
          </div>
        </header>

        <div className={`calc-layout ${showHistory ? '' : 'no-hist'}`}>
          {/* Panel principal */}
          <main className="calc-main">
            <div className={`display-card ${shake ? 'shake' : ''}`}>
              <div className="display-expr">{expression || ' '}</div>
              <input
                ref={screenRef}
                className="display-screen"
                value={display}
                readOnly
                inputMode="none"
                aria-label="Pantalla"
              />
              <p className="display-guide">{guide}</p>
            </div>

            {/* Funciones rápidas */}
            <div className="quick-row">
              {sciQuick.map((b) => (
                <button key={b.label} type="button" className="btn btn-fn btn-sm" onClick={b.action}>
                  {b.label}
                </button>
              ))}
            </div>

            {/* Pad */}
            <div className="pad">
              {padButtons.map((b, i) => (
                <button
                  key={i}
                  type="button"
                  className={`btn ${b.className ?? ''}`}
                  style={b.span ? ({ gridColumn: `span ${b.span}` } as CSSProperties) : undefined}
                  onClick={b.action}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Acciones */}
            <div className="action-row">
              <button type="button" className="btn btn-accent" onClick={() => setScienceOpen(true)}>
                Science Mode
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(display);
                    setGuide('Resultado copiado al portapapeles.');
                  } catch {
                    setGuide('No se pudo copiar.');
                  }
                }}
              >
                Copiar
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={async () => {
                  try {
                    const t = await navigator.clipboard.readText();
                    if (t) {
                      setExpression((p) => p + t.trim());
                      setDisplay((d) => (d === '0' ? t.trim() : d + t.trim()));
                    }
                  } catch {
                    setGuide('No se pudo pegar (permiso denegado).');
                  }
                }}
              >
                Pegar
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setHistory([]);
                  setGuide('Historial borrado.');
                }}
              >
                Reset
              </button>
            </div>
          </main>

          {/* Historial */}
          {showHistory && (
            <aside className="calc-history">
              <h2>Historial</h2>
              {history.length === 0 && <p className="muted">Aún no hay cálculos.</p>}
              <ul>
                {history.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      className="hist-item"
                      onClick={() => {
                        setExpression(h.result);
                        setDisplay(h.result);
                        setGuide(h.expression);
                      }}
                    >
                      <span className="hist-expr">{h.expression}</span>
                      <span className="hist-res">= {h.result}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>

        {/* ═══ Modal Science Mode ═══ */}
        {scienceOpen && (
          <div className="modal-overlay" onClick={() => !activeOp && setScienceOpen(false)} role="presentation">
            <div
              className="modal science-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Science Mode"
            >
              <div className="modal-head">
                <h2>Science Mode</h2>
                <button type="button" className="icon-btn close" onClick={() => setScienceOpen(false)} aria-label="Cerrar">
                  ✕
                </button>
              </div>

              <div className="search-wrap">
                <input
                  className="search-input"
                  placeholder="Buscar fórmula, nombre o categoría…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="cat-chips">
                <button
                  type="button"
                  className={`chip ${!activeCategory ? 'chip-on' : ''}`}
                  onClick={() => setActiveCategory(null)}
                >
                  Todas
                </button>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`chip ${activeCategory === c ? 'chip-on' : ''}`}
                    onClick={() => setActiveCategory(c)}
                  >
                    {c}
                  </button>
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

        {/* ═══ Modal de operación ═══ */}
        {activeOp && (
          <div className="modal-overlay" onClick={() => setActiveOp(null)} role="presentation">
            <div
              className="modal op-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={activeOp.name}
            >
              <div className="modal-head">
                <div>
                  <span className="op-cat">{activeOp.category}</span>
                  <h2>{activeOp.name}</h2>
                </div>
                <button type="button" className="icon-btn close" onClick={() => setActiveOp(null)} aria-label="Cerrar">
                  ✕
                </button>
              </div>

              <div className="formula-box">
                <code>{activeOp.formula}</code>
              </div>
              <p className="op-desc">{activeOp.description}</p>

              <div className="form-fields">
                {activeOp.fields.map((f) => (
                  <label key={f.key} className="field">
                    <span className="field-label">
                      {f.label}
                      {f.unit ? <span className="unit"> ({f.unit})</span> : null}
                    </span>
                    {f.type === 'select' && f.options ? (
                      <select
                        value={formValues[f.key] ?? ''}
                        onChange={(e) => setFormValues((s) => ({ ...s, [f.key]: e.target.value }))}
                      >
                        {f.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder={f.placeholder ?? '0'}
                        value={formValues[f.key] ?? ''}
                        onChange={(e) => setFormValues((s) => ({ ...s, [f.key]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && runOp()}
                      />
                    )}
                  </label>
                ))}
              </div>

              {formError && <p className="form-error">{formError}</p>}
              {formResult && (
                <div className="form-result">
                  <span className="res-val">
                    {formResult.result}
                    {formResult.unit ? ` ${formResult.unit}` : ''}
                  </span>
                  {formResult.detail && <span className="res-detail">{formResult.detail}</span>}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setActiveOp(null)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-accent" onClick={runOp}>
                  Calcular
                </button>
                {formResult && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setActiveOp(null);
                      setScienceOpen(false);
                    }}
                  >
                    Usar resultado
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ESTILOS (tema-aware con variables CSS del ecosistema)
═══════════════════════════════════════════════════════════════ */

const CSS = `
.calc-page {
  min-height: 100vh;
  min-height: 100dvh;
    background: var(--bg-primary, #0c0c0c);
    background-color: #111;
    background-image: url('/images/backgrounds/FdCC.png');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
          background-color: var(--bg-primary);
          background-image: url('/images/backgrounds/FNP.png');
          background-size: cover;
          background-position: center;
          background-blend-mode: overlay;
          color: var(--text-primary);
  color: var(--text-primary, #fff);
  font-family: var(--font-main, system-ui, sans-serif);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.calc-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--border, #ff1a1a) 25%, transparent);
  background: color-mix(in srgb, var(--bg-secondary, #161616) 90%, transparent);
  backdrop-filter: blur(12px);
  z-index: 10;
  flex-shrink: 0;
}

.calc-title {
  flex: 1;
  margin: 0;
  font-size: 1.15rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent, #ff1a1a);
  text-shadow: 0 0 12px var(--glow, rgba(255,26,26,0.5));
}

.header-actions { display: flex; gap: 8px; align-items: center; }

.icon-btn {
  width: 40px; height: 40px;
  border-radius: var(--radius-full, 9999px);
  border: 1px solid color-mix(in srgb, var(--border, #ff1a1a) 35%, transparent);
  background: var(--bg-secondary, #161616);
  color: var(--text-primary, #fff);
  font-size: 1.1rem;
  cursor: pointer;
  transition: background var(--transition-fast, 0.15s), box-shadow var(--transition-fast, 0.15s), transform 0.1s;
}
.icon-btn:hover {
  background: color-mix(in srgb, var(--accent, #ff1a1a) 18%, var(--bg-secondary));
  box-shadow: 0 0 12px var(--glow, rgba(255,26,26,0.4));
}
.icon-btn:active { transform: scale(0.94); }
.icon-btn.close { font-size: 1rem; }

.chip {
  padding: 6px 12px;
  border-radius: var(--radius-full, 9999px);
  border: 1px solid color-mix(in srgb, var(--border, #ff1a1a) 30%, transparent);
  background: transparent;
  color: var(--text-secondary, #c8c8c8);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s);
  white-space: nowrap;
}
.chip:hover { border-color: var(--accent, #ff1a1a); color: var(--text-primary); }
.chip-on {
  background: color-mix(in srgb, var(--accent, #ff1a1a) 22%, transparent);
  border-color: var(--accent, #ff1a1a);
  color: var(--text-primary, #fff);
  box-shadow: 0 0 10px var(--glow, rgba(255,26,26,0.35));
}

.calc-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 0;
  min-height: 0;
  overflow: hidden;
}
.calc-layout.no-hist { grid-template-columns: 1fr; }

.calc-main {
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 12px;
  overflow-y: auto;
  max-width: 560px;
  margin: 0 auto;
  width: 100%;
}

.display-card {
  background: var(--bg-card, rgba(12,12,12,0.94));
  border: 1px solid var(--card-border, rgba(255,26,26,0.28));
  border-radius: var(--radius-xl, 20px);
  padding: 16px 18px 12px;
  box-shadow: var(--shadow, 0 0 22px rgba(255,26,26,0.25));
  transition: box-shadow var(--transition-normal, 0.25s);
}
.display-card.shake { animation: shake 0.35s ease; }
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

.display-expr {
  min-height: 1.2em;
  font-size: 0.85rem;
  color: var(--text-muted, #9ca3af);
  text-align: right;
  word-break: break-all;
  opacity: 0.85;
}
.display-screen {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text-primary, #fff);
  font-size: clamp(1.6rem, 5vw, 2.4rem);
  font-family: var(--font-mono, ui-monospace, monospace);
  text-align: right;
  outline: none;
  padding: 4px 0;
  letter-spacing: 0.02em;
}
.display-guide {
  margin: 6px 0 0;
  font-size: 0.78rem;
  color: var(--text-secondary, #c8c8c8);
  text-align: right;
  line-height: 1.35;
  min-height: 2.2em;
}

.quick-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.pad {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.btn {
  appearance: none;
  border: none;
  border-radius: var(--radius-md, 10px);
  padding: 14px 8px;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  background: color-mix(in srgb, var(--accent, #ff1a1a) 55%, #2a2a2a);
  color: #fff;
  box-shadow: 0 0 10px color-mix(in srgb, var(--glow, rgba(255,26,26,0.5)) 40%, transparent);
  transition: background var(--transition-fast, 0.15s), transform 0.1s, box-shadow var(--transition-fast, 0.15s);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.btn:hover {
  background: color-mix(in srgb, var(--accent-hover, #ff4444) 70%, #333);
  box-shadow: 0 0 16px var(--glow, rgba(255,26,26,0.55));
}
.btn:active { transform: scale(0.96); }

.btn-op {
  background: #ff9800;
  box-shadow: 0 0 10px rgba(255,152,0,0.45);
}
.btn-op:hover { background: #ffaa33; box-shadow: 0 0 14px rgba(255,152,0,0.65); }

.btn-warn {
  background: #e65100;
  box-shadow: 0 0 10px rgba(230,81,0,0.4);
}
.btn-warn:hover { background: #ff6d00; }

.btn-danger {
  background: #b71c1c;
  box-shadow: 0 0 10px rgba(183,28,28,0.45);
}
.btn-danger:hover { background: #d32f2f; }

.btn-eq {
  background: var(--accent, #ff1a1a);
  box-shadow: 0 0 14px var(--glow, rgba(255,26,26,0.55));
  font-size: 1.25rem;
}
.btn-eq:hover { background: var(--accent-hover, #ff4444); }

.btn-fn {
  background: color-mix(in srgb, #003366 80%, var(--accent, #ff1a1a));
  box-shadow: 0 0 8px rgba(0,51,102,0.5);
  font-size: 0.85rem;
}
.btn-fn:hover { background: #004080; }
.btn-sm { padding: 8px 10px; font-size: 0.78rem; border-radius: 8px; }

.btn-accent {
  background: var(--accent, #ff1a1a);
  box-shadow: 0 0 14px var(--glow, rgba(255,26,26,0.5));
  padding: 12px 18px;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
}
.btn-accent:hover { background: var(--accent-hover, #ff4444); }

.btn-ghost {
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--border, #ff1a1a) 35%, transparent);
  box-shadow: none;
  color: var(--text-secondary, #c8c8c8);
  padding: 12px 14px;
  font-size: 0.9rem;
}
.btn-ghost:hover {
  border-color: var(--accent, #ff1a1a);
  color: var(--text-primary);
  background: color-mix(in srgb, var(--accent, #ff1a1a) 12%, transparent);
  box-shadow: 0 0 10px var(--glow, rgba(255,26,26,0.3));
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  padding-bottom: 8px;
}

/* Historial */
.calc-history {
  border-left: 1px solid color-mix(in srgb, var(--border, #ff1a1a) 20%, transparent);
  background: var(--bg-secondary, #161616);
  padding: 16px 12px;
  overflow-y: auto;
  animation: slideIn 0.3s ease;
}
@keyframes slideIn {
  from { opacity: 0; transform: translateX(12px); }
  to { opacity: 1; transform: translateX(0); }
}
.calc-history h2 {
  margin: 0 0 12px;
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent, #ff1a1a);
}
.calc-history ul { list-style: none; margin: 0; padding: 0; }
.hist-item {
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: var(--radius-md, 10px);
  padding: 10px 8px;
  cursor: pointer;
  color: var(--text-primary);
  transition: background var(--transition-fast, 0.15s);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hist-item:hover { background: color-mix(in srgb, var(--accent, #ff1a1a) 12%, transparent); }
.hist-expr { font-size: 0.75rem; color: var(--text-muted, #9ca3af); word-break: break-all; }
.hist-res { font-size: 0.9rem; font-family: var(--font-mono, monospace); color: var(--accent, #ff1a1a); }
.muted { color: var(--text-muted, #9ca3af); font-size: 0.85rem; }

/* Modales */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay-strong, rgba(0,0,0,0.75));
  backdrop-filter: blur(6px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background: var(--bg-card, rgba(18,18,18,0.98));
  border: 1px solid var(--card-border, rgba(255,26,26,0.28));
  border-radius: var(--radius-xl, 20px);
  box-shadow: var(--shadow, 0 0 30px rgba(255,26,26,0.35));
  width: 100%;
  max-height: min(90vh, 720px);
  display: flex;
  flex-direction: column;
  animation: popIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}
@keyframes popIn {
  from { opacity: 0; transform: scale(0.94) translateY(12px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.science-modal { max-width: 640px; }
.op-modal { max-width: 440px; }

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 8px;
  flex-shrink: 0;
}
.modal-head h2 {
  margin: 4px 0 0;
  font-size: 1.2rem;
  color: var(--text-primary, #fff);
}

.search-wrap { padding: 0 18px 8px; flex-shrink: 0; }
.search-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--radius-md, 10px);
  border: 1px solid color-mix(in srgb, var(--border, #ff1a1a) 30%, transparent);
  background: var(--bg-secondary, #161616);
  color: var(--text-primary, #fff);
  font-size: 0.95rem;
  outline: none;
  transition: border-color var(--transition-fast, 0.15s), box-shadow var(--transition-fast, 0.15s);
  box-sizing: border-box;
}
.search-input:focus {
  border-color: var(--accent, #ff1a1a);
  box-shadow: var(--focus-ring, 0 0 0 3px var(--glow));
}

.cat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 18px 10px;
  flex-shrink: 0;
}

.op-grid {
  flex: 1;
  overflow-y: auto;
  padding: 4px 14px 18px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
  align-content: start;
}

.op-card {
  text-align: left;
  padding: 12px;
  border-radius: var(--radius-md, 10px);
  border: 1px solid color-mix(in srgb, var(--border, #ff1a1a) 22%, transparent);
  background: color-mix(in srgb, var(--bg-secondary, #161616) 80%, transparent);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.op-card:hover {
  border-color: var(--accent, #ff1a1a);
  background: color-mix(in srgb, var(--accent, #ff1a1a) 14%, var(--bg-secondary));
  box-shadow: 0 0 14px var(--glow, rgba(255,26,26,0.35));
  transform: translateY(-2px);
}
.op-cat {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent, #ff1a1a);
  opacity: 0.9;
}
.op-name { font-size: 0.88rem; font-weight: 600; line-height: 1.25; }
.op-formula {
  font-size: 0.75rem;
  font-family: var(--font-mono, monospace);
  color: var(--text-muted, #9ca3af);
}

.formula-box {
  margin: 0 18px;
  padding: 12px 14px;
  border-radius: var(--radius-md, 10px);
  background: color-mix(in srgb, var(--accent, #ff1a1a) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--border, #ff1a1a) 25%, transparent);
  text-align: center;
}
.formula-box code {
  font-family: var(--font-mono, monospace);
  font-size: 1.05rem;
  color: var(--accent, #ff1a1a);
}

.op-desc {
  margin: 10px 18px;
  font-size: 0.88rem;
  color: var(--text-secondary, #c8c8c8);
  line-height: 1.45;
}

.form-fields {
  padding: 0 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  max-height: 40vh;
}
.field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 0.82rem; color: var(--text-secondary, #c8c8c8); }
.unit { color: var(--text-muted, #9ca3af); font-size: 0.78rem; }
.field input,
.field select {
  padding: 10px 12px;
  border-radius: var(--radius-sm, 6px);
  border: 1px solid color-mix(in srgb, var(--border, #ff1a1a) 28%, transparent);
  background: var(--bg-secondary, #161616);
  color: var(--text-primary, #fff);
  font-size: 1rem;
  outline: none;
  transition: border-color var(--transition-fast, 0.15s), box-shadow var(--transition-fast, 0.15s);
}
.field input:focus,
.field select:focus {
  border-color: var(--accent, #ff1a1a);
  box-shadow: var(--focus-ring, 0 0 0 3px var(--glow));
}

.form-error {
  margin: 10px 18px 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(183,28,28,0.25);
  color: #ff8a80;
  font-size: 0.85rem;
}
.form-result {
  margin: 12px 18px 0;
  padding: 14px;
  border-radius: var(--radius-md, 10px);
  background: color-mix(in srgb, var(--accent, #ff1a1a) 15%, transparent);
  border: 1px solid var(--card-border, rgba(255,26,26,0.28));
  display: flex;
  flex-direction: column;
  gap: 4px;
  animation: popIn 0.25s ease;
}
.res-val {
  font-size: 1.35rem;
  font-family: var(--font-mono, monospace);
  color: var(--accent, #ff1a1a);
  font-weight: 700;
}
.res-detail { font-size: 0.82rem; color: var(--text-secondary, #c8c8c8); }

.modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  padding: 16px 18px;
  flex-shrink: 0;
  border-top: 1px solid color-mix(in srgb, var(--border, #ff1a1a) 15%, transparent);
  margin-top: 12px;
}

/* Responsive */
@media (max-width: 768px) {
  .calc-layout { grid-template-columns: 1fr; }
  .calc-history {
    position: fixed;
    right: 0; top: 0; bottom: 0;
    width: min(280px, 85vw);
    z-index: 50;
    box-shadow: -8px 0 24px rgba(0,0,0,0.5);
  }
  .calc-main { max-width: 100%; padding: 12px; }
  .pad { gap: 6px; }
  .btn { padding: 12px 6px; font-size: 0.95rem; }
  .science-modal, .op-modal { max-height: 92dvh; }
  .op-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 400px) {
  .op-grid { grid-template-columns: 1fr; }
  .pad { grid-template-columns: repeat(5, 1fr); gap: 5px; }
  .btn { padding: 10px 4px; font-size: 0.88rem; }
}
`;
