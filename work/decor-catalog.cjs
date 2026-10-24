var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/decorations/catalog.ts
var catalog_exports = {};
__export(catalog_exports, {
  ART: () => ART,
  CATALOG: () => CATALOG,
  FRAMES: () => FRAMES,
  SEPARATORS: () => SEPARATORS,
  SYMBOLS: () => SYMBOLS,
  frameText: () => frameText
});
module.exports = __toCommonJS(catalog_exports);
var motifs = [["Celestial", "\u2726", "\u2727", "\u22C6"], ["Lunar", "\u263E", "\u263D", "\u22C6"], ["Rom\xE1ntico", "\u2661", "\u2665", "\u0B68\u0B67"], ["Bot\xE1nico", "\u2740", "\u273F", "\u2741"], ["Real", "\u2654", "\u2655", "\u269C"], ["G\xF3tico", "\u2020", "\u2720", "\u2671"], ["Cristal", "\u25C7", "\u25C6", "\u25C8"], ["Estelar", "\u2606", "\u2605", "\u2729"], ["Amino", "\u0B68\u0B67", "\uA4B0 \uA4B1", "\u22B9"], ["Marino", "\u2248", "\u224B", "\u3030"], ["Minimalista", "\xB7", "\u2022", "\u22C5"], ["Astral", "\u263C", "\u2600", "\u273A"], ["Flechas", "\u21A0", "\u219E", "\u27B3"], ["Nieve", "\u2745", "\u2746", "\u273B"], ["Oriental", "\u300C", "\u300D", "\u203B"], ["Musical", "\u266A", "\u266B", "\u266C"], ["Filigrana", "\u2766", "\u2767", "\u2619"], ["Imperial", "\u269C", "\u265B", "\u265A"], ["Ne\xF3n", "\u2301", "\u232C", "\u27E1"], ["Alas", "\u029A", "\u025E", "\u0F04"], ["Oc\xE9ano", "\u{1319D}", "\u{1319F}", "\u{131FC}"], ["Encantado", "\u2765", "\u10E6", "\u2763"], ["Medieval", "\u2694", "\u26E8", "\u2670"], ["Cosmos", "\u2735", "\u2736", "\u2737"]];
var SEPARATORS = motifs.flatMap(([name, a, b, c], i) => [
  `\u2500\u2500\u2500\u2500 ${a} \u2500\u2500\u2500\u2500`,
  `\u2501\u2501\u2501 ${b} \u2501\u2501\u2501`,
  `\u22C5\u2500\u2500\u2500 ${a} ${b} ${a} \u2500\u2500\u2500\u22C5`,
  `\u2576\u2574\u2576\u2574 ${c} \u2576\u2574\u2576\u2574`,
  `${a} \xB7 . \xB7 ${b} \xB7 . \xB7 ${a}`,
  `\u2022\u2500\u2500\u2500\u2500\u2500\u2500 ${c} \u2500\u2500\u2500\u2500\u2500\u2500\u2022`,
  `\u256D\u2500\u2500\u2500\u2500 ${a} \u2500\u2500\u2500\u2500\u256E`,
  `\u2570\u2500\u2500\u2500\u2500 ${b} \u2500\u2500\u2500\u2500\u256F`,
  `${a} \u2508\u2508\u2508 ${b} \u2508\u2508\u2508 ${a}`,
  `\u2550 \u22C6 \u2550 ${c} \u2550 \u22C6 \u2550`,
  `\uFE36\uFE36\uFE36 ${a} \uFE36\uFE36\uFE36`,
  `\u231C \u2500\u2500\u2500 ${b} \u2500\u2500\u2500 \u231D`,
  `\u254C\u254C\u254C \u22C6 ${a} \u22C6 \u254C\u254C\u254C`,
  `${c} \u2550\u2550\u2550\u2550 ${b} \u2550\u2550\u2550\u2550 ${c}`,
  `-\u02CB\u02CF ${a} \u2501\u2501 ${b} \u02CE\u02CA-`,
  `${a} \u2500\u2500 \xB7 \xB7 \xB7 \u2500\u2500 ${b}`,
  `\u250A \u250A ${c} \u250A \u250A`,
  `\u22B9 \u2500\u2500\u2500\u2500\u2500 ${a} \u2500\u2500\u2500\u2500\u2500 \u22B9`,
  `\u0F3A ${a} \u2500\u2500\u2500 ${b} \u0F3B`,
  `\xB7: ${c} :\xB7 \u2501\u2501 \xB7: ${a} :\xB7`,
  `\u22C6\uFF61\xB0\u2729 ${a} \u2500\u2500 ${b} \u2729\xB0\uFF61\u22C6`,
  `\u256D\u254C ${a} \u254C\u256E \u22B9 \u256D\u254C ${b} \u254C\u256E`,
  `\u2022\xB0\u2022 ${c} \u2500\u2500\u2500\u2500\u2500 ${a} \u2022\xB0\u2022`,
  `\u22B1 ${a} \u2550\u2550\u2550 ${b} \u22B0`,
  `\u22C6\u207A\u208A\u22C6 ${c} \u22C6\u207A\u208A\u22C6`,
  `\u231E ${a} \u254C\u254C\u254C\u254C\u254C ${b} \u231D`,
  `\u02DA \u0F18 ${c} \u22C6\uFF61\u02DA ${a}`,
  `\u2504\u2504\u2504 ${a} \u27E1 ${b} \u2504\u2504\u2504`,
  `\u2554\u2550 ${a} \u2550\u2561 ${c} \u255E\u2550 ${b} \u2550\u2557`,
  `\u2727\uFF65\uFF9F ${a} \u2500\u2500 ${b} \uFF65\uFF9F\u2727`
].map((text, j) => ({ id: `sep-${i}-${j}`, name: `${name} ${j + 1}`, category: name, text })));
var FRAMES = motifs.flatMap(([name, a, b, c], i) => [
  [`\u256D\u2500\u2500\u2500\u2500\u2500\u2500 ${a} \u2500\u2500\u2500\u2500\u2500\u2500\u256E`, `\u2570\u2500\u2500\u2500\u2500\u2500\u2500 ${b} \u2500\u2500\u2500\u2500\u2500\u2500\u256F`],
  [`\u250F\u2501\u2501\u2501\u2501\u2501\u2501 ${c} \u2501\u2501\u2501\u2501\u2501\u2501\u2513`, `\u2517\u2501\u2501\u2501\u2501\u2501\u2501 ${c} \u2501\u2501\u2501\u2501\u2501\u2501\u251B`],
  [`\u2554\u2550\u2550\u2550\u2550\u2550\u2550 ${a} \u2550\u2550\u2550\u2550\u2550\u2550\u2557`, `\u255A\u2550\u2550\u2550\u2550\u2550\u2550 ${b} \u2550\u2550\u2550\u2550\u2550\u2550\u255D`],
  [`\u250C \u2500 \xB7 ${a} \xB7 \u2500 \u2510`, `\u2514 \u2500 \xB7 ${b} \xB7 \u2500 \u2518`],
  [`\u0F3A\u2501\u2501\u2501\u2501 ${a} \u2501\u2501\u2501\u2501\u0F3B`, `\u0F3A\u2501\u2501\u2501\u2501 ${b} \u2501\u2501\u2501\u2501\u0F3B`],
  [`${a} \u2508\u2508\u2508\u2508 ${c} \u2508\u2508\u2508\u2508 ${a}`, `${b} \u2508\u2508\u2508\u2508 ${c} \u2508\u2508\u2508\u2508 ${b}`],
  [`\u02DA\u208A\xB7 \u035F\u035F\u035E\u035E\u27B3 ${a} \u256D\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`, `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F ${b} \xB7\u208A\u02DA`],
  [`\u300C ${a} \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`, `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 ${b} \u300D`],
  [`\u256D\u2500\u2756 ${a} \u2756\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`, `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2756 ${b} \u2756\u2500\u256F`],
  [`\u2727\uFF65\uFF9F ${a} \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557`, `\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D ${b} \uFF65\uFF9F\u2727`],
  [`\u250D\u2501\u2501 ${c} \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2511`, `\u2515\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501 ${c} \u2501\u2501\u2519`],
  [`\u22B1\u22C5 \u2500\u2500 ${a} \u2500\u2500 \u22C5\u22B0`, `\u22B1\u22C5 \u2500\u2500 ${b} \u2500\u2500 \u22C5\u22B0`],
  [`\u2554\u254C\u254C\u254C\u254C ${a} \u254C\u254C\u254C\u254C\u2557`, `\u255A\u254C\u254C\u254C\u254C ${b} \u254C\u254C\u254C\u254C\u255D`],
  [`\uFF61\uFF65:*:\uFF65\uFF9F ${a} \uFF9F\uFF65:*:\uFF65\uFF61`, `\uFF61\uFF65:*:\uFF65\uFF9F ${b} \uFF9F\uFF65:*:\uFF65\uFF61`],
  [`\u2500\u2500\u2500 \u22C6\u22C5 ${a} \u22C5\u22C6 \u2500\u2500\u2500`, `\u2500\u2500\u2500 \u22C6\u22C5 ${b} \u22C5\u22C6 \u2500\u2500\u2500`],
  [`\u250F\u2501 ${a} \u2501\u2501\u2501\u2501\u2501 ${c} \u2501\u2513`, `\u2517\u2501 ${b} \u2501\u2501\u2501\u2501\u2501 ${c} \u2501\u251B`],
  [`\u231C\u2550\u2550\u2550\u2550 ${a} \u2550\u2550\u2550\u2550\u231D`, `\u231E\u2550\u2550\u2550\u2550 ${b} \u2550\u2550\u2550\u2550\u231F`],
  [`\u2553\u2500\u2500\u2500\u2500 ${c} \u2500\u2500\u2500\u2500\u2556`, `\u2559\u2500\u2500\u2500\u2500 ${c} \u2500\u2500\u2500\u2500\u255C`],
  [`\u25C7\u2501\u2501 ${a} \u2501\u2501\u2501\u2501\u2501\u2501\u25C7`, `\u25C7\u2501\u2501\u2501\u2501\u2501\u2501 ${b} \u2501\u2501\u25C7`],
  [`\uFE35\u203F\uFE35 ${a} \uFE35\u203F\uFE35`, `\uFE36\u203F\uFE36 ${b} \uFE36\u203F\uFE36`]
].map(([text, bottom], j) => ({ id: `frame-${i}-${j}`, name: `${name} ${j + 1}`, category: name, text, bottom })));
var blocks = [["Flechas", 8592, 8703], ["Flechas", 10224, 10239], ["Flechas", 10496, 10623], ["Flechas", 129024, 129279], ["Matem\xE1ticas", 8704, 8959], ["Matem\xE1ticas", 10176, 10223], ["Matem\xE1ticas", 10624, 11007], ["Geometr\xEDa", 9632, 9727], ["Ornamentos", 9984, 10175], ["Ornamentos", 11008, 11263], ["Marcos y l\xEDneas", 9472, 9631], ["Braille y puntos", 10240, 10495], ["M\xFAsica", 119040, 119295], ["Monedas", 8352, 8399], ["T\xE9cnicos", 8960, 9215], ["Letras griegas", 880, 1023], ["Alfabetos decorativos", 119808, 120831], ["Letras y n\xFAmeros", 8448, 8591], ["Letras y n\xFAmeros", 9312, 9471], ["Letras y n\xFAmeros", 127232, 127487], ["Puntuaci\xF3n", 8192, 8303], ["Puntuaci\xF3n", 11776, 11903], ["Orientales", 12289, 12351], ["Egipcios", 77824, 78895], ["Emoji y s\xEDmbolos", 9728, 9983], ["Emoji y s\xEDmbolos", 127744, 128591], ["Transporte", 128640, 128767], ["Emoji y s\xEDmbolos", 129280, 129791]];
var SYMBOLS = blocks.flatMap(([category, a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i).filter((n) => !/[\p{Cn}\p{C}\p{Z}\p{M}]/u.test(String.fromCodePoint(n))).map((n) => ({ id: `symbol-${n}`, name: `${category} \xB7 U+${n.toString(16).toUpperCase()}`, category, text: String.fromCodePoint(n) })));
var EMOJI = ["\u{1F469}\u200D\u{1F4BB}", "\u{1F468}\u200D\u{1F4BB}", "\u{1F9D1}\u200D\u{1F3A8}", "\u{1F3F3}\uFE0F\u200D\u{1F308}", "\u{1F3F3}\uFE0F\u200D\u26A7\uFE0F", "\u2764\uFE0F", "\u2764\uFE0F\u200D\u{1F525}", "\u2764\uFE0F\u200D\u{1FA79}", "\u2601\uFE0F", "\u2600\uFE0F", "\u2744\uFE0F", "\u2B50", "\u2728", "\u{1F338}", "\u{1F98B}", "\u{1F54A}\uFE0F", "\u{1F339}", "\u{1F3AD}", "\u2694\uFE0F", "\u{1F6E1}\uFE0F", "\u{1F408}\u200D\u2B1B", "\u{1F415}\u200D\u{1F9BA}", "\u{1F451}", "\u{1F4AB}", "\u{1F30C}", "\u{1FAB7}", "\u{1FAF6}", "\u{1FAE7}"];
for (const [i, text] of EMOJI.entries()) SYMBOLS.push({ id: `emoji-${i}`, name: "Emoji compuesto " + (i + 1), category: "Emoji compuestos", text });
var originalArt = [
  ["ASCII", "Gato curioso", " /_/\\\n( o.o )\n > ^ <"],
  ["ASCII", "B\xFAho nocturno", ' ,_,\n(O,O)\n(   )\n-"-"-'],
  ["ASCII", "Pez", "   /`\xB7.\xB8\n  /\xB8...\xB8`:\xB7\n  `\xB7.\xB8.\xB7\xB4\n     `\xB7"],
  ["ASCII", "Caf\xE9", "   ( (\n    ) )\n .------.\n |      |] \n \\      /\n  `----\xB4"],
  ["ASCII", "Espada", "     /\\\n     ||\n     ||\n  ===++===\n     ||\n     ()"],
  ["ASCII", "Cohete", "    /\\\n   /  \\\n  | () |\n  |    |\n /|    |\\\n/_|____|_\\\n   /  \\\n   ^^^^"],
  ["ASCII", "Libro abierto", "  ____  ____\n /    \\/    \\\n|      |     |\n|      |     |\n|______|_____|"],
  ["ASCII", "Monta\xF1as", "      /\\\n  /\\ /  \\  /\\\n /  /    \\/  \\\n/__/______\\___\\"],
  ["ASCII", "Conejo", ' (\\_/)\n (o.o)\n (")(")'],
  ["ASCII", "Rat\xF3n", "  ()_()\n ( o.o )\n  > ^ <"],
  ["ASCII", "P\xE1jaro", "  __\n<(o )___\n ( ._> /\n  `---\xB4"],
  ["ASCII", "Mariposa", " .==.   .==.\n \\()8\\ /8()/\n  \\___V___/\n  /___^___\\\n  \\()8/ \\8()/"],
  ["ASCII", "Castillo", " []   []   []\n |____|____|\n |  _   _  |\n | |_| |_| |\n |    _    |\n |___| |___|"],
  ["ASCII", "Sobre", " .----------.\n |\\        /|\n | \\      / |\n |  \\____/  |\n |__________|"],
  ["Text Art", "Gato lunar", "  /_/\\  \u263E\n ( \u02F6\u1D54 \u1D55 \u1D54\u02F6 )\n  / > \u2661 < \\"],
  ["Text Art", "Flor", "     \u273F\n  \u2740  \u2502  \u2740\n   \u2572 \u2502 \u2571\n    \u2572\u2502\u2571\n     \u2502\n    \u2571 \u2572"],
  ["Text Art", "Abrazo", "\u0295\u3063\u2022\u1D25\u2022\u0294\u3063\n  \u2661 para ti \u2661"],
  ["Text Art", "Noche de estrellas", "     \u2727         \u22C6\n  \u22C6       \u263E\n      \u2726        \u2727\n \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u22C6\u2500\u2500\u2500\u2500\u2500\u2500"],
  ["Text Art", "Corona", " \u2654   \u2655   \u2654\n \u2572\u2502\u2572 \u2502 \u2571\u2502\u2571\n  \u2550\u2550\u2550\u2550\u2550\u2550\u2550"],
  ["Text Art", "Pergamino", "\u256D\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E\n\u2502    TU ROL    \u2502\n\u2502              \u2502\n\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F"],
  ["Monospace", "Terminal", "+--------------------+\n| > HOLA, UNIVERSO_   |\n+--------------------+"],
  ["Monospace", "Dado", " .-------.\n/   o   /|\n+-------+|\n| o   o ||\n|   o   |/\n+-------+"],
  ["Dot Art", "Coraz\xF3n", "\u2800\u2800\u28E0\u28F6\u28F6\u28E6\u28C4\u2800\u28E0\u28F6\u28F6\u28E6\u28C4\n\u2800\u28FE\u28FF\u28FF\u28FF\u28FF\u28FF\u28FE\u28FF\u28FF\u28FF\u28FF\u28FF\u28F7\n\u2800\u28BF\u28FF\u28FF\u28FF\u28FF\u28FF\u28FF\u28FF\u28FF\u28FF\u28FF\u28FF\u287F\n\u2800\u2800\u283B\u28FF\u28FF\u28FF\u28FF\u28FF\u28FF\u28FF\u28FF\u28FF\u281F\n\u2800\u2800\u2800\u2800\u2819\u283F\u28FF\u28FF\u28FF\u28FF\u281F\n\u2800\u2800\u2800\u2800\u2800\u2800\u2808\u281B\u280B"],
  ["Dot Art", "Destello", "\u2800\u2800\u2800\u2800\u2880\u28C0\n\u2800\u2800\u2800\u2800\u28FE\u28FF\u2844\n\u2800\u28C0\u28E0\u28F4\u28FF\u28FF\u28E6\u28C4\u28C0\n\u2808\u281B\u283F\u28FF\u28FF\u28FF\u28FF\u283F\u281B\n\u2800\u2800\u2800\u2818\u28FF\u28FF\u2803\n\u2800\u2800\u2800\u2800\u2839\u280F"]
];
var ART = originalArt.map(([category, name, text], i) => ({ id: `art-${i}`, name, category, text: category === "ASCII" ? text.replace(/[^\x20-\x7e\n]/g, "'") : text }));
var shapes = [["Coraz\xF3n", (x, y) => (x * x + y * y - 1) ** 3 - x * x * y * y * y < 0], ["Luna", (x, y) => x * x + y * y < 1 && (x - 0.4) ** 2 + (y + 0.15) ** 2 > 0.8], ["Estrella", (x, y) => Math.hypot(x, y) < 0.62 + 0.28 * Math.cos(5 * Math.atan2(y, x))], ["Diamante", (x, y) => Math.abs(x) + Math.abs(y) < 1.15], ["Planeta", (x, y) => x * x + y * y < 0.5 || Math.abs(y + 0.35 * x) < 0.09 && Math.abs(x) < 1.1], ["Anillo", (x, y) => x * x + y * y < 1 && x * x + y * y > 0.65], ["Mariposa", (x, y) => ((Math.abs(x) - 0.5) * 1.6) ** 2 + (y * 1.3) ** 2 < 0.6], ["Flor", (x, y) => Math.hypot(x, y) < 0.65 + 0.2 * Math.cos(6 * Math.atan2(y, x))], ["Reloj de arena", (x, y) => Math.abs(x) < Math.abs(y) * 0.8 && Math.abs(y) < 1], ["\xC1rbol", (x, y) => y > -0.7 && Math.abs(x) < (y + 0.8) * 0.6 || y < -0.65 && Math.abs(x) < 0.13], ["Cruz", (x, y) => Math.abs(x) < 0.18 && Math.abs(y) < 1 || Math.abs(y - 0.3) < 0.18 && Math.abs(x) < 0.8], ["Onda", (x, y) => Math.abs(y - Math.sin(x * 5) * 0.5) < 0.12], ["Eclipse", (x, y) => x * x + y * y < 1 && (x + 0.45) ** 2 + y * y > 0.85], ["Portal", (x, y) => Math.abs(x) < 0.7 && Math.abs(y) < 1 && (Math.abs(x) > 0.5 || Math.abs(y) > 0.8)], ["Rombo doble", (x, y) => Math.abs(Math.abs(x) + Math.abs(y) - 0.8) < 0.13], ["Escudo", (x, y) => y < 0.9 && y > Math.abs(x) * 1.5 - 1 && Math.abs(x) < 0.7]];
for (const [i, [name, fn]] of shapes.entries()) for (const [j, [category, ink, blank]] of [["ASCII", "#", " "], ["Monospace", "@", " "], ["Text Art", "\u25C6", "\u3000"], ["Dot Art", "\u28FF", "\u2800"]].entries()) for (const size of [15, 23, 35]) {
  const rows = Array.from({ length: Math.round(size * 0.65) }, (_, y) => Array.from({ length: size }, (_2, x) => fn((x / (size - 1) - 0.5) * 2.5, (0.5 - y / (Math.round(size * 0.65) - 1)) * 2.5) ? ink : blank).join("").trimEnd());
  ART.push({ id: `shape-${i}-${j}-${size}`, name: `${name} \xB7 ${size === 15 ? "compacto" : size === 23 ? "detalle" : "panor\xE1mico"}`, category, text: rows.join("\n") });
}
var CATALOG = { separators: SEPARATORS, frames: FRAMES, symbols: SYMBOLS, art: ART };
function frameText(top, bottom, body, width = 24) {
  const wrap = (s) => s.replace(/─{4,}|━{4,}|═{4,}/g, (m) => m[0].repeat(Math.max(4, Math.min(48, width) - 8)));
  return wrap(top) + "\n" + body + "\n" + wrap(bottom);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ART,
  CATALOG,
  FRAMES,
  SEPARATORS,
  SYMBOLS,
  frameText
});
