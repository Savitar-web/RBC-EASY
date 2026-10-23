/**
 * pages/ModoAscendido/ModoAscendido.tsx
 * Calculadora (ancho de Calcular), gráfica con herramientas reales y matrices por burbujas.
 * Fondo: public/images/backgrounds/FMA.png
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceState } from '../../hooks/useWorkspaceState';
import glassCSS from './ascended-glass.css?inline';

type View = 'calc' | 'graph' | 'matrices' | 'lineal' | 'trigo' | 'geo' | 'funciones' | 'aritmetica';
type Kb = 'num' | 'fn' | 'abc' | 'sym';
type Bg = 'default' | 'white' | 'black';
type Box = { x0: number; x1: number; y0: number; y1: number };
type Curve = { id: string; expr: string; color: string; on: boolean };
type Dep =
  | { t: 'mid'; a: string; b: string }
  | { t: 'on-seg'; a: string; b: string; u: number }
  | { t: 'on-circ'; c: string; rim: string; ang: number };
type Pt = {
  id: string; label: string; x: number; y: number;
  locked?: boolean; hidden?: boolean; showLabel?: boolean; complex?: boolean; dep?: Dep;
};
type Sh = {
  id: string; kind: string; pts: string[]; color: string;
  hidden?: boolean; showLabel?: boolean; label?: string;
  r?: number; n?: number; text?: string; rigid?: boolean;
  raw?: { x: number; y: number }[]; coef?: number[];
};
type Matrix = { id: string; name: string; rows: number; cols: number; cells: string[][] };
type XY = { x: number; y: number };

const COLORS = ['#2ecc71', '#ff2a2a', '#5aa7ff', '#f5b942', '#d18bff', '#7dffb3', '#ff8ad8', '#9ad1ff'];
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LINKS = [
  { name: 'Calculadora', path: '/calcular' },
  { name: 'Balística', path: '/balistica' },
  { name: 'Conversión', path: '/conversion' },
  { name: 'Modo ascendido', path: '/modo-ascendido' },
];
const VIEWS: { id: View; name: string }[] = [
  { id: 'calc', name: 'Calculadora' },
  { id: 'graph', name: 'Graficar' },
  { id: 'matrices', name: 'Matrices' },
  { id: 'lineal', name: 'Álgebra lineal' },
  { id: 'aritmetica', name: 'Aritmética' },
  { id: 'trigo', name: 'Trigonometría' },
  { id: 'geo', name: 'Geometría' },
  { id: 'funciones', name: 'Funciones' },
];
const GROUPS: { name: string; tools: { id: string; label: string }[] }[] = [
  { name: 'Mueve', tools: [
    { id: 'select', label: 'Mueve' },
    { id: 'freehand', label: 'Figura a mano alzada' },
    { id: 'pencil', label: 'Lápiz' },
  ]},
  { name: 'Punto', tools: [
    { id: 'point', label: 'Punto' },
    { id: 'pointOn', label: 'Punto en objeto' },
    { id: 'lock', label: 'Limitar o liberar' },
    { id: 'intersect', label: 'Intersección' },
    { id: 'mid', label: 'Medio o centro' },
    { id: 'complex', label: 'Número complejo' },
    { id: 'extrema', label: 'Extremos' },
    { id: 'roots', label: 'Raíces' },
  ]},
  { name: 'Recta', tools: [
    { id: 'line', label: 'Recta' },
    { id: 'segment', label: 'Segmento' },
    { id: 'segmentLen', label: 'Segmento de longitud dada' },
    { id: 'ray', label: 'Semirrecta' },
    { id: 'polyline', label: 'Poligonal' },
    { id: 'vector', label: 'Vector' },
    { id: 'equipollent', label: 'Equipolente' },
  ]},
  { name: 'Especial', tools: [
    { id: 'perp', label: 'Perpendicular' },
    { id: 'parallel', label: 'Paralela' },
    { id: 'bisector', label: 'Mediatriz' },
    { id: 'angleBis', label: 'Bisectriz' },
    { id: 'tangent', label: 'Tangente' },
    { id: 'polar', label: 'Polar o conjugado' },
    { id: 'fit', label: 'Ajuste lineal' },
    { id: 'locus', label: 'Lugar geométrico' },
  ]},
  { name: 'Polígono', tools: [
    { id: 'poly', label: 'Polígono' },
    { id: 'regular', label: 'Polígono regular' },
    { id: 'rigid', label: 'Polígono rígido' },
    { id: 'vectorPoly', label: 'Polígono vectorial' },
  ]},
  { name: 'Círculo', tools: [
    { id: 'circle', label: 'Circunferencia (centro, punto)' },
    { id: 'circleR', label: 'Centro y radio' },
    { id: 'compass', label: 'Compás' },
    { id: 'circle3', label: 'Por tres puntos' },
    { id: 'semi', label: 'Semicircunferencia' },
    { id: 'arc', label: 'Arco de circunferencia' },
    { id: 'arc3', label: 'Arco tres puntos' },
    { id: 'sector', label: 'Sector circular' },
    { id: 'sector3', label: 'Sector tres puntos' },
  ]},
  { name: 'Cónica', tools: [
    { id: 'ellipse', label: 'Elipse' },
    { id: 'hyperbola', label: 'Hipérbola' },
    { id: 'parabola', label: 'Parábola' },
    { id: 'conic5', label: 'Cónica por cinco puntos' },
  ]},
  { name: 'Medida', tools: [
    { id: 'angle', label: 'Ángulo' },
    { id: 'angleAmp', label: 'Ángulo dada su amplitud' },
    { id: 'distance', label: 'Distancia o longitud' },
    { id: 'area', label: 'Área' },
    { id: 'slope', label: 'Pendiente' },
    { id: 'list', label: 'Lista {1, 2}' },
    { id: 'relation', label: 'Relación' },
    { id: 'inspect', label: 'Inspección de función' },
  ]},
  { name: 'Transforma', tools: [
    { id: 'reflect', label: 'Simetría axial' },
    { id: 'central', label: 'Simetría central' },
    { id: 'invert', label: 'Inversión' },
    { id: 'rotate', label: 'Rotación' },
    { id: 'translate', label: 'Traslación' },
    { id: 'homothety', label: 'Homotecia' },
  ]},
  { name: 'General', tools: [
    { id: 'slider', label: 'Deslizador' },
    { id: 'text', label: 'Texto' },
    { id: 'image', label: 'Imagen' },
    { id: 'button', label: 'Botón' },
    { id: 'check', label: 'Casilla de control' },
    { id: 'input', label: 'Casilla de entrada' },
    { id: 'pan', label: 'Desplazar vista' },
    { id: 'zoomIn', label: 'Aproximar' },
    { id: 'zoomOut', label: 'Alejar' },
    { id: 'hide', label: 'Mostrar u ocultar objeto' },
    { id: 'label', label: 'Mostrar u ocultar etiqueta' },
    { id: 'style', label: 'Copiar estilo visual' },
    { id: 'delete', label: 'Borrar' },
  ]},
];

const NEED: Record<string, number> = {
  line: 2, segment: 2, ray: 2, vector: 2, segmentLen: 2, circle: 2, semi: 2,
  mid: 2, distance: 2, slope: 2, perp: 3, parallel: 3, bisector: 2, angleBis: 3,
  circle3: 3, compass: 3, arc: 3, arc3: 3, sector: 3, sector3: 3,
  ellipse: 3, hyperbola: 3, parabola: 3, conic5: 5, angle: 3, angleAmp: 2,
  reflect: 3, central: 2, invert: 3, rotate: 2, translate: 3, homothety: 2,
  tangent: 3, polar: 3, equipollent: 3, circleR: 1, regular: 2,
};

function toSup(n: string): string {
  return n.replace(/\d/g, (d) => SUP[Number(d)]).replace(/-/g, '⁻');
}
function fromSup(s: string): string {
  return s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => String(SUP.indexOf(c))).replace(/⁻/g, '-');
}
function hypot(a: XY, b: XY): number { return Math.hypot(a.x - b.x, a.y - b.y); }
function gcd(a: number, b: number): number { a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b)); while (b) { const t = b; b = a % b; a = t; } return a || 1; }

function evalExpr(src: string, scope: Record<string, number>, deg: boolean, trace?: string[]): number {
  const record = (label:string, value:number) => { if(trace) trace.push(`${label} = ${Number(value.toPrecision(14))}`); return value; };
  const s = src
    .replace(/[{[]/g, '(').replace(/[}\]]/g, ')')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+√\(/g, (m) => `root(${fromSup(m.slice(0, -2))},`)
    .replace(/∛\(/g, 'root(3,').replace(/∜\(/g, 'root(4,').replace(/√\(/g, 'root(2,')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => `^(${fromSup(m)})`)
    .replace(/π/g, 'pi').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '');
  let i = 0;
  const peek = () => s[i];
  const eat = () => s[i++];
  const fact = (n: number) => {
    if (n < 0 || !Number.isInteger(n) || n > 170) throw new Error('factorial fuera de rango');
    let r = 1; for (let k = 2; k <= n; k++) r *= k; return r;
  };
  function expr(): number {
    let v=term(); while(peek()==='+'||peek()==='-'){const op=eat(),a=v,r=term();v=record(`${a} ${op} ${r}`,op==='+'?a+r:a-r);}return v;
  }
  function term(): number {
    let v=unary();
    while(peek()==='*'||peek()==='/'||/[a-z(]/i.test(peek()||'')){
      const implicit=peek()!=='*'&&peek()!=='/';const op=implicit?'*':eat(),a=v,r=unary();
      if(op==='/'&&r===0)throw new Error('No se puede dividir entre cero.');
      v=record(`${a} ${op==='*'?'×':'÷'} ${r}`,op==='*'?a*r:a/r);
    }return v;
  }
  function pow(): number {let v=post();if(peek()==='^'){eat();const power=unary();v=record(`${v} ^ ${power}`,v**power);}return v;}
  function unary(): number {if(peek()==='-'){eat();return -unary();}if(peek()==='+'){eat();return unary();}return pow();}
  function post(): number {let v=primary();while(peek()==='!'||peek()==='%'){const op=eat();v=record(`${v}${op}`,op==='!'?fact(v):v/100);}return v;}
  function primary(): number {
    if (peek() === '(') { eat(); const v = expr(); if (peek() !== ')') throw new Error('Falta cerrar un paréntesis.'); eat(); return v; }
    if (/[0-9.]/.test(peek() || '')) { const token=s.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i); if(!token)throw new Error('Número no válido.');i+=token[0].length;return Number(token[0]); }
    if (/[a-zA-Z]/.test(peek() || '')) {
      let j = i; while (/[a-zA-Z0-9]/.test(s[j] || '')) j++;
      const id = s.slice(i, j).toLowerCase(); i = j;
      if (Object.prototype.hasOwnProperty.call(scope,id)) return scope[id];
      if (id === 'pi') return Math.PI;
      if (id === 'e') return Math.E;
      if (peek() === '(') {
        eat();
        const args = [expr()];
        while (peek() === ',') { eat(); args.push(expr()); }
        if (peek() !== ')') throw new Error('Falta cerrar la función.'); eat();
        if (!['min','max','gcd','lcm','mod','root'].includes(id) && args.length!==1) throw new Error(`${id} necesita un argumento.`);
        if (['gcd','lcm','mod','root'].includes(id) && args.length!==2) throw new Error(`${id} necesita dos argumentos.`);
        const a = args[0];
        const rad = deg ? (a * Math.PI) / 180 : a;
        const back = (n: number) => (deg ? (n * 180) / Math.PI : n);
        if(id==='sqrt')return record(`√(${a})`,Math.sqrt(a));
        if(id==='cbrt')return record(`∛(${a})`,Math.cbrt(a));
        if (id === 'sin') return record(`sin(${args.join(', ')})`, Math.sin(rad));
        if (id === 'cos') return record(`cos(${args.join(', ')})`, Math.cos(rad));
        if (id === 'tan') {if(Math.abs(Math.cos(rad))<1e-14)throw new Error('La tangente no está definida en ese ángulo.');return Math.tan(rad);}
        if (id === 'asin') return record(`asin(${args.join(', ')})`, back(Math.asin(a)));
        if (id === 'acos') return record(`acos(${args.join(', ')})`, back(Math.acos(a)));
        if (id === 'atan') return record(`atan(${args.join(', ')})`, back(Math.atan(a)));
        if (id === 'sinh') return record(`sinh(${args.join(', ')})`, Math.sinh(a));
        if (id === 'cosh') return record(`cosh(${args.join(', ')})`, Math.cosh(a));
        if (id === 'tanh') return record(`tanh(${args.join(', ')})`, Math.tanh(a));
        if (id === 'ln') return record(`ln(${args.join(', ')})`, Math.log(a));
        if (id === 'log') return record(`log(${args.join(', ')})`, Math.log10(a));
        if (id === 'log2') return record(`log2(${args.join(', ')})`, Math.log2(a));
        if (id === 'abs') return record(`abs(${args.join(', ')})`, Math.abs(a));
        if (id === 'exp') return record(`exp(${args.join(', ')})`, Math.exp(a));
        if (id === 'floor') return record(`floor(${args.join(', ')})`, Math.floor(a));
        if (id === 'ceil') return record(`ceil(${args.join(', ')})`, Math.ceil(a));
        if (id === 'round') return record(`round(${args.join(', ')})`, Math.round(a));
        if (id === 'sign') return record(`sign(${args.join(', ')})`, Math.sign(a));
        if (id === 'min') return record(`min(${args.join(', ')})`, Math.min(...args));
        if (id === 'max') return record(`max(${args.join(', ')})`, Math.max(...args));
        if (id === 'mod') return record(`mod(${args.join(', ')})`, a % args[1]);
        if (id === 'gcd') return record(`gcd(${args.join(', ')})`, gcd(a, args[1] ?? 1));
        if (id === 'lcm') return record(`lcm(${args.join(', ')})`, Math.abs(a * args[1]) / gcd(a, args[1] ?? 1));
        if (id === 'root') {const value=args[1];if(a===0 || (value<0 && (!Number.isInteger(a)||Math.abs(a%2)!==1)))throw new Error('Esta raíz no tiene un resultado real.');return Math.sign(value)*Math.abs(value)**(1/a);}
        throw new Error(id);
      }
      throw new Error(id);
    }
    throw new Error('expresión');
  }
  const v = expr();
  if (peek()) throw new Error(`Revisa la expresión cerca de «${s.slice(i,i+12)}».`);
  if(!Number.isFinite(v))throw new Error('El resultado no es un número real finito. Revisa el dominio y los datos.');
  return v;
}

function cellNum(value:string):number {
  const text=value.trim().replace(',', '.').replace(/−/g,'-');
  if(!text)return 0;
  try{return evalExpr(text,{},false);}catch{return NaN;}
}
function det(m: number[][]): number {
  const n = m.length;
  if (n === 1) return m[0][0];
  if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  let s = 0;
  for (let j = 0; j < n; j++) s += (j % 2 ? -1 : 1) * m[0][j] * det(m.slice(1).map((row) => row.filter((_, k) => k !== j)));
  return s;
}
function transpose(m: number[][]): number[][] { return m[0].map((_, j) => m.map((row) => row[j])); }
function mulM(a: number[][], b: number[][]): number[][] { return a.map((row) => b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0))); }
function addM(a: number[][], b: number[][]): number[][] { return a.map((row, i) => row.map((v, j) => v + (b[i]?.[j] ?? 0))); }
function subM(a: number[][], b: number[][]): number[][] { return a.map((row, i) => row.map((v, j) => v - (b[i]?.[j] ?? 0))); }
function scaleM(a: number[][], k: number): number[][] { return a.map((row) => row.map((v) => v * k)); }
function identity(n: number): number[][] { return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => (i === j ? 1 : 0))); }
function inverse(m: number[][]): number[][] {
  const n = m.length;
  if (m.some((row) => row.length !== n)) throw new Error('La inversa pide una matriz cuadrada');
  const a = m.map((row, i) => [...row, ...identity(n)[i]]);
  for (let col = 0; col < n; col++) {
    let p = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[p][col])) p = r;
    [a[col], a[p]] = [a[p], a[col]];
    const piv = a[col][col];
    if (Math.abs(piv) < 1e-10) throw new Error('No es invertible');
    for (let j = 0; j < a[col].length; j++) a[col][j] /= piv;
    for (let r = 0; r < n; r++) if (r !== col) { const f = a[r][col]; for (let j = 0; j < a[r].length; j++) a[r][j] -= f * a[col][j]; }
  }
  return a.map((row) => row.slice(n));
}
function rrefSteps(src: number[][]): { m: number[][]; steps: string[] } {
  const m = src.map((row) => [...row]);
  const steps = [`Se parte de la matriz aumentada.\n${fmtM(m)}`];
  let lead = 0;
  for (let r = 0; r < m.length && lead < m[0].length; r++) {
    let i = r;
    while (Math.abs(m[i][lead]) < 1e-10) {
      i++;
      if (i === m.length) { i = r; lead++; if (lead === m[0].length) return { m, steps }; }
    }
    if (i !== r) {
      [m[i], m[r]] = [m[r], m[i]];
      steps.push(`Se cambia la fila ${r + 1} con la fila ${i + 1} para que el pivote no sea cero.\n${fmtM(m)}`);
    }
    const piv = m[r][lead];
    if (Math.abs(piv - 1) > 1e-8) {
      m[r] = m[r].map((v) => v / piv);
      steps.push(`La fila ${r + 1} se divide entre ${Number(piv.toPrecision(6))} para dejar el pivote en 1.\n${fmtM(m)}`);
    }
    for (let k = 0; k < m.length; k++) if (k !== r && Math.abs(m[k][lead]) > 1e-10) {
      const f = m[k][lead];
      m[k] = m[k].map((v, j) => v - f * m[r][j]);
      steps.push(`Fila ${k + 1} = fila ${k + 1} − (${Number(f.toPrecision(6))}) · fila ${r + 1}. Así se anula esa columna.\n${fmtM(m)}`);
    }
    lead++;
  }
  steps.push(`Forma escalonada reducida.\n${fmtM(m)}`);
  return { m, steps };
}
function rref(src: number[][]): number[][] {
  const m = src.map((row) => [...row]);
  let lead = 0;
  for (let r = 0; r < m.length && lead < m[0].length; r++) {
    let i = r;
    while (Math.abs(m[i][lead]) < 1e-10) { i++; if (i === m.length) { i = r; lead++; if (lead === m[0].length) return m; } }
    [m[i], m[r]] = [m[r], m[i]];
    const piv = m[r][lead];
    m[r] = m[r].map((v) => v / piv);
    for (let k = 0; k < m.length; k++) if (k !== r) { const f = m[k][lead]; m[k] = m[k].map((v, j) => v - f * m[r][j]); }
    lead++;
  }
  return m;
}
function fmtM(m: number[][]): string { return m.map((r) => r.map((n) => Number(n.toPrecision(6))).join('\t')).join('\n'); }
function solveAug(aug: number[][]): number[] {
  const m = rref(aug);
  return m.map((row) => row[row.length - 1]);
}

function syncPoints(pts: Pt[]): Pt[] {
  const map = new Map(pts.map((p) => [p.id, { ...p, dep: p.dep ? { ...p.dep } : undefined }]));
  const list = pts.map((p) => map.get(p.id)!);
  for (const p of list) {
    if (!p.dep) continue;
    if (p.dep.t === 'mid') {
      const a = map.get(p.dep.a); const b = map.get(p.dep.b);
      if (a && b) { p.x = (a.x + b.x) / 2; p.y = (a.y + b.y) / 2; }
    } else if (p.dep.t === 'on-seg') {
      const a = map.get(p.dep.a); const b = map.get(p.dep.b);
      if (a && b) { p.x = a.x + (b.x - a.x) * p.dep.u; p.y = a.y + (b.y - a.y) * p.dep.u; }
    } else if (p.dep.t === 'on-circ') {
      const c = map.get(p.dep.c); const rim = map.get(p.dep.rim);
      if (c && rim) {
        const rad = Math.hypot(rim.x - c.x, rim.y - c.y);
        p.x = c.x + rad * Math.cos(p.dep.ang);
        p.y = c.y + rad * Math.sin(p.dep.ang);
      }
    }
  }
  return list;
}

function clipSpan(x1: number, y1: number, x2: number, y2: number, box: Box, tMin: number, tMax: number): [number, number, number, number] | null {
  const dx = x2 - x1; const dy = y2 - y1;
  let t0 = tMin; let t1 = tMax;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - box.x0, box.x1 - x1, y1 - box.y0, box.y1 - y1];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-12) { if (q[i] < 0) return null; }
    else {
      const t = q[i] / p[i];
      if (p[i] < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    }
  }
  if (t0 > t1) return null;
  return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
}
function lineIntersect(a: XY, b: XY, c: XY, d: XY): XY | null {
  const den = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x);
  if (Math.abs(den) < 1e-12) return null;
  const t = ((a.x - c.x) * (c.y - d.y) - (a.y - c.y) * (c.x - d.x)) / den;
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}
function circum(a: XY, b: XY, c: XY): { x: number; y: number; r: number } | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-9) return null;
  const x = ((a.x ** 2 + a.y ** 2) * (b.y - c.y) + (b.x ** 2 + b.y ** 2) * (c.y - a.y) + (c.x ** 2 + c.y ** 2) * (a.y - b.y)) / d;
  const y = ((a.x ** 2 + a.y ** 2) * (c.x - b.x) + (b.x ** 2 + b.y ** 2) * (a.x - c.x) + (c.x ** 2 + c.y ** 2) * (b.x - a.x)) / d;
  return { x, y, r: Math.hypot(x - a.x, y - a.y) };
}
function reflectPt(p: XY, a: XY, b: XY): XY {
  const dx = b.x - a.x; const dy = b.y - a.y; const l2 = dx * dx + dy * dy || 1;
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  return { x: 2 * (a.x + t * dx) - p.x, y: 2 * (a.y + t * dy) - p.y };
}
function rotatePt(p: XY, c: XY, deg: number): XY {
  const a = (deg * Math.PI) / 180; const dx = p.x - c.x; const dy = p.y - c.y;
  return { x: c.x + dx * Math.cos(a) - dy * Math.sin(a), y: c.y + dx * Math.sin(a) + dy * Math.cos(a) };
}
function polyArea(pts: XY[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) { const q = pts[(i + 1) % pts.length]; s += pts[i].x * q.y - q.x * pts[i].y; }
  return Math.abs(s) / 2;
}
function fitLine(pts: XY[]): { m: number; b: number } | null {
  if (pts.length < 2) return null;
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  let num = 0; let den = 0;
  for (const p of pts) { num += (p.x - mx) * (p.y - my); den += (p.x - mx) ** 2; }
  const m = den ? num / den : 0;
  return { m, b: my - m * mx };
}
function conicCoef(pts: XY[]): number[] | null {
  if (pts.length < 5) return null;
  const rows = pts.slice(0, 5).map((p) => [p.x * p.x, p.x * p.y, p.y * p.y, p.x, p.y, 1]);
  const aug = rows.map((r) => [...r, 0]);
  for (let c = 0; c < 5; c++) {
    let p = c;
    for (let r = c + 1; r < 5; r++) if (Math.abs(aug[r][c]) > Math.abs(aug[p][c])) p = r;
    [aug[c], aug[p]] = [aug[p], aug[c]];
    if (Math.abs(aug[c][c]) < 1e-10) return [1, 0, 1, 0, 0, -1];
    const piv = aug[c][c];
    for (let j = c; j < 6; j++) aug[c][j] /= piv;
    for (let r = 0; r < 5; r++) if (r !== c) { const f = aug[r][c]; for (let j = c; j < 6; j++) aug[r][j] -= f * aug[c][j]; }
  }
  return [aug[0][5], aug[1][5], aug[2][5], aug[3][5], aug[4][5], -1];
}

function sampleFn(expr: string, deg: boolean, param: number, box: Box) {
  const xs: number[] = []; const ys: number[] = [];
  const steps = 240;
  for (let i = 0; i <= steps; i++) {
    const x = box.x0 + ((box.x1 - box.x0) * i) / steps;
    try {
      const y = evalExpr(expr, { x, a: param }, deg);
      if (Number.isFinite(y)) { xs.push(x); ys.push(y); }
    } catch { /* skip */ }
  }
  return { xs, ys };
}
function rootsOf(expr: string, deg: boolean, param: number): number[] {
  const found: number[] = [];
  let prevX = -24;
  let prev = NaN;
  try { prev = evalExpr(expr, { x: prevX, a: param }, deg); } catch { prev = NaN; }
  for (let x = -23.95; x <= 24; x += 0.05) {
    let y = NaN;
    try { y = evalExpr(expr, { x, a: param }, deg); } catch { y = NaN; }
    if (Number.isFinite(prev) && Number.isFinite(y) && prev * y < 0) {
      let lo = prevX; let hi = x; let flo = prev;
      for (let k = 0; k < 24; k++) {
        const mid = (lo + hi) / 2;
        let fm = NaN;
        try { fm = evalExpr(expr, { x: mid, a: param }, deg); } catch { break; }
        if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm; }
      }
      const root = (lo + hi) / 2;
      if (!found.some((r) => Math.abs(r - root) < 0.08)) found.push(root);
    }
    prevX = x; prev = y;
  }
  return found.slice(0, 12);
}
function extremaOf(expr: string, deg: boolean, param: number): XY[] {
  const out: XY[] = [];
  const d = (x: number) => {
    const h = 1e-3;
    try { return (evalExpr(expr, { x: x + h, a: param }, deg) - evalExpr(expr, { x: x - h, a: param }, deg)) / (2 * h); }
    catch { return NaN; }
  };
  let prevX = -20; let prev = d(prevX);
  for (let x = -19.9; x <= 20; x += 0.1) {
    const now = d(x);
    if (Number.isFinite(prev) && Number.isFinite(now) && prev * now < 0) {
      let y = NaN;
      try { y = evalExpr(expr, { x, a: param }, deg); } catch { y = NaN; }
      if (Number.isFinite(y) && !out.some((p) => Math.abs(p.x - x) < 0.2)) out.push({ x, y });
    }
    prevX = x; prev = now;
  }
  return out.slice(0, 10);
}

