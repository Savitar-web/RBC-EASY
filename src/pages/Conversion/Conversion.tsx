/**
 * pages/Conversion/Conversion.tsx
 * Conversión de unidades — diseño oscuro con acento rojo.
 * Fondo: public/images/backgrounds/TA.png
 * Ruta: /conversion
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Unit = {
  id: string;
  label: string;
  symbol: string;
  toBase: (n: number) => number;
  fromBase: (n: number) => number;
};
type Category = { id: string; name: string; base: string; note?: string; units: Unit[] };

const u = (id: string, label: string, symbol: string, factor: number): Unit => ({
  id, label, symbol,
  toBase: (n) => n * factor,
  fromBase: (n) => n / factor,
});
const c = (id: string, name: string, base: string, note: string, units: Unit[]): Category => ({
  id, name, base, note: note || undefined, units,
});
const pct = (id: string, label: string, factor: number): Unit => u(id, label, label, factor);

const CATEGORIES: Category[] = [
  c('length', 'Longitud', 'metro', 'Del yoctómetro al año luz, más las usuales.', [
    u('ym', 'yoctómetro', 'ym', 1e-24), u('zm', 'zeptómetro', 'zm', 1e-21), u('am', 'attómetro', 'am', 1e-18),
    u('fm', 'femtómetro', 'fm', 1e-15), u('pm', 'picómetro', 'pm', 1e-12), u('ang', 'ångström', 'Å', 1e-10),
    u('nm', 'nanómetro', 'nm', 1e-9), u('um', 'micrómetro', 'µm', 1e-6), u('mm', 'milímetro', 'mm', 0.001),
    u('cm', 'centímetro', 'cm', 0.01), u('dm', 'decímetro', 'dm', 0.1), u('m', 'metro', 'm', 1),
    u('dam', 'decámetro', 'dam', 10), u('hm', 'hectómetro', 'hm', 100), u('km', 'kilómetro', 'km', 1000),
    u('Mm', 'megámetro', 'Mm', 1e6), u('Gm', 'gigámetro', 'Gm', 1e9), u('Tm', 'terámetro', 'Tm', 1e12),
    u('Pm', 'petámetro', 'Pm', 1e15), u('Em', 'exámetro', 'Em', 1e18), u('Zm', 'zettámetro', 'Zm', 1e21),
    u('Ym', 'yottámetro', 'Ym', 1e24), u('in', 'pulgada', 'in', 0.0254), u('ft', 'pie', 'ft', 0.3048),
    u('yd', 'yarda', 'yd', 0.9144), u('mi', 'milla', 'mi', 1609.344), u('nmi', 'milla náutica', 'nmi', 1852),
    u('mil', 'mil (0.001 in)', 'mil', 2.54e-5), u('fath', 'braza', 'fath', 1.8288), u('ch', 'cadena', 'ch', 20.1168),
    u('fur', 'furlong', 'fur', 201.168), u('ls', 'segundo luz', 'ls', 299792458),
    u('lmin', 'minuto luz', 'lmin', 299792458 * 60), u('lh', 'hora luz', 'lh', 299792458 * 3600),
    u('ld', 'día luz', 'ld', 299792458 * 86400), u('ly', 'año luz', 'ly', 9.4607304725808e15),
    u('au', 'unidad astronómica', 'ua', 1.495978707e11), u('pc', 'parsec', 'pc', 3.085677581e16),
    u('kpc', 'kiloparsec', 'kpc', 3.085677581e19), u('Mpc', 'megaparsec', 'Mpc', 3.085677581e22),
    u('Rearth', 'radio terrestre', 'R⊕', 6371000), u('Rsun', 'radio solar', 'R☉', 6.957e8),
    u('Rmoon', 'radio lunar', 'R☾', 1737400),
  ]),
  c('mass', 'Masa', 'kilogramo', 'Prefijos del gramo, imperial, troy, atómica y astronómica.', [
    u('yg', 'yoctogramo', 'yg', 1e-27), u('zg', 'zeptogramo', 'zg', 1e-24), u('ag', 'attogramo', 'ag', 1e-21),
    u('fg', 'femtogramo', 'fg', 1e-18), u('pg', 'picogramo', 'pg', 1e-15), u('ng', 'nanogramo', 'ng', 1e-12),
    u('ug', 'microgramo', 'µg', 1e-9), u('mg', 'miligramo', 'mg', 1e-6), u('cg', 'centigramo', 'cg', 1e-5),
    u('dg', 'decigramo', 'dg', 1e-4), u('g', 'gramo', 'g', 0.001), u('dag', 'decagramo', 'dag', 0.01),
    u('hg', 'hectogramo', 'hg', 0.1), u('kg', 'kilogramo', 'kg', 1), u('q', 'quintal métrico', 'q', 100),
    u('t', 'tonelada métrica', 't', 1000), u('Mg', 'megagramo', 'Mg', 1000), u('Gg', 'gigagramo', 'Gg', 1e6),
    u('Tg', 'teragramo', 'Tg', 1e9), u('kt', 'kilotonelada', 'kt', 1e6), u('Mt', 'megatonelada', 'Mt', 1e9),
    u('oz', 'onza avoirdupois', 'oz', 0.028349523125), u('lb', 'libra avoirdupois', 'lb', 0.45359237),
    u('st', 'stone', 'st', 6.35029318), u('tonUS', 'tonelada corta', 'ton US', 907.18474),
    u('tonUK', 'tonelada larga', 'ton UK', 1016.0469088), u('gr', 'grano', 'gr', 6.479891e-5),
    u('ct', 'quilate', 'ct', 0.0002), u('ozt', 'onza troy', 'oz t', 0.0311034768),
    u('lbt', 'libra troy', 'lb t', 0.3732417216), u('slug', 'slug', 'slug', 14.59390294),
    u('u', 'dalton', 'u', 1.6605390666e-27), u('me', 'masa del electrón', 'mₑ', 9.1093837015e-31),
    u('mp', 'masa del protón', 'mₚ', 1.67262192369e-27), u('Msun', 'masa solar', 'M☉', 1.98847e30),
    u('Mearth', 'masa terrestre', 'M⊕', 5.9722e24), u('Mjup', 'masa de Júpiter', 'M♃', 1.89813e27),
  ]),
  c('time', 'Tiempo', 'segundo', 'Del tiempo de Planck al milenio. Incluye yocto, zepto, atto y femto.', [
    u('tP', 'tiempo de Planck', 'tP', 5.391247e-44), u('ys', 'yoctosegundo', 'ys', 1e-24),
    u('zs', 'zeptosegundo', 'zs', 1e-21), u('as', 'attosegundo', 'as', 1e-18), u('fs', 'femtosegundo', 'fs', 1e-15),
    u('shake', 'shake', 'shake', 1e-8), u('ps', 'picosegundo', 'ps', 1e-12), u('ns', 'nanosegundo', 'ns', 1e-9),
    u('us', 'microsegundo', 'µs', 1e-6), u('ms', 'milisegundo', 'ms', 0.001), u('cs', 'centisegundo', 'cs', 0.01),
    u('ds', 'decisegundo', 'ds', 0.1), u('s', 'segundo', 's', 1), u('das', 'decasegundo', 'das', 10),
    u('hs', 'hectosegundo', 'hs', 100), u('ks', 'kilosegundo', 'ks', 1000), u('Ms', 'megasegundo', 'Ms', 1e6),
    u('Gs', 'gigasegundo', 'Gs', 1e9), u('min', 'minuto', 'min', 60), u('h', 'hora', 'h', 3600),
    u('d', 'día', 'd', 86400), u('dsid', 'día sideral', 'd sid', 86164.0905), u('wk', 'semana', 'sem', 604800),
    u('fn', 'quincena', 'fn', 1209600), u('mo', 'mes medio', 'mes', 2629746), u('yr', 'año juliano', 'a', 31557600),
    u('yr_greg', 'año gregoriano medio', 'a g', 31556952), u('yr_trop', 'año trópico', 'a tr', 31556925.2),
    u('dec', 'década', 'déc', 315576000), u('cen', 'siglo', 'siglo', 3155760000),
    u('mil', 'milenio', 'milenio', 31557600000), u('olym', 'olimpíada', 'olimp', 31557600 * 4),
  ]),
  c('speed', 'Velocidad', 'm/s', 'De milímetros por hora a la velocidad de la luz. Incluye Mach y el sonido.', [
    u('mmph', 'milímetro por hora', 'mm/h', 1 / 3.6e6), u('cmph', 'centímetro por hora', 'cm/h', 1 / 3.6e5),
    u('mmin', 'metro por minuto', 'm/min', 1 / 60), u('mh', 'metro por hora', 'm/h', 1 / 3600),
    u('mmps', 'milímetro por segundo', 'mm/s', 0.001), u('cmps', 'centímetro por segundo', 'cm/s', 0.01),
    u('umps', 'micrómetro por segundo', 'µm/s', 1e-6), u('mps', 'metro por segundo', 'm/s', 1),
    u('kmh', 'kilómetro por hora', 'km/h', 1 / 3.6), u('kmmin', 'kilómetro por minuto', 'km/min', 1000 / 60),
    u('kmd', 'kilómetro por día', 'km/d', 1000 / 86400), u('kmps', 'kilómetro por segundo', 'km/s', 1000),
    u('mph', 'milla por hora', 'mph', 0.44704), u('mpm', 'milla por minuto', 'mi/min', 26.8224),
    u('kn', 'nudo', 'kn', 1852 / 3600), u('fps', 'pie por segundo', 'ft/s', 0.3048),
    u('fpm', 'pie por minuto', 'ft/min', 0.00508), u('fph', 'pie por hora', 'ft/h', 0.3048 / 3600),
    u('ips', 'pulgada por segundo', 'in/s', 0.0254), u('ipm', 'pulgada por minuto', 'in/min', 0.0254 / 60),
    u('yds', 'yarda por segundo', 'yd/s', 0.9144), u('walk', 'paso humano medio', 'paso', 1.4),
    u('run', 'carrera media', 'carrera', 3.5), u('sound0', 'sonido a 0 °C', 'c₀', 331.3),
    u('sound15', 'sonido a 15 °C', 'c₁₅', 340.3), u('sound20', 'sonido a 20 °C', 'c₂₀', 343.2),
    u('sound25', 'sonido a 25 °C', 'c₂₅', 346.1), u('mach', 'Mach (15 °C)', 'Ma', 340.3),
    u('mach2', 'Mach 2 (15 °C)', 'Ma2', 680.6), u('au_d', 'UA por día', 'ua/d', 1.495978707e11 / 86400),
    u('ly_yr', 'año luz por año', 'ly/a', 299792458), u('leo', 'órbita baja típica', 'LEO', 7800),
    u('esc', 'velocidad de escape terrestre', 'vesc', 11186), u('c', 'velocidad de la luz', 'c', 299792458),
    u('m_ps', 'metro por picosegundo', 'm/ps', 1e12), u('m_fs', 'metro por femtosegundo', 'm/fs', 1e15),
    u('m_as', 'metro por attosegundo', 'm/as', 1e18), u('m_zs', 'metro por zeptosegundo', 'm/zs', 1e21),
    u('m_ys', 'metro por yoctosegundo', 'm/ys', 1e24), u('km_ps', 'kilómetro por picosegundo', 'km/ps', 1e15),
    u('mm_ps', 'milímetro por picosegundo', 'mm/ps', 1e9), u('nm_fs', 'nanómetro por femtosegundo', 'nm/fs', 1e6),
  ]),
  c('accel', 'Aceleración', 'm/s²', 'SI, gal, g estándar y g de otros cuerpos.', [
    u('nmps2', 'nm/s²', 'nm/s²', 1e-9), u('umps2', 'µm/s²', 'µm/s²', 1e-6), u('mmps2', 'mm/s²', 'mm/s²', 0.001),
    u('cmps2', 'cm/s²', 'cm/s²', 0.01), u('mps2', 'm/s²', 'm/s²', 1), u('kmps2', 'km/s²', 'km/s²', 1000),
    u('gal', 'gal', 'Gal', 0.01), u('mgal', 'miligal', 'mGal', 1e-5), u('g', 'gravedad estándar', 'g', 9.80665),
    u('mg', 'miligravedad', 'mg', 0.00980665), u('fps2', 'ft/s²', 'ft/s²', 0.3048), u('ips2', 'in/s²', 'in/s²', 0.0254),
    u('kmhs', 'km/h por segundo', 'km/h/s', 1 / 3.6), u('mphs', 'mph por segundo', 'mph/s', 0.44704),
    u('kns', 'nudo por segundo', 'kn/s', 0.514444), u('g_moon', 'g lunar', 'g☽', 1.62),
    u('g_mars', 'g marciana', 'g♂', 3.71), u('g_jup', 'g joviana', 'g♃', 24.79), u('g_sun', 'g solar', 'g☉', 274),
  ]),
  c('force', 'Fuerza', 'newton', 'SI, cgs, técnica e imperial.', [
    u('uN', 'micronewton', 'µN', 1e-6), u('mN', 'milinewton', 'mN', 0.001), u('N', 'newton', 'N', 1),
    u('kN', 'kilonewton', 'kN', 1000), u('MN', 'meganewton', 'MN', 1e6), u('GN', 'giganewton', 'GN', 1e9),
    u('dyn', 'dina', 'dyn', 1e-5), u('kgf', 'kilogramo-fuerza', 'kgf', 9.80665), u('gf', 'gramo-fuerza', 'gf', 0.00980665),
    u('tf', 'tonelada-fuerza', 'tf', 9806.65), u('lbf', 'libra-fuerza', 'lbf', 4.4482216152605),
    u('ozf', 'onza-fuerza', 'ozf', 0.27801385095), u('pdl', 'poundal', 'pdl', 0.138254954376),
    u('kip', 'kip', 'kip', 4448.2216152605), u('sn', 'sthène', 'sn', 1000),
  ]),
  c('pressure', 'Presión', 'pascal', 'Meteorológicas, técnicas e industriales.', [
    u('uPa', 'micropascal', 'µPa', 1e-6), u('mPa', 'milipascal', 'mPa', 0.001), u('Pa', 'pascal', 'Pa', 1),
    u('hPa', 'hectopascal', 'hPa', 100), u('kPa', 'kilopascal', 'kPa', 1000), u('MPa', 'megapascal', 'MPa', 1e6),
    u('GPa', 'gigapascal', 'GPa', 1e9), u('bar', 'bar', 'bar', 1e5), u('mbar', 'milibar', 'mbar', 100),
    u('atm', 'atmósfera', 'atm', 101325), u('torr', 'torr', 'Torr', 133.322368421),
    u('mmHg', 'milímetro de mercurio', 'mmHg', 133.322368421), u('cmHg', 'centímetro de mercurio', 'cmHg', 1333.22368421),
    u('inHg', 'pulgada de mercurio', 'inHg', 3386.389), u('psi', 'libra por pulgada²', 'psi', 6894.757293168),
    u('psf', 'libra por pie²', 'psf', 47.88025898), u('kgfcm2', 'kgf/cm²', 'kgf/cm²', 98066.5),
    u('mmH2O', 'mm de agua', 'mmH₂O', 9.80665), u('cmH2O', 'cm de agua', 'cmH₂O', 98.0665),
    u('inH2O', 'in de agua', 'inH₂O', 249.08891),
  ]),
  c('energy', 'Energía', 'julio', 'Mecánica, eléctrica, térmica y nuclear.', [
    u('eV', 'electronvoltio', 'eV', 1.602176634e-19), u('keV', 'kiloelectronvoltio', 'keV', 1.602176634e-16),
    u('MeV', 'megaelectronvoltio', 'MeV', 1.602176634e-13), u('GeV', 'gigaelectronvoltio', 'GeV', 1.602176634e-10),
    u('TeV', 'teraelectronvoltio', 'TeV', 1.602176634e-7), u('erg', 'ergio', 'erg', 1e-7),
    u('uJ', 'microjulio', 'µJ', 1e-6), u('mJ', 'milijulio', 'mJ', 0.001), u('J', 'julio', 'J', 1),
    u('kJ', 'kilojulio', 'kJ', 1000), u('MJ', 'megajulio', 'MJ', 1e6), u('GJ', 'gigajulio', 'GJ', 1e9),
    u('TJ', 'terajulio', 'TJ', 1e12), u('cal', 'caloría', 'cal', 4.184), u('kcal', 'kilocaloría', 'kcal', 4184),
    u('Wh', 'watt-hora', 'Wh', 3600), u('kWh', 'kilowatt-hora', 'kWh', 3.6e6), u('MWh', 'megawatt-hora', 'MWh', 3.6e9),
    u('btu', 'BTU (IT)', 'BTU', 1055.05585262), u('therm', 'therm', 'therm', 1.05505585262e8),
    u('ftlbf', 'pie-libra fuerza', 'ft·lbf', 1.3558179483314), u('Ha', 'hartree', 'Eₕ', 4.3597447222071e-18),
    u('toe', 'tonelada equivalente de petróleo', 'tep', 4.1868e10), u('tnt', 'tonelada de TNT', 't TNT', 4.184e9),
  ]),
  c('power', 'Potencia', 'watt', 'Eléctrica, mecánica y térmica.', [
    u('uW', 'microwatt', 'µW', 1e-6), u('mW', 'miliwatt', 'mW', 0.001), u('W', 'watt', 'W', 1),
    u('kW', 'kilowatt', 'kW', 1000), u('MW', 'megawatt', 'MW', 1e6), u('GW', 'gigawatt', 'GW', 1e9),
    u('TW', 'terawatt', 'TW', 1e12), u('hp', 'caballo de vapor mecánico', 'hp', 745.69987158),
    u('PS', 'caballo métrico', 'PS', 735.49875), u('btuh', 'BTU/h', 'BTU/h', 0.29307107),
    u('cals', 'caloría por segundo', 'cal/s', 4.184), u('kcalh', 'kilocaloría por hora', 'kcal/h', 1.16222222),
    u('ftlbfs', 'ft·lbf/s', 'ft·lbf/s', 1.3558179483314), u('ergs', 'ergio por segundo', 'erg/s', 1e-7),
    u('tonref', 'tonelada de refrigeración', 'TR', 3516.853),
  ]),
  c('data', 'Datos', 'bit', 'Decimal (kB) y binario (KiB) por separado.', [
    u('bit', 'bit', 'bit', 1), u('nibble', 'nibble', 'nibble', 4), u('B', 'byte', 'B', 8),
    u('kB', 'kilobyte (1000)', 'kB', 8000), u('KiB', 'kibibyte (1024)', 'KiB', 8192),
    u('MB', 'megabyte', 'MB', 8e6), u('MiB', 'mebibyte', 'MiB', 8388608),
    u('GB', 'gigabyte', 'GB', 8e9), u('GiB', 'gibibyte', 'GiB', 8589934592),
    u('TB', 'terabyte', 'TB', 8e12), u('TiB', 'tebibyte', 'TiB', 8796093022208),
    u('PB', 'petabyte', 'PB', 8e15), u('PiB', 'pebibyte', 'PiB', 9007199254740992),
    u('EB', 'exabyte', 'EB', 8e18), u('EiB', 'exbibyte', 'EiB', 9.223372036854776e18),
    u('ZB', 'zettabyte', 'ZB', 8e21), u('YB', 'yottabyte', 'YB', 8e24),
  ]),
  c('bitrate', 'Tasa de datos', 'bit/s', 'De bits por segundo a terabits. Decimal y binario.', [
    u('bps', 'bit por segundo', 'bit/s', 1), u('kbps', 'kilobit/s', 'kbit/s', 1000),
    u('Kibps', 'kibibit/s', 'Kibit/s', 1024), u('Mbps', 'megabit/s', 'Mbit/s', 1e6),
    u('Mibps', 'mebibit/s', 'Mibit/s', 1048576), u('Gbps', 'gigabit/s', 'Gbit/s', 1e9),
    u('Gibps', 'gibibit/s', 'Gibit/s', 1073741824), u('Tbps', 'terabit/s', 'Tbit/s', 1e12),
    u('Bps', 'byte por segundo', 'B/s', 8), u('MBps', 'megabyte/s', 'MB/s', 8e6),
  ]),
  c('angle', 'Ángulo', 'grado', 'Grado, radián, gon, mil y vuelta.', [
    u('deg', 'grado', '°', 1), u('rad', 'radián', 'rad', 180 / Math.PI), u('grad', 'gradián', 'gon', 0.9),
    u('arcmin', 'minuto de arco', '′', 1 / 60), u('arcsec', 'segundo de arco', '″', 1 / 3600),
    u('turn', 'vuelta', 'rev', 360), u('mrad', 'milirradián', 'mrad', 0.057295779513),
    u('mil', 'mil NATO', 'mil', 0.05625), u('sign', 'signo (30°)', 'signo', 30),
    u('quad', 'cuadrante', 'cuad', 90), u('sext', 'sextante', 'sext', 60),
  ]),
  c('area', 'Área', 'm²', 'Del barn a la milla cuadrada.', [
    u('mm2', 'milímetro cuadrado', 'mm²', 1e-6), u('cm2', 'centímetro cuadrado', 'cm²', 1e-4),
    u('m2', 'metro cuadrado', 'm²', 1), u('a', 'área', 'a', 100), u('ha', 'hectárea', 'ha', 10000),
    u('km2', 'kilómetro cuadrado', 'km²', 1e6), u('in2', 'pulgada cuadrada', 'in²', 0.00064516),
    u('ft2', 'pie cuadrado', 'ft²', 0.09290304), u('yd2', 'yarda cuadrada', 'yd²', 0.83612736),
    u('acre', 'acre', 'acre', 4046.8564224), u('mi2', 'milla cuadrada', 'mi²', 2589988.110336),
    u('barn', 'barn', 'b', 1e-28), u('ping', 'ping', 'ping', 3.305785),
  ]),
  c('volume', 'Volumen', 'm³', 'Cocina, laboratorio y comercio.', [
    u('uL', 'microlitro', 'µL', 1e-9), u('mL', 'mililitro', 'mL', 1e-6), u('cL', 'centilitro', 'cL', 1e-5),
    u('dL', 'decilitro', 'dL', 1e-4), u('L', 'litro', 'L', 0.001), u('m3', 'metro cúbico', 'm³', 1),
    u('in3', 'pulgada cúbica', 'in³', 1.6387064e-5), u('ft3', 'pie cúbico', 'ft³', 0.028316846592),
    u('yd3', 'yarda cúbica', 'yd³', 0.764554857984), u('galUS', 'galón US', 'gal US', 0.003785411784),
    u('galUK', 'galón imperial', 'gal UK', 0.00454609), u('floz', 'onza fluida US', 'fl oz', 2.95735295625e-5),
    u('cup', 'taza US', 'cup', 0.0002365882365), u('pt', 'pinta US', 'pt', 0.000473176473),
    u('qt', 'cuarto US', 'qt', 0.000946352946), u('bbl', 'barril de petróleo', 'bbl', 0.158987294928),
    u('tsp', 'cucharadita', 'tsp', 4.92892159375e-6), u('tbsp', 'cucharada', 'tbsp', 1.478676478125e-5),
    u('cupM', 'taza métrica', 'taza', 0.00025), u('drop', 'gota (0.05 mL)', 'gota', 5e-8),
  ]),
  c('freq', 'Frecuencia', 'hertz', 'Ondas, giro y ritmo.', [
    u('uHz', 'microhertz', 'µHz', 1e-6), u('mHz', 'milihertz', 'mHz', 0.001), u('Hz', 'hertz', 'Hz', 1),
    u('kHz', 'kilohertz', 'kHz', 1000), u('MHz', 'megahertz', 'MHz', 1e6), u('GHz', 'gigahertz', 'GHz', 1e9),
    u('THz', 'terahertz', 'THz', 1e12), u('rpm', 'revoluciones por minuto', 'rpm', 1 / 60),
    u('rps', 'revoluciones por segundo', 'rps', 1), u('bpm', 'pulsos por minuto', 'bpm', 1 / 60),
    u('radps', 'radián por segundo', 'rad/s', 1 / (2 * Math.PI)),
  ]),
  c('density', 'Densidad', 'kg/m³', 'Masa sobre volumen.', [
    u('kgm3', 'kilogramo por metro cúbico', 'kg/m³', 1), u('gcm3', 'gramo por centímetro cúbico', 'g/cm³', 1000),
    u('gmL', 'gramo por mililitro', 'g/mL', 1000), u('kgL', 'kilogramo por litro', 'kg/L', 1000),
    u('tm3', 'tonelada por metro cúbico', 't/m³', 1000), u('lbft3', 'libra por pie cúbico', 'lb/ft³', 16.01846337),
    u('lbgal', 'libra por galón US', 'lb/gal', 119.826427), u('ozin3', 'onza por pulgada cúbica', 'oz/in³', 1729.99404),
  ]),
  c('charge', 'Carga', 'coulomb', 'Incluye la carga elemental.', [
    u('e', 'carga elemental', 'e', 1.602176634e-19), u('pC', 'picocoulomb', 'pC', 1e-12),
    u('nC', 'nanocoulomb', 'nC', 1e-9), u('uC', 'microcoulomb', 'µC', 1e-6), u('mC', 'milicoulomb', 'mC', 0.001),
    u('C', 'coulomb', 'C', 1), u('kC', 'kilocoulomb', 'kC', 1000), u('Ah', 'amperio-hora', 'Ah', 3600),
    u('mAh', 'miliamperio-hora', 'mAh', 3.6), u('Fr', 'franklin', 'Fr', 3.335640951e-10),
  ]),
  c('voltage', 'Voltaje', 'voltio', '', [
    u('nV', 'nanovoltio', 'nV', 1e-9), u('uV', 'microvoltio', 'µV', 1e-6), u('mV', 'milivoltio', 'mV', 0.001),
    u('V', 'voltio', 'V', 1), u('kV', 'kilovoltio', 'kV', 1000), u('MV', 'megavoltio', 'MV', 1e6),
    u('GV', 'gigavoltio', 'GV', 1e9),
  ]),
  c('current', 'Corriente', 'amperio', '', [
    u('fA', 'femtoamperio', 'fA', 1e-15), u('pA', 'picoamperio', 'pA', 1e-12), u('nA', 'nanoamperio', 'nA', 1e-9),
    u('uA', 'microamperio', 'µA', 1e-6), u('mA', 'miliamperio', 'mA', 0.001), u('A', 'amperio', 'A', 1),
    u('kA', 'kiloamperio', 'kA', 1000), u('MA', 'megaamperio', 'MA', 1e6),
  ]),
  c('resistance', 'Resistencia', 'ohmio', '', [
    u('uohm', 'microohmio', 'µΩ', 1e-6), u('mohm', 'miliohmio', 'mΩ', 0.001), u('ohm', 'ohmio', 'Ω', 1),
    u('kohm', 'kilohmio', 'kΩ', 1000), u('Mohm', 'megohmio', 'MΩ', 1e6), u('Gohm', 'gigohmio', 'GΩ', 1e9),
    u('Tohm', 'teraohmio', 'TΩ', 1e12),
  ]),
  c('cap', 'Capacitancia', 'faradio', '', [
    u('fF', 'femtofaradio', 'fF', 1e-15), u('pF', 'picofaradio', 'pF', 1e-12), u('nF', 'nanofaradio', 'nF', 1e-9),
    u('uF', 'microfaradio', 'µF', 1e-6), u('mF', 'milifaradio', 'mF', 0.001), u('F', 'faradio', 'F', 1),
    u('kF', 'kilofaradio', 'kF', 1000),
  ]),
  c('ind', 'Inductancia', 'henrio', '', [
    u('nH', 'nanohenrio', 'nH', 1e-9), u('uH', 'microhenrio', 'µH', 1e-6), u('mH', 'milihenrio', 'mH', 0.001),
    u('H', 'henrio', 'H', 1), u('kH', 'kilohenrio', 'kH', 1000),
  ]),
  c('flux', 'Flujo magnético', 'weber', '', [
    u('nWb', 'nanoweber', 'nWb', 1e-9), u('uWb', 'microweber', 'µWb', 1e-6), u('mWb', 'miliweber', 'mWb', 0.001),
    u('Wb', 'weber', 'Wb', 1), u('Mx', 'maxwell', 'Mx', 1e-8),
  ]),
  c('bfield', 'Campo magnético', 'tesla', '', [
    u('nT', 'nanotesla', 'nT', 1e-9), u('uT', 'microtesla', 'µT', 1e-6), u('mT', 'militesla', 'mT', 0.001),
    u('T', 'tesla', 'T', 1), u('G', 'gauss', 'G', 0.0001), u('kG', 'kilogauss', 'kG', 0.1),
  ]),
  c('torque', 'Par', 'N·m', '', [
    u('Nm', 'newton metro', 'N·m', 1), u('kNm', 'kilonewton metro', 'kN·m', 1000),
    u('kgfm', 'kgf·m', 'kgf·m', 9.80665), u('ftlbf', 'ft·lbf', 'ft·lbf', 1.3558179483314),
    u('inlbf', 'in·lbf', 'in·lbf', 0.112984829), u('dynm', 'dina·cm', 'dyn·cm', 1e-7),
  ]),
  c('flow', 'Caudal', 'm³/s', '', [
    u('m3s', 'metro cúbico por segundo', 'm³/s', 1), u('m3h', 'metro cúbico por hora', 'm³/h', 1 / 3600),
    u('Ls', 'litro por segundo', 'L/s', 0.001), u('Lmin', 'litro por minuto', 'L/min', 1e-3 / 60),
    u('Lh', 'litro por hora', 'L/h', 1e-3 / 3600), u('gpm', 'galón US por minuto', 'gpm', 6.30901964e-5),
    u('cfm', 'pie cúbico por minuto', 'cfm', 0.0004719474432), u('mlmin', 'mililitro por minuto', 'mL/min', 1e-6 / 60),
  ]),
  c('light', 'Iluminancia', 'lux', '', [
    u('mlx', 'mililux', 'mlx', 0.001), u('lx', 'lux', 'lx', 1), u('klx', 'kilolux', 'klx', 1000),
    u('fc', 'foot-candle', 'fc', 10.76391041671), u('ph', 'phot', 'ph', 10000),
  ]),
  c('lumen', 'Flujo luminoso', 'lumen', '', [
    u('mlm', 'mililumen', 'mlm', 0.001), u('lm', 'lumen', 'lm', 1), u('klm', 'kilolumen', 'klm', 1000),
    u('cdsr', 'candela estereorradián', 'cd·sr', 1),
  ]),
  c('activity', 'Radiactividad', 'becquerel', '', [
    u('Bq', 'becquerel', 'Bq', 1), u('kBq', 'kilobecquerel', 'kBq', 1000), u('MBq', 'megabecquerel', 'MBq', 1e6),
    u('GBq', 'gigabecquerel', 'GBq', 1e9), u('TBq', 'terabecquerel', 'TBq', 1e12),
    u('Ci', 'curio', 'Ci', 3.7e10), u('mCi', 'milicurio', 'mCi', 3.7e7), u('uCi', 'microcurio', 'µCi', 37000),
  ]),
  c('dose', 'Dosis', 'gray', '', [
    u('uGy', 'microgray', 'µGy', 1e-6), u('mGy', 'miligray', 'mGy', 0.001), u('Gy', 'gray', 'Gy', 1),
    u('kGy', 'kilogray', 'kGy', 1000), u('rad', 'rad', 'rad', 0.01), u('Sv', 'sievert', 'Sv', 1),
    u('mSv', 'milisievert', 'mSv', 0.001), u('uSv', 'microsievert', 'µSv', 1e-6), u('rem', 'rem', 'rem', 0.01),
  ]),
  c('visc', 'Viscosidad dinámica', 'Pa·s', '', [
    u('uPas', 'micropascal segundo', 'µPa·s', 1e-6), u('mPas', 'milipascal segundo', 'mPa·s', 0.001),
    u('Pas', 'pascal segundo', 'Pa·s', 1), u('cP', 'centipoise', 'cP', 0.001), u('P', 'poise', 'P', 0.1),
  ]),
  c('conc', 'Concentración', 'mol/L', 'Molaridad, ppm y mg/L. 1 ppm ≈ 1 mg/L en agua.', [
    u('molL', 'mol por litro', 'mol/L', 1), u('mmol', 'milimol por litro', 'mmol/L', 0.001),
    u('umol', 'micromol por litro', 'µmol/L', 1e-6), u('ppm', 'partes por millón', 'ppm', 1e-6),
    u('ppb', 'partes por mil millones', 'ppb', 1e-9), u('ppt', 'partes por billón', 'ppt', 1e-12),
    u('mgL', 'miligramo por litro', 'mg/L', 1e-6), u('gL', 'gramo por litro', 'g/L', 0.001),
    u('percent', 'porcentaje masa/volumen', '%', 0.01),
  ]),
  c('type', 'Tipografía', 'milímetro', 'Punto, pica y las medidas de imprenta.', [
    u('mm', 'milímetro', 'mm', 1), u('pt', 'punto (1/72 in)', 'pt', 25.4 / 72),
    u('pica', 'pica', 'pica', 25.4 / 6), u('in', 'pulgada', 'in', 25.4), u('px96', 'píxel a 96 dpi', 'px', 25.4 / 96),
  ]),
  c('temp', 'Temperatura', 'Celsius', 'Conversión afín. El cero no se escala.', [
    { id: 'C', label: 'Celsius', symbol: '°C', toBase: (n) => n, fromBase: (n) => n },
    { id: 'F', label: 'Fahrenheit', symbol: '°F', toBase: (n) => (n - 32) * 5 / 9, fromBase: (n) => n * 9 / 5 + 32 },
    { id: 'K', label: 'kelvin', symbol: 'K', toBase: (n) => n - 273.15, fromBase: (n) => n + 273.15 },
    { id: 'R', label: 'Rankine', symbol: '°R', toBase: (n) => (n - 491.67) * 5 / 9, fromBase: (n) => n * 9 / 5 + 491.67 },
    { id: 'Re', label: 'Réaumur', symbol: '°Ré', toBase: (n) => n * 1.25, fromBase: (n) => n * 0.8 },
  ]),
  c('fuel', 'Consumo', 'L/100 km', 'Menor L/100 km es más eficiente. mpg se invierte.', [
    { id: 'l100', label: 'litros por 100 km', symbol: 'L/100 km', toBase: (n) => n, fromBase: (n) => n },
    { id: 'kml', label: 'kilómetros por litro', symbol: 'km/L', toBase: (n) => n === 0 ? Infinity : 100 / n, fromBase: (n) => n === 0 ? Infinity : 100 / n },
    { id: 'mpgUS', label: 'millas por galón US', symbol: 'mpg US', toBase: (n) => n === 0 ? Infinity : 235.214583 / n, fromBase: (n) => n === 0 ? Infinity : 235.214583 / n },
    { id: 'mpgUK', label: 'millas por galón imperial', symbol: 'mpg UK', toBase: (n) => n === 0 ? Infinity : 282.481 / n, fromBase: (n) => n === 0 ? Infinity : 282.481 / n },
    { id: 'mlp', label: 'millas por litro', symbol: 'mi/L', toBase: (n) => n === 0 ? Infinity : 62.137119 / n, fromBase: (n) => n === 0 ? Infinity : 62.137119 / n },
  ]),
  c('pct', 'Porcentaje', 'cantidad', 'El 100% es la cantidad. El resto es esa fracción.', [
    pct('p100', '100%', 1), pct('p75', '75%', 0.75), pct('p50', '50%', 0.5), pct('p25', '25%', 0.25),
    pct('p20', '20%', 0.2), pct('p15', '15%', 0.15), pct('p12', '12.5%', 0.125), pct('p10', '10%', 0.1),
    pct('p8', '8%', 0.08), pct('p5', '5%', 0.05), pct('p2', '2%', 0.02), pct('p1', '1%', 0.01),
    pct('p05', '0.5%', 0.005), pct('p01', '0.1%', 0.001),
  ]),
  c('tip', 'Propina', 'cuenta', 'La base es la cuenta. Elige la tasa o el total con propina.', [
    pct('bill', 'cuenta (100%)', 1), pct('t5', 'propina 5%', 0.05), pct('t8', 'propina 8%', 0.08),
    pct('t10', 'propina 10%', 0.1), pct('t12', 'propina 12%', 0.12), pct('t15', 'propina 15%', 0.15),
    pct('t18', 'propina 18%', 0.18), pct('t20', 'propina 20%', 0.2), pct('t25', 'propina 25%', 0.25),
    pct('tot10', 'total con 10%', 1.1), pct('tot12', 'total con 12%', 1.12), pct('tot15', 'total con 15%', 1.15),
    pct('tot18', 'total con 18%', 1.18), pct('tot20', 'total con 20%', 1.2), pct('tot25', 'total con 25%', 1.25),
  ]),
  c('discount', 'Descuento y aumento', 'precio', 'Off baja el precio. El aumento lo sube.', [
    pct('price', 'precio original', 1), pct('off5', 'con 5% off', 0.95), pct('off10', 'con 10% off', 0.9),
    pct('off15', 'con 15% off', 0.85), pct('off20', 'con 20% off', 0.8), pct('off25', 'con 25% off', 0.75),
    pct('off30', 'con 30% off', 0.7), pct('off40', 'con 40% off', 0.6), pct('off50', 'con 50% off', 0.5),
    pct('up5', 'aumento 5%', 1.05), pct('up10', 'aumento 10%', 1.1), pct('up15', 'aumento 15%', 1.15),
    pct('up20', 'aumento 20%', 1.2), pct('iva16', 'con IVA 16%', 1.16), pct('iva8', 'con IVA 8%', 1.08),
  ]),
  c('interest', 'Interés simple', 'capital', 'Un año. La tasa está en el nombre. El resultado es el interés, no el capital.', [
    pct('cap', 'capital', 1), pct('i1', 'interés 1%', 0.01), pct('i2', 'interés 2%', 0.02),
    pct('i3', 'interés 3%', 0.03), pct('i5', 'interés 5%', 0.05), pct('i8', 'interés 8%', 0.08),
    pct('i10', 'interés 10%', 0.1), pct('i12', 'interés 12%', 0.12), pct('i15', 'interés 15%', 0.15),
    pct('i20', 'interés 20%', 0.2),
  ]),
];

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (n !== 0 && (abs >= 1e12 || abs < 1e-8)) return n.toExponential(8);
  const s = n.toPrecision(12);
  return String(Number(s));
}

const LINKS = [
  { name: 'Calculadora', path: '/calcular' },
  { name: 'Balística', path: '/balistica' },
  { name: 'Conversión', path: '/conversion' },
  { name: 'Modo ascendido', path: '/modo-ascendido' },
];

export default function Conversion() {
  const navigate = useNavigate();
  const [catId, setCatId] = useState(CATEGORIES[0].id);
  const [query, setQuery] = useState('');
  const [catQuery, setCatQuery] = useState('');
  const cat = CATEGORIES.find((x) => x.id === catId) ?? CATEGORIES[0];
  const [from, setFrom] = useState(cat.units[0].id);
  const [to, setTo] = useState(cat.units[Math.min(4, cat.units.length - 1)].id);
  const [value, setValue] = useState('1');
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState('');

  const visibleCats = useMemo(() => {
    const q = catQuery.trim().toLowerCase();
    return CATEGORIES.filter((item) => !q || item.name.toLowerCase().includes(q));
  }, [catQuery]);

  const pick = (id: string) => {
    const next = CATEGORIES.find((x) => x.id === id) ?? CATEGORIES[0];
    setCatId(id);
    setFrom(next.units[0].id);
    setTo(next.units[Math.min(1, next.units.length - 1)].id);
    setQuery('');
  };

  const fromU = cat.units.find((x) => x.id === from) ?? cat.units[0];
  const toU = cat.units.find((x) => x.id === to) ?? cat.units[0];

  const result = useMemo(() => {
    const n = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    try { return toU.fromBase(fromU.toBase(n)); } catch { return null; }
  }, [value, fromU, toU]);

  const table = useMemo(() => {
    const n = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(n)) return [];
    const q = query.trim().toLowerCase();
    return cat.units
      .filter((unit) => !q || unit.label.toLowerCase().includes(q) || unit.symbol.toLowerCase().includes(q))
      .map((unit) => ({ unit, value: unit.fromBase(fromU.toBase(n)) }));
  }, [cat, value, fromU, query]);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(text); setTimeout(() => setCopied(''), 1200); } catch { /* ignore */ }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="cv">
        <header className="cv-head">
          <button type="button" className="icon" onClick={() => navigate('/calcular')} aria-label="Volver">←</button>
          <div className="titles">
            <h1>Conversión</h1>
            <p>{CATEGORIES.length} magnitudes ·</p>
          </div>
          <div className="menu-wrap">
            <button type="button" className="ghost" onClick={() => setMenu((s) => !s)} aria-expanded={menu}>Módulos ▾</button>
            {menu && (
              <div className="drop">
                {LINKS.map((l) => <button key={l.path} type="button" onClick={() => navigate(l.path)}>{l.name}</button>)}
              </div>
            )}
          </div>
        </header>

        <main className="cv-main">
          <label className="topic">Buscar magnitud
            <input value={catQuery} onChange={(e) => setCatQuery(e.target.value)} placeholder="tiempo, velocidad, propina…" />
          </label>
          <div className="cats">
            {visibleCats.map((item) => (
              <button key={item.id} type="button" className={item.id === cat.id ? 'on' : ''} onClick={() => pick(item.id)}>{item.name}</button>
            ))}
          </div>

          <section className="panel">
            <div className="panel-top">
              <h2>{cat.name}</h2>
              <span>Base: {cat.base}</span>
            </div>
            {cat.note && <p className="note">{cat.note}</p>}
            <div className="grid">
              <label>Valor
                <input value={value} inputMode="decimal" onChange={(e) => setValue(e.target.value)} />
              </label>
              <label>Desde
                <select value={from} onChange={(e) => setFrom(e.target.value)}>
                  {cat.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.label} ({unit.symbol})</option>)}
                </select>
              </label>
              <button type="button" className="swap" onClick={() => { setFrom(to); setTo(from); }} aria-label="Intercambiar">⇄</button>
              <label>Hacia
                <select value={to} onChange={(e) => setTo(e.target.value)}>
                  {cat.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.label} ({unit.symbol})</option>)}
                </select>
              </label>
            </div>
            <div className="result">
              <span>Resultado</span>
              <strong>{result === null ? 'Escribe un número' : `${fmt(result)} ${toU.symbol}`}</strong>
              <button type="button" className="copy" onClick={() => result !== null && copy(`${fmt(result)} ${toU.symbol}`)}>
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-top">
              <h2>Todas las formas</h2>
              <input className="search" placeholder="Filtrar unidad" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <ul className="all">
              {table.map(({ unit, value: v }) => (
                <li key={unit.id} className={unit.id === to ? 'on' : ''}>
                  <button type="button" onClick={() => setTo(unit.id)}>
                    <b>{unit.symbol}</b>
                    <span>{unit.label}</span>
                  </button>
                  <em>{fmt(v)}</em>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </>
  );
}

const CSS = `
.cv{min-height:100dvh;color:#f6f6f8;font-family:var(--font-main,system-ui,sans-serif);background:#07070c url('/images/backgrounds/TA.png') center/cover;     background-size: 697px 1159px;
    background-repeat: repeat; 
    background-position: center center; position:relative}
.cv::before{content:'';position:fixed;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.64),rgba(0,0,0,.44) 38%,rgba(0,0,0,.7))}
.cv-head{position:sticky;top:0;z-index:60;display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(8,8,10,.78);border-bottom:1px solid rgba(255,26,26,.4);backdrop-filter:blur(16px);overflow:visible}
.cv-main{position:relative;z-index:1}
.titles{flex:1;min-width:0}
.cv-head h1{margin:0;font-size:1.02rem;letter-spacing:.16em;text-transform:uppercase;color:#ff1a1a}
.cv-head p{margin:2px 0 0;color:#d0d0d8;font-size:.76rem}
.menu-wrap{position:relative;flex:0 0 auto}
.drop{position:absolute;top:calc(100% + 8px);right:0;width:230px;padding:6px;border-radius:14px;background:rgba(12,12,14,.98);border:1px solid rgba(255,26,26,.5);display:flex;flex-direction:column;gap:4px;z-index:80;box-shadow:0 18px 40px rgba(0,0,0,.5)}
.drop button{text-align:left;border:0;border-radius:10px;padding:11px 12px;background:rgba(255,255,255,.04);color:#fff;cursor:pointer;font-weight:650}
.drop button:hover{background:rgba(255,42,42,.18)}
.icon,.ghost,.swap,.copy,.cats button{border:1px solid #2a2a32;color:#f4f4f8;cursor:pointer;background:linear-gradient(180deg,#2c2c34,#121216)}
.icon{width:42px;height:42px;border-radius:14px;font-size:1.15rem}
.ghost{border-radius:999px;padding:10px 14px;font-size:.78rem;font-weight:700}
.cv-main{max-width:1080px;margin:0 auto;padding:16px 14px 48px;display:flex;flex-direction:column;gap:14px}
.topic{margin:0}
.cats{display:flex;gap:8px;overflow:auto;padding-bottom:2px;scrollbar-width:none}
.cats button{flex:0 0 auto;border-radius:999px;padding:8px 12px;font-size:.78rem;font-weight:700}
.cats button.on{background:linear-gradient(180deg,#ff3b3b,#9f1230);border-color:#ff8a8a}
.panel{border-radius:22px;padding:16px;background:rgba(10,10,12,.74);border:1px solid rgba(255,26,26,.3);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 16px 40px rgba(0,0,0,.35)}
.panel-top{display:flex;justify-content:space-between;gap:12px;align-items:center}
.panel h2{margin:0;font-size:1.12rem;color:#fff}
.panel-top span,.note{color:#c8c8d2;font-size:.82rem}
.note{margin:8px 0 0;line-height:1.4}
.grid{display:grid;grid-template-columns:1.2fr 1fr auto 1fr;gap:10px;align-items:end;margin-top:14px}
label{display:flex;flex-direction:column;gap:6px;font-size:.75rem;color:#d0d0d8;font-weight:650}
input,select{width:100%;box-sizing:border-box;border-radius:14px;padding:12px;color:#fff;font-size:1rem;border:1px solid rgba(255,255,255,.16);background:#111116;outline:none}
input:focus,select:focus{border-color:#ff1a1a;box-shadow:0 0 0 3px rgba(255,26,26,.22)}
.swap{height:46px;width:46px;border-radius:14px;font-size:1.2rem}
.result{margin-top:14px;padding:14px;border-radius:16px;background:linear-gradient(180deg,rgba(255,26,26,.16),rgba(255,26,26,.06));border:1px solid rgba(255,26,26,.4);display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:center}
.result span{font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:#ffb4b4}
.result strong{grid-column:1;font-size:clamp(1.35rem,3vw,2rem);font-variant-numeric:tabular-nums;word-break:break-all}
.copy{border-radius:12px;padding:10px 12px}
.search{max-width:240px}
.all{list-style:none;margin:12px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px;max-height:52vh;overflow:auto}
.all li{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 10px;border-radius:12px;background:#121216;border:1px solid #2a2a32}
.all li.on{border-color:#ff2a2a;background:#1a1012}
.all button{border:0;background:transparent;color:#fff;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:2px;min-width:0}
.all b{color:#ff4d4d;font-family:var(--font-mono,ui-monospace,monospace)}
.all span{color:#c8c8d2;font-size:.78rem}
.all em{font-style:normal;font-variant-numeric:tabular-nums;font-size:.9rem}
@media(max-width:760px){.grid{grid-template-columns:1fr}.swap{width:100%;height:42px}.all{grid-template-columns:1fr;max-height:none}.cv-head p{display:none}.search{max-width:140px}}
`;
