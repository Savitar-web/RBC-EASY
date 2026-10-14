export type Unit = {
  id: string;
  label: string;
  toBase: (n: number) => number;
  fromBase: (n: number) => number;
};

export type Category = {
  id: string;
  name: string;
  units: Unit[];
  note?: string;
};

const lin = (id: string, label: string, perBase: number): Unit => ({
  id,
  label,
  toBase: (n) => n * perBase,
  fromBase: (n) => n / perBase,
});

export const CATEGORIES: Category[] = [
  {
    id: "length",
    name: "Longitud",
    units: [
      lin("nm", "nanómetro", 1e-9),
      lin("um", "micrómetro", 1e-6),
      lin("mm", "milímetro", 1e-3),
      lin("cm", "centímetro", 0.01),
      lin("m", "metro", 1),
      lin("km", "kilómetro", 1000),
      lin("in", "pulgada", 0.0254),
      lin("ft", "pie", 0.3048),
      lin("yd", "yarda", 0.9144),
      lin("mi", "milla", 1609.344),
      lin("nmi", "milla náutica", 1852),
      lin("au", "unidad astronómica", 1.495978707e11),
    ],
  },
  {
    id: "mass",
    name: "Masa",
    units: [
      lin("ug", "microgramo", 1e-9),
      lin("mg", "miligramo", 1e-6),
      lin("g", "gramo", 0.001),
      lin("kg", "kilogramo", 1),
      lin("t", "tonelada", 1000),
      lin("oz", "onza", 0.028349523125),
      lin("lb", "libra", 0.45359237),
      lin("st", "stone", 6.35029318),
      lin("gr", "grain", 6.479891e-5),
    ],
  },
  {
    id: "time",
    name: "Tiempo",
    units: [
      lin("ns", "nanosegundo", 1e-9),
      lin("us", "microsegundo", 1e-6),
      lin("ms", "milisegundo", 0.001),
      lin("s", "segundo", 1),
      lin("min", "minuto", 60),
      lin("h", "hora", 3600),
      lin("d", "día", 86400),
      lin("wk", "semana", 604800),
      lin("yr", "año (365.25 d)", 31557600),
    ],
  },
  {
    id: "temp",
    name: "Temperatura",
    note: "Conversión afín, no un factor.",
    units: [
      { id: "C", label: "Celsius", toBase: (n) => n, fromBase: (n) => n },
      { id: "F", label: "Fahrenheit", toBase: (n) => (n - 32) * 5 / 9, fromBase: (n) => n * 9 / 5 + 32 },
      { id: "K", label: "kelvin", toBase: (n) => n - 273.15, fromBase: (n) => n + 273.15 },
    ],
  },
  {
    id: "speed",
    name: "Velocidad",
    units: [
      lin("mps", "m/s", 1),
      lin("kmh", "km/h", 1 / 3.6),
      lin("mph", "mph", 0.44704),
      lin("kn", "nudo", 0.514444),
      lin("fps", "ft/s", 0.3048),
      lin("c", "fracción de c", 299792458),
    ],
  },
  {
    id: "accel",
    name: "Aceleración",
    units: [
      lin("mps2", "m/s²", 1),
      lin("g", "g", 9.80665),
      lin("fps2", "ft/s²", 0.3048),
    ],
  },
  {
    id: "force",
    name: "Fuerza",
    units: [
      lin("N", "newton", 1),
      lin("kN", "kilonewton", 1000),
      lin("dyn", "dina", 1e-5),
      lin("kgf", "kilogramo-fuerza", 9.80665),
      lin("lbf", "libra-fuerza", 4.4482216152605),
    ],
  },
  {
    id: "pressure",
    name: "Presión",
    units: [
      lin("Pa", "pascal", 1),
      lin("kPa", "kilopascal", 1000),
      lin("MPa", "megapascal", 1e6),
      lin("bar", "bar", 1e5),
      lin("atm", "atmósfera", 101325),
      lin("torr", "torr", 133.322368),
      lin("mmHg", "mmHg", 133.322368),
      lin("psi", "psi", 6894.757293168),
    ],
  },
  {
    id: "energy",
    name: "Energía",
    units: [
      lin("J", "joule", 1),
      lin("kJ", "kilojoule", 1000),
      lin("cal", "caloría", 4.184),
      lin("kcal", "kilocaloría", 4184),
      lin("Wh", "watt-hora", 3600),
      lin("kWh", "kilowatt-hora", 3.6e6),
      lin("eV", "electronvoltio", 1.602176634e-19),
      lin("btu", "BTU", 1055.05585262),
      lin("ftlbf", "ft·lbf", 1.3558179483314),
    ],
  },
  {
    id: "power",
    name: "Potencia",
    units: [
      lin("W", "watt", 1),
      lin("kW", "kilowatt", 1000),
      lin("hp", "caballo (hp)", 745.699871582),
      lin("btuh", "BTU/h", 0.29307107),
    ],
  },
  {
    id: "data",
    name: "Datos",
    note: "kB es decimal (1000). KiB es binario (1024).",
    units: [
      lin("bit", "bit", 1),
      lin("B", "byte", 8),
      lin("kB", "kilobyte", 8e3),
      lin("KiB", "kibibyte", 8 * 1024),
      lin("MB", "megabyte", 8e6),
      lin("MiB", "mebibyte", 8 * 1024 ** 2),
      lin("GB", "gigabyte", 8e9),
      lin("GiB", "gibibyte", 8 * 1024 ** 3),
      lin("TB", "terabyte", 8e12),
      lin("TiB", "tebibyte", 8 * 1024 ** 4),
    ],
  },
  {
    id: "angle",
    name: "Ángulo",
    units: [
      lin("deg", "grado", 1),
      lin("rad", "radián", 180 / Math.PI),
      lin("grad", "gradián", 0.9),
      lin("arcmin", "minuto de arco", 1 / 60),
      lin("arcsec", "segundo de arco", 1 / 3600),
      lin("turn", "vuelta", 360),
    ],
  },
  {
    id: "area",
    name: "Área",
    units: [
      lin("mm2", "mm²", 1e-6),
      lin("cm2", "cm²", 1e-4),
      lin("m2", "m²", 1),
      lin("ha", "hectárea", 1e4),
      lin("km2", "km²", 1e6),
      lin("in2", "in²", 0.00064516),
      lin("ft2", "ft²", 0.09290304),
      lin("acre", "acre", 4046.8564224),
    ],
  },
  {
    id: "volume",
    name: "Volumen",
    units: [
      lin("ml", "mililitro", 1e-6),
      lin("l", "litro", 0.001),
      lin("m3", "m³", 1),
      lin("in3", "in³", 1.6387064e-5),
      lin("ft3", "ft³", 0.028316846592),
      lin("gal", "galón US", 0.003785411784),
      lin("floz", "fl oz US", 2.95735295625e-5),
    ],
  },
  {
    id: "freq",
    name: "Frecuencia",
    units: [
      lin("Hz", "hertz", 1),
      lin("kHz", "kilohertz", 1e3),
      lin("MHz", "megahertz", 1e6),
      lin("GHz", "gigahertz", 1e9),
      lin("rpm", "rpm", 1 / 60),
    ],
  },
  {
    id: "density",
    name: "Densidad",
    units: [
      lin("kgm3", "kg/m³", 1),
      lin("gcm3", "g/cm³", 1000),
      lin("lbft3", "lb/ft³", 16.01846337),
    ],
  },
  {
    id: "charge",
    name: "Carga",
    units: [
      lin("C", "coulomb", 1),
      lin("mC", "milicoulomb", 1e-3),
      lin("uC", "microcoulomb", 1e-6),
      lin("nC", "nanocoulomb", 1e-9),
      lin("e", "carga elemental", 1.602176634e-19),
      lin("Ah", "amperio-hora", 3600),
    ],
  },
  {
    id: "voltage",
    name: "Voltaje",
    units: [lin("uV", "microvoltio", 1e-6), lin("mV", "milivoltio", 1e-3), lin("V", "voltio", 1), lin("kV", "kilovoltio", 1e3)],
  },
  {
    id: "current",
    name: "Corriente",
    units: [lin("uA", "microamperio", 1e-6), lin("mA", "miliamperio", 1e-3), lin("A", "amperio", 1), lin("kA", "kiloamperio", 1e3)],
  },
  {
    id: "resistance",
    name: "Resistencia",
    units: [lin("mohm", "miliohmio", 1e-3), lin("ohm", "ohmio", 1), lin("kohm", "kilohmio", 1e3), lin("Mohm", "megohmio", 1e6)],
  },
  {
    id: "cap",
    name: "Capacitancia",
    units: [lin("pF", "picofaradio", 1e-12), lin("nF", "nanofaradio", 1e-9), lin("uF", "microfaradio", 1e-6), lin("mF", "milifaradio", 1e-3), lin("F", "faradio", 1)],
  },
];

export function convert(cat: Category, value: number, fromId: string, toId: string): number {
  const from = cat.units.find((u) => u.id === fromId);
  const to = cat.units.find((u) => u.id === toId);
  if (!from || !to) throw new Error("Unidad desconocida");
  return to.fromBase(from.toBase(value));
}