const VIEW_INFO: Record<View,{name:string;subtitle:string;guide:string;example:string}> = {
  calc:{name:'Calculadora científica',subtitle:'Escribe, calcula y revisa cada operación.',guide:'Se resuelven primero paréntesis y funciones, después potencias, productos y cocientes, y al final sumas y restas. El porcentaje divide entre 100. DEG interpreta los ángulos en grados; RAD, en radianes. Las raíces pares de números negativos no pertenecen al dominio real.',example:'2(3 + 4)^2 · sin(30) · root(3, -8)'},
  graph:{name:'Estudio de gráficas',subtitle:'Explora curvas y construcciones en un mismo plano.',guide:'Escribe una función de x y pulsa Enter. Arrastra para mover el plano; usa la rueda o el gesto de pinza para acercarte. Las herramientas se agrupan por operación: toca de nuevo una herramienta para abrir su grupo. Las distancias del plano son unidades de coordenadas, no una escala física del dispositivo.',example:'sin(x) · x^2 - 4 · exp(-x^2)'},
  matrices:{name:'Laboratorio de matrices',subtitle:'Álgebra matricial con resultados y desarrollo.',guide:'Define las dimensiones y crea una matriz. Selecciona una celda, introduce un número o una fracción y guárdala. Sumar y restar requiere dimensiones iguales; A×B requiere que las columnas de A coincidan con las filas de B. Sólo las matrices cuadradas con determinante distinto de cero tienen inversa.',example:'Matriz identidad 3×3 · determinante · inversa · Gauss-Jordan'},
  lineal:{name:'Ecuaciones y sistemas',subtitle:'Del planteamiento a la comprobación de la solución.',guide:'Escribe cada ecuación con sus incógnitas y un signo igual. Gauss-Jordan identifica pivotes y permite distinguir soluciones únicas, infinitas o sistemas incompatibles. En ecuaciones de segundo grado, a debe ser distinto de cero; el discriminante b²−4ac determina el tipo de raíces.',example:'2x + y = 7; x - y = 2 · x² - 3x + 2 = 0'},
  aritmetica:{name:'Aritmética aplicada',subtitle:'Porcentajes, proporciones y operaciones esenciales.',guide:'Elige una operación y completa todos sus datos. Un porcentaje p equivale a p/100; verifica siempre a qué cantidad se aplica. En proporciones y fracciones los denominadores no pueden valer cero. Las cantidades deben compartir unidades para que la comparación tenga sentido.',example:'15 % de 240 · descuento del 20 % · regla de tres'},
  trigo:{name:'Trigonometría',subtitle:'Ángulos, razones y triángulos explicados.',guide:'En este laboratorio los datos angulares se expresan en grados, como indican las fórmulas. Comprueba que los lados son positivos y cumplen la desigualdad triangular. En las funciones inversas, seno y coseno sólo admiten valores entre −1 y 1; una tangente puede no estar definida.',example:'sin(30°) = 0.5 · Pitágoras · ley de cosenos'},
  geo:{name:'Geometría',subtitle:'Medidas, áreas y volúmenes con interpretación.',guide:'Utiliza la misma unidad de longitud en todos los datos. Las áreas se expresan en unidades cuadradas y los volúmenes en unidades cúbicas. Radios, alturas y longitudes deben ser positivos. Revisa si la fórmula usa radio o diámetro antes de sustituir los valores.',example:'Área del círculo = πr² · volumen de un cilindro = πr²h'},
  funciones:{name:'Análisis de funciones',subtitle:'Derivadas, integrales y aproximaciones numéricas.',guide:'Las funciones de cálculo usan radianes. La derivada describe cambio instantáneo y la integral definida representa área con signo. Los métodos numéricos dan aproximaciones: comprueba continuidad, dominio e intervalo. En bisección, los extremos deben encerrar un cambio de signo; una integral indefinida incluye la constante C.',example:'Derivar 3x^2 + sin(x) · integrar x^2 · ceros de x^2 - 2'},
};
function downloadData(name:string,body:string,type='text/plain;charset=utf-8') {
  const href=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=href;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
}
async function copyValue(text:string,onStatus:(value:string)=>void) {try{await navigator.clipboard.writeText(text);onStatus('Copiado al portapapeles.');}catch{onStatus('No se pudo copiar. Puedes seleccionar el texto o descargarlo.');}}
export default function ModoAscendido() {
  const navigate=useNavigate();
  const [savedView,setView]=useWorkspaceState<View>('view','calc');
  const view=VIEWS.some(item=>item.id===savedView)?savedView:'calc';
  const [deg,setDeg]=useWorkspaceState('degrees',true);
  const [menu,setMenu]=useState(false),[query,setQuery]=useState(''),[help,setHelp]=useState(false),[status,setStatus]=useState('');
  const info=VIEW_INFO[view];
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{if(event.altKey&&!event.ctrlKey&&/^[1-8]$/.test(event.key)){event.preventDefault();setView(VIEWS[Number(event.key)-1].id);}if(event.key==='Escape'){setMenu(false);setHelp(false);}};
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[setView]);
  return <><style>{CSS}</style><style>{glassCSS}</style><div className={`ma ma-modern ma-view-${view}`}>
    <header className="head">
      <button type="button" className="icon" onClick={()=>navigate('/calcular')} aria-label="Volver a la calculadora">←</button>
      <div className="ma-brand"><span>RBC EASY / LABORATORIO</span><h1>Modo ascendido</h1></div>
      <div className="ma-head-actions">
        <button type="button" className="chip" title="Unidad angular de calculadora y gráfica" onClick={()=>setDeg(value=>!value)}>{deg?'DEG':'RAD'}</button>
        <div className="menu-wrap"><button type="button" className="chip" aria-expanded={menu} onClick={()=>setMenu(!menu)}>Módulos ▾</button>{menu&&<div className="drop">{LINKS.map(link=><button type="button" key={link.path} onClick={()=>navigate(link.path)}>{link.name}</button>)}<button type="button" onClick={()=>{try{const data=Object.fromEntries(Object.keys(localStorage).filter(key=>key.startsWith('ascended:')).map(key=>[key,JSON.parse(localStorage.getItem(key)||'null')]));downloadData('RBC-laboratorio.json',JSON.stringify({version:1,data},null,2),'application/json');setMenu(false);}catch{setStatus('No se pudo exportar la sesión.');}}}>Descargar sesión</button></div>}</div>
      </div>
    </header>
    <aside className="ma-navigation" aria-label="Navegación del laboratorio">
      <label className="ma-tool-search"><span>HERRAMIENTAS</span><input type="search" aria-label="Buscar herramienta" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar herramienta…" /></label>
      <nav className="workspace-tabs" aria-label="Herramientas de modo ascendido">{VIEWS.filter(item=>`${item.name} ${VIEW_INFO[item.id].subtitle}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))).map(item=><button key={item.id} type="button" aria-pressed={view===item.id} title={`Alt+${VIEWS.indexOf(item)+1}`} onClick={()=>{setView(item.id);setHelp(false);}}><span className="ma-nav-number">{String(VIEWS.indexOf(item)+1).padStart(2,'0')}</span><span><strong>{item.name}</strong><small>{VIEW_INFO[item.id].subtitle}</small></span></button>)}</nav>
      <p className="ma-local-note">Tu trabajo se guarda en este dispositivo.</p>
      <button type="button" className="ma-backup" onClick={()=>{
        const data=Object.fromEntries(Object.keys(localStorage).filter(key=>key.startsWith('ascended:')).map(key=>[key,JSON.parse(localStorage.getItem(key)||'null')]));downloadData('RBC-laboratorio.json',JSON.stringify({version:1,data},null,2),'application/json');setStatus('Sesión descargada con cálculos, matrices y gráficas.');
      }}>Descargar sesión</button>
    </aside>
    <main className="ma-workspace">
      <div className="ma-context"><div><span className="ma-eyebrow">ESPACIO DE TRABAJO</span><h2>{info.name}</h2><p>{info.subtitle}</p></div><button type="button" className="chip" aria-expanded={help} onClick={()=>setHelp(!help)}>{help?'Ocultar guía':'Cómo se usa'}</button></div>
      {help&&<section className="ma-guide" aria-label="Guía de la herramienta"><h3>Antes de empezar</h3><p>{info.guide}</p><p><strong>Ejemplo:</strong> {info.example}</p><p>Los cálculos usan precisión numérica de JavaScript; revisa el redondeo y las unidades al interpretar el resultado.</p></section>}
      {status&&<p className="ma-status" role="status">{status}</p>}
      {view==='calc'&&<Calculator deg={deg}/>}{view==='graph'&&<GraphStudio deg={deg}/>}{view==='matrices'&&<MatrixStudio/>}{view==='lineal'&&<SystemSolver/>}
      {view==='aritmetica'&&<FormulaLab key="arith" title="Aritmética" items={ARITH}/>}{view==='trigo'&&<FormulaLab key="trig" title="Trigonometría" items={TRIG}/>}{view==='geo'&&<FormulaLab key="geom" title="Geometría" items={GEOM}/>}{view==='funciones'&&<FormulaLab key="func" title="Funciones" items={FUNCS}/>}
    </main>
  </div></>;
}
type Calculation = {expression:string;result:string;steps:string[];degrees:boolean;time:number};
function Calculator({deg}:{deg:boolean}) {
  const [expr,setExpr]=useWorkspaceState('expression',''),[res,setRes]=useWorkspaceState('result','0');
  const [memory,setMemory]=useWorkspaceState('memory',0),[ans,setAns]=useWorkspaceState('answer',0);
  const [history,setHistory]=useWorkspaceState<Calculation[]>('history',[]);
  const [steps,setSteps]=useState<string[]>([]),[guide,setGuide]=useState('Enter calcula. Esc limpia la entrada. Puedes escribir directamente.');
  const [error,setError]=useWorkspaceState('calc-error','');
  const [askExp,setAskExp]=useState(false),[historyOpen,setHistoryOpen]=useState(false);
  const input=useRef<HTMLInputElement>(null);
  const put=(token:string)=>{
    setError('');
    if(token==='C'){setExpr('');setRes('0');setSteps([]);return;}
    if(token==='MC'){setMemory(0);setGuide('Memoria borrada.');return;}
    if(token==='M+'||token==='M−'){const value=Number(res);if(Number.isFinite(value))setMemory(m=>m+(token==='M+'?value:-value));return;}
    if(token==='='){
      try{const development:string[]=[];const value=evalExpr(expr||'0',{ans},deg,development);const result=String(Number(value.toPrecision(14)));setRes(result);setAns(value);setSteps(development);setGuide(`Resultado en modo ${deg?'grados':'radianes'}.`);setHistory(old=>[{expression:expr||'0',result,steps:development,degrees:deg,time:Date.now()},...old].slice(0,40));}
      catch(problem){setError(problem instanceof Error?problem.message:'Revisa la expresión.');}return;
    }
    if(token==='xʸ'){setAskExp(true);return;}
    const value=token==='MR'?String(memory):token==='ANS'?String(ans):({'÷':'/','×':'*','−':'-','n!':'!'}[token]||token);
    const element=input.current,start=element?.selectionStart??expr.length,end=element?.selectionEnd??expr.length;
    const from=token==='⌫'&&start===end?Math.max(0,start-1):start;
    setExpr(expr.slice(0,from)+(token==='⌫'?'':value)+expr.slice(end));
    requestAnimationFrame(()=>{element?.focus();const cursor=from+(token==='⌫'?0:value.length);element?.setSelectionRange(cursor,cursor);});
  };
  const keys=['C','⌫','(',')','7','8','9','÷','4','5','6','×','1','2','3','−','0','.','%','+'];
  const fns=['sin(','cos(','tan(','asin(','acos(','atan(','ln(','log(','log2(','√(','∛(','xʸ','n!','abs(','exp(','floor(','ceil(','mod(','gcd(','lcm(','min(','max(','π','e',','];
  return <section className="calc ma-calculator"><div className="shell">
    <div className="readout"><div className="ma-display-label"><span>EXPRESIÓN EDITABLE</span><span>{deg?'DEG':'RAD'} · M {memory!==0?'●':'○'}</span></div>
      <input ref={input} className="ma-expression" aria-label="Expresión científica" value={expr} onChange={event=>{setExpr(event.target.value);setError('');}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();put('=');}if(event.key==='Escape'){event.preventDefault();put('C');}}} placeholder="0" autoComplete="off" autoCapitalize="off" spellCheck={false}/>
      <strong aria-label="Resultado">{error?'—':res}</strong><p role={error?'alert':'status'} className={error?'ma-error':''}>{error||guide}</p>
    </div>
    <div className="mem">{['MC','MR','M+','M−','ANS'].map(key=><button type="button" key={key} title={{MC:'Borrar memoria',MR:'Insertar memoria','M+':'Sumar a memoria','M−':'Restar de memoria',ANS:'Insertar último resultado'}[key]} onClick={()=>put(key)}>{key}</button>)}</div>
    <details className="ma-functions"><summary>Funciones científicas <span>Trigonometría, potencias y más</span></summary><div className="fn">{fns.map(fn=><button type="button" key={fn} onClick={()=>put(fn)}>{fn.replace('(','')}</button>)}</div></details>
    <div className="pad">{keys.map(key=><button key={key} type="button" className={key==='C'?'danger':key==='⌫'?'warn':/[0-9.]/.test(key)?'num':'op'} onClick={()=>put(key)}>{key}</button>)}</div>
    <div className="ma-calc-actions"><button type="button" className="ma-secondary" onClick={()=>copyValue(res,setGuide)}>Copiar resultado</button><button type="button" className="eq" onClick={()=>put('=')}>=</button></div>
    <details className="ma-explanation" open={steps.length>0}><summary>Desarrollo de la operación</summary>{steps.length?<ol>{steps.map((step,index)=><li key={index}>{step}</li>)}</ol>:<p>Calcula una expresión para ver el orden de sus operaciones. Los signos, paréntesis y la unidad angular forman parte del cálculo.</p>}</details>
  </div><aside className="ma-history"><div className="ma-history-heading"><h3>Historial de trabajo</h3><button type="button" className="chip" onClick={()=>setHistoryOpen(!historyOpen)}>{historyOpen?'Contraer':'Ver historial'}</button></div><p>Recupera una expresión para editarla o copia su resultado. Se conservan los últimos 40 cálculos.</p>
    <div className={historyOpen?'ma-history-list open':'ma-history-list'}>{history.length?history.map(item=><article key={item.time}><button type="button" className="ma-history-expression" onClick={()=>{setExpr(item.expression);setRes(item.result);setSteps(item.steps);}}><span>{item.expression}</span><strong>= {item.result}</strong><small>{item.degrees?'Grados':'Radianes'} · {new Date(item.time).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}</small></button><button type="button" className="ma-secondary" onClick={()=>copyValue(item.result,setGuide)}>Copiar</button></article>):<p>Aún no hay operaciones guardadas.</p>}</div>
    {history.length>0&&<div className="ops"><button type="button" onClick={()=>downloadData('RBC-calculos.txt',history.map(item=>`${item.expression} = ${item.result} (${item.degrees?'DEG':'RAD'})\n${item.steps.join('\n')}`).join('\n\n'))}>Descargar historial</button><button type="button" onClick={()=>{if(window.confirm('¿Borrar el historial de cálculos?'))setHistory([]);}}>Borrar</button></div>}
    <div className="ma-example-card"><span>PRUEBA UNA EXPRESIÓN</span>{['2(3 + 4)^2','sin(30)','root(3,-8)','250*15%'].map(example=><button key={example} type="button" onClick={()=>{setExpr(example);input.current?.focus();}}>{example}</button>)}</div>
  </aside>{askExp&&<ExpModal base={expr||'0'} onClose={()=>setAskExp(false)} onOk={exponent=>{setExpr((expr||'0')+toSup(exponent));setAskExp(false);}}/>}</section>;
}

function GraphStudio({ deg }: { deg: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<Box>({ x0: -8, x1: 8, y0: -5, y1: 5 });
  const ptsRef = useRef<Pt[]>([]);
  const drag = useRef<null | { kind: 'pan' | 'point' | 'draw'; x: number; y: number; box: Box; id?: string; pts: XY[] }>(null);
  const ptrs = useRef<Map<number, XY>>(new Map());
  const pinch = useRef<null | { d: number; box: Box }>(null);
  const [draft, setDraft] = useWorkspaceState('graph-draft','sin(x^2)');
  const [curves, setCurves] = useWorkspaceState<Curve[]>('curves',[{ id: 'c1', expr: 'sin(x^2)', color: COLORS[0], on: true }]);
  const [box, setBox] = useWorkspaceState<Box>('graph-box',{ x0: -8, x1: 8, y0: -5, y1: 5 });
  const [editingCurve,setEditingCurve]=useState<string|null>(null);
  const [param, setParam] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [kb, setKb] = useState<Kb>('num');
  const [kbOpen, setKbOpen] = useState(false);
  const [bg, setBg] = useWorkspaceState<Bg>('graph-background','default');
  const [fullscreen,setFullscreen] = useState(false), [templates,setTemplates] = useState(false), [objects,setObjects] = useState(false);
  const [size,setSize] = useState({width:800,height:500});
  useEffect(()=>{const node=canvas.current?.parentElement;if(!node)return;const observer=new ResizeObserver(([entry])=>{const {width,height}=entry.contentRect;if(width>0&&height>0)setSize({width,height});});observer.observe(node);return()=>observer.disconnect();},[]);
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){setFullscreen(false);setTemplates(false);setMenuPos(null);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
  useEffect(()=>{setBox(previous=>{const center=(previous.y0+previous.y1)/2;const half=(previous.x1-previous.x0)*size.height/size.width/2;return {...previous,y0:center-half,y1:center+half};});},[size.width,size.height]);
  const fitView=(span=16)=>{const width=Math.max(span,span*size.width/size.height);const half=width*size.height/size.width/2;setBox({x0:-width/2,x1:width/2,y0:-half,y1:half});};
  const presets = [
    {name:'Circunferencia',formula:'x² + y² = 9',expressions:['sqrt(9-x^2)','-sqrt(9-x^2)'],path:'M50 15a35 35 0 1 0 0 70a35 35 0 1 0 0-70',note:'Radio 3; centro (0, 0). Se importan las dos semicircunferencias.',span:9},
    {name:'Elipse',formula:'x²/16 + y²/4 = 1',expressions:['2*sqrt(1-x^2/16)','-2*sqrt(1-x^2/16)'],path:'M10 50a40 23 0 1 0 80 0a40 23 0 1 0-80 0',note:'Semiejes 4 y 2; focos (±√12, 0).',span:11},
    {name:'Parábola y tangente',formula:'f(x) = x²; t(x) = 2x − 1',expressions:['x^2','2*x-1'],path:'M15 10Q50 160 85 10M15 90L85 20',note:'Tangente en (1, 1); pendiente f′(1) = 2.',span:10},
    {name:'Hipérbola',formula:'x²/4 − y² = 1',expressions:['sqrt(x^2/4-1)','-sqrt(x^2/4-1)','x/2','-x/2'],path:'M5 10Q70 50 5 90M95 10Q30 50 95 90',note:'Vértices (±2, 0) y asíntotas y = ±x/2.',span:12},
    {name:'Ondas armónicas',formula:'sin(x), cos(x)',expressions:deg?['sin(x*180/pi)','cos(x*180/pi)']:['sin(x)','cos(x)'],path:'M0 50Q25 0 50 50T100 50',note:'Período espacial 2π. La conversión angular está incluida si usas DEG.',span:16},
    {name:'Distribución normal',formula:'exp(−x²/2) / √(2π)',expressions:['exp(-x^2/2)/sqrt(2*pi)'],path:'M5 85C30 85 30 15 50 15S70 85 95 85',note:'Densidad normal estándar: media 0 y desviación típica 1.',span:8},
    {name:'Cúbica y derivada',formula:'f(x) = x³ − 3x; f′(x) = 3x² − 3',expressions:['x^3-3*x','3*x^2-3'],path:'M15 90C25-30 75 130 85 10',note:'Puntos críticos x = ±1. Las raíces de la derivada marcan extremos.',span:10},
    {name:'Valor absoluto',formula:'|x|, x, −x',expressions:['abs(x)','x','-x'],path:'M10 10L50 85L90 10',note:'Función continua con cambio de pendiente en x = 0.',span:12},
  ];
  const importPreset=(preset:typeof presets[number])=>{setCurves(list=>[...list,...preset.expressions.filter(expr=>!list.some(c=>c.expr===expr)).map((expr,index)=>({id:crypto.randomUUID(),expr,color:COLORS[(list.length+index)%COLORS.length],on:true}))]);fitView(preset.span);setTemplates(false);setObjects(true);setNote(`${preset.name}: ${preset.note}`);};
  const [tool, setTool] = useState('select');
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [menuPos, setMenuPos] = useState<{ x: number; y: number; name: string } | null>(null);
  const [points, setPoints] = useWorkspaceState<Pt[]>('points',[]);
  const [shapes, setShapes] = useWorkspaceState<Sh[]>('shapes',[]);
  const [pending, setPending] = useState<Pt[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('Mueve: arrastra un punto o el fondo.');
  const [expMode, setExpMode] = useState(false);
  const [askExp, setAskExp] = useState(false);
  const [extra, setExtra] = useState('6');
  const [ink, setInk] = useState<XY[]>([]);
  const [styleColor, setStyleColor] = useState('#5aa7ff');
  const seq = useRef(0);
  boxRef.current = box;
  ptsRef.current = points;

  const world = (cx: number, cy: number) => {
    const c = canvas.current; const b = boxRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: b.x0 + ((cx - r.left) / r.width) * (b.x1 - b.x0), y: b.y1 - ((cy - r.top) / r.height) * (b.y1 - b.y0) };
  };
  const zoom = (factor: number, cx?: number, cy?: number) => {
    setBox((v) => {
      const anchor = cx != null && cy != null ? world(cx, cy) : { x: (v.x0 + v.x1) / 2, y: (v.y0 + v.y1) / 2 };
      return {
        x0: anchor.x - (anchor.x - v.x0) * factor,
        x1: anchor.x + (v.x1 - anchor.x) * factor,
        y0: anchor.y - (anchor.y - v.y0) * factor,
        y1: anchor.y + (v.y1 - anchor.y) * factor,
      };
    });
  };
  const nearPt = (x: number, y: number) => {
    const span = boxRef.current.x1 - boxRef.current.x0;
    return ptsRef.current.find((p) => !p.hidden && Math.hypot(p.x - x, p.y - y) < span * 0.035);
  };
  const fresh = (x: number, y: number, extraPt?: Partial<Pt>): Pt => {
    seq.current += 1;
    return { id: `p${Date.now()}${seq.current}`, label: LABELS[(points.length + pending.length + seq.current) % 26], x, y, showLabel: true, ...extraPt };
  };
  const pushPoint = (p: Pt) => { setPoints((prev) => syncPoints([...prev, p])); return p; };
  const byId = (id: string, list = points) => list.find((p) => p.id === id);

  const addShape = (partial: Omit<Sh, 'id' | 'color'> & { color?: string }) => {
    const sh: Sh = { id: `s${Date.now()}${seq.current}`, color: partial.color || styleColor, showLabel: true, ...partial };
    setShapes((prev) => [...prev, sh]);
    setPending([]);
    return sh;
  };

  const finish = (kind: string, got: Pt[]) => {
    const n = Number(extra) || 0;
    const A = got[0]; const B = got[1]; const C = got[2];
    if (kind === 'mid' && B) { pushPoint(fresh((A.x + B.x) / 2, (A.y + B.y) / 2, { dep: { t: 'mid', a: A.id, b: B.id } })); setNote('Punto medio creado.'); setPending([]); return; }
    if (kind === 'distance' && B) { setNote(`Distancia = ${hypot(A, B).toFixed(4)} cm`); addShape({ kind: 'measure', pts: [A.id, B.id], text: `${hypot(A, B).toFixed(3)} cm` }); return; }
    if (kind === 'slope' && B) { const m = (B.y - A.y) / ((B.x - A.x) || 1e-9); setNote(`Pendiente = ${m.toFixed(4)}`); addShape({ kind: 'measure', pts: [A.id, B.id], text: `m = ${m.toFixed(3)}` }); return; }
    if (kind === 'segmentLen' && B) {
      const len = n > 0 ? n : hypot(A, B);
      const ang = Math.atan2(B.y - A.y, B.x - A.x);
      const q = pushPoint(fresh(A.x + len * Math.cos(ang), A.y + len * Math.sin(ang)));
      addShape({ kind: 'segment', pts: [A.id, q.id] }); setNote(`Segmento de ${len} cm`); return;
    }
    if (kind === 'circle3' && C) {
      const o = circum(A, B, C); if (!o) { setNote('Los puntos están alineados.'); return; }
      const center = pushPoint(fresh(o.x, o.y));
      addShape({ kind: 'circle', pts: [center.id, A.id], r: o.r }); setNote('Circunferencia por tres puntos.'); return;
    }
    if (kind === 'circleR') {
      const radius = n > 0 ? n : 2;
      const rim = pushPoint(fresh(A.x + radius, A.y));
      addShape({ kind: 'circle', pts: [A.id, rim.id], r: radius }); setNote(`Radio ${radius}`); setPending([]); return;
    }
    if (kind === 'regular' && B) {
      const sides = Math.max(3, Math.round(n || 6));
      const rad = hypot(A, B); const a0 = Math.atan2(B.y - A.y, B.x - A.x);
      const ids = [B.id];
      for (let k = 1; k < sides; k++) {
        const a = a0 + (2 * Math.PI * k) / sides;
        ids.push(pushPoint(fresh(A.x + rad * Math.cos(a), A.y + rad * Math.sin(a))).id);
      }
      addShape({ kind: 'poly', pts: ids, n: sides }); setNote(`Polígono regular de ${sides} lados.`); return;
    }
    if (kind === 'bisector' && B) {
      const mid = pushPoint(fresh((A.x + B.x) / 2, (A.y + B.y) / 2, { dep: { t: 'mid', a: A.id, b: B.id } }));
      const dx = B.x - A.x; const dy = B.y - A.y;
      const q = pushPoint(fresh(mid.x - dy, mid.y + dx));
      addShape({ kind: 'line', pts: [mid.id, q.id] }); setNote('Mediatriz.'); return;
    }
    if (kind === 'angleBis' && C) {
      const u1 = Math.atan2(A.y - B.y, A.x - B.x); const u2 = Math.atan2(C.y - B.y, C.x - B.x);
      let dlt = u2 - u1; while (dlt <= -Math.PI) dlt += Math.PI * 2; while (dlt > Math.PI) dlt -= Math.PI * 2;
      const ang = u1 + dlt / 2;
      const q = pushPoint(fresh(B.x + Math.cos(ang), B.y + Math.sin(ang)));
      addShape({ kind: 'ray', pts: [B.id, q.id] }); setNote('Bisectriz.'); return;
    }
    if (kind === 'perp' && C) {
      const dx = B.x - A.x; const dy = B.y - A.y;
      const q = pushPoint(fresh(C.x - dy, C.y + dx));
      addShape({ kind: 'line', pts: [C.id, q.id] }); setNote('Perpendicular.'); return;
    }
    if (kind === 'parallel' && C) {
      const q = pushPoint(fresh(C.x + (B.x - A.x), C.y + (B.y - A.y)));
      addShape({ kind: 'line', pts: [C.id, q.id] }); setNote('Paralela.'); return;
    }
    if (kind === 'angle' && C) {
      const a1 = Math.atan2(A.y - B.y, A.x - B.x); const a2 = Math.atan2(C.y - B.y, C.x - B.x);
      let d = (a2 - a1) * 180 / Math.PI; if (d < 0) d += 360; if (d > 180) d = 360 - d;
      addShape({ kind: 'angle', pts: [A.id, B.id, C.id], text: `${d.toFixed(2)}°` }); setNote(`Ángulo ${d.toFixed(2)}°`); return;
    }
    if (kind === 'angleAmp' && B) {
      const amp = n || 60;
      const base = Math.atan2(B.y - A.y, B.x - A.x);
      const q = pushPoint(fresh(A.x + Math.cos(base + (amp * Math.PI) / 180), A.y + Math.sin(base + (amp * Math.PI) / 180)));
      addShape({ kind: 'angle', pts: [B.id, A.id, q.id], text: `${amp}°` }); setNote(`Ángulo de ${amp}°.`); return;
    }
    if (kind === 'area' && got.length >= 3) {
      const area = polyArea(got); addShape({ kind: 'poly', pts: got.map((p) => p.id), text: `${area.toFixed(3)} cm²` }); setNote(`Área = ${area.toFixed(4)} cm²`); return;
    }
    if (kind === 'reflect' && C) { const r = reflectPt(C, A, B); pushPoint(fresh(r.x, r.y)); setNote('Reflejo axial.'); setPending([]); return; }
    if (kind === 'central' && B) { pushPoint(fresh(2 * A.x - B.x, 2 * A.y - B.y)); setNote('Simetría central.'); setPending([]); return; }
    if (kind === 'rotate' && B) { const r = rotatePt(B, A, n || 90); pushPoint(fresh(r.x, r.y)); setNote(`Rotación ${n || 90}°.`); setPending([]); return; }
    if (kind === 'translate' && C) { pushPoint(fresh(C.x + (B.x - A.x), C.y + (B.y - A.y))); setNote('Traslación.'); setPending([]); return; }
    if (kind === 'homothety' && B) { const k = n || 2; pushPoint(fresh(A.x + k * (B.x - A.x), A.y + k * (B.y - A.y))); setNote(`Homotecia k = ${k}`); setPending([]); return; }
    if (kind === 'invert' && C) {
      const rad = hypot(A, B); const d = hypot(A, C) || 1e-6;
      const k = (rad * rad) / d; const ang = Math.atan2(C.y - A.y, C.x - A.x);
      pushPoint(fresh(A.x + k * Math.cos(ang), A.y + k * Math.sin(ang))); setNote('Inversión.'); setPending([]); return;
    }
    if (kind === 'tangent' && C) {
      const rad = hypot(A, B); const d = hypot(A, C);
      if (d <= rad) { setNote('El punto está dentro de la circunferencia.'); setPending([]); return; }
      const ang = Math.atan2(C.y - A.y, C.x - A.x); const th = Math.acos(rad / d);
      pushPoint(fresh(A.x + rad * Math.cos(ang + th), A.y + rad * Math.sin(ang + th)));
      pushPoint(fresh(A.x + rad * Math.cos(ang - th), A.y + rad * Math.sin(ang - th)));
      setNote('Puntos de tangencia.'); setPending([]); return;
    }
    if (kind === 'polar' && C) {
      const rad = hypot(A, B); const d = hypot(A, C) || 1;
      const k = (rad * rad) / d; const ang = Math.atan2(C.y - A.y, C.x - A.x);
      const q = pushPoint(fresh(A.x + k * Math.cos(ang), A.y + k * Math.sin(ang)));
      const nrm = pushPoint(fresh(q.x - Math.sin(ang), q.y + Math.cos(ang)));
      addShape({ kind: 'line', pts: [q.id, nrm.id] }); setNote('Polar.'); return;
    }
    if (kind === 'equipollent' && C) { const q = pushPoint(fresh(C.x + (B.x - A.x), C.y + (B.y - A.y))); addShape({ kind: 'vector', pts: [C.id, q.id] }); setNote('Vector equipolente.'); return; }
    if (kind === 'compass' && C) { const q = pushPoint(fresh(C.x + (B.x - A.x), C.y + (B.y - A.y))); addShape({ kind: 'circle', pts: [C.id, q.id] }); setNote('Compás.'); return; }
    if (kind === 'conic5' && got.length >= 5) {
      const coef = conicCoef(got); addShape({ kind: 'conic', pts: got.map((p) => p.id), coef: coef || undefined }); setNote('Cónica por cinco puntos.'); return;
    }
    if (kind === 'parabola' && C) { addShape({ kind: 'parabola', pts: [A.id, B.id, C.id] }); setNote('Parábola (foco y directriz).'); return; }
    if ((kind === 'poly' || kind === 'rigid' || kind === 'vectorPoly' || kind === 'polyline') && got.length >= 3) {
      addShape({ kind: kind === 'polyline' ? 'polyline' : 'poly', pts: got.map((p) => p.id), rigid: kind === 'rigid' });
      setNote(kind === 'polyline' ? 'Poligonal cerrada.' : 'Polígono creado.'); return;
    }
    addShape({ kind, pts: got.map((p) => p.id), r: kind === 'circle' ? hypot(A, B) : undefined, n: n || undefined });
    setNote(`${kind} creado.`);
  };

  const onToolClick = (w: XY, hit?: Pt) => {
    if (tool === 'zoomIn') { zoom(0.8); return; }
    if (tool === 'zoomOut') { zoom(1.25); return; }
    if (tool === 'slider') { setPlaying((p) => !p); setNote(playing ? 'Deslizador en pausa.' : 'Deslizador animando a.'); return; }
    if (tool === 'input') { setNote('Escribe en la casilla de entrada de abajo.'); return; }
    if (tool === 'fit') {
      const free = points.filter((p) => !p.dep);
      const fit = fitLine(free.length ? free : points);
      if (!fit) { setNote('Hacen falta dos puntos.'); return; }
      addShape({ kind: 'fit', pts: [], text: `y = ${fit.m.toFixed(3)}x + ${fit.b.toFixed(3)}`, raw: [{ x: box.x0, y: fit.m * box.x0 + fit.b }, { x: box.x1, y: fit.m * box.x1 + fit.b }] });
      setNote('Ajuste lineal.'); return;
    }
    if (tool === 'roots' || tool === 'extrema') {
      const expr = curves[curves.length - 1]?.expr;
      if (!expr) return;
      const list = tool === 'roots' ? rootsOf(expr, deg, param).map((x) => ({ x, y: 0 })) : extremaOf(expr, deg, param);
      list.forEach((p) => pushPoint(fresh(p.x, p.y)));
      setNote(list.length ? `${list.length} puntos marcados.` : 'No se encontraron.'); return;
    }
    if (tool === 'inspect') {
      const expr = curves[curves.length - 1]?.expr || draft;
      const y = (() => { try { return evalExpr(expr, { x: 0, a: param }, deg); } catch { return NaN; } })();
      const d = (() => { try { return (evalExpr(expr, { x: 1e-3, a: param }, deg) - y) / 1e-3; } catch { return NaN; } })();
      setNote(`f(0) ≈ ${Number.isFinite(y) ? y.toPrecision(6) : '—'} · f'(0) ≈ ${Number.isFinite(d) ? d.toPrecision(6) : '—'}`);
      return;
    }
    if (tool === 'locus') { setPlaying(true); setNote('Lugar: la curva sigue a a.'); return; }
    if (tool === 'delete') {
      if (hit) setPoints((prev) => prev.filter((p) => p.id !== hit.id));
      setNote(hit ? `Se borró ${hit.label}.` : 'Toca un punto para borrarlo.'); return;
    }
    if (tool === 'lock' && hit) {
      setPoints((prev) => syncPoints(prev.map((p) => p.id === hit.id ? { ...p, locked: !p.locked, dep: p.locked ? p.dep : undefined } : p)));
      setNote(hit.locked ? `${hit.label} libre.` : `${hit.label} limitado.`); return;
    }
    if (tool === 'hide') {
      if (hit) setPoints((prev) => prev.map((p) => p.id === hit.id ? { ...p, hidden: !p.hidden } : p));
      else setShapes((prev) => prev.length ? prev.map((s, i) => i === prev.length - 1 ? { ...s, hidden: !s.hidden } : s) : prev);
      setNote('Visibilidad cambiada.'); return;
    }
    if (tool === 'label' && hit) { setPoints((prev) => prev.map((p) => p.id === hit.id ? { ...p, showLabel: !p.showLabel } : p)); return; }
    if (tool === 'style' && hit) { setStyleColor(styleColor === '#5aa7ff' ? '#ff2a2a' : '#5aa7ff'); setNote('Estilo copiado. La siguiente figura lo usa.'); return; }
    if (tool === 'check') { setCurves((prev) => prev.map((c, i) => i === prev.length - 1 ? { ...c, on: !c.on } : c)); setNote('Casilla: última curva.'); return; }
    if (tool === 'button') { setBox({ x0: -8, x1: 8, y0: -5, y1: 5 }); setNote('Botón: vista reiniciada.'); return; }
    if (tool === 'text' || tool === 'image') {
      const p = hit || pushPoint(fresh(w.x, w.y));
      addShape({ kind: tool, pts: [p.id], text: tool === 'image' ? 'imagen' : (draft || 'Texto') });
      setPending([]); return;
    }
    if (tool === 'list') { setNote(`Lista = { ${points.slice(-4).map((p) => p.label).join(', ')} }`); return; }
    if (tool === 'relation' && points.length >= 2) {
      const a = points[points.length - 2]; const b = points[points.length - 1];
      setNote(Math.abs(a.y - b.y) < 1e-6 ? `${a.label} y ${b.label} tienen la misma altura.` : `${a.label} y ${b.label} no están alineados en horizontal.`);
      return;
    }
    if (tool === 'pointOn') {
      const host = shapes.find((s) => s.pts.length >= 2 && (s.kind === 'segment' || s.kind === 'line' || s.kind === 'circle'));
      if (host && host.kind !== 'circle') {
        const a = byId(host.pts[0]); const b = byId(host.pts[1]);
        if (a && b) {
          const dx = b.x - a.x; const dy = b.y - a.y; const l2 = dx * dx + dy * dy || 1;
          const u = Math.max(0, Math.min(1, ((w.x - a.x) * dx + (w.y - a.y) * dy) / l2));
          pushPoint(fresh(a.x + dx * u, a.y + dy * u, { dep: { t: 'on-seg', a: a.id, b: b.id, u } }));
          setNote('Punto sobre el objeto. Arrástralo y se queda en él.'); return;
        }
      }
      if (host && host.kind === 'circle') {
        const c = byId(host.pts[0]); const rim = byId(host.pts[1]);
        if (c && rim) {
          const ang = Math.atan2(w.y - c.y, w.x - c.x);
          pushPoint(fresh(w.x, w.y, { dep: { t: 'on-circ', c: c.id, rim: rim.id, ang } }));
          setNote('Punto sobre la circunferencia.'); return;
        }
      }
      setNote('Primero crea un segmento o una circunferencia.'); return;
    }
    if (tool === 'intersect') {
      const lines = shapes.filter((s) => ['line', 'segment', 'ray'].includes(s.kind) && s.pts.length >= 2);
      if (lines.length < 2) { setNote('Hacen falta dos rectas.'); return; }
      const s1 = lines[lines.length - 2]; const s2 = lines[lines.length - 1];
      const a = byId(s1.pts[0]); const b = byId(s1.pts[1]); const c = byId(s2.pts[0]); const d = byId(s2.pts[1]);
      if (a && b && c && d) {
        const p = lineIntersect(a, b, c, d);
        if (p) { pushPoint(fresh(p.x, p.y)); setNote('Intersección.'); } else setNote('Son paralelas.');
      }
      return;
    }

    const pt = (tool === 'point' || tool === 'complex' || !hit) ? pushPoint(fresh(Number(w.x.toFixed(3)), Number(w.y.toFixed(3)), { complex: tool === 'complex' })) : hit;
    if (tool === 'point' || tool === 'complex') { setNote(tool === 'complex' ? `${pt.label} = ${pt.x} + ${pt.y}i` : `${pt.label} = (${pt.x}, ${pt.y})`); return; }
    if (tool === 'circleR') { finish('circleR', [pt]); return; }

    const next = [...pending, pt];
    const closing = (tool === 'poly' || tool === 'rigid' || tool === 'polyline' || tool === 'vectorPoly') && next.length >= 3 && hypot(next[0], pt) < (box.x1 - box.x0) * 0.04;
    if (closing) { finish(tool, next.slice(0, -1)); return; }
    const need = NEED[tool] ?? 1;
    if (tool !== 'poly' && tool !== 'polyline' && tool !== 'rigid' && tool !== 'vectorPoly' && next.length >= need) finish(tool, next);
    else { setPending(next); setNote(`${GROUPS.flatMap((g) => g.tools).find((t) => t.id === tool)?.label}: ${next.length} punto(s).`); }
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setMenuPos(null);
    const w = world(e.clientX, e.clientY);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) {
      const [p, q] = [...ptrs.current.values()];
      pinch.current = { d: Math.hypot(p.x - q.x, p.y - q.y), box };
      drag.current = null;
      return;
    }
    const hit = nearPt(w.x, w.y);
    if (tool === 'pencil' || tool === 'freehand') {
      drag.current = { kind: 'draw', x: e.clientX, y: e.clientY, box, pts: [w] };
      setInk([w]); return;
    }
    if (tool === 'select' || tool === 'pan') {
      if (hit && tool === 'select' && !hit.locked && hit.dep?.t !== 'mid') {
        drag.current = { kind: 'point', x: e.clientX, y: e.clientY, box, id: hit.id, pts: [] };
        setSelected(hit.id);
      } else {
        drag.current = { kind: 'pan', x: e.clientX, y: e.clientY, box, pts: [] };
        if (hit) setSelected(hit.id);
      }
      return;
    }
    onToolClick(w, hit);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size >= 2 && pinch.current) {
      const [p, q] = [...ptrs.current.values()];
      const d = Math.hypot(p.x - q.x, p.y - q.y) || 1;
      const f = pinch.current.d / d;
      const start = pinch.current.box;
      const cx = (start.x0 + start.x1) / 2; const cy = (start.y0 + start.y1) / 2;
      setBox({
        x0: cx - ((start.x1 - start.x0) / 2) * f,
        x1: cx + ((start.x1 - start.x0) / 2) * f,
        y0: cy - ((start.y1 - start.y0) / 2) * f,
        y1: cy + ((start.y1 - start.y0) / 2) * f,
      });
      return;
    }
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'draw') {
      const w = world(e.clientX, e.clientY);
      d.pts.push(w); setInk([...d.pts]); return;
    }
    if (d.kind === 'point' && d.id) {
      const w = world(e.clientX, e.clientY);
      setPoints((prev) => {
        const moved = prev.map((p): Pt => {
          if (p.id !== d.id || p.locked) return p;
          const dep = p.dep;
          if (dep?.t === 'on-seg') {
            const a = prev.find((q) => q.id === dep.a);
            const b = prev.find((q) => q.id === dep.b);
            if (!a || !b) return p;
            const dx = b.x - a.x; const dy = b.y - a.y; const l2 = dx * dx + dy * dy || 1;
            const u = Math.max(0, Math.min(1, ((w.x - a.x) * dx + (w.y - a.y) * dy) / l2));
            const next: Dep = { t: 'on-seg', a: a.id, b: b.id, u };
            return { ...p, dep: next };
          }
          if (dep?.t === 'on-circ') {
            const c = prev.find((q) => q.id === dep.c);
            if (!c) return p;
            const next: Dep = { t: 'on-circ', c: dep.c, rim: dep.rim, ang: Math.atan2(w.y - c.y, w.x - c.x) };
            return { ...p, dep: next };
          }
          if (dep?.t === 'mid') return p;
          if (shapes.some((s) => s.rigid && s.pts.includes(p.id))) return p;
          return { ...p, x: Number(w.x.toFixed(3)), y: Number(w.y.toFixed(3)) };
        });
        const rigid = shapes.find((s) => s.rigid && s.pts.includes(d.id!));
        const origin = prev.find((q) => q.id === d.id);
        const shifted = !rigid || !origin ? moved : moved.map((p): Pt => {
          if (!rigid.pts.includes(p.id) || p.dep) return p;
          return { ...p, x: p.x + (w.x - origin.x), y: p.y + (w.y - origin.y) };
        });
        return syncPoints(shifted);
      });
      return;
    }
    if (d.kind === 'pan') {
      const c = canvas.current; if (!c) return;
      const r = c.getBoundingClientRect();
      const dx = ((e.clientX - d.x) / r.width) * (d.box.x1 - d.box.x0);
      const dy = ((e.clientY - d.y) / r.height) * (d.box.y1 - d.box.y0);
      setBox({ x0: d.box.x0 - dx, x1: d.box.x1 - dx, y0: d.box.y0 + dy, y1: d.box.y1 + dy });
    }
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) pinch.current = null;
    if (drag.current?.kind === 'draw' && drag.current.pts.length > 1) {
      addShape({ kind: 'freehand', pts: [], raw: drag.current.pts, color: '#f5b942' });
      setInk([]);
    }
    drag.current = null;
  };

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => { setParam((p) => (p >= 6 ? -6 : p + 0.04)); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const ratio=Math.min(window.devicePixelRatio||1,2);
    c.width=Math.round(size.width*ratio);c.height=Math.round(size.height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    const w = size.width; const h = size.height;
    ctx.clearRect(0, 0, w, h);


    const sx = (x: number) => ((x - box.x0) / (box.x1 - box.x0)) * w;
    const sy = (y: number) => h - ((y - box.y0) / (box.y1 - box.y0)) * h;
    const dark = bg === 'white';
    ctx.strokeStyle = dark ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.14)';
    ctx.lineWidth = 1;
    const gridStep=(span:number,pixels:number)=>{const raw=span/Math.max(2,pixels/65);const magnitude=10**Math.floor(Math.log10(raw));return [1,2,5,10].find(n=>n*magnitude>=raw)!*magnitude;};
    const xStep=gridStep(box.x1-box.x0,w),yStep=gridStep(box.y1-box.y0,h);
    for (let x = Math.ceil(box.x0 / xStep) * xStep; x <= box.x1; x += xStep) { ctx.beginPath(); ctx.moveTo(sx(x), 0); ctx.lineTo(sx(x), h); ctx.stroke(); }
    for (let y = Math.ceil(box.y0 / yStep) * yStep; y <= box.y1; y += yStep) { ctx.beginPath(); ctx.moveTo(0, sy(y)); ctx.lineTo(w, sy(y)); ctx.stroke(); }
    ctx.strokeStyle = dark ? '#222' : 'rgba(255,255,255,.85)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(sx(0), 0); ctx.lineTo(sx(0), h); ctx.moveTo(0, sy(0)); ctx.lineTo(w, sy(0)); ctx.stroke();
    const ax = sx(0); const ay = sy(0);
    ctx.fillStyle = dark ? '#9f1230' : '#ff6b6b';
    ctx.beginPath(); ctx.moveTo(ax, 8); ctx.lineTo(ax - 6, 18); ctx.lineTo(ax + 6, 18); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w - 8, ay); ctx.lineTo(w - 18, ay - 6); ctx.lineTo(w - 18, ay + 6); ctx.closePath(); ctx.fill();
    const axisNum = (text: string, x: number, y: number) => {
      ctx.save();
      ctx.font = '500 12px system-ui, sans-serif';
      const g = ctx.createLinearGradient(x, y - 22, x, y + 2);
      g.addColorStop(0, '#ffd0d0');
      g.addColorStop(0.45, '#ff4d4d');
      g.addColorStop(1, '#b1121f');
      ctx.fillStyle = g;
      ctx.fillText(text, x, y);
      ctx.restore();
    };
    const label = (text: string, x: number, y: number) => {
      ctx.save();
      ctx.font = '600 13px system-ui, sans-serif';
      const g = ctx.createLinearGradient(x, y - 16, x, y + 2);
      g.addColorStop(0, '#ffc4c4');
      g.addColorStop(1, '#e11d2e');
      ctx.shadowColor = 'rgba(40,0,8,.55)';
      ctx.shadowBlur = 4;
      ctx.fillStyle = g;
      ctx.fillText(text, x, y);
      ctx.restore();
    };
    for (let x = Math.ceil(box.x0 / xStep) * xStep; x <= box.x1; x += xStep) if (x !== 0) axisNum(String(Number(x.toPrecision(6))), sx(x) + 6, Math.min(h - 10, Math.max(30, sy(0) + 26)));
    for (let y = Math.ceil(box.y0 / yStep) * yStep; y <= box.y1; y += yStep) if (y !== 0) axisNum(String(Number(y.toPrecision(6))), Math.min(w - 42, Math.max(8, sx(0) + 8)), sy(y) - 4);
    const at = (id: string) => points.find((p) => p.id === id);
    curves.filter((cv) => cv.on).forEach((cv) => {
      ctx.beginPath(); ctx.strokeStyle = cv.color; ctx.lineWidth = 2.6; let started = false;
      for (let i = 0; i <= w; i++) {
        const x = box.x0 + ((box.x1 - box.x0) * i) / w;
        let y = NaN; try { y = evalExpr(cv.expr, { x, a: param }, deg); } catch { y = NaN; }
        if (!Number.isFinite(y)) { started = false; continue; }
        if (Math.abs(sy(y))>h*8) {started=false;continue;}
        if (!started) { ctx.moveTo(sx(x), sy(y)); started = true; } else ctx.lineTo(sx(x), sy(y));
      }
      ctx.stroke();
    });
    shapes.filter((s) => !s.hidden).forEach((sh) => {
      ctx.strokeStyle = sh.color; ctx.fillStyle = sh.color; ctx.lineWidth = 2.2;
      const p = sh.pts.map(at).filter((q): q is Pt => Boolean(q));
      if (sh.raw && sh.raw.length > 1) {
        ctx.beginPath(); sh.raw.forEach((q, i) => i ? ctx.lineTo(sx(q.x), sy(q.y)) : ctx.moveTo(sx(q.x), sy(q.y))); ctx.stroke(); return;
      }
      if (sh.kind === 'line' && p[1]) { const c = clipSpan(p[0].x, p[0].y, p[1].x, p[1].y, box, -1e5, 1e5); if (c) { ctx.beginPath(); ctx.moveTo(sx(c[0]), sy(c[1])); ctx.lineTo(sx(c[2]), sy(c[3])); ctx.stroke(); } return; }
      if ((sh.kind === 'segment' || sh.kind === 'vector' || sh.kind === 'measure') && p[1]) {
        ctx.beginPath(); ctx.moveTo(sx(p[0].x), sy(p[0].y)); ctx.lineTo(sx(p[1].x), sy(p[1].y)); ctx.stroke();
        if (sh.kind === 'vector') {
          const ang = Math.atan2(sy(p[1].y) - sy(p[0].y), sx(p[1].x) - sx(p[0].x));
          ctx.beginPath(); ctx.moveTo(sx(p[1].x), sy(p[1].y));
          ctx.lineTo(sx(p[1].x) - 12 * Math.cos(ang - 0.4), sy(p[1].y) - 12 * Math.sin(ang - 0.4));
          ctx.moveTo(sx(p[1].x), sy(p[1].y));
          ctx.lineTo(sx(p[1].x) - 12 * Math.cos(ang + 0.4), sy(p[1].y) - 12 * Math.sin(ang + 0.4));
          ctx.stroke();
        }
        if (sh.text) label(sh.text, (sx(p[0].x) + sx(p[1].x)) / 2, (sy(p[0].y) + sy(p[1].y)) / 2);
        return;
      }
      if (sh.kind === 'ray' && p[1]) { const c = clipSpan(p[0].x, p[0].y, p[1].x, p[1].y, box, 0, 1e5); if (c) { ctx.beginPath(); ctx.moveTo(sx(c[0]), sy(c[1])); ctx.lineTo(sx(c[2]), sy(c[3])); ctx.stroke(); } return; }
      if (sh.kind === 'circle' && p[1]) {
        const rad = Math.hypot(sx(p[1].x) - sx(p[0].x), sy(p[1].y) - sy(p[0].y));
        ctx.beginPath(); ctx.arc(sx(p[0].x), sy(p[0].y), rad, 0, Math.PI * 2); ctx.stroke(); return;
      }
      if ((sh.kind === 'semi' || sh.kind === 'arc' || sh.kind === 'sector') && p[1]) {
        const a0 = Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x);
        const a1 = p[2] ? Math.atan2(p[2].y - p[0].y, p[2].x - p[0].x) : a0 + Math.PI;
        const rad = Math.hypot(sx(p[1].x) - sx(p[0].x), sy(p[1].y) - sy(p[0].y));
        ctx.beginPath();
        if (sh.kind === 'sector') ctx.moveTo(sx(p[0].x), sy(p[0].y));
        ctx.arc(sx(p[0].x), sy(p[0].y), rad, -a0, -a1, true);
        if (sh.kind === 'sector') ctx.closePath();
        ctx.stroke(); return;
      }
      if ((sh.kind === 'poly' || sh.kind === 'polyline') && p.length > 1) {
        ctx.beginPath(); p.forEach((q, i) => i ? ctx.lineTo(sx(q.x), sy(q.y)) : ctx.moveTo(sx(q.x), sy(q.y)));
        if (sh.kind === 'poly') ctx.closePath(); ctx.stroke();
        if (sh.text) label(sh.text, sx(p[0].x), sy(p[0].y) - 12);
        return;
      }
      if (sh.kind === 'ellipse' && p[2]) {
        ctx.beginPath();
        const rx = Math.hypot(sx(p[1].x) - sx(p[0].x), sy(p[1].y) - sy(p[0].y));
        const ry = Math.hypot(sx(p[2].x) - sx(p[0].x), sy(p[2].y) - sy(p[0].y));
        ctx.ellipse(sx(p[0].x), sy(p[0].y), rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); return;
      }
      if (sh.kind === 'hyperbola' && p[2]) {
        const rx = Math.max(8, Math.hypot(sx(p[1].x) - sx(p[0].x), sy(p[1].y) - sy(p[0].y)));
        const ry = Math.max(8, Math.hypot(sx(p[2].x) - sx(p[0].x), sy(p[2].y) - sy(p[0].y)));
        ctx.beginPath();
        for (let i = -40; i <= 40; i++) { const t = i / 12; const X = sx(p[0].x) + rx * Math.cosh(t) * Math.sign(i || 1); const Y = sy(p[0].y) - ry * Math.sinh(t); if (i === -40 || i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
        ctx.stroke(); return;
      }
      if (sh.kind === 'parabola' && p[2]) {
        ctx.beginPath();
        const focus = p[0];
        for (let i = 0; i <= 80; i++) {
          const x = box.x0 + ((box.x1 - box.x0) * i) / 80;
          const direct = p[1].y;
          const y = ((x - focus.x) ** 2) / (2 * ((focus.y - direct) || 1)) + (focus.y + direct) / 2;
          if (i === 0) ctx.moveTo(sx(x), sy(y)); else ctx.lineTo(sx(x), sy(y));
        }
        ctx.stroke(); return;
      }
      if (sh.kind === 'conic' && sh.coef) {
        const f = (x: number, y: number) => sh.coef![0] * x * x + sh.coef![1] * x * y + sh.coef![2] * y * y + sh.coef![3] * x + sh.coef![4] * y + sh.coef![5];
        ctx.beginPath();
        const cols = 48; const rows = 32;
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
          const x = box.x0 + ((box.x1 - box.x0) * i) / cols; const y = box.y0 + ((box.y1 - box.y0) * j) / rows;
          const x2 = box.x0 + ((box.x1 - box.x0) * (i + 1)) / cols; const y2 = box.y0 + ((box.y1 - box.y0) * (j + 1)) / rows;
          if (f(x, y) * f(x2, y) < 0) { ctx.moveTo(sx(x), sy(y)); ctx.lineTo(sx(x2), sy(y)); }
          if (f(x, y) * f(x, y2) < 0) { ctx.moveTo(sx(x), sy(y)); ctx.lineTo(sx(x), sy(y2)); }
        }
        ctx.stroke(); return;
      }
      if (sh.kind === 'fit' && sh.raw) { ctx.beginPath(); ctx.moveTo(sx(sh.raw[0].x), sy(sh.raw[0].y)); ctx.lineTo(sx(sh.raw[1].x), sy(sh.raw[1].y)); ctx.stroke(); if (sh.text) label(sh.text, 16, 28); }
      if ((sh.kind === 'text' || sh.kind === 'image') && p[0]) label(sh.text || '', sx(p[0].x) + 8, sy(p[0].y));
      if (sh.kind === 'angle' && p[1] && sh.text) label(sh.text, sx(p[1].x) + 8, sy(p[1].y) - 8);
    });
    if (ink.length > 1) { ctx.strokeStyle = '#f5b942'; ctx.beginPath(); ink.forEach((q, i) => i ? ctx.lineTo(sx(q.x), sy(q.y)) : ctx.moveTo(sx(q.x), sy(q.y))); ctx.stroke(); }
    points.filter((p) => !p.hidden).forEach((p) => {
      ctx.fillStyle = p.id === selected ? '#f5b942' : '#ff2a2a';
      ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      if (p.showLabel !== false) label(p.label, sx(p.x) + 10, sy(p.y) - 10);
    });
  }, [curves, box, param, deg, bg, points, shapes, selected, ink, styleColor, size]);

  const centerOn = (expr: string) => {
    const s = sampleFn(expr, deg, param, { x0: -20, x1: 20, y0: -20, y1: 20 });
    if (!s.xs.length) return;
    let best = 0;
    for (let i = 1; i < s.ys.length; i++) if (Math.abs(s.ys[i]) > Math.abs(s.ys[best]) && Math.abs(s.ys[i]) < 30) best = i;
    setBox({ x0: s.xs[best] - 6, x1: s.xs[best] + 6, y0: s.ys[best] - 4, y1: s.ys[best] + 4 });
  };
  const pushKey = (token: string) => {
    if (token === '⌫') { setDraft((s) => s.slice(0, -1)); return; }
    if (token === '↵' || token === '=') { addCurve(); return; }
    if (token === 'xʸ') { setAskExp(true); return; }
    if (token === '√') { setDraft((s) => `${s}√(`); return; }
    if (expMode && /^[0-9]$/.test(token)) { setDraft((s) => s + toSup(token)); return; }
    setExpMode(false);
    const map: Record<string, string> = { '×': '*', '÷': '/', '−': '-' };
    setDraft((s) => s + (map[token] ?? token));
  };
  const addCurve = () => {
    const clean = draft.trim().replace(/^(?:y|f\(x\))\s*=\s*/i,'');
    if (!clean) return;
    let valid=false;let message='';for(const x of [0,1,-1,2,-2,5,10,100]){try{evalExpr(clean,{x,a:param},deg);valid=true;break;}catch(problem){message=String(problem);}}
    if(!valid){setNote(`Revisa la función o su dominio: ${message}`);return;}
    setNote(`${editingCurve?'Actualizada':'Añadida'}: y = ${clean}`);setDraft('');
    if(editingCurve){setCurves(list=>list.map(curve=>curve.id===editingCurve?{...curve,expr:clean}:curve));setEditingCurve(null);return;}
    setCurves((list) => list.some((c) => c.expr === clean) ? list : [...list, { id: String(Date.now()), expr: clean, color: COLORS[list.length % COLORS.length], on: true }]);
  };
  const nums = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', 'π'];
  const ops = ['÷', '×', '−', '+', 'xʸ', '√(', '(', ')', '⌫', '='];
  const fns = ['sin(', 'cos(', 'tan(', 'asin(', 'acos(', 'atan(', 'sinh(', 'cosh(', 'tanh(', 'ln(', 'log(', 'log2(', 'abs(', 'exp(', 'floor(', 'ceil(', '√(', '∛(', 'x', 'y', 'a', 'e', 'π', 'n!'];
  const abc = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const sym = ['∞', '≈', '≠', '∈', '⊂', '∠', '→', '≤', '≥', '∥', '⊥', '∧', '∨', '¬', 'π', 'e'];
  const kindOf = (k: string) => ('÷×−+='.includes(k) || k === 'xʸ' || k === '⌫' ? 'op' : 'num');
  const toolName = GROUPS.flatMap((g) => g.tools).find((t) => t.id === tool)?.label || tool;
  const needsExtra = ['circleR', 'segmentLen', 'regular', 'angleAmp', 'rotate', 'homothety'].includes(tool);

  return (
    <section className={`graph${kbOpen ? ' kb-on' : ''}${fullscreen?' graph-fullscreen':''}${objects?' objects-open':''}`} aria-label="Laboratorio gráfico">
      <div className="toolbar">
        <div className="toolbar-row">
          {GROUPS.map((g) => {
            const current = g.tools.find((t) => t.id === (picked[g.name] || g.tools[0].id)) || g.tools[0];
            const active = g.tools.some((t) => t.id === tool);
            return (
              <button key={g.name} type="button" className={active ? 'on' : ''} title={current.label}
                onClick={(e) => {
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  if (tool === current.id) {
                    setMenuPos(menuPos?.name === g.name ? null : { x: Math.min(r.left, window.innerWidth - 260), y: r.bottom + 6, name: g.name });
                  } else {
                    setTool(current.id);
                    setMenuPos(null);
                    setPending([]);
                    setNote(`${current.label}. Vuelve a tocar el icono para ver el resto del grupo.`);
                  }
                }}><ToolIcon id={current.id} /><span>{g.name}</span></button>
            );
          })}
          <button type="button" title={kbOpen ? 'Ocultar teclado' : 'Mostrar teclado'} onClick={() => setKbOpen((s) => !s)} aria-label="Teclado">
            <SvgKeyboard off={!kbOpen} />
          </button>
          <button type="button" title="Cambiar fondo: original, blanco o negro" onClick={() => setBg((b) => b === 'default' ? 'white' : b === 'white' ? 'black' : 'default')} aria-label="Fondo">
            <SvgBg mode={bg} /><span>{bg==='white'?'Blanco':bg==='black'?'Negro':'Fondo'}</span>
          </button>
        </div>
        <div className="ma-graph-actions">
          <button type="button" onClick={()=>setTemplates(true)}>Plantillas</button>
          <button type="button" aria-pressed={objects} onClick={()=>setObjects(!objects)}>Funciones · {curves.length}</button>
          <button type="button" onClick={()=>setFullscreen(!fullscreen)}>{fullscreen?'Salir de pantalla completa':'Pantalla completa'}</button>
          <button type="button" aria-label="Acercar gráfica" onClick={()=>zoom(.8)}>+</button><button type="button" aria-label="Alejar gráfica" onClick={()=>zoom(1.25)}>−</button>
          <button type="button" onClick={()=>{fitView();setNote('Vista centrada. Las construcciones se conservan.');}}>Centrar plano</button>
          <button type="button" onClick={()=>{try{const image=canvas.current?.toDataURL('image/png');if(!image)return;const anchor=document.createElement('a');anchor.href=image;anchor.download='RBC-grafica.png';anchor.click();setNote('Gráfica exportada como PNG.');}catch{setNote('La imagen contiene recursos que no permiten exportar.');}}}>Exportar PNG</button>
        </div>
        <p className="tool-note">{toolName}. {note}</p>
        {needsExtra && <label className="extra">Valor<input value={extra} onChange={(e) => setExtra(e.target.value)} /></label>}
      </div>
      {menuPos && (
          <div className="tmenu" style={{ left: menuPos.x, top: menuPos.y }}>
            {GROUPS.find((g) => g.name === menuPos.name)?.tools.map((t) => (
              <button key={t.id} type="button" onClick={() => { setTool(t.id); setPicked((m) => ({ ...m, [menuPos.name]: t.id })); setMenuPos(null); setPending([]); setNote(t.label); }}>
                <ToolIcon id={t.id} /><span>{t.label}</span>
              </button>
            ))}
          </div>
      )}
      <div className="graph-body">
        <ul className="exprs">
          {curves.map((cv) => (
            <li key={cv.id}>
              <input type="checkbox" aria-label={`Mostrar ${cv.expr}`} checked={cv.on} onChange={()=>setCurves(list=>list.map(c=>c.id===cv.id?{...c,on:!c.on}:c))} />
              <button type="button" className="expr-main" onClick={() => centerOn(cv.expr)}><i style={{ background: cv.color }} /><span>f(x) = {cv.expr}</span></button>
              <button type="button" aria-label={`Editar función ${cv.expr}`} title="Editar función" onClick={()=>{setEditingCurve(cv.id);setDraft(cv.expr);}}>✎</button>
              <button type="button" aria-label={`Eliminar función ${cv.expr}`} onClick={() => setCurves((list) => list.filter((c) => c.id !== cv.id))}>✕</button>
            </li>
          ))}
          {points.filter((p) => !p.hidden).map((p) => (
            <li key={p.id}>
              <button type="button" className="expr-main" onClick={() => { setSelected(p.id); setBox({ x0: p.x - 4, x1: p.x + 4, y0: p.y - 3, y1: p.y + 3 }); }}>
                <i style={{ background: '#5aa7ff' }} /><span>{p.complex ? `${p.label} = ${p.x} + ${p.y}i` : `${p.label} = (${p.x}, ${p.y})`}</span>
              </button>
              <button type="button" aria-label={`Borrar ${p.label}`} onClick={() => { setPoints((prev) => prev.filter((q) => q.id !== p.id)); setShapes((prev) => prev.filter((s) => !s.pts.includes(p.id))); if (selected === p.id) setSelected(null); }}>✕</button>
            </li>
          ))}
          {shapes.filter((s) => s.text).map((s) => (
            <li key={s.id}>
              <button type="button" className="expr-main" onClick={() => setNote(s.text || '')}><i style={{ background: s.color }} /><span>{s.text}</span></button>
              <button type="button" aria-label="Borrar figura" onClick={() => setShapes((prev) => prev.filter((q) => q.id !== s.id))}>✕</button>
            </li>
          ))}
        </ul>
        <div className={`stage graph-bg-${bg}`}>
          <canvas ref={canvas} width={1600} height={1000} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            onWheel={(e) => { e.preventDefault(); const fine = e.ctrlKey || e.altKey || e.metaKey; zoom(e.deltaY > 0 ? (fine ? 1.06 : 1.12) : (fine ? 0.94 : 0.88), e.clientX, e.clientY); }}
          />
          <div className="hud">
            <label>a = {param.toFixed(2)}
              <input type="range" min="-6" max="6" step="0.01" value={param} onChange={(e) => setParam(Number(e.target.value))} />
            </label>
            <button type="button" onClick={() => fitView()}>Centrar</button>
          </div>
        </div>
      </div>
      <div className="entry">
        <span className="entry-prefix">y =</span><input aria-label="Función para graficar" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCurve()} placeholder="x^2, sin(x), a*x + 1…" /><button type="button" className="go" onClick={addCurve}>{editingCurve?'Actualizar':'Añadir'}</button>{editingCurve&&<button type="button" className="chip" onClick={()=>{setEditingCurve(null);setDraft('');}}>Cancelar</button>}
        {expMode && <sup>□</sup>}
        {(tool === 'poly' || tool === 'polyline' || tool === 'rigid') && pending.length >= 3 && <button type="button" className="go" onClick={() => finish(tool, pending)}>Cerrar</button>}
      </div>
      {kbOpen && (
        <footer className="dock">
          <div className="tabs">
            {(['num', 'fn', 'abc', 'sym'] as Kb[]).map((id) => <button key={id} type="button" className={kb === id ? 'on' : ''} onClick={() => setKb(id)}>{id === 'num' ? '123' : id === 'fn' ? 'f(x)' : id === 'abc' ? 'ABC' : '#&¬'}</button>)}
          </div>
          {kb === 'num' && (
            <div className="kb-split">
              <div className="kb-nums">{nums.map((k) => <button key={k} type="button" className="num" onClick={() => pushKey(k)}>{k}</button>)}</div>
              <div className="kb-ops">{ops.map((k) => <button key={k} type="button" className={kindOf(k)} onClick={() => pushKey(k)}>{k}</button>)}</div>
            </div>
          )}
          {kb === 'fn' && <div className="kb-fn">{fns.map((k) => <button key={k} type="button" onClick={() => pushKey(k)}>{k.replace('(', '')}</button>)}</div>}
          {kb === 'abc' && <div className="kb-fn">{abc.map((k) => <button key={k} type="button" className="num" onClick={() => pushKey(k)}>{k}</button>)}<button type="button" className="op" onClick={() => pushKey('⌫')}>⌫</button></div>}
          {kb === 'sym' && <div className="kb-fn">{sym.map((k) => <button key={k} type="button" onClick={() => pushKey(k)}>{k}</button>)}<button type="button" className="op" onClick={() => pushKey('⌫')}>⌫</button></div>}
        </footer>
      )}
      {templates && <div className="modal-back" onClick={()=>setTemplates(false)}><div className="modal template-gallery" role="dialog" aria-modal="true" aria-label="Plantillas matemáticas" onClick={e=>e.stopPropagation()}><div className="template-heading"><h3>Plantillas matemáticas</h3><button className="chip" onClick={()=>setTemplates(false)}>Cerrar</button></div><p>Importa las funciones y relaciones sin borrar tus construcciones.</p><div className="template-grid">{presets.map(preset=><button type="button" key={preset.name} onClick={()=>importPreset(preset)}><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M0 50H100M50 0V100" stroke="#ffffff20"/><path d={preset.path} fill="none" stroke="currentColor" strokeWidth="2"/></svg><strong>{preset.name}</strong><code>{preset.formula}</code><small>{preset.note}</small><span>Importar relaciones →</span></button>)}</div></div></div>}
      {askExp && <ExpModal base={draft || 'x'} onClose={() => setAskExp(false)} onOk={(exp) => { setDraft((s) => (s || 'x') + toSup(exp)); setAskExp(false); setNote(`Exponente ${exp} colocado sobre la entrada.`); }} />}
    </section>
  );
}

function ToolIcon({ id }: { id: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      {id === 'select' && <path d="M4 2.5l7.5 6.2-2.6.4 2.2 4.2-1.7.8-2.2-4.2-2.6 2.4z" fill="currentColor" />}
      {id === 'freehand' && <path d="M3 13c2-4 3-4 4-2s2 3 4 0 3-4 4-2" fill="none" stroke="currentColor" strokeWidth="1.6" />}
      {id === 'pencil' && <path d="M4 14l7-8 2 2-7 8H4z" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {id === 'point' && <circle cx="9" cy="9" r="3" fill="currentColor" />}
      {id === 'pointOn' && <><circle cx="9" cy="9" r="2.4" fill="currentColor" /><path d="M3 13h12" stroke="currentColor" strokeWidth="1.4" /></>}
      {id === 'lock' && <path d="M6 8V6a3 3 0 016 0v2M5 8h8v6H5z" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      {id === 'intersect' && <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.6" />}
      {id === 'mid' && <><circle cx="5" cy="12" r="1.4" fill="currentColor" /><circle cx="13" cy="6" r="1.4" fill="currentColor" /><circle cx="9" cy="9" r="2" fill="#ff2a2a" /></>}
      {id === 'complex' && <text x="4" y="13" fontSize="11" fill="currentColor">z</text>}
      {id === 'extrema' && <path d="M2 12c2-6 4 2 6-4s4 2 8-2" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {id === 'roots' && <path d="M2 9h14M6 12c1-4 2-4 3 0s2 4 3 0" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      {(id === 'line' || id === 'fit') && <path d="M2 14L16 4" stroke="currentColor" strokeWidth="1.6" />}
      {id === 'segment' && <path d="M4 13h10" stroke="currentColor" strokeWidth="1.6" />}
      {id === 'segmentLen' && <path d="M3 12h12M6 10v4M12 10v4" stroke="currentColor" strokeWidth="1.4" />}
      {id === 'ray' && <path d="M3 13h10l-3-2M13 13l-3 2" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      {id === 'polyline' && <path d="M3 13l4-6 4 3 4-5" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {(id === 'vector' || id === 'equipollent') && <path d="M3 13h9l-2.5-2M12 13l-2.5 2" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {(id === 'perp' || id === 'bisector') && <path d="M3 14h12M9 14V4" stroke="currentColor" strokeWidth="1.5" />}
      {id === 'parallel' && <path d="M4 6l10 2M4 12l10 2" stroke="currentColor" strokeWidth="1.5" />}
      {(id === 'angleBis' || id === 'angle' || id === 'angleAmp') && <path d="M4 14L9 5l6 9" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {id === 'tangent' && <><circle cx="8" cy="10" r="4" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M12 6l3 8" stroke="currentColor" strokeWidth="1.4" /></>}
      {id === 'polar' && <><circle cx="9" cy="9" r="5" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M14 3v12" stroke="currentColor" strokeWidth="1.4" /></>}
      {id === 'locus' && <path d="M3 12c2-5 4 5 6 0s4 4 6-2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 2" />}
      {(id === 'poly' || id === 'rigid' || id === 'vectorPoly') && <path d="M9 3l6 5-2 7H5L3 8z" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      {id === 'regular' && <path d="M9 2l3 5h5l-4 3 2 5-6-3-6 3 2-5-4-3h5z" fill="none" stroke="currentColor" strokeWidth="1" />}
      {(id === 'circle' || id === 'circleR' || id === 'circle3' || id === 'compass') && <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {id === 'semi' && <path d="M3 11a6 6 0 0112 0" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {(id === 'arc' || id === 'arc3') && <path d="M3 12a6 6 0 019-5" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {(id === 'sector' || id === 'sector3') && <path d="M9 9l6 2A6 6 0 009 3z" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      {id === 'ellipse' && <ellipse cx="9" cy="9" rx="7" ry="4" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {id === 'hyperbola' && <path d="M2 4c4 4 4 6 0 10M16 4c-4 4-4 6 0 10" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      {id === 'parabola' && <path d="M3 14c3-9 9-9 12 0" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {id === 'conic5' && <path d="M3 9c2-5 10-5 12 0s-2 6-6 6-8-1-6-6z" fill="none" stroke="currentColor" strokeWidth="1.3" />}
      {(id === 'distance' || id === 'slope') && <path d="M3 13l8-7M11 6v3M11 6H8" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      {id === 'area' && <path d="M4 13l4-8 6 8z" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      {id === 'list' && <text x="2" y="13" fontSize="9" fill="currentColor">{'{ }'}</text>}
      {id === 'relation' && <text x="3" y="13" fontSize="12" fill="currentColor">≟</text>}
      {id === 'inspect' && <circle cx="8" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      {(id === 'reflect' || id === 'central' || id === 'invert' || id === 'rotate' || id === 'translate' || id === 'homothety') && <path d="M4 13l5-8 5 8M9 5v8" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      {id === 'slider' && <path d="M3 9h12M9 6v6" stroke="currentColor" strokeWidth="1.6" />}
      {id === 'text' && <text x="4" y="13" fontSize="12" fill="currentColor">T</text>}
      {id === 'image' && <rect x="3" y="4" width="12" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      {id === 'button' && <rect x="3" y="6" width="12" height="6" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      {id === 'check' && <path d="M4 9l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.6" />}
      {id === 'input' && <rect x="2" y="5" width="14" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      {id === 'pan' && <path d="M9 2v14M2 9h14" stroke="currentColor" strokeWidth="1.4" />}
      {id === 'zoomIn' && <path d="M8 3a5 5 0 100 10 5 5 0 000-10zM12 12l3 3M8 6v4M6 8h4" fill="none" stroke="currentColor" strokeWidth="1.3" />}
      {id === 'zoomOut' && <path d="M8 3a5 5 0 100 10 5 5 0 000-10zM12 12l3 3M6 8h4" fill="none" stroke="currentColor" strokeWidth="1.3" />}
      {id === 'hide' && <path d="M2 9s3-4 7-4 7 4 7 4-3 4-7 4-7-4-7-4z" fill="none" stroke="currentColor" strokeWidth="1.3" />}
      {id === 'label' && <text x="5" y="13" fontSize="12" fill="currentColor">A</text>}
      {id === 'style' && <path d="M5 13c4-8 8 2 8-4" fill="none" stroke="currentColor" strokeWidth="1.6" />}
      {id === 'delete' && <path d="M4 5h10M7 5V3h4v2M6 5l1 10h4l1-10" fill="none" stroke="currentColor" strokeWidth="1.4" />}
    </svg>
  );
}

function SvgKeyboard({ off }: { off: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="1" y="3" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 7h1M8 7h1M12 7h1M4 11h8" stroke="currentColor" strokeWidth="1.6" />
      {off && <path d="M2 16L16 2" stroke="#ff2a2a" strokeWidth="1.8" />}
    </svg>
  );
}
function SvgBg({ mode }: { mode: Bg }) {
  const fill = mode === 'white' ? '#f4f4f6' : mode === 'black' ? '#111' : '#5aa7ff';
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="1" y="1" width="16" height="16" rx="3" fill={fill} stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function ExpModal({ base, onClose, onOk }: { base: string; onClose: () => void; onOk: (exp: string) => void }) {
  const [v, setV] = useState('');
  const tap = (k: string) => {
    if (k === '⌫') { setV((s) => s.slice(0, -1)); return; }
    if (k === '−') { setV((s) => (s.startsWith('-') ? s.slice(1) : `-${s}`)); return; }
    setV((s) => (s + k).slice(0, 6));
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Exponente</h3>
        <p>Se coloca arriba de la entrada actual, sin usar el signo ^.</p>
        <div className="exp-preview"><span>{base || '0'}</span><sup>{v || '□'}</sup></div>
        <div className="mini-pad">
          {['7', '8', '9', '4', '5', '6', '1', '2', '3', '−', '0', '⌫'].map((k) => (
            <button key={k} type="button" className={'−⌫'.includes(k) ? 'op' : 'num'} onClick={() => tap(k)}>{k}</button>
          ))}
        </div>
        <div className="ops">
          <button type="button" onClick={onClose}>Cancelar</button>
          <button type="button" className="create" onClick={() => v && onOk(v)}>Poner exponente</button>
        </div>
      </div>
    </div>
  );
}

function sheet(title: string, blocks: [string, string][]): string {
  return [`§ ${title}`, ...blocks.flatMap(([head, body]) => [`§ ${head}`, body])].join('\n');
}
function ResultActions({text}:{text:string}) {
  const [status,setStatus]=useState('');
  const plain=text.replace(/^§/,'').replace(/§/g,'\n');
  return <div className="ma-result-actions"><button type="button" className="ma-secondary" onClick={()=>copyValue(plain,setStatus)}>Copiar desarrollo</button><button type="button" className="ma-secondary" onClick={()=>downloadData('RBC-desarrollo.txt',plain)}>Descargar desarrollo</button>{status&&<span role="status">{status}</span>}</div>;
}

function ResultCard({ text }: { text: string }) {
  const chunks = text.split(/\n(?=§ )/);
  const parts = chunks.map((block) => {
    const lines = block.split('\n');
    const marked = lines[0].startsWith('§ ');
    return { head: marked ? lines[0].slice(2).trim() : 'Detalle', body: (marked ? lines.slice(1) : lines).join('\n').trim() };
  }).filter((p) => p.body);
  if (!text.includes('§ ')) return <><ResultActions text={text} /><pre className="out">{text}</pre></>;
  return (
    <div className="result">
        <ResultActions text={text} />
      {parts.map((p) => (
        <section key={`${p.head}-${p.body.slice(0, 12)}`} className={`res-block${/resultado|respuesta/i.test(p.head) ? ' answer' : ''}`}>
          <h4>{p.head}</h4>
          <pre>{p.body}</pre>
        </section>
      ))}
    </div>
  );
}
function explainDet(name: string, m: number[][]): string {
  if (m.length !== m[0].length) return sheet('Determinante', [['Qué es', 'El determinante solo existe en matrices cuadradas: mismo número de filas y columnas.'], ['Resultado', `${name} no es cuadrada, así que no tiene determinante.`]]);
  if (m.length === 1) return sheet('Determinante 1×1', [['Qué es', 'Una matriz de una sola celda es ese número. Su determinante es la celda.'], ['Datos', `${name} = [${m[0][0]}]`], ['Resultado', `det(${name}) = ${m[0][0]}`]]);
  if (m.length === 2) {
    const a = m[0][0]; const b = m[0][1]; const c = m[1][0]; const d = m[1][1];
    const val = a * d - b * c;
    return sheet(`Determinante de ${name}`, [
      ['Qué es', 'En 2×2 la regla es ad − bc: producto de la diagonal principal menos el de la secundaria.'],
      ['Datos', `a = ${a}\nb = ${b}\nc = ${c}\nd = ${d}`],
      ['Cómo se hizo', `Diagonal principal: (${a})(${d}) = ${a * d}\nDiagonal secundaria: (${b})(${c}) = ${b * c}\nSe resta la secundaria a la principal.`],
      ['Resultado', `det(${name}) = ${a * d} − ${b * c} = ${val}`],
      ['Qué significa', Math.abs(val) < 1e-8 ? 'El determinante es 0: las filas son múltiplos y la matriz no es invertible.' : 'El determinante no es 0: las filas son independientes y la matriz es invertible.'],
    ]);
  }
  if (m.length === 3) {
    const a = m;
    const pos = a[0][0] * a[1][1] * a[2][2] + a[0][1] * a[1][2] * a[2][0] + a[0][2] * a[1][0] * a[2][1];
    const neg = a[0][2] * a[1][1] * a[2][0] + a[0][0] * a[1][2] * a[2][1] + a[0][1] * a[1][0] * a[2][2];
    const val = pos - neg;
    return sheet(`Sarrus de ${name}`, [
      ['Qué es', 'Sarrus sirve solo para 3×3. Se copian las dos primeras columnas a la derecha. Se suman las tres diagonales que bajan y se restan las tres que suben.'],
      ['Diagonales que bajan', `${a[0][0]}·${a[1][1]}·${a[2][2]} + ${a[0][1]}·${a[1][2]}·${a[2][0]} + ${a[0][2]}·${a[1][0]}·${a[2][1]} = ${pos}`],
      ['Diagonales que suben', `${a[0][2]}·${a[1][1]}·${a[2][0]} + ${a[0][0]}·${a[1][2]}·${a[2][1]} + ${a[0][1]}·${a[1][0]}·${a[2][2]} = ${neg}`],
      ['Cómo se hizo', 'Cada diagonal es el producto de tres celdas. La suma de las que bajan es la parte positiva. La suma de las que suben se resta.'],
      ['Resultado', `det(${name}) = ${pos} − ${neg} = ${val}`],
      ['Qué significa', Math.abs(val) < 1e-8 ? 'Como el determinante es 0, la matriz no es invertible: alguna fila es combinación de las otras.' : 'El determinante no es 0, así que existe inversa y el sistema asociado tiene solución única.'],
    ]);
  }
  return sheet(`Determinante de ${name}`, [
    ['Qué es', 'Para más de 3×3 se expande por cofactores: cada elemento de la primera fila se multiplica por (−1)^(1+j) y por el determinante de la submatriz que queda al quitar su fila y su columna.'],
    ['Cómo se hizo', 'Se repite el mismo proceso en cada submatriz hasta llegar a 2×2, donde ya se usa ad − bc.'],
    ['Resultado', `det(${name}) = ${det(m)}`],
  ]);
}

function saveMatrix(list: Matrix[], name: string, res: number[][]): Matrix[] {
  return [...list, { id: name + Date.now(), name, rows: res.length, cols: res[0].length, cells: res.map((row) => row.map((n) => String(Number(n.toPrecision(8))))) }];
}

const subscript=(n:number)=>String(n).replace(/\d/g,d=>'₀₁₂₃₄₅₆₇₈₉'[Number(d)]);
function MatrixStudio() {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [mats, setMats] = useWorkspaceState<Matrix[]>('matrices',[]);
  const [active, setActive] = useWorkspaceState('active-matrix',0);
  const [cell, setCell] = useState<{ r: number; c: number } | null>(null);
  const [value, setValue] = useState('');
  const [out, setOut] = useState('');
  const [pick, setPick] = useState<null | 'add' | 'sub' | 'mul' | 'scale'>(null);
  const [scalar, setScalar] = useState('2');
  const [sysOpen, setSysOpen] = useState(false);
  const [rowOps, setRowOps] = useState<string[][]>([]);
  const [rhs, setRhs] = useState<string[]>([]);
  const [rhsFocus, setRhsFocus] = useState(0);
  const create = () => {
    const name = String.fromCharCode(65 + (mats.length % 26));
    const label = mats.some((x) => x.name === name) ? `${name}${mats.length}` : name;
    const m: Matrix = { id: `${label}${Date.now()}`, name: label, rows, cols, cells: Array.from({ length: rows }, () => Array.from({ length: cols }, () => '')) };
    setMats((list) => [...list, m]);
    setActive(mats.length);
    setCell({ r: 0, c: 0 });
    setValue('');
    setOut('');
    setPick(null);
  };
  const current = mats[active] || mats[0];
  const currentIndex = current ? mats.indexOf(current) : -1;
  const toNum = (m:Matrix) => { const values=m.cells.map(row=>row.map(cellNum));if(values.some(row=>row.some(value=>!Number.isFinite(value))))throw new Error('Hay una celda no válida. Usa números, fracciones o potencias finitas.');return values; };
  const save = () => {
    if (!cell || !current) return;
    if(!Number.isFinite(cellNum(value))){setOut('La celda no contiene un número válido. Revisa la expresión y el denominador.');return;}
    setMats((list) => list.map((m, i) => i !== active ? m : { ...m, cells: m.cells.map((row, r) => row.map((v, c) => (r === cell.r && c === cell.c ? value : v))) }));
    const nextC = cell.c + 1 < current.cols ? cell.c + 1 : 0;
    const nextR = cell.c + 1 < current.cols ? cell.r : Math.min(current.rows - 1, cell.r + 1);
    setCell({ r: nextR, c: nextC });
    setValue(current.cells[nextR]?.[nextC] ?? '');
  };
  const unary = (op: string) => {
    if (!current) { setOut('Primero crea una matriz.'); return; }
    try {
      const a = toNum(current);
      if ((op==='det'||op==='sarrus'||op==='inv')&&current.rows!==current.cols)throw new Error('Esta operación requiere una matriz cuadrada.');
      if(op==='eigen'){
        if(current.rows!==2||current.cols!==2)throw new Error('Los valores propios están disponibles para matrices 2 × 2.');
        const tr=a[0][0]+a[1][1],d=det(a),disc=tr*tr-4*d;
        const values=disc>=0?`λ₁ = ${(tr+Math.sqrt(disc))/2}\nλ₂ = ${(tr-Math.sqrt(disc))/2}`:`λ₁ = ${tr/2} + ${Math.sqrt(-disc)/2}i\nλ₂ = ${tr/2} − ${Math.sqrt(-disc)/2}i`;
        setOut(sheet('Valores propios (2 × 2)',[['Definición','Son las raíces de det(A − λI) = 0.'],['Polinomio característico',`λ² − (${tr})λ + (${d}) = 0`],['Discriminante',`tr(A)² − 4 det(A) = ${disc}`],['Resultado',values]]));
      }
      if(op==='norm'){setOut(sheet('Normas matriciales',[['Norma de Frobenius','Raíz cuadrada de la suma de los cuadrados de todas las entradas.'],['Resultado',`‖A‖F = ${Math.hypot(...a.flat())}\n‖A‖₁ (máxima suma absoluta por columna) = ${Math.max(...transpose(a).map(row=>row.reduce((sum,v)=>sum+Math.abs(v),0)))}\n‖A‖∞ (máxima suma absoluta por fila) = ${Math.max(...a.map(row=>row.reduce((sum,v)=>sum+Math.abs(v),0)))}`]]));}
      if(op==='rank'){const reduced=rrefSteps(a);const rank=reduced.m.filter(row=>row.some(v=>Math.abs(v)>1e-9)).length;setOut(sheet('Rango y nulidad',[['Datos',fmtM(a)],['Operaciones elementales',reduced.steps.join('\n\n')],['Resultado',`Rango = ${rank}\nNulidad = ${current.cols-rank}\nDimensión del dominio = ${current.cols}`]]));}
      if(op==='trace'){if(current.rows!==current.cols)throw new Error('La traza requiere una matriz cuadrada.');setOut(sheet('Traza',[['Desarrollo',a.map((row,i)=>String(row[i])).join(' + ')],['Resultado',String(a.reduce((sum,row,i)=>sum+row[i],0))]]));}
      if (op === 'det' || op === 'sarrus') setOut(explainDet(current.name, a));
      if (op === 'yes') {
        const square = a.length === a[0].length;
        const d = square ? det(a) : NaN;
        setOut(square
          ? sheet('¿Es invertible?', [
            ['Qué es', 'Una matriz cuadrada es invertible exactamente cuando su determinante no es cero. Si lo es, existe otra matriz que al multiplicarla da la identidad.'],
            ['Cómo se hizo', `Se calculó det(${current.name}) = ${d}.`],
            ['Resultado', Math.abs(d) > 1e-8 ? 'Sí es invertible.' : 'No es invertible: el determinante es 0 y alguna fila depende de las otras.'],
          ])
          : sheet('¿Es invertible?', [['Resultado', 'Solo una matriz cuadrada puede ser invertible. Esta no tiene el mismo número de filas y columnas.']]));
      }
      if (op === 'tr') {
        const t = transpose(a);
        setOut(sheet(`Transpuesta de ${current.name}`, [
          ['Qué es', 'La transpuesta cambia filas por columnas. La celda (i, j) pasa a (j, i). El tamaño m×n se convierte en n×m.'],
          ['Cómo se hizo', 'Se leyó cada fila de izquierda a derecha y se escribió como columna, de arriba abajo.'],
          ['Resultado', fmtM(t)],
        ]));
        setMats((list) => saveMatrix(list, `${current.name}ᵀ`, t));
      }
      if (op === 'inv') {
        const inv = inverse(a);
        setOut(sheet(`Inversa de ${current.name}`, [
          ['Qué es', 'La inversa A⁻¹ es la matriz que cumple A·A⁻¹ = I. Solo existe si A es cuadrada y su determinante no es cero.'],
          ['Cómo se hizo', 'Se armó la matriz aumentada [A | I]. Con Gauss-Jordan se dejó la identidad a la izquierda. Lo que quedó a la derecha es la inversa.'],
          ['Comprobación', 'Si al multiplicar A por este resultado no sale la identidad, revisa que no haya celdas vacías o un determinante cero.'],
          ['Resultado', fmtM(inv)],
        ]));
        setMats((list) => saveMatrix(list, `${current.name}⁻¹`, inv));
      }
      if (op === 'gauss') {
        const g = rref(a);
        setOut(sheet('Gauss-Jordan', [
          ['Qué es', 'La forma escalonada reducida deja un 1 en cada pivote y ceros en el resto de esa columna. Sirve para resolver sistemas y ver el rango.'],
          ['Cómo se hizo', '1. Se elige el primer número distinto de cero de la columna (el pivote).\n2. Se divide la fila para dejar el pivote en 1.\n3. Se resta un múltiplo de esa fila a las demás, para anular la columna.\n4. Se repite con la siguiente columna.'],
          ['Resultado', fmtM(g)],
        ]));
        setMats((list) => saveMatrix(list, `rref ${current.name}`, g));
      }
    } catch (e) { setOut(e instanceof Error ? e.message : 'error'); }
  };
  const withOther = (other: Matrix) => {
    if (!current || !pick || pick === 'scale') return;
    try {
      const a = toNum(current);
      const b = toNum(other);
      if (pick === 'add' || pick === 'sub') {
        if (a.length !== b.length || a[0].length !== b[0].length) throw new Error('Para sumar o restar, las dos matrices deben medir lo mismo.');
        const res = pick === 'add' ? addM(a, b) : subM(a, b);
        const sign = pick === 'add' ? '+' : '−';
        const lines = res.flatMap((row, i) => row.map((_, j) => `(${i + 1}, ${j + 1}): ${a[i][j]} ${sign} ${b[i][j]} = ${Number(res[i][j].toPrecision(6))}`));
        setOut(sheet(`${current.name} ${sign} ${other.name}`, [
          ['Qué es', pick === 'add' ? 'La suma de matrices se hace celda a celda, en la misma posición. Las dos tienen que medir igual.' : 'La resta también es celda a celda: se resta el número de la segunda matriz al de la primera, en la misma casilla.'],
          ['Datos', `${current.name} es ${a.length}×${a[0].length}\n${other.name} es ${b.length}×${b[0].length}`],
          ['Cómo se hizo', lines.join('\n')],
          ['Resultado', fmtM(res)],
        ]));
        setMats((list) => saveMatrix(list, `${current.name}${sign}${other.name}`, res));
      }
      if (pick === 'mul') {
        if (a[0].length !== b.length) throw new Error(`Para multiplicar, las columnas de ${current.name} (${a[0].length}) deben coincidir con las filas de ${other.name} (${b.length}).`);
        const res = mulM(a, b);
        const lines = res.flatMap((row, i) => row.map((v, j) => {
          const bits = a[i].map((x, k) => `(${x})(${b[k][j]})`);
          return `(${i + 1}, ${j + 1}) = ${bits.join(' + ')} = ${Number(v.toPrecision(6))}`;
        }));
        setOut(sheet(`${current.name} × ${other.name}`, [
          ['Qué es', 'El producto no es celda a celda. La celda (i, j) es el producto punto de la fila i de la primera con la columna j de la segunda.'],
          ['Condición', `Las columnas de ${current.name} (${a[0].length}) coinciden con las filas de ${other.name} (${b.length}). El resultado mide ${res.length}×${res[0].length}.`],
          ['Cómo se hizo', lines.join('\n')],
          ['Resultado', fmtM(res)],
        ]));
        setMats((list) => saveMatrix(list, `${current.name}×${other.name}`, res));
      }
      setPick(null);
    } catch (e) { setOut(e instanceof Error ? e.message : 'error'); }
  };
  const applyScale = () => {
    if (!current) return;
    const k = cellNum(scalar);
    if (!scalar.trim() || !Number.isFinite(k)) { setOut('Escribe un número, por ejemplo 2, −3 o 1/2.'); return; }
    let a:number[][];try{a=toNum(current);}catch(problem){setOut(String(problem));return;}
    const res = scaleM(a, k);
    const lines = a.flatMap((row, i) => row.map((v, j) => `(${i + 1}, ${j + 1}): ${k} · ${v} = ${Number(res[i][j].toPrecision(6))}`));
    setOut(sheet(`${k} · ${current.name}`, [
      ['Qué es', 'Multiplicar por un escalar es multiplicar cada celda por el mismo número. No cambia el tamaño de la matriz.'],
      ['Datos', `Escalar = ${k}\nMatriz ${current.name}, ${a.length}×${a[0].length}`],
      ['Cómo se hizo', lines.join('\n')],
      ['Resultado', fmtM(res)],
    ]));
    setMats((list) => saveMatrix(list, `${k}${current.name}`, res));
    setPick(null);
  };
  const openSystem = () => {
    if (!current) return;
    setRowOps(current.cells.map((row) => Array.from({ length: Math.max(0, row.length - 1) }, () => '+')));
    setRhs(current.cells.map(() => ''));
    setRhsFocus(0);
    setSysOpen(true);
  };
  const tapRhs = (token: string) => {
    setRhs((list) => list.map((v, i) => {
      if (i !== rhsFocus) return v;
      if (token === '⌫') return v.slice(0, -1);
      if (token === 'C') return '';
      if (token === '−') return v.startsWith('-') ? v.slice(1) : `-${v || ''}`;
      return `${v}${token}`.slice(0, 14);
    }));
  };
  const solveMatrixSystem = () => {
    if (!current) return;
    try {
      if(rhs.some(value=>!value.trim()))throw new Error('Completa el resultado de todas las filas; escribe 0 cuando corresponda.');
      const a = toNum(current);
      if (!a.length || !a[0]?.length) throw new Error('La matriz está vacía.');
      const vars = a[0].map((_, i) => 'xyzuvw'[i] || `x${i + 1}`);
      const eqs = a.map((row, i) => {
        const bits = row.map((v, j) => `${j === 0 ? '' : ` ${rowOps[i]?.[j - 1] || '+'} `}${v}${vars[j]}`);
        return `${bits.join('')} = ${rhs[i] || '0'}`;
      });
      const aug = a.map((row, i) => [
        ...row.map((v, j) => (j > 0 && rowOps[i]?.[j - 1] === '−' ? -v : v)),
        cellNum(rhs[i] || '0'),
      ]);
      if(aug.some(row=>row.some(value=>!Number.isFinite(value))))throw new Error('Completa todos los coeficientes con números finitos.');
      const traced = rrefSteps(aug);
      const n=current.cols,eps=1e-9;
      const inconsistent=traced.m.some(row=>row.slice(0,n).every(v=>Math.abs(v)<eps)&&Math.abs(row[n])>=eps);
      const pivots=traced.m.map(row=>row.slice(0,n).findIndex(v=>Math.abs(v)>=eps)).filter(i=>i>=0);
      const free=Array.from({length:n},(_,i)=>i).filter(i=>!pivots.includes(i));
      const unique=!inconsistent&&pivots.length===n;
      const sol=Array(n).fill(0);traced.m.forEach(row=>{const pivot=row.slice(0,n).findIndex(v=>Math.abs(v)>=eps);if(pivot>=0)sol[pivot]=row[n];});
      const format=(v:number)=>String(Number(v.toPrecision(10)));
      const parametric=traced.m.filter(row=>row.slice(0,n).some(v=>Math.abs(v)>=eps)).map(row=>{const pivot=row.slice(0,n).findIndex(v=>Math.abs(v)>=eps);return `${vars[pivot]} = ${format(row[n])}`+free.filter(j=>Math.abs(row[j])>=eps).map(j=>` ${row[j]>0?'−':'+'} ${format(Math.abs(row[j]))}·${vars[j]}`).join('');}).join('\n');
      const solution=inconsistent?'Sistema incompatible: aparece una fila 0 = b con b distinto de cero. No existe solución.':unique?vars.map((v,i)=>`${v} = ${format(sol[i])}`).join('\n'):`Infinitas soluciones. Variables libres: ${free.map(i=>vars[i]).join(', ')}.\n${parametric}`;
      const check=unique?a.map((row,i)=>`Fila ${i+1}: ${format(row.reduce((sum,v,j)=>sum+v*sol[j],0))} = ${rhs[i]}`).join('\n'):inconsistent?'Una igualdad contradictoria impide satisfacer simultáneamente todas las ecuaciones.':'Asigna un valor real a cada variable libre para obtener una solución particular.';
      setOut(sheet(`Gauss-Jordan con ${current.name}`, [
        ['Qué es', 'Cada fila de la matriz se convierte en una ecuación. La celda es el coeficiente y la letra es la incógnita. El botón entre celdas pone el signo. El número después del igual es el resultado de esa fila.'],
        ['Ecuaciones', eqs.join('\n')],
        ['Matriz aumentada', `Los coeficientes van a la izquierda y el resultado a la derecha.\n${fmtM(aug)}`],
        ['Cómo se hizo', traced.steps.join('\n\n')],
        ['Resultado', solution],
        ['Comprobación', check],
      ]));
      setSysOpen(false);
    } catch (e) { setOut(e instanceof Error ? e.message : 'error'); }
  };
  const opName = pick === 'add' ? 'Sumar' : pick === 'sub' ? 'Restar' : pick === 'mul' ? 'Multiplicar' : 'Por un número';
  return (
    <section className="studio">
      <details className="dim-card matrix-create" open={!current}>
        <summary>Nueva matriz <span>Dimensiones, identidad y exportación</span></summary>
        <p className="ma-lab-hint">Crea una matriz vacía o parte de una identidad. Cada celda admite decimales y fracciones como 1/3.</p>
        <div className="ops"><button type="button" onClick={()=>{const name=`I${rows}`;setMats(list=>[...list,{id:crypto.randomUUID(),name,rows,cols:rows,cells:Array.from({length:rows},(_,r)=>Array.from({length:rows},(_,c)=>r===c?'1':'0'))}]);setActive(mats.length);setOut('Matriz identidad creada: unos en la diagonal principal y ceros en el resto.');}}>Crear identidad</button>
        {mats.length>0&&<button type="button" onClick={()=>downloadData('RBC-matrices.json',JSON.stringify(mats,null,2),'application/json')}>Exportar matrices</button>}</div>

        <div className="dim">
          <span>Filas</span>
          <button type="button" onClick={() => setRows((n) => Math.max(1, n - 1))}>−</button>
          <strong>{rows}</strong>
          <button type="button" onClick={() => setRows((n) => Math.min(6, n + 1))}>+</button>
          <span>Columnas</span>
          <button type="button" onClick={() => setCols((n) => Math.max(1, n - 1))}>−</button>
          <strong>{cols}</strong>
          <button type="button" onClick={() => setCols((n) => Math.min(6, n + 1))}>+</button>
        </div>
        <button type="button" className="create" onClick={create}>Crear matriz</button>
      </details>
      {!current && <p className="note">Elige el tamaño y pulsa Crear matriz. Después escribe directamente en la cuadrícula; las celdas vacías valen cero.</p>}
      {current && (
        <>
          <div className="mat-tabs">
            {mats.map((m, i) => <button key={m.id} type="button" className={i === active ? 'on' : ''} onClick={() => { setActive(i); setCell(null); setPick(null); }}>{m.name} · {m.rows}×{m.cols}</button>)}
          </div>
          <div className="matrix-board">
            <div className="matrix-caption"><strong>{current.name} <small>{current.rows} × {current.cols}</small></strong><span>Escribe en las celdas · Tab avanza · pega filas desde una hoja de cálculo</span></div>
            <div className="matrix-scroll"><div className="matrix-grid" style={{gridTemplateColumns:`repeat(${current.cols}, minmax(64px,100px))`}}>
              {current.cells.flatMap((row,r)=>row.map((v,c)=><label key={`${current.id}-${r}-${c}`}><span>a{subscript(r+1)}{subscript(c+1)}</span><input aria-label={`Matriz ${current.name}, fila ${r+1}, columna ${c+1}`} value={v} placeholder="0" aria-invalid={!Number.isFinite(cellNum(v))} onKeyDown={event=>{if(event.key!=='Enter')return;event.preventDefault();const inputs=event.currentTarget.closest('.matrix-grid')?.querySelectorAll('input');inputs?.[(r*current.cols+c+1)%(current.rows*current.cols)]?.focus();}} onChange={event=>setMats(list=>list.map((m,i)=>i!==currentIndex?m:{...m,cells:m.cells.map((line,ri)=>line.map((old,ci)=>ri===r&&ci===c?event.target.value:old))}))} onPaste={event=>{const source=event.clipboardData.getData('text');if(!/[\t\n]/.test(source))return;event.preventDefault();const lines=source.trim().split(/\r?\n/).map(line=>line.split('\t'));if(lines.some(line=>line.some(value=>!Number.isFinite(cellNum(value))))){setOut('No se pegó: hay valores no numéricos.');return;}if(r+lines.length>current.rows||lines.some(line=>c+line.length>current.cols)){setOut('No se pegó: los datos exceden las dimensiones de esta matriz.');return;}setMats(list=>list.map((m,i)=>i!==currentIndex?m:{...m,cells:m.cells.map((line,ri)=>line.map((old,ci)=>lines[ri-r]?.[ci-c]??old))}));}} /></label>))}
            </div></div>
            <div className="ops"><button onClick={()=>{setMats(list=>[...list,{...current,id:crypto.randomUUID(),name:current.name+' copia',cells:current.cells.map(row=>[...row])}]);setActive(mats.length);}}>Duplicar matriz</button><button onClick={()=>{if(!confirm(`¿Eliminar la matriz ${current.name}?`))return;setMats(list=>list.filter(m=>m.id!==current.id));setActive(0);setOut('');}}>Eliminar matriz</button></div>
          </div>
          <div className="ops">
            {[['det', 'Determinante'], ['inv', 'Inversa'], ['tr', 'Transpuesta'], ['yes', '¿Invertible?'], ['rank','Rango y nulidad'], ['trace','Traza'], ['norm','Normas'], ['eigen','Valores propios 2 × 2'], ['gauss', 'Forma reducida']].map(([id, label]) => (
              <button key={id} type="button" onClick={() => { setPick(null); unary(id); }}>{label}</button>
            ))}
            <button type="button" onClick={() => setPick('add')}>Sumar</button>
            <button type="button" onClick={() => setPick('sub')}>Restar</button>
            <button type="button" onClick={() => setPick('mul')}>Multiplicar</button>
            <button type="button" onClick={() => setPick('scale')}>Por un número</button>
            <button type="button" onClick={openSystem}>Gauss-Jordan · Resolver Ax = b</button>
          </div>
          {pick && pick !== 'scale' && (
            <div className="picker">
              <h3>{opName} {current.name} con</h3>
              <p className="note">Elige cualquier matriz, incluida ella misma.</p>
              <div className="mat-tabs">
                {mats.map((m) => <button key={m.id} type="button" onClick={() => withOther(m)}>{m.name}</button>)}
              </div>
            </div>
          )}
          {pick === 'scale' && (
            <div className="picker">
              <h3>Multiplicar {current.name} por</h3>
              <div className="dim">
                <input value={scalar} onChange={(e) => setScalar(e.target.value)} />
                {['2', '3', '−1', '1/2'].map((n) => <button key={n} type="button" onClick={() => setScalar(n.replace('−', '-'))}>{n}</button>)}
              </div>
              <button type="button" className="create" onClick={applyScale}>Aplicar</button>
            </div>
          )}
          {sysOpen && (
            <div className="modal-back" onClick={() => setSysOpen(false)}>
              <div className="modal sys-modal" onClick={(e) => e.stopPropagation()}>
                <h3>Sistema con {current.name}</h3>
                <p>Completa las igualdades de Ax = b. Acepta sistemas cuadrados, sobredeterminados y subdeterminados.</p>
                <div className="augmented-scroll"><table className="augmented-table"><thead><tr>{Array.from({length:current.cols},(_,c)=><th key={c}>{'xyzuvw'[c]||`x${c+1}`}</th>)}<th className="rhs-column">= b</th></tr></thead><tbody>{current.cells.map((row,r)=><tr key={r}>{row.map((v,c)=><td key={c}>{v||'0'}</td>)}<td className="rhs-column"><input aria-label={`Igualdad de la fila ${r+1}`} value={rhs[r]||''} onFocus={()=>setRhsFocus(r)} onChange={e=>setRhs(list=>list.map((v,i)=>i===r?e.target.value:v))} placeholder="Resultado"/></td></tr>)}</tbody></table></div>
                <p>Cada fila es una ecuación: las columnas son los coeficientes de x, y, z… La última columna contiene el resultado de esa ecuación. Conservamos los signos escritos en la matriz.</p>
                <div className="mini-pad">
                  {['7', '8', '9', '4', '5', '6', '1', '2', '3', '−', '0', '.', '⌫', 'C'].map((k) => (
                    <button key={k} type="button" className={'−⌫C.'.includes(k) ? 'op' : 'num'} onClick={() => tapRhs(k)}>{k}</button>
                  ))}
                </div>
                <div className="ops">
                  <button type="button" onClick={() => setSysOpen(false)}>Cancelar</button>
                  <button type="button" className="create" onClick={solveMatrixSystem}>Resolver</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {out && <ResultCard text={out} />}
    </section>
  );
}

function SystemSolver() {
  const [mode, setMode] = useState<'sistema' | 'bhaskara' | 'lineal' | 'completar' | 'cramer'>('sistema');
  const [eqs, setEqs] = useWorkspaceState('equations',['2x + 4y + 3z = 200', 'x + 3y + 2z = 120', '3x + 4y + 2z = 130']);
  const [focus, setFocus] = useState(0);
  const [abc, setAbc] = useState({ a: '1', b: '-3', c: '2' });
  const [lin, setLin] = useState({ a: '2', b: '5', c: '11' });
  const [sq, setSq] = useState({ b: '6', c: '5' });
  const [cr, setCr] = useState({ a: '2', b: '4', e: '200', c: '1', d: '3', f: '120' });
  const [out, setOut] = useState('');
  const writeEq = (token: string) => {
    setEqs((list) => list.map((line, i) => {
      if (i !== focus) return line;
      if (token === '⌫') return line.slice(0, -1);
      if (token === 'C') return '';
      return line + token;
    }));
  };
  const solveSystem = () => {
    try {
      const rows = eqs.map((s) => s.trim()).filter(Boolean);
      if (rows.length < 2) throw new Error('Hacen falta al menos dos ecuaciones.');
      const vars = Array.from(new Set(rows.join(' ').match(/[a-z]/gi) || [])).sort();
      if (vars.length !== rows.length) throw new Error(`Sistema cuadrado: hay ${rows.length} ecuaciones y ${vars.length} incógnitas. Deben coincidir.`);
      const aug = rows.map((line) => {
        const [left, right] = line.split('=');
        if (!right) throw new Error('Cada ecuación necesita un igual.');
        const coeffs = vars.map((v) => {
          const m = left.match(new RegExp(`([+-]?\\d*\\.?\\d*)\\s*${v}\\b`));
          if (!m) return 0;
          const raw = m[1];
          if (raw === '' || raw === '+') return 1;
          if (raw === '-') return -1;
          return Number(raw);
        });
        return [...coeffs, Number(right.trim())];
      });
      const sol = solveAug(aug);
      if(aug.some(row=>row.some(value=>!Number.isFinite(value))))throw new Error('Completa todos los coeficientes con números finitos.');
      const traced = rrefSteps(aug);
      setOut(sheet('Sistema cuadrado', [
        ['Qué es', 'Un sistema cuadrado tiene tantas ecuaciones como incógnitas. Si las ecuaciones son independientes, hay una sola solución.'],
        ['Datos', rows.map((line, i) => `${i + 1}. ${line}`).join('\n')],
        ['Incógnitas', vars.join(', ')],
        ['Matriz aumentada', 'Se escriben los coeficientes de cada incógnita y, a la derecha de la barra, el resultado.\n' + fmtM(aug)],
        ['Cómo se hizo', traced.steps.join('\n\n')],
        ['Resultado', vars.map((v, i) => `${v} = ${sol[i].toFixed(6)}`).join('\n')],
        ['Comprobación', 'Sustituye estos valores en cada ecuación. Si el lado izquierdo coincide con el derecho, el procedimiento está bien.'],
      ]));
    } catch (e) { setOut(e instanceof Error ? e.message : 'error'); }
  };
  const solveBhaskara = () => {
    const a = Number(abc.a); const b = Number(abc.b); const c = Number(abc.c);
    if (![a, b, c].every(Number.isFinite) || a === 0) { setOut('a, b y c deben ser números, y a no puede ser 0.'); return; }
    const d = b * b - 4 * a * c;
    const blocks: [string, string][] = [
      ['Qué es', 'La fórmula general resuelve ax² + bx + c = 0. El discriminante D = b² − 4ac dice cuántas raíces reales hay.'],
      ['Datos', `a = ${a}\nb = ${b}\nc = ${c}\nEcuación: ${a}x² + (${b})x + (${c}) = 0`],
      ['Fórmula', 'x = (−b ± √D) / (2a)'],
      ['Discriminante', `D = (${b})² − 4(${a})(${c}) = ${b * b} − ${4 * a * c} = ${d}`],
    ];
    if (d < 0) blocks.push(['Resultado', 'D es negativo: no hay soluciones reales. Hay dos raíces complejas conjugadas.']);
    else if (d === 0) blocks.push(['Resultado', `D = 0: una solución doble.\nx = −b / (2a) = ${(-b / (2 * a)).toFixed(6)}`]);
    else {
      const r = Math.sqrt(d);
      blocks.push(['Raíz del discriminante', `√D = ${r.toFixed(6)}`]);
      blocks.push(['Resultado', `x₁ = (−b + √D) / (2a) = ${((-b + r) / (2 * a)).toFixed(6)}\nx₂ = (−b − √D) / (2a) = ${((-b - r) / (2 * a)).toFixed(6)}`]);
    }
    blocks.push(['Qué significa', d > 0 ? 'Dos cortes con el eje x.' : d === 0 ? 'La parábola toca el eje x en un solo punto.' : 'La parábola no cruza el eje x.']);
    setOut(sheet('Fórmula general', blocks));
  };
  const solveLineal = () => {
    const a = Number(lin.a); const b = Number(lin.b); const c = Number(lin.c);
    if (![a, b, c].every(Number.isFinite)) { setOut('Escribe números en a, b y c.'); return; }
    if (a === 0) { setOut(b === c ? '0·x + b = c se cumple para todo x, porque b = c.' : 'No tiene solución: a es 0 y b no es igual a c.'); return; }
    setOut(sheet('Ecuación lineal', [
      ['Qué es', 'ax + b = c es una recta escrita como igualdad. Se despeja x dejando el término con x solo.'],
      ['Datos', `${a}x + (${b}) = ${c}`],
      ['Cómo se hizo', `1. Se resta b de los dos lados.\n   ${a}x = ${c} − (${b}) = ${c - b}\n2. Se divide entre a.\n   x = ${c - b} / ${a}`],
      ['Resultado', `x = ${((c - b) / a).toFixed(6)}`],
      ['Comprobación', `Si vuelves a poner x en la ecuación, ${a}·${((c - b) / a).toFixed(6)} + (${b}) debe dar ${c}.`],
    ]));
  };
  const solveComplete = () => {
    const b = Number(sq.b); const c = Number(sq.c);
    if (![b, c].every(Number.isFinite)) { setOut('b y c deben ser números.'); return; }
    const h = b / 2;
    const right = h * h - c;
    const blocks: [string, string][] = [
      ['Qué es', 'Completar el cuadrado reescribe x² + bx + c como un cuadrado perfecto más un número. Así se despeja sin usar la fórmula de memoria.'],
      ['Datos', `x² + (${b})x + (${c}) = 0`],
      ['Cómo se hizo', `La mitad de b es ${b}/2 = ${h}.\nSe suma y se resta (${h})².\n(x + ${h})² = (${h})² − (${c}) = ${h * h} − ${c} = ${right}`],
    ];
    if (right < 0) blocks.push(['Resultado', 'El lado derecho es negativo: no hay solución real.']);
    else {
      const r = Math.sqrt(right);
      blocks.push(['Resultado', `x + ${h} = ±${r.toFixed(6)}\nx₁ = ${(-h + r).toFixed(6)}\nx₂ = ${(-h - r).toFixed(6)}`]);
    }
    setOut(sheet('Completar el cuadrado', blocks));
  };
  const solveCramer = () => {
    const a = Number(cr.a); const b = Number(cr.b); const e = Number(cr.e);
    const c = Number(cr.c); const d = Number(cr.d); const f = Number(cr.f);
    if (![a, b, e, c, d, f].every(Number.isFinite)) { setOut('Completa los seis coeficientes.'); return; }
    const D = a * d - b * c;
    const Dx = e * d - b * f;
    const Dy = a * f - e * c;
    const blocks: [string, string][] = [
      ['Qué es', 'Cramer resuelve un sistema 2×2 con determinantes. x = Dx/D e y = Dy/D. D usa los coeficientes; Dx y Dy cambian una columna por los resultados.'],
      ['Sistema', `${a}x + (${b})y = ${e}\n${c}x + (${d})y = ${f}`],
      ['Determinante D', `D = ad − bc = (${a})(${d}) − (${b})(${c}) = ${a * d} − ${b * c} = ${D}`],
      ['Dx y Dy', `Dx cambia la columna de x: (${e})(${d}) − (${b})(${f}) = ${Dx}\nDy cambia la columna de y: (${a})(${f}) − (${e})(${c}) = ${Dy}`],
    ];
    if (Math.abs(D) < 1e-10) blocks.push(['Resultado', 'D = 0: no hay solución única. Las rectas son paralelas o son la misma.']);
    else blocks.push(['Resultado', `x = Dx/D = ${Dx}/${D} = ${(Dx / D).toFixed(6)}\ny = Dy/D = ${Dy}/${D} = ${(Dy / D).toFixed(6)}`]);
    setOut(sheet('Cramer 2×2', blocks));
  };
  const pad = ['7', '8', '9', 'x', '+', '4', '5', '6', 'y', '−', '1', '2', '3', 'z', '=', '0', '.', '(', ')', 'w', '⌫', 'C'];
  return (
    <section className="studio">
      <h2>Álgebra lineal</h2>
      <div className="cards">
        <button type="button" className={mode === 'sistema' ? 'on' : ''} onClick={() => setMode('sistema')}>Sistema cuadrado</button>
        <button type="button" className={mode === 'bhaskara' ? 'on' : ''} onClick={() => setMode('bhaskara')}>Fórmula general</button>
        <button type="button" className={mode === 'lineal' ? 'on' : ''} onClick={() => setMode('lineal')}>Ecuación lineal</button>
        <button type="button" className={mode === 'completar' ? 'on' : ''} onClick={() => setMode('completar')}>Completar cuadrado</button>
        <button type="button" className={mode === 'cramer' ? 'on' : ''} onClick={() => setMode('cramer')}>Cramer 2×2</button>
      </div>
      {mode === 'sistema' && (
        <>
          <p className="note">Toca una ecuación y escribe con el teclado. El número de ecuaciones debe ser igual al de incógnitas.</p>
          {eqs.map((eq, i) => <input key={i} className={focus === i ? 'focus' : ''} value={eq} onFocus={() => setFocus(i)} onChange={(e) => setEqs((list) => list.map((v, k) => (k === i ? e.target.value : v)))} />)}
          <div className="eqpad">{pad.map((k) => <button key={k} type="button" className={'+=−⌫C'.includes(k) ? 'op' : 'num'} onClick={() => writeEq(k === '−' ? '-' : k)}>{k}</button>)}</div>
          <div className="ops">
            <button type="button" onClick={() => setEqs((list) => [...list, ''])}>Añadir ecuación</button>
            <button type="button" onClick={() => setEqs((list) => list.slice(0, -1))}>Quitar</button>
            <button type="button" onClick={solveSystem}>Resolver</button>
          </div>
        </>
      )}
      {mode === 'bhaskara' && (
        <div className="lab">
          <p className="note">ax² + bx + c = 0. El discriminante dice cuántas raíces reales hay.</p>
          {(['a', 'b', 'c'] as const).map((k) => <label key={k}>{k}<input value={abc[k]} onChange={(e) => setAbc((s) => ({ ...s, [k]: e.target.value }))} /></label>)}
          <button type="button" className="create" onClick={solveBhaskara}>Resolver</button>
        </div>
      )}
      {mode === 'lineal' && (
        <div className="lab">
          <p className="note">ax + b = c. Se despeja x restando b y dividiendo entre a.</p>
          {(['a', 'b', 'c'] as const).map((k) => <label key={k}>{k}<input value={lin[k]} onChange={(e) => setLin((s) => ({ ...s, [k]: e.target.value }))} /></label>)}
          <button type="button" className="create" onClick={solveLineal}>Resolver</button>
        </div>
      )}
      {mode === 'completar' && (
        <div className="lab">
          <p className="note">x² + bx + c = 0. Se forma (x + b/2)² y se despeja.</p>
          {(['b', 'c'] as const).map((k) => <label key={k}>{k}<input value={sq[k]} onChange={(e) => setSq((s) => ({ ...s, [k]: e.target.value }))} /></label>)}
          <button type="button" className="create" onClick={solveComplete}>Resolver</button>
        </div>
      )}
      {mode === 'cramer' && (
        <div className="lab">
          <p className="note">ax + by = e y cx + dy = f. x = Dx/D, y = Dy/D.</p>
          {(['a', 'b', 'e', 'c', 'd', 'f'] as const).map((k) => <label key={k}>{k}<input value={cr[k]} onChange={(e) => setCr((s) => ({ ...s, [k]: e.target.value }))} /></label>)}
          <button type="button" className="create" onClick={solveCramer}>Resolver</button>
        </div>
      )}
      {out && <ResultCard text={out} />}
    </section>
  );
}

type LabItem = { name: string; idea: string; fields: { name: string; kind: 'num' | 'expr' }[]; run: (v: string[]) => string };

function splitTerms(src: string): { sign: string; body: string }[] {
  const s = src.replace(/\s+/g, '').replace(/−/g, '-');
  const out: { sign: string; body: string }[] = [];
  let buf = '';
  let depth = 0;
  let sign = '+';
  const flush = () => { if (buf) out.push({ sign, body: buf }); buf = ''; };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (depth === 0 && (c === '+' || c === '-') && (buf || i > 0)) {
      if (!buf && c === '-') { sign = '-'; continue; }
      flush();
      sign = c;
      continue;
    }
    buf += c;
  }
  flush();
  return out;
}
function diffOne(body: string): string {
  const poly = body.match(/^(\d*\.?\d*)x(?:\^(\d+))?$/);
  if (poly) {
    const coef = poly[1] === '' ? 1 : Number(poly[1]);
    const n = poly[2] ? Number(poly[2]) : 1;
    if (!poly[2] && !body.includes('x')) return '0';
    const nc = coef * n;
    const np = n - 1;
    if (np === 0) return String(nc);
    if (np === 1) return `${nc}x`;
    return `${nc}x^${np}`;
  }
  if (/^\d*\.?\d+$/.test(body)) return '0';
  if (body === 'sin(x)') return 'cos(x)';
  if (body === 'cos(x)') return 'sin(x)';
  if (body === 'exp(x)' || body === 'e^x') return 'exp(x)';
  if (body === 'ln(x)') return '1/x';
  if (body === 'tan(x)') return '1/cos(x)^2';
  return `d/dx(${body})`;
}
function intOne(body: string): string {
  const poly = body.match(/^(\d*\.?\d*)x(?:\^(\d+))?$/);
  if (poly) {
    const coef = poly[1] === '' ? 1 : Number(poly[1]);
    const n = poly[2] ? Number(poly[2]) : 1;
    const np = n + 1;
    const nc = coef / np;
    return `${Number(nc.toPrecision(6))}x^${np}`;
  }
  if (/^\d*\.?\d+$/.test(body)) return `${body}x`;
  if (body === 'sin(x)') return '-cos(x)';
  if (body === 'cos(x)') return 'sin(x)';
  if (body === 'exp(x)' || body === 'e^x') return 'exp(x)';
  if (body === '1/x') return 'ln|x|';
  return `∫(${body}) dx`;
}
function diffText(src: string): string {
  const terms = splitTerms(src);
  if (!terms.length) return 'Escribe una función, por ejemplo 3x^2 + sin(x).';
  const steps: string[] = [];
  const pieces = terms.map((t) => {
    const d = diffOne(t.body);
    const shown = t.body === 'cos(x)' ? (t.sign === '-' ? 'sin(x)' : '-sin(x)') : (t.sign === '-' ? `-(${d})` : d);
    const why = t.body.match(/x\^(\d+)/)
      ? 'Regla de la potencia: baja el exponente y se resta 1.'
      : t.body === 'sin(x)' ? 'La derivada del seno es el coseno.'
      : t.body === 'cos(x)' ? 'La derivada del coseno es −seno.'
      : /^\d/.test(t.body) && !t.body.includes('x') ? 'La derivada de una constante es 0.'
      : 'Se aplica la regla del término.';
    steps.push(`${t.sign === '-' ? '−' : '+'}${t.body} → ${shown}\n   ${why}`);
    if (t.body === 'cos(x)') return t.sign === '-' ? 'sin(x)' : '-sin(x)';
    return (t.sign === '-' ? '-' : '+') + d;
  });
  const expr = pieces.join('').replace(/^\+/, '');
  return sheet('Derivada', [
    ['Qué es', 'La derivada mide la pendiente instantánea. La de una suma es la suma de las derivadas, conservando el signo de cada término.'],
    ['Función', src],
    ['Cómo se hizo', steps.join('\n')],
    ['Resultado', `f'(x) = ${expr}`],
    ['Cómo leerlo', 'Si f\'(x) es positiva, la función crece. Si es negativa, decrece. Un cero de f\' puede ser un máximo o un mínimo.'],
  ]);
}
function intText(src: string): string {
  const terms = splitTerms(src);
  if (!terms.length) return 'Escribe una función, por ejemplo 3x^2 + cos(x).';
  const steps: string[] = [];
  const pieces = terms.map((t) => {
    const d = intOne(t.body);
    const why = t.body.match(/x\^(\d+)/)
      ? 'Regla de la potencia: se suma 1 al exponente y se divide entre el nuevo exponente.'
      : t.body === 'sin(x)' ? 'La integral del seno es −coseno.'
      : t.body === 'cos(x)' ? 'La integral del coseno es el seno.'
      : /^\d/.test(t.body) && !t.body.includes('x') ? 'La integral de una constante k es kx.'
      : 'Se integra el término.';
    steps.push(`∫ ${t.sign === '-' ? '−' : ''}${t.body} dx = ${t.sign === '-' ? '−' : ''}${d}\n   ${why}`);
    return (t.sign === '-' ? '-' : '+') + d;
  });
  return sheet('Integral', [
    ['Qué es', 'La integral indefinida es la familia de antiderivadas. Se integra término a término y al final se suma C, porque la derivada de una constante es cero.'],
    ['Función', src],
    ['Cómo se hizo', steps.join('\n')],
    ['Resultado', `∫ f(x) dx = ${pieces.join('').replace(/^\+/, '')} + C`],
    ['Comprobación', 'Si derivas el resultado, sin la C, debes recuperar la función original.'],
  ]);
}

const ARITH: LabItem[] = [
  { name: 'Porcentaje', idea: 'El porcentaje es una fracción con denominador 100. El 1% es la centésima parte.', fields: [{ name: 'cantidad', kind: 'num' }, { name: 'porciento', kind: 'num' }], run: ([a, p]) => { const A = Number(a); const P = Number(p); const part = (A * P) / 100; return `1. Se convierte el porcentaje en fracción: ${P}% = ${P}/100.\n2. Se multiplica esa fracción por la cantidad.\n   ${A} × ${P} / 100\n3. Primero ${A} × ${P} = ${A * P}.\n4. Luego se divide entre 100: ${A * P} / 100 = ${part}.\nEso es la parte que representa el ${P}% de ${A}.`; } },
  { name: 'Regla de tres', idea: 'Si a está con b, entonces c está con x en la misma razón. Se cruzan los productos.', fields: [{ name: 'a', kind: 'num' }, { name: 'b', kind: 'num' }, { name: 'c', kind: 'num' }], run: ([a, b, c]) => { const A = Number(a); const B = Number(b); const C = Number(c); if (!A) return 'a no puede ser 0: no se puede dividir entre cero.'; const x = (B * C) / A; return `Proporción: ${A} / ${B} = ${C} / x.\n1. Se cruzan: ${A} · x = ${B} · ${C}.\n2. ${B} · ${C} = ${B * C}.\n3. Se despeja x dividiendo entre ${A}.\n   x = ${B * C} / ${A} = ${x}.\nSi a crece, x crece en la misma razón.`; } },
  { name: 'Potencia', idea: 'aⁿ multiplica a por sí mismo n veces. Si n es negativo, es 1 dividido entre esa potencia.', fields: [{ name: 'base', kind: 'num' }, { name: 'exponente', kind: 'num' }], run: ([a, b]) => { const A = Number(a); const B = Number(b); const v = A ** B; return `Base = ${A}, exponente = ${B}.\n${B >= 0 ? `Se multiplica ${A} por sí mismo ${B} veces.` : `El exponente es negativo: se calcula ${A}^${-B} y luego se toma el recíproco.`}\n${A}^${B} = ${v}.\nComprobación: si el exponente es 0, cualquier base distinta de 0 da 1.`; } },
  { name: 'Raíz', idea: 'La raíz de índice n deshace la potencia n.', fields: [{ name: 'índice', kind: 'num' }, { name: 'radicando', kind: 'num' }], run: ([n, a]) => `raíz ${n} de ${a} = ${Math.sign(Number(a)) * Math.abs(Number(a)) ** (1 / Number(n))}` },
  { name: 'MCD', idea: 'El máximo común divisor es el mayor entero que divide a los dos. Euclides: MCD(a, b) = MCD(b, a mod b).', fields: [{ name: 'a', kind: 'num' }, { name: 'b', kind: 'num' }], run: ([a, b]) => { let x = Math.abs(Math.round(Number(a))); let y = Math.abs(Math.round(Number(b))); const steps = [`MCD(${x}, ${y})`]; while (y) { steps.push(`${x} = ${Math.floor(x / y)}·${y} + ${x % y}`); const t = y; y = x % y; x = t; } return `${steps.join('\n')}\nMCD = ${x}`; } },
  { name: 'MCM', idea: 'MCM(a, b) = |a·b| / MCD(a, b).', fields: [{ name: 'a', kind: 'num' }, { name: 'b', kind: 'num' }], run: ([a, b]) => { const g = gcd(Number(a), Number(b)); return `MCD = ${g}\nMCM = |${a}·${b}| / ${g} = ${Math.abs(Number(a) * Number(b)) / g}`; } },
  { name: 'Factorial', idea: 'n! = 1·2·3·…·n. 0! vale 1.', fields: [{ name: 'n', kind: 'num' }], run: ([n]) => { const k = Math.round(Number(n)); if (k < 0 || k > 20) return 'Usa un entero entre 0 y 20.'; let r = 1; const steps = []; for (let i = 2; i <= k; i++) { r *= i; steps.push(`${i} → ${r}`); } return (steps.join('\n') || '0! o 1! = 1') + `\n${k}! = ${r}`; } },
  { name: 'Combinaciones', idea: 'nCr cuenta grupos sin importar el orden: n! / (r!(n−r)!).', fields: [{ name: 'n', kind: 'num' }, { name: 'r', kind: 'num' }], run: ([n, r]) => { const N = Math.round(Number(n)); const R = Math.round(Number(r)); if (R < 0 || N < R) return 'r tiene que estar entre 0 y n.'; let c = 1; for (let i = 1; i <= R; i++) c = c * (N - R + i) / i; return `Se multiplica ${N}·${N - 1}·… y se divide entre r!.\nnCr = ${c}`; } },
  { name: 'Promedio', idea: 'La media aritmética es la suma dividida entre cuántos datos hay.', fields: [{ name: 'suma', kind: 'num' }, { name: 'cantidad', kind: 'num' }], run: ([s, n]) => `media = ${s} / ${n} = ${Number(s) / Number(n)}` },
  { name: 'Interés simple', idea: 'I = C · r · t, con r en tanto por uno. Aquí la tasa se escribe en porcentaje.', fields: [{ name: 'capital', kind: 'num' }, { name: 'tasa %', kind: 'num' }, { name: 'años', kind: 'num' }], run: ([c, r, t]) => `I = ${c} × (${r}/100) × ${t} = ${(Number(c) * Number(r) * Number(t)) / 100}` },
  { name: 'Descuento', idea: 'Un descuento quita un porcentaje del precio. El precio final es el original menos esa parte.', fields: [{ name: 'precio', kind: 'num' }, { name: '% off', kind: 'num' }], run: ([p, d]) => { const off = (Number(p) * Number(d)) / 100; return `Se calcula el ${d}% de ${p}: ${off}.\nSe resta del precio.\nFinal = ${p} − ${off} = ${Number(p) - off}`; } },
  { name: 'Aumento', idea: 'Un aumento suma un porcentaje. Final = cantidad · (1 + tasa/100).', fields: [{ name: 'cantidad', kind: 'num' }, { name: '%', kind: 'num' }], run: ([a, p]) => `Factor = 1 + ${p}/100 = ${1 + Number(p) / 100}\nFinal = ${a} · ese factor = ${Number(a) * (1 + Number(p) / 100)}` },
  { name: 'División', idea: 'Dividir es repartir. El cociente dice cuántas veces cabe el divisor; el resto es lo que sobra.', fields: [{ name: 'dividendo', kind: 'num' }, { name: 'divisor', kind: 'num' }], run: ([a, b]) => { const A = Number(a); const B = Number(b); if (!B) return 'No se puede dividir entre 0.'; const q = Math.trunc(A / B); return `${A} = ${q} · ${B} + ${A - q * B}\nCociente = ${A / B}\nResto = ${A % B}`; } },
  { name: 'Proporción', idea: 'a/b = c/d. Si falta un extremo, se cruzan los productos: a·d = b·c.', fields: [{ name: 'a', kind: 'num' }, { name: 'b', kind: 'num' }, { name: 'c', kind: 'num' }], run: ([a, b, c]) => `d = b·c / a, despejando el cuarto término.\n${b} · ${c} / ${a} = ${(Number(b) * Number(c)) / Number(a)}` },
  { name: 'Sucesión aritmética', idea: 'Cada término suma una diferencia constante: aₙ = a₁ + (n−1)d.', fields: [{ name: 'a1', kind: 'num' }, { name: 'd', kind: 'num' }, { name: 'n', kind: 'num' }], run: ([a, d, n]) => { const an = Number(a) + (Number(n) - 1) * Number(d); const s = (Number(n) / 2) * (Number(a) + an); return `aₙ = ${a} + (${n}−1)·${d} = ${an}\nSuma de los n términos = n/2 · (primero + último) = ${s}`; } },
  { name: 'Sucesión geométrica', idea: 'Cada término se multiplica por una razón: aₙ = a₁ · rⁿ⁻¹.', fields: [{ name: 'a1', kind: 'num' }, { name: 'razón', kind: 'num' }, { name: 'n', kind: 'num' }], run: ([a, r, n]) => { const an = Number(a) * Number(r) ** (Number(n) - 1); return `aₙ = ${a} · ${r}^${Number(n) - 1} = ${an}`; } },
  { name: 'Valor absoluto', idea: 'El valor absoluto es la distancia al cero. Quita el signo.', fields: [{ name: 'número', kind: 'num' }], run: ([a]) => `|${a}| = ${Math.abs(Number(a))}\nEn la recta, esa es la distancia de ${a} hasta 0.` },
  { name: 'Parte de un total', idea: 'Si una parte vale p y el total es t, el porcentaje es 100·p/t.', fields: [{ name: 'parte', kind: 'num' }, { name: 'total', kind: 'num' }], run: ([p, t]) => { const P = Number(p); const T = Number(t); if (!T) return 'El total no puede ser 0.'; return `1. Se divide la parte entre el total: ${P}/${T} = ${P / T}.\n2. Se multiplica por 100 para pasarlo a porcentaje.\n   (${P}/${T}) · 100 = ${(P / T) * 100}%.\nEso dice qué fracción del total representa la parte.`; } },
  { name: 'Redondeo', idea: 'Redondear a n decimales mira el siguiente dígito: 5 o más sube, menos se queda.', fields: [{ name: 'número', kind: 'num' }, { name: 'decimales', kind: 'num' }], run: ([a, d]) => { const n = Number(a); const k = Math.max(0, Math.round(Number(d))); const f = 10 ** k; const r = Math.round(n * f) / f; return `1. Se multiplica por 10^${k} = ${f}: ${n * f}.\n2. Se redondea al entero más cercano: ${Math.round(n * f)}.\n3. Se divide entre ${f}.\nResultado = ${r}`; } },
];
const TRIG: LabItem[] = [
  { name: 'Ley de senos', idea: 'En cualquier triángulo, a/sen A = b/sen B = c/sen C. El lado más grande queda frente al ángulo más grande.', fields: [{ name: 'lado a', kind: 'num' }, { name: 'A°', kind: 'num' }, { name: 'B°', kind: 'num' }], run: ([a, A, B]) => { const rad = (n: string) => (Number(n) * Math.PI) / 180; const sA = Math.sin(rad(A)); const sB = Math.sin(rad(B)); if (Math.abs(sA) < 1e-10) return 'sen A es 0: no se puede dividir. Revisa el ángulo.'; const b = (Number(a) * sB) / sA; return `1. Se pasan los ángulos a la razón del seno.\n   sen(${A}°) = ${sA.toFixed(6)}\n   sen(${B}°) = ${sB.toFixed(6)}\n2. De a/sen A = b/sen B se despeja b.\n   b = a · sen B / sen A\n3. b = ${a} · ${sB.toFixed(6)} / ${sA.toFixed(6)} = ${b.toFixed(6)}\nEl lado b queda frente al ángulo B.`; } },
  { name: 'Ley de cosenos', idea: 'Generaliza a Pitágoras: a² = b² + c² − 2bc cos A. Si A = 90°, el coseno es 0 y queda Pitágoras.', fields: [{ name: 'b', kind: 'num' }, { name: 'c', kind: 'num' }, { name: 'A°', kind: 'num' }], run: ([b, c, A]) => { const rad = (Number(A) * Math.PI) / 180; const cos = Math.cos(rad); const a2 = Number(b) ** 2 + Number(c) ** 2 - 2 * Number(b) * Number(c) * cos; return `1. cos(${A}°) = ${cos.toFixed(6)}.\n2. Se sustituye en a² = b² + c² − 2bc cos A.\n   b² = ${Number(b) ** 2}\n   c² = ${Number(c) ** 2}\n   2bc cos A = ${(2 * Number(b) * Number(c) * cos).toFixed(6)}\n3. a² = ${a2.toFixed(6)}.\n4. a = √(a²) = ${Math.sqrt(Math.max(0, a2)).toFixed(6)}.\nSi el ángulo es obtuso, el coseno es negativo y el lado a sale más grande que en un triángulo rectángulo.`; } },
  { name: 'Área con sen', idea: 'Área = (1/2)·b·c·sen A. El seno trae la altura.', fields: [{ name: 'b', kind: 'num' }, { name: 'c', kind: 'num' }, { name: 'A°', kind: 'num' }], run: ([b, c, A]) => `Área = ½ · ${b} · ${c} · sen(${A}°) = ${(Number(b) * Number(c) * Math.sin((Number(A) * Math.PI) / 180)) / 2}` },
  { name: 'Ángulo doble', idea: 'sen(2θ) = 2 sen θ cos θ. cos(2θ) = cos²θ − sen²θ.', fields: [{ name: 'θ°', kind: 'num' }], run: ([t]) => { const r = (Number(t) * Math.PI) / 180; return `sen(2θ) = ${Math.sin(2 * r)}\ncos(2θ) = ${Math.cos(2 * r)}`; } },
  { name: 'Identidad', idea: 'sen²θ + cos²θ = 1. Sirve para despejar una razón si conoces la otra.', fields: [{ name: 'sen θ', kind: 'num' }], run: ([s]) => { const v = Number(s); if (Math.abs(v) > 1) return 'El seno está entre −1 y 1.'; const c = Math.sqrt(1 - v * v); return `cos²θ = 1 − sen²θ = 1 − ${v * v} = ${1 - v * v}\ncos θ = ±${c}`; } },
  { name: 'Longitud de arco', idea: 'Si el ángulo está en radianes, la longitud es radio por ángulo.', fields: [{ name: 'radio', kind: 'num' }, { name: 'grados', kind: 'num' }], run: ([r, d]) => { const rad = (Number(d) * Math.PI) / 180; return `θ = ${d}° = ${rad} rad\nL = rθ = ${Number(r) * rad}`; } },
  { name: 'Sector', idea: 'El área del sector es la fracción del círculo que marca el ángulo.', fields: [{ name: 'radio', kind: 'num' }, { name: 'grados', kind: 'num' }], run: ([r, d]) => `Área = (θ/360) · π r² = ${(Number(d) / 360) * Math.PI * Number(r) ** 2}` },
  { name: 'A grados', idea: '180° equivalen a π radianes.', fields: [{ name: 'radianes', kind: 'num' }], run: ([r]) => `${r} rad · 180/π = ${(Number(r) * 180) / Math.PI}°` },
  { name: 'A radianes', idea: 'Se multiplica los grados por π/180.', fields: [{ name: 'grados', kind: 'num' }], run: ([d]) => `${d}° · π/180 = ${(Number(d) * Math.PI) / 180} rad` },
  { name: 'Tangente', idea: 'tan θ = sen θ / cos θ. No existe cuando el coseno es 0.', fields: [{ name: 'θ°', kind: 'num' }], run: ([t]) => { const r = (Number(t) * Math.PI) / 180; const c = Math.cos(r); if (Math.abs(c) < 1e-10) return 'El coseno es 0: la tangente no está definida.'; return `sen = ${Math.sin(r)}\ncos = ${c}\ntan = sen/cos = ${Math.sin(r) / c}`; } },
  { name: 'Ángulo mitad', idea: 'sen(θ/2) = ±√((1−cos θ)/2). El signo depende del cuadrante.', fields: [{ name: 'θ°', kind: 'num' }], run: ([t]) => { const r = (Number(t) * Math.PI) / 180; return `cos θ = ${Math.cos(r)}\nsen(θ/2) = ${Math.sin(r / 2)}\ncos(θ/2) = ${Math.cos(r / 2)}`; } },
  { name: 'Complementarios', idea: 'Dos ángulos son complementarios si suman 90°. sen θ = cos(90°−θ).', fields: [{ name: 'θ°', kind: 'num' }], run: ([t]) => { const a = Number(t); const b = 90 - a; return `Complemento = 90 − ${a} = ${b}°\nsen(${a}°) = ${Math.sin((a * Math.PI) / 180)}\ncos(${b}°) = ${Math.cos((b * Math.PI) / 180)}`; } },
  { name: 'Polares', idea: 'x = r cos θ, y = r sen θ. El radio es la distancia al origen.', fields: [{ name: 'r', kind: 'num' }, { name: 'θ°', kind: 'num' }], run: ([r, t]) => { const a = (Number(t) * Math.PI) / 180; return `x = ${r}·cos(${t}°) = ${Number(r) * Math.cos(a)}\ny = ${r}·sen(${t}°) = ${Number(r) * Math.sin(a)}`; } },
  { name: 'Proyección', idea: 'La componente de un lado sobre otro es |u| cos θ.', fields: [{ name: 'módulo', kind: 'num' }, { name: 'θ°', kind: 'num' }], run: ([m, t]) => `Proyección = ${m} · cos(${t}°) = ${Number(m) * Math.cos((Number(t) * Math.PI) / 180)}` },
  { name: 'Herón', idea: 'Con los tres lados se calcula el semiperímetro s y el área √(s(s−a)(s−b)(s−c)).', fields: [{ name: 'a', kind: 'num' }, { name: 'b', kind: 'num' }, { name: 'c', kind: 'num' }], run: ([a, b, c]) => { const A = Number(a); const B = Number(b); const C = Number(c); const s = (A + B + C) / 2; const k = s * (s - A) * (s - B) * (s - C); if (k < 0) return 'Esos lados no forman un triángulo.'; return `s = (${A}+${B}+${C})/2 = ${s}\nÁrea = √(${k}) = ${Math.sqrt(k)}`; } },
  { name: 'Ley de tangentes', idea: '(a−b)/(a+b) = tan((A−B)/2) / tan((A+B)/2). Sirve cuando se conocen dos lados y el ángulo incluido no basta.', fields: [{ name: 'lado a', kind: 'num' }, { name: 'lado b', kind: 'num' }, { name: 'A°', kind: 'num' }, { name: 'B°', kind: 'num' }], run: ([a, b, A, B]) => { const left = (Number(a) - Number(b)) / (Number(a) + Number(b)); const right = Math.tan(((Number(A) - Number(B)) * Math.PI) / 360) / Math.tan(((Number(A) + Number(B)) * Math.PI) / 360); return `Lado izquierdo (a−b)/(a+b) = ${left}\nLado derecho tan((A−B)/2)/tan((A+B)/2) = ${right}\n${Math.abs(left - right) < 0.02 ? 'Coinciden: los datos cumplen la ley.' : 'No coinciden: revisa lados y ángulos.'}`; } },
];
const GEOM: LabItem[] = [
  { name: 'Pitágoras', idea: 'En un triángulo rectángulo, el cuadrado de la hipotenusa es la suma de los cuadrados de los catetos.', fields: [{ name: 'a', kind: 'num' }, { name: 'b', kind: 'num' }], run: ([a, b]) => { const A = Number(a); const B = Number(b); const c = Math.hypot(A, B); return `Los catetos son ${A} y ${B}. La hipotenusa es el lado de enfrente del ángulo recto.\n1. Se eleva cada cateto al cuadrado.\n   ${A}² = ${A * A}\n   ${B}² = ${B * B}\n2. Se suman: ${A * A} + ${B * B} = ${A * A + B * B}.\n3. La hipotenusa es la raíz de esa suma.\n   c = √${A * A + B * B} = ${c.toFixed(6)}.\nComprobación: c² debe coincidir con a² + b².`; } },
  { name: 'Círculo', idea: 'Área = πr². Perímetro = 2πr. El radio va del centro al borde; el diámetro es el doble.', fields: [{ name: 'radio', kind: 'num' }], run: ([r]) => { const R = Number(r); const area = Math.PI * R * R; const peri = 2 * Math.PI * R; return `Radio = ${R}. Diámetro = ${2 * R}.\nÁrea: se multiplica π por el radio al cuadrado.\n   r² = ${R * R}\n   π · r² ≈ ${area.toFixed(6)}\nPerímetro: la circunferencia es el diámetro por π, o 2πr.\n   2 · π · ${R} ≈ ${peri.toFixed(6)}\nSi duplicas el radio, el área se multiplica por 4 y el perímetro por 2.`; } },
  { name: 'Rectángulo', idea: 'Área = base · altura. Perímetro = 2(base + altura).', fields: [{ name: 'base', kind: 'num' }, { name: 'altura', kind: 'num' }], run: ([b, h]) => `Área = ${b}·${h} = ${Number(b) * Number(h)}\nPerímetro = 2(${b}+${h}) = ${2 * (Number(b) + Number(h))}` },
  { name: 'Triángulo', idea: 'El área es la mitad del rectángulo que lo contiene: (base·altura)/2.', fields: [{ name: 'base', kind: 'num' }, { name: 'altura', kind: 'num' }], run: ([b, h]) => `Área = (${b}·${h})/2 = ${(Number(b) * Number(h)) / 2}` },
  { name: 'Trapecio', idea: 'Se promedian las dos bases y se multiplica por la altura.', fields: [{ name: 'base mayor', kind: 'num' }, { name: 'base menor', kind: 'num' }, { name: 'altura', kind: 'num' }], run: ([B, b, h]) => `Área = (${B}+${b})/2 · ${h} = ${((Number(B) + Number(b)) / 2) * Number(h)}` },
  { name: 'Rombo', idea: 'El área es la mitad del producto de las diagonales.', fields: [{ name: 'diagonal 1', kind: 'num' }, { name: 'diagonal 2', kind: 'num' }], run: ([d1, d2]) => `Área = (${d1}·${d2})/2 = ${(Number(d1) * Number(d2)) / 2}` },
  { name: 'Polígono regular', idea: 'Área = (perímetro · apotema) / 2.', fields: [{ name: 'lados', kind: 'num' }, { name: 'lado', kind: 'num' }, { name: 'apotema', kind: 'num' }], run: ([n, l, ap]) => { const p = Number(n) * Number(l); return `Perímetro = ${n}·${l} = ${p}\nÁrea = (${p}·${ap})/2 = ${(p * Number(ap)) / 2}`; } },
  { name: 'Cubo', idea: 'Volumen = arista³. Área total = 6 aristas².', fields: [{ name: 'arista', kind: 'num' }], run: ([a]) => `Volumen = ${a}³ = ${Number(a) ** 3}\nÁrea = 6·${a}² = ${6 * Number(a) ** 2}` },
  { name: 'Prisma', idea: 'Volumen = área de la base por la altura.', fields: [{ name: 'área base', kind: 'num' }, { name: 'altura', kind: 'num' }], run: ([b, h]) => `V = ${b} · ${h} = ${Number(b) * Number(h)}` },
  { name: 'Cilindro', idea: 'La base es un círculo. Volumen = πr²h. Área lateral = 2πrh.', fields: [{ name: 'radio', kind: 'num' }, { name: 'altura', kind: 'num' }], run: ([r, h]) => `V = π·${r}²·${h} = ${Math.PI * Number(r) ** 2 * Number(h)}\nLateral = 2π·${r}·${h} = ${2 * Math.PI * Number(r) * Number(h)}` },
  { name: 'Cono', idea: 'El cono ocupa un tercio del cilindro con la misma base y altura.', fields: [{ name: 'radio', kind: 'num' }, { name: 'altura', kind: 'num' }], run: ([r, h]) => `V = (1/3)πr²h = ${(Math.PI * Number(r) ** 2 * Number(h)) / 3}` },
  { name: 'Esfera', idea: 'Volumen = (4/3)πr³. Área = 4πr².', fields: [{ name: 'radio', kind: 'num' }], run: ([r]) => `V = (4/3)π·${r}³ = ${((4 / 3) * Math.PI * Number(r) ** 3).toFixed(4)}\nÁrea = 4π·${r}² = ${(4 * Math.PI * Number(r) ** 2).toFixed(4)}` },
  { name: 'Pirámide', idea: 'Igual que el cono: un tercio de base por altura.', fields: [{ name: 'área base', kind: 'num' }, { name: 'altura', kind: 'num' }], run: ([b, h]) => `V = (1/3)·${b}·${h} = ${(Number(b) * Number(h)) / 3}` },
  { name: 'Paralelogramo', idea: 'Área = base · altura. La altura es perpendicular a la base, no el lado inclinado.', fields: [{ name: 'base', kind: 'num' }, { name: 'altura', kind: 'num' }], run: ([b, h]) => `Área = ${b} · ${h} = ${Number(b) * Number(h)}` },
  { name: 'Elipse', idea: 'Área = π · a · b, con a y b los semiejes.', fields: [{ name: 'semieje a', kind: 'num' }, { name: 'semieje b', kind: 'num' }], run: ([a, b]) => `Área = π · ${a} · ${b} = ${Math.PI * Number(a) * Number(b)}` },
  { name: 'Anillo', idea: 'El área de la corona es el círculo grande menos el pequeño: π(R² − r²).', fields: [{ name: 'R', kind: 'num' }, { name: 'r', kind: 'num' }], run: ([R, r]) => `π(${R}² − ${r}²) = ${Math.PI * (Number(R) ** 2 - Number(r) ** 2)}` },
  { name: 'Ortoedro', idea: 'Caja rectangular. Volumen = largo · ancho · alto. Diagonal = √(l²+a²+h²).', fields: [{ name: 'largo', kind: 'num' }, { name: 'ancho', kind: 'num' }, { name: 'alto', kind: 'num' }], run: ([l, a, h]) => `V = ${l}·${a}·${h} = ${Number(l) * Number(a) * Number(h)}\nDiagonal = √(${l}²+${a}²+${h}²) = ${Math.hypot(Number(l), Number(a), Number(h))}` },
  { name: 'Semiesfera', idea: 'La mitad de la esfera. Volumen = (2/3)πr³. Área curva = 2πr².', fields: [{ name: 'radio', kind: 'num' }], run: ([r]) => `V = (2/3)π·${r}³ = ${((2 / 3) * Math.PI * Number(r) ** 3).toFixed(4)}\nÁrea curva = 2π·${r}² = ${(2 * Math.PI * Number(r) ** 2).toFixed(4)}` },
  { name: 'Distancia', idea: 'Entre dos puntos, √((x2−x1)² + (y2−y1)²). Es Pitágoras en el plano.', fields: [{ name: 'x1', kind: 'num' }, { name: 'y1', kind: 'num' }, { name: 'x2', kind: 'num' }, { name: 'y2', kind: 'num' }], run: ([x1, y1, x2, y2]) => { const dx = Number(x2) - Number(x1); const dy = Number(y2) - Number(y1); return `Δx = ${dx}, Δy = ${dy}\n√(${dx}² + ${dy}²) = ${Math.hypot(dx, dy)}`; } },
  { name: 'Punto medio', idea: 'El punto medio promedia las coordenadas.', fields: [{ name: 'x1', kind: 'num' }, { name: 'y1', kind: 'num' }, { name: 'x2', kind: 'num' }, { name: 'y2', kind: 'num' }], run: ([x1, y1, x2, y2]) => `M = ((${x1}+${x2})/2, (${y1}+${y2})/2) = (${(Number(x1) + Number(x2)) / 2}, ${(Number(y1) + Number(y2)) / 2})` },
  { name: 'Pendiente', idea: 'm = (y2 − y1) / (x2 − x1). Positiva sube, negativa baja.', fields: [{ name: 'x1', kind: 'num' }, { name: 'y1', kind: 'num' }, { name: 'x2', kind: 'num' }, { name: 'y2', kind: 'num' }], run: ([x1, y1, x2, y2]) => { const dx = Number(x2) - Number(x1); if (!dx) return 'La recta es vertical: la pendiente no está definida.'; const m = (Number(y2) - Number(y1)) / dx; return `m = (${y2} − ${y1}) / (${x2} − ${x1}) = ${m}`; } },
  { name: 'Hexágono', idea: 'Un hexágono regular se parte en 6 triángulos equiláteros. Área = (3√3/2)·lado².', fields: [{ name: 'lado', kind: 'num' }], run: ([l]) => { const L = Number(l); const area = (3 * Math.sqrt(3) / 2) * L * L; return `1. El hexágono regular tiene 6 lados iguales.\n2. Área = (3√3 / 2) · lado².\n   lado² = ${L * L}\n   3√3/2 ≈ ${(3 * Math.sqrt(3) / 2).toFixed(6)}\n3. Área = ${area.toFixed(6)}\nPerímetro = 6 · ${L} = ${6 * L}`; } },
  { name: 'Tronco de cono', idea: 'Volumen = (1/3)πh(R² + Rr + r²). Es un cono al que se le quitó la punta.', fields: [{ name: 'R', kind: 'num' }, { name: 'r', kind: 'num' }, { name: 'altura', kind: 'num' }], run: ([R, r, h]) => { const v = (Math.PI * Number(h) * (Number(R) ** 2 + Number(R) * Number(r) + Number(r) ** 2)) / 3; return `R² = ${Number(R) ** 2}\nRr = ${Number(R) * Number(r)}\nr² = ${Number(r) ** 2}\nV = (1/3)πh(R²+Rr+r²) = ${v}`; } },
];
const FUNCS: LabItem[] = [
  { name: 'Derivada', idea: 'La derivada mide la pendiente instantánea. Aquí se deriva término a término: potencias, seno, coseno, exp y ln.', fields: [{ name: 'f(x)', kind: 'expr' }], run: ([f]) => diffText(f) },
  { name: 'Integral', idea: 'La integral indefinida es la antiderivada. Se integra cada término y se suma C.', fields: [{ name: 'f(x)', kind: 'expr' }], run: ([f]) => intText(f) },
  { name: 'Valor', idea: 'Sustituye x en la función y evalúa.', fields: [{ name: 'f(x)', kind: 'expr' }, { name: 'x', kind: 'num' }], run: ([f, x]) => { try { const y = evalExpr(f, { x: Number(x) }, false); return `Se reemplaza x por ${x}.\nf(${x}) = ${y}`; } catch (e) { return e instanceof Error ? e.message : 'No se pudo evaluar.'; } } },
  { name: 'Pendiente numérica', idea: 'f\'(x) ≈ (f(x+h) − f(x−h)) / (2h). Con h pequeño se acerca a la derivada.', fields: [{ name: 'f(x)', kind: 'expr' }, { name: 'x', kind: 'num' }, { name: 'h', kind: 'num' }], run: ([f, x, h]) => { const xx = Number(x); const hh = Number(h) || 0.0001; try { const a = evalExpr(f, { x: xx + hh }, false); const b = evalExpr(f, { x: xx - hh }, false); return `f(${xx + hh}) = ${a}\nf(${xx - hh}) = ${b}\npendiente ≈ (${a} − ${b}) / ${2 * hh} = ${(a - b) / (2 * hh)}`; } catch (e) { return e instanceof Error ? e.message : 'error'; } } },
  { name: 'Área por trapecios', idea: 'Se parte [a, b] en n trapecios. El área aproximada es (h/2)·(y0 + 2y1 + … + yn).', fields: [{ name: 'f(x)', kind: 'expr' }, { name: 'a', kind: 'num' }, { name: 'b', kind: 'num' }, { name: 'n', kind: 'num' }], run: ([f, a, b, n]) => { const A = Number(a); const B = Number(b); const N = Math.max(1, Math.round(Number(n) || 8)); const h = (B - A) / N; let s = 0; const bits: string[] = []; try { for (let i = 0; i <= N; i++) { const y = evalExpr(f, { x: A + i * h }, false); const w = i === 0 || i === N ? 1 : 2; s += w * y; bits.push(`y${i} = ${Number(y.toPrecision(6))}`); } return `${bits.join('\n')}\nh = ${h}\nárea ≈ (h/2)·suma = ${(h / 2) * s}`; } catch (e) { return e instanceof Error ? e.message : 'error'; } } },
  { name: 'Tangente', idea: 'La recta tangente en x0 es y = f(x0) + f\'(x0)(x − x0).', fields: [{ name: 'f(x)', kind: 'expr' }, { name: 'x0', kind: 'num' }], run: ([f, x]) => { const x0 = Number(x); try { const y = evalExpr(f, { x: x0 }, false); const d = (evalExpr(f, { x: x0 + 1e-4 }, false) - evalExpr(f, { x: x0 - 1e-4 }, false)) / 2e-4; return `f(${x0}) = ${y}\nf'(${x0}) ≈ ${d}\ny = ${y} + (${d})(x − ${x0})`; } catch (e) { return e instanceof Error ? e.message : 'error'; } } },
  { name: 'Composición', idea: 'f(g(x)) se evalúa de adentro hacia afuera.', fields: [{ name: 'x', kind: 'num' }], run: ([x]) => { const v = Number(x); const inner = Math.cos(v); return `Ejemplo sin(cos(x)).\n1. cos(${v}) = ${inner}\n2. sin de ese resultado = ${Math.sin(inner)}`; } },
  { name: 'Par o impar', idea: 'Par si f(−x) = f(x). Impar si f(−x) = −f(x).', fields: [{ name: 'f(a)', kind: 'num' }, { name: 'f(-a)', kind: 'num' }], run: ([p, n]) => (Math.abs(Number(p) - Number(n)) < 1e-6 ? 'f(−a) = f(a): parece par.' : Math.abs(Number(p) + Number(n)) < 1e-6 ? 'f(−a) = −f(a): parece impar.' : 'No coincide con par ni con impar en estos dos valores.') },
  { name: 'Límite numérico', idea: 'Se evalúa la función cada vez más cerca de a, por la izquierda y por la derecha.', fields: [{ name: 'f(x)', kind: 'expr' }, { name: 'a', kind: 'num' }], run: ([f, a]) => { const A = Number(a); const steps = ['Se prueba h = 0.1, 0.01 y 0.001.']; try { for (const h of [0.1, 0.01, 0.001]) { const L = evalExpr(f, { x: A - h }, false); const R = evalExpr(f, { x: A + h }, false); steps.push(`h=${h}: f(a−h)=${Number(L.toPrecision(6))} · f(a+h)=${Number(R.toPrecision(6))}`); } return steps.join('\n'); } catch (e) { return e instanceof Error ? e.message : 'error'; } } },
  { name: 'Tabla', idea: 'Varios valores de x muestran cómo crece o decrece la función.', fields: [{ name: 'f(x)', kind: 'expr' }, { name: 'desde', kind: 'num' }, { name: 'hasta', kind: 'num' }], run: ([f, a, b]) => { const A = Number(a); const B = Number(b); const lines = ['x    f(x)']; try { for (let i = 0; i <= 6; i++) { const x = A + ((B - A) * i) / 6; const y = evalExpr(f, { x }, false); lines.push(`${Number(x.toPrecision(4))}    ${Number(y.toPrecision(6))}`); } return lines.join('\n'); } catch (e) { return e instanceof Error ? e.message : 'error'; } } },
  { name: 'Segunda derivada', idea: 'f\'\'(x) dice la concavidad. Se aproxima derivando dos veces con diferencias finitas.', fields: [{ name: 'f(x)', kind: 'expr' }, { name: 'x', kind: 'num' }], run: ([f, x]) => { const x0 = Number(x); const h = 1e-3; try { const y1 = evalExpr(f, { x: x0 + h }, false); const y0 = evalExpr(f, { x: x0 }, false); const y2 = evalExpr(f, { x: x0 - h }, false); const d2 = (y1 - 2 * y0 + y2) / (h * h); return `f(${x0}+h)=${y1}\nf(${x0})=${y0}\nf(${x0}−h)=${y2}\nf'' ≈ (f(x+h) − 2f(x) + f(x−h)) / h² = ${d2}\n${d2 > 0 ? 'Positiva: cóncava hacia arriba.' : d2 < 0 ? 'Negativa: cóncava hacia abajo.' : 'Casi cero: posible punto de inflexión.'}`; } catch (e) { return e instanceof Error ? e.message : 'error'; } } },
  { name: 'Ceros', idea: 'Se busca un cambio de signo en [a, b] y se parte el intervalo (bisección).', fields: [{ name: 'f(x)', kind: 'expr' }, { name: 'a', kind: 'num' }, { name: 'b', kind: 'num' }], run: ([f, a, b]) => { let A = Number(a); let B = Number(b); try { let fa = evalExpr(f, { x: A }, false); let fb = evalExpr(f, { x: B }, false); if (fa * fb > 0) return 'No hay cambio de signo en ese intervalo. Prueba otros extremos.'; const steps = [`f(${A})=${fa}`, `f(${B})=${fb}`]; for (let k = 0; k < 48; k++) { const m = (A + B) / 2; const fm = evalExpr(f, { x: m }, false); if(k<10 || k===47)steps.push(`medio ${m}: f=${Number(fm.toPrecision(6))}`); if(Math.abs(fm)<1e-12){A=m;B=m;break;} if (fa * fm <= 0) { B = m; fb = fm; } else { A = m; fa = fm; } } return `${steps.join('\n')}\nRaíz aproximada = ${(A + B) / 2}`; } catch (e) { return e instanceof Error ? e.message : 'error'; } } },
  { name: 'Secante', idea: 'La pendiente entre dos puntos de la curva es (f(b)−f(a))/(b−a). Es la recta que corta la gráfica en a y en b.', fields: [{ name: 'f(x)', kind: 'expr' }, { name: 'a', kind: 'num' }, { name: 'b', kind: 'num' }], run: ([f, a, b]) => { const A = Number(a); const B = Number(b); if (A === B) return 'a y b tienen que ser distintos.'; try { const fa = evalExpr(f, { x: A }, false); const fb = evalExpr(f, { x: B }, false); const m = (fb - fa) / (B - A); return `f(${A}) = ${fa}\nf(${B}) = ${fb}\nPendiente = (${fb} − ${fa}) / (${B} − ${A}) = ${m}\nRecta: y = ${fa} + (${m})(x − ${A})`; } catch (e) { return e instanceof Error ? e.message : 'error'; } } },
  { name: 'Valor medio', idea: 'El valor medio de f en [a, b] es el área bajo la curva dividida entre el ancho del intervalo.', fields: [{ name: 'f(x)', kind: 'expr' }, { name: 'a', kind: 'num' }, { name: 'b', kind: 'num' }], run: ([f, a, b]) => { const A = Number(a); const B = Number(b); const N = 256; const h = (B - A) / N; let s = 0; try { for (let i = 0; i <= N; i++) { const y = evalExpr(f, { x: A + i * h }, false); s += (i === 0 || i === N ? 1 : 2) * y; } const area = (h / 2) * s; return `Área aproximada por trapecios = ${area}\nAncho = ${B - A}\nValor medio = área / ancho = ${area / (B - A)}`; } catch (e) { return e instanceof Error ? e.message : 'error'; } } },
];

function FormulaLab({ title, items }: { title: string; items: LabItem[] }) {
  const [selection,setSelection]=useWorkspaceState(`lab-${title}-selection`,items[0].name);
  const pick=items.find(item=>item.name===selection)||items[0];
  const setPick=(item:LabItem)=>setSelection(item.name);
  const [search,setSearch]=useState('');
  const [vals, setVals] = useWorkspaceState<string[]>(`lab-${title}-values`,items[0].fields.map(() => ''));
  const [out, setOut] = useState('');
  const [focus, setFocus] = useState(0);
  const exprKeys = ['7', '8', '9', '+', 'sin(', '4', '5', '6', '−', 'cos(', '1', '2', '3', '*', 'tan(', '0', '.', 'x', '/', 'exp(', '(', ')', '^', 'ln(', 'π', '⌫'];
  const numKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '−', '0', '.', '⌫'];
  const keys = pick.fields.some((f) => f.kind === 'expr') ? exprKeys : numKeys;
  const write = (token: string) => {
    setVals((list) => list.map((v, i) => {
      if (i !== focus) return v;
      if (token === '⌫') return v.slice(0, -1);
      return v + (token === '−' ? '-' : token);
    }));
  };
  return (
    <section className="studio">
      <input className="ma-formula-search" aria-label="Buscar fórmula" type="search" value={search} onChange={event=>{setSearch(event.target.value);const catalog=event.currentTarget.parentElement?.querySelector('details');if(catalog)catalog.open=true;}} placeholder="Buscar una fórmula u operación…" />
      <details className="formula-catalog"><summary>Fórmulas y métodos <span>{pick.name}</span></summary><div className="cards">
        {items.filter(item=>`${item.name} ${item.idea}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).map((item) => <button key={item.name} type="button" className={pick.name === item.name ? 'on' : ''} onClick={() => { setPick(item); setVals(item.fields.map(() => '')); setOut(''); setFocus(0); }}>{item.name}</button>)}
      </div></details>
      <h3 className="formula-title">{pick.name}</h3><p className="idea">{pick.idea}</p>
      <div className="lab">
        {pick.fields.map((field, i) => (
          <label key={field.name}>{field.name}<input value={vals[i] || ''} onFocus={() => setFocus(i)} onChange={(e) => setVals((list) => list.map((v, k) => (k === i ? e.target.value : v)))} /></label>
        ))}
        <button type="button" className="create" onClick={() => {
          if (pick.fields.some((f, i) => f.kind === 'num' && (!(vals[i]||'').trim() || !Number.isFinite(Number(vals[i].replace(',','.')))))) { setOut('Completa los datos numéricos.'); return; }
          if (pick.fields.some((f, i) => f.kind === 'expr' && !(vals[i] || '').trim())) { setOut('Escribe la función.'); return; }
          setOut((() => {
            let raw:string;
            try { raw=pick.run(vals.map((value,index)=>pick.fields[index]?.kind==='num'?value.trim().replace(',','.'):value)); }
            catch(problem) { return problem instanceof Error?problem.message:'No se pudo calcular. Revisa los datos.'; }
            if(/\b(?:NaN|Infinity)\b/.test(raw))return 'Los datos producen un resultado fuera del dominio. Revisa denominadores, longitudes, raíces e intervalos.';
            if (raw.startsWith('§')) return raw;
            const last = raw.split('\n').map((s) => s.trim()).filter(Boolean).slice(-1)[0] || raw;
            return sheet(pick.name, [
              ['Qué significa', pick.idea],
              ['Datos', pick.fields.map((f, i) => `${f.name}: ${vals[i] || '—'}`).join('\n')],
              ['Cómo se hizo', raw],
              ['Resultado', last],
              ['Para recordar', title==='Funciones'?'Las funciones de cálculo usan radianes. Los métodos numéricos son aproximaciones: revisa el dominio, la continuidad y el intervalo.':title==='Trigonometría'?'Los ángulos de este laboratorio se expresan en grados. Comprueba que los lados son positivos y que los argumentos de seno y coseno inversos estén entre −1 y 1.':'Comprueba las unidades y el signo del resultado. El área usa unidades cuadradas; el volumen, cúbicas. Un porcentaje p equivale a p/100; ningún denominador puede ser cero.'],
            ]);
          })());
        }}>Calcular</button>
      </div>
      {keys.length > 0 && (
        <details className="formula-keyboard"><summary>Teclado matemático</summary><div className="eqpad">{keys.map((k) => <button key={k} type="button" className={'−+*/=⌫'.includes(k) ? 'op' : 'num'} onClick={() => write(k)}>{k}</button>)}</div></details>
      )}
      {out && <ResultCard text={out} />}
    </section>
  );
}


const CSS = `
.ma{height:100dvh;display:flex;flex-direction:column;color:#f6f6f8;font-family:var(--font-main,system-ui,sans-serif);background:#07070c url('/images/backgrounds/FMA.png') center/cover no-repeat fixed;overflow:hidden}
.ma::before{content:'';position:fixed;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.62),rgba(0,0,0,.46) 42%,rgba(0,0,0,.72))}
.head,.calc,.graph,.studio{position:relative;z-index:1}
.head{height:52px;flex:0 0 52px;display:flex;align-items:center;gap:8px;padding:0 10px;background:rgba(8,8,10,.82);border-bottom:1px solid rgba(255,26,26,.4);z-index:50;backdrop-filter:blur(10px)}
.head h1{flex:1;margin:0;font-size:.84rem;letter-spacing:.14em;text-transform:uppercase;color:#ff2a2a}
.icon,.chip{border:1px solid #2a2a32;color:#f4f4f8;cursor:pointer;background:linear-gradient(180deg,#2c2c34,#121216)}
.icon{width:36px;height:36px;border-radius:10px}
.chip{border-radius:999px;padding:7px 12px;font-size:.74rem;font-weight:700}
.chip.on{background:linear-gradient(180deg,#ff3b3b,#9f1230);border-color:#ff8a8a}
.menu-wrap{position:relative}
.drop{position:absolute;top:calc(100% + 8px);right:0;width:230px;padding:6px;border-radius:14px;background:rgba(12,12,14,.98);border:1px solid rgba(255,26,26,.45);display:flex;flex-direction:column;gap:4px;z-index:80;box-shadow:0 16px 40px rgba(0,0,0,.45)}
.drop button{text-align:left;border:0;border-radius:10px;padding:10px;background:rgba(255,255,255,.04);color:#fff;cursor:pointer}
.calc{flex:1;min-height:0;display:flex;justify-content:center;align-items:stretch;padding:8px}
.shell{width:min(520px,100%);height:100%;display:flex;flex-direction:column;gap:8px}
.readout{background:rgba(8,8,10,.84);border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:12px 14px;box-shadow:inset 0 0 0 1px rgba(255,42,42,.12)}
.expr{text-align:right;font-size:1.15rem;min-height:1.4em;word-break:break-all}
.caret{color:#f5b942}
.readout strong{display:block;text-align:right;font-size:clamp(1.7rem,4vw,2.3rem)}
.readout p,.note{margin:4px 0 0;color:#d0d0d8;font-size:.78rem;line-height:1.35}
.mem{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.mem button,.fn button{height:38px;border-radius:12px;border:1px solid #2a2a32;background:linear-gradient(180deg,#3c3c46,#222228);color:#fff;cursor:pointer;font-weight:700}
.fn{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}
.fn button{flex:0 0 auto;min-width:58px;background:linear-gradient(180deg,#24507f,#102743)}
.pad{flex:1;min-height:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(5,minmax(48px,1fr));gap:6px}
.pad button,.kb button,.ops button,.cards button,.toolbar button,.mat-tabs button,.bubble,.eq,.create,.dim button,.eqpad button,.mini-pad button,.kb-nums button,.kb-ops button,.kb-fn button{border:1px solid #2a2a32;color:#fff;cursor:pointer;border-radius:14px;font-weight:700}
.pad .num,.kb-nums .num,.mini-pad .num,.eqpad .num{background:linear-gradient(180deg,#3a3a44,#1c1c22)}
.pad .op,.kb .op,.kb-ops .op,.mini-pad .op,.eqpad .op{background:linear-gradient(180deg,#f6b24a,#c2410c);color:#1a0c04}
.pad .danger{background:linear-gradient(180deg,#b42323,#6f1218)}
.pad .warn{background:linear-gradient(180deg,#9a3412,#7c2d12)}
.eq,.create{height:52px;background:linear-gradient(180deg,#ff3b3b,#9f1230);font-size:1.25rem}
.graph{flex:1;min-height:0;display:flex;flex-direction:column;position:relative;overflow:hidden}
.toolbar{position:relative;z-index:30;background:rgba(8,8,10,.78);border-bottom:1px solid rgba(255,255,255,.08);backdrop-filter:blur(8px)}
.toolbar-row{display:flex;gap:6px;overflow-x:auto;padding:8px;align-items:center}
.toolbar button{width:42px;height:40px;flex:0 0 auto;background:linear-gradient(180deg,#24242c,#121216);color:#fff;display:grid;place-items:center;border-radius:12px}
.toolbar button.on{outline:2px solid #ff2a2a;background:linear-gradient(180deg,#3a1518,#1a0c10)}
.tool-note{margin:0 8px 8px;padding:6px 10px;color:#f2f2f6;font-size:.78rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px}
.extra{display:flex;align-items:center;gap:8px;padding:0 10px 8px;font-size:.75rem;color:#d0d0d8}
.extra input{width:88px;border-radius:8px;border:1px solid #2a2a32;background:#111;color:#fff;padding:6px 8px}
.tmenu{position:fixed;z-index:200;min-width:250px;max-height:min(380px,62vh);overflow:auto;background:rgba(12,12,14,.98);border:1px solid rgba(255,26,26,.45);border-radius:14px;padding:6px;box-shadow:0 18px 40px rgba(0,0,0,.5)}
.tmenu button{width:100%;height:auto;display:flex;gap:8px;align-items:center;text-align:left;background:transparent;border:0;color:#fff;padding:9px;border-radius:8px;cursor:pointer}
.tmenu button:hover{outline:1px solid #ff2a2a}
.tmenu b{width:22px;text-align:center;color:#ff8a8a}
.graph-body{flex:1;min-height:180px;display:grid;grid-template-columns:minmax(190px,270px) minmax(0,1fr);gap:0}
.exprs{list-style:none;margin:0;padding:8px;overflow:auto;background:rgba(8,8,10,.62);border-right:1px solid rgba(255,255,255,.08)}
.exprs li{display:flex;align-items:center;gap:4px;margin-bottom:6px}
.expr-main{flex:1;display:flex;gap:8px;align-items:center;text-align:left;background:rgba(18,18,22,.92);color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:8px 10px;cursor:pointer}
.exprs i{width:10px;height:10px;border-radius:99px;flex:0 0 auto}
.exprs li>button:last-child{border:0;background:transparent;color:#fff;cursor:pointer}
.stage{position:relative;min-height:0;min-width:0;background:radial-gradient(1200px 500px at 50% 0%,rgba(255,42,42,.08),transparent 55%)}
.stage canvas{width:100%;height:100%;touch-action:none;display:block}
.hud{position:absolute;right:12px;top:12px;display:flex;gap:8px;align-items:center;background:rgba(12,12,14,.92);padding:8px 10px;border-radius:14px;border:1px solid rgba(255,42,42,.45);box-shadow:0 10px 24px rgba(0,0,0,.35)}
.hud label{display:flex;flex-direction:column;gap:4px;font-size:.75rem}
.hud input[type=range]{width:140px;accent-color:#ff2a2a}
.hud button{border:0;border-radius:10px;padding:8px 12px;background:linear-gradient(180deg,#ff3b3b,#9f1230);color:#fff;cursor:pointer;font-weight:700}
.entry{position:absolute;left:10px;right:10px;bottom:10px;z-index:22;display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(10,10,12,.9);border:1px solid rgba(255,255,255,.1);border-radius:14px;box-shadow:0 12px 28px rgba(0,0,0,.35)}
.graph.kb-on .entry{bottom:min(42vh,304px)}
.entry input,.studio input,.cell-edit input,.lab input{flex:1;border:1px solid rgba(255,255,255,.14);background:#111116;color:#fff;border-radius:10px;padding:10px;outline:none;font-size:1rem}
.studio input.focus,.lab input:focus,.entry input:focus{outline:2px solid #ff2a2a}
.go{border-radius:999px;padding:8px 14px;background:#ff2a2a;color:#fff;border:0;cursor:pointer}
.dock{position:absolute;left:10px;right:10px;bottom:8px;z-index:24;background:rgba(8,8,12,.94);border:1px solid rgba(255,26,26,.4);border-radius:18px;padding:8px 10px 12px;max-height:min(40vh,286px);overflow:auto;box-shadow:0 18px 42px rgba(0,0,0,.5);backdrop-filter:blur(10px)}
.tabs{display:flex;gap:8px;justify-content:center;margin-bottom:8px}
.tabs button{border:1px solid #2a2a32;background:#17171c;color:#d0d0d8;cursor:pointer;padding:7px 14px;border-radius:999px;font-weight:700}
.tabs .on,.cards button.on,.bubble.on,.mat-tabs button.on{background:linear-gradient(180deg,#ff3b3b,#9f1230);color:#fff;border-color:#ff8a8a}
.kb-split{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(140px,.95fr);gap:8px;align-items:stretch}
.kb-nums{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.kb-nums button{height:56px;font-size:1.35rem}
.kb-ops{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.kb-ops button{height:52px;font-size:1.15rem}
.kb-fn{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:6px}
.kb-fn button{height:50px;background:linear-gradient(180deg,#24507f,#102743);font-size:.95rem}
.studio{flex:1;min-height:0;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:12px}
.dim-card,.picker,.modal{background:rgba(8,8,10,.88);border:1px solid rgba(255,42,42,.4);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:10px;box-shadow:0 16px 40px rgba(0,0,0,.28)}
.dim-card h2,.studio h2,.modal h3,.picker h3{margin:0;color:#ff2a2a;letter-spacing:.08em;text-transform:uppercase;font-size:.95rem}
.dim,.ops,.mat-tabs,.lab{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.dim button{width:40px;height:40px;background:#17171c}
.dim strong{min-width:1.4rem;text-align:center;font-size:1.05rem}
.bubbles{display:grid;gap:8px}
.bubble{height:68px;border-radius:18px;background:linear-gradient(180deg,#32323c,#141418);font-size:1.15rem;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
.cell-edit{display:flex;flex-direction:column;gap:8px;background:rgba(8,8,10,.84);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:8px}
.cards button,.ops button,.mat-tabs button{min-height:46px;background:linear-gradient(180deg,#2a2a32,#15151a);padding:8px 12px}
.lab{align-items:flex-end}
.lab label{display:flex;flex-direction:column;gap:4px;font-size:.78rem;color:#d0d0d8;min-width:min(160px,100%)}
.idea{margin:0;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#e6e6ee;font-size:.9rem;line-height:1.4}
.out{margin:0;padding:14px;border-radius:14px;background:#101014;border:1px solid #ff1a1a;white-space:pre-wrap;line-height:1.45;font-size:.92rem}
.result{display:flex;flex-direction:column;gap:8px}
.res-block{background:rgba(12,12,16,.92);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px 14px}
.res-block h4{margin:0 0 6px;color:#ff8a8a;font-size:.76rem;letter-spacing:.12em;text-transform:uppercase}
.res-block pre{margin:0;white-space:pre-wrap;font-family:inherit;font-size:.95rem;line-height:1.5;color:#f4f4f8}
.res-block.answer{border-color:#ff2a2a;background:linear-gradient(180deg,rgba(255,42,42,.18),rgba(12,12,16,.94))}
.res-block.answer pre{font-size:1.12rem;font-weight:700;color:#fff}
.modal-back{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.58);display:grid;place-items:center;padding:16px}
.modal{width:min(420px,92vw)}
.sys-modal{width:min(640px,94vw);max-height:min(86vh,760px);overflow:auto}
.sys-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px;border-radius:12px;background:rgba(255,255,255,.04)}
.sys-bit{display:flex;align-items:center;gap:4px}
.sys-bit b{min-width:36px;text-align:center;padding:6px 8px;border-radius:10px;background:#17171c}
.sys-bit i{font-style:normal;color:#ff8a8a}
.sys-bit .op{width:36px;height:36px;border-radius:10px}
.sys-row em{font-style:normal;color:#f5b942;font-weight:700}
.sys-row input{max-width:120px}
.exprs li>button:last-child{min-width:36px;min-height:36px;border-radius:10px;font-size:1rem}
.exp-preview{text-align:right;font-size:1.7rem;padding:8px 4px;word-break:break-all}
.exp-preview sup{color:#f5b942;font-size:.7em}
.mini-pad,.eqpad{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
.mini-pad button,.eqpad button{height:48px;font-size:1.05rem}
@media(max-width:800px){
  .graph-body{grid-template-columns:1fr;grid-template-rows:auto minmax(220px,1fr)}
  .exprs{max-height:96px;display:flex;gap:6px;border-right:0;border-bottom:1px solid rgba(255,255,255,.08)}
  .exprs li{margin:0;min-width:170px}
  .kb-split{grid-template-columns:1fr}
  .kb-nums button{height:52px;font-size:1.25rem}
  .kb-fn{grid-template-columns:repeat(auto-fill,minmax(88px,1fr))}
  .shell{width:100%}
  .head h1{font-size:.72rem;letter-spacing:.08em}
  .studio{padding:10px;gap:10px}
  .cards{grid-template-columns:repeat(auto-fill,minmax(132px,1fr))}
  .lab{flex-direction:column;align-items:stretch}
  .lab label,.lab input{width:100%;min-width:0}
  .eqpad,.mini-pad{grid-template-columns:repeat(4,minmax(0,1fr))}
  .ops button,.cards button,.mat-tabs button{min-height:48px}
  .dock{left:6px;right:6px;max-height:46vh}
  .graph.kb-on .entry{bottom:min(48vh,332px)}
  .entry{left:6px;right:6px}
  .res-block{padding:10px 12px}
  .dim{width:100%}
  .sys-row{align-items:flex-start}
  .sys-row input{max-width:none;flex:1}
  .hud{left:8px;right:8px;top:auto;bottom:8px}
  .graph.kb-on .hud{display:none}
}
@media(max-width:520px){
  .head{gap:4px;padding:0 6px}
  .chip{padding:6px 8px;font-size:.68rem}
  .cards{grid-template-columns:1fr 1fr}
  .bubble{height:58px;font-size:1rem}
  .kb-nums button{height:48px}
  .studio h2{font-size:.86rem}
  .sys-bit b{min-width:28px;padding:5px 6px}
  .mini-pad,.eqpad{grid-template-columns:repeat(4,minmax(0,1fr))}
  .exprs li>button:last-child{min-width:40px;min-height:40px}
}
`;
