export type ShotInput = {
  v0: number;
  angleDeg: number;
  y0: number;
  mass: number;
  diameter: number;
  cd: number;
  rho: number;
  headwind: number;
  crosswind: number;
  g: number;
  drag: boolean;
};

export type Sample = {
  t: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  v: number;
};

export type ShotResult = {
  samples: Sample[];
  vacuum: Sample[];
  range: number;
  apex: number;
  tof: number;
  vImpact: number;
  energyImpact: number;
  energyMuzzle: number;
  drop: number;
  drift: number;
  momentum: number;
};

export type Preset = {
  id: string;
  name: string;
  v0: number;
  angle: number;
  mass: number;
  diameter: number;
  cd: number;
  note: string;
};

export const PRESETS: Preset[] = [
  { id: "demo", name: "Esfera didáctica", v0: 48, angle: 38, mass: 0.25, diameter: 0.09, cd: 0.47, note: "Arrastre cuadrático visible frente al vacío." },
  { id: "bb", name: "Balín 4.5 mm", v0: 180, angle: 1.2, mass: 0.00053, diameter: 0.0045, cd: 0.47, note: "Masa baja: el arrastre domina enseguida." },
  { id: "pistol", name: "9×19 mm", v0: 360, angle: 0.15, mass: 0.008, diameter: 0.009, cd: 0.23, note: "Trayectoria tensa. El ángulo es la elevación del cañón." },
  { id: "rifle", name: "5.56 mm", v0: 940, angle: 0.12, mass: 0.004, diameter: 0.00569, cd: 0.28, note: "Alta velocidad inicial. Compara vacío contra aire." },
  { id: "arrow", name: "Flecha", v0: 70, angle: 8, mass: 0.024, diameter: 0.009, cd: 1.4, note: "Cd alto por plumas y eje." },
  { id: "vacuum", name: "Vacío ideal", v0: 40, angle: 45, mass: 1, diameter: 0.05, cd: 0, note: "Sin arrastre. Alcance = v²/g en terreno plano." },
];

export function airDensity(altitudeM: number, tempC: number): number {
  const h = Math.max(-200, Math.min(altitudeM, 10000));
  const t = Math.max(-40, Math.min(tempC, 50));
  return 1.225 * Math.exp(-h / 8500) * (288.15 / (t + 273.15));
}

function hypot3(x: number, y: number, z: number): number {
  return Math.hypot(x, y, z);
}

type State = [number, number, number, number, number, number];

function deriv(s: State, shot: ShotInput, k: number): State {
  const [, , , vx, vy, vz] = s;
  const vrx = vx + shot.headwind;
  const vry = vy;
  const vrz = vz - shot.crosswind;
  const speed = hypot3(vrx, vry, vrz);
  const dragA = shot.drag && k > 0 && speed > 1e-8 ? k * speed : 0;
  return [vx, vy, vz, -dragA * vrx, -dragA * vry - shot.g, -dragA * vrz];
}

function add(a: State, b: State, scale: number): State {
  return [
    a[0] + b[0] * scale,
    a[1] + b[1] * scale,
    a[2] + b[2] * scale,
    a[3] + b[3] * scale,
    a[4] + b[4] * scale,
    a[5] + b[5] * scale,
  ];
}

function rk4(s: State, dt: number, shot: ShotInput, k: number): State {
  const k1 = deriv(s, shot, k);
  const k2 = deriv(add(s, k1, dt / 2), shot, k);
  const k3 = deriv(add(s, k2, dt / 2), shot, k);
  const k4 = deriv(add(s, k3, dt), shot, k);
  const next: State = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 6; i++) {
    next[i] = s[i]! + (dt / 6) * (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!);
  }
  return next;
}

function pack(t: number, s: State): Sample {
  const v = hypot3(s[3], s[4], s[5]);
  return { t, x: s[0], y: s[1], z: s[2], vx: s[3], vy: s[4], vz: s[5], v };
}

function vacuumPoint(shot: ShotInput, t: number): Sample {
  const th = (shot.angleDeg * Math.PI) / 180;
  const vx = shot.v0 * Math.cos(th);
  const vy0 = shot.v0 * Math.sin(th);
  const x = vx * t;
  const y = shot.y0 + vy0 * t - 0.5 * shot.g * t * t;
  const vy = vy0 - shot.g * t;
  return { t, x, y, z: 0, vx, vy, vz: 0, v: Math.hypot(vx, vy) };
}

export function simulate(shot: ShotInput): ShotResult {
  if (!(shot.v0 > 0) || !(shot.mass > 0) || !(shot.g > 0)) {
    throw new Error("Velocidad, masa y gravedad deben ser positivas");
  }
  const th = (shot.angleDeg * Math.PI) / 180;
  const vx0 = shot.v0 * Math.cos(th);
  const vy0 = shot.v0 * Math.sin(th);
  const area = Math.PI * (shot.diameter / 2) ** 2;
  const k = shot.drag && shot.cd > 0 && shot.diameter > 0 ? (0.5 * shot.cd * shot.rho * area) / shot.mass : 0;
  const vyTerm = Math.sqrt(Math.max(0, vy0 * vy0 + 2 * shot.g * Math.max(shot.y0, 0)));
  const tofGuess = Math.max(0.2, (vy0 + vyTerm) / shot.g);
  const steps = Math.max(240, Math.min(2800, Math.round(tofGuess / 0.004)));
  const dt = (tofGuess * 1.35) / steps;

  let s: State = [0, shot.y0, 0, vx0, vy0, 0];
  const samples: Sample[] = [pack(0, s)];
  let apex = shot.y0;
  let t = 0;
  for (let i = 0; i < steps; i++) {
    const prev = s;
    const next = rk4(s, dt, shot, k);
    t += dt;
    if (next[1] < 0 && prev[1] >= 0 && t > dt * 0.5) {
      const frac = prev[1] / (prev[1] - next[1]);
      const hit = add(prev, [next[0] - prev[0], next[1] - prev[1], next[2] - prev[2], next[3] - prev[3], next[4] - prev[4], next[5] - prev[5]], frac);
      hit[1] = 0;
      const ht = t - dt + dt * frac;
      samples.push(pack(ht, hit));
      s = hit;
      t = ht;
      break;
    }
    s = next;
    if (s[1] > apex) apex = s[1];
    if (i % 2 === 0 || i === steps - 1) samples.push(pack(t, s));
    if (s[0] > 1e7) break;
  }

  const last = samples[samples.length - 1]!;
  const vacuum: Sample[] = [];
  const vt = Math.max(last.t, 0.05);
  for (let i = 0; i <= 80; i++) {
    const p = vacuumPoint(shot, (vt * i) / 80);
    vacuum.push(p);
    if (p.y < 0 && i > 2) {
      vacuum[vacuum.length - 1] = vacuumPoint(shot, vt);
      break;
    }
  }
  const boreY = shot.y0 + last.x * Math.tan(th);
  return {
    samples,
    vacuum,
    range: Math.max(0, last.x),
    apex,
    tof: last.t,
    vImpact: last.v,
    energyImpact: 0.5 * shot.mass * last.v * last.v,
    energyMuzzle: 0.5 * shot.mass * shot.v0 * shot.v0,
    drop: boreY - last.y,
    drift: last.z,
    momentum: shot.mass * last.v,
  };
}

export function bestAngle(base: ShotInput): number {
  let bestA = base.angleDeg;
  let bestR = -1;
  for (let a = 8; a <= 80; a += 2) {
    const r = simulate({ ...base, angleDeg: a }).range;
    if (r > bestR) {
      bestR = r;
      bestA = a;
    }
  }
  for (let a = bestA - 2; a <= bestA + 2.001; a += 0.25) {
    const r = simulate({ ...base, angleDeg: a }).range;
    if (r > bestR) {
      bestR = r;
      bestA = Math.round(a * 100) / 100;
    }
  }
  return bestA;
}

export type RangeRow = {
  x: number;
  y: number;
  drop: number;
  drift: number;
  v: number;
  energy: number;
  t: number;
  mils: number;
  moa: number;
};

export function rangeTable(shot: ShotInput, result: ShotResult, step: number): RangeRow[] {
  const rows: RangeRow[] = [];
  const th = (shot.angleDeg * Math.PI) / 180;
  const max = result.range;
  for (let x = step; x <= max + 1e-6; x += step) {
    let hit: Sample | null = null;
    for (let i = 1; i < result.samples.length; i++) {
      const a = result.samples[i - 1]!;
      const b = result.samples[i]!;
      if ((a.x <= x && b.x >= x) || (a.x >= x && b.x <= x)) {
        const f = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x);
        hit = {
          t: a.t + (b.t - a.t) * f,
          x,
          y: a.y + (b.y - a.y) * f,
          z: a.z + (b.z - a.z) * f,
          vx: a.vx + (b.vx - a.vx) * f,
          vy: a.vy + (b.vy - a.vy) * f,
          vz: a.vz + (b.vz - a.vz) * f,
          v: 0,
        };
        hit.v = Math.hypot(hit.vx, hit.vy, hit.vz);
        break;
      }
    }
    if (!hit || x <= 0) continue;
    const bore = shot.y0 + x * Math.tan(th);
    const drop = bore - hit.y;
    const mils = (drop / x) * 1000;
    rows.push({
      x,
      y: hit.y,
      drop,
      drift: hit.z,
      v: hit.v,
      energy: 0.5 * shot.mass * hit.v * hit.v,
      t: hit.t,
      mils,
      moa: mils * 3.43775,
    });
    if (rows.length > 40) break;
  }
  return rows;
}
