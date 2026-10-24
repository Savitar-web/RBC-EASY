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

// src/decorations/text.ts
var text_exports = {};
__export(text_exports, {
  LETTER_STYLES: () => LETTER_STYLES,
  readableText: () => readableText,
  styledInput: () => styledInput,
  stylize: () => stylize
});
module.exports = __toCommonJS(text_exports);
var seq = (start, n = 26) => Array.from({ length: n }, (_, i) => String.fromCodePoint(start + i)).join("");
var LETTER_STYLES = [
  { id: "plain", name: "Original" },
  { id: "bold", name: "Serif negrita", upper: seq(119808), lower: seq(119834), digits: seq(120782, 10) },
  { id: "italic", name: "Serif cursiva", upper: seq(119860), lower: "\u{1D44E}\u{1D44F}\u{1D450}\u{1D451}\u{1D452}\u{1D453}\u{1D454}\u210E\u{1D456}\u{1D457}\u{1D458}\u{1D459}\u{1D45A}\u{1D45B}\u{1D45C}\u{1D45D}\u{1D45E}\u{1D45F}\u{1D460}\u{1D461}\u{1D462}\u{1D463}\u{1D464}\u{1D465}\u{1D466}\u{1D467}" },
  { id: "bold-italic", name: "Cursiva negrita", upper: seq(119912), lower: seq(119938) },
  { id: "script", name: "Caligraf\xEDa", upper: "\u{1D49C}\u212C\u{1D49E}\u{1D49F}\u2130\u2131\u{1D4A2}\u210B\u2110\u{1D4A5}\u{1D4A6}\u2112\u2133\u{1D4A9}\u{1D4AA}\u{1D4AB}\u{1D4AC}\u211B\u{1D4AE}\u{1D4AF}\u{1D4B0}\u{1D4B1}\u{1D4B2}\u{1D4B3}\u{1D4B4}\u{1D4B5}", lower: "\u{1D4B6}\u{1D4B7}\u{1D4B8}\u{1D4B9}\u212F\u{1D4BB}\u210A\u{1D4BD}\u{1D4BE}\u{1D4BF}\u{1D4C0}\u{1D4C1}\u{1D4C2}\u{1D4C3}\u2134\u{1D4C5}\u{1D4C6}\u{1D4C7}\u{1D4C8}\u{1D4C9}\u{1D4CA}\u{1D4CB}\u{1D4CC}\u{1D4CD}\u{1D4CE}\u{1D4CF}" },
  { id: "script-bold", name: "Caligraf\xEDa imperial", upper: seq(120016), lower: seq(120042) },
  { id: "gothic", name: "G\xF3tica", upper: "\u{1D504}\u{1D505}\u212D\u{1D507}\u{1D508}\u{1D509}\u{1D50A}\u210C\u2111\u{1D50D}\u{1D50E}\u{1D50F}\u{1D510}\u{1D511}\u{1D512}\u{1D513}\u{1D514}\u211C\u{1D516}\u{1D517}\u{1D518}\u{1D519}\u{1D51A}\u{1D51B}\u{1D51C}\u2128", lower: seq(120094) },
  { id: "gothic-bold", name: "G\xF3tica negrita", upper: seq(120172), lower: seq(120198) },
  { id: "double", name: "Doble trazo", upper: "\u{1D538}\u{1D539}\u2102\u{1D53B}\u{1D53C}\u{1D53D}\u{1D53E}\u210D\u{1D540}\u{1D541}\u{1D542}\u{1D543}\u{1D544}\u2115\u{1D546}\u2119\u211A\u211D\u{1D54A}\u{1D54B}\u{1D54C}\u{1D54D}\u{1D54E}\u{1D54F}\u{1D550}\u2124", lower: seq(120146), digits: seq(120792, 10) },
  { id: "sans", name: "Sans", upper: seq(120224), lower: seq(120250), digits: seq(120802, 10) },
  { id: "sans-bold", name: "Sans negrita", upper: seq(120276), lower: seq(120302), digits: seq(120812, 10) },
  { id: "sans-italic", name: "Sans inclinada", upper: seq(120328), lower: seq(120354) },
  { id: "sans-bi", name: "Sans negrita inclinada", upper: seq(120380), lower: seq(120406) },
  { id: "mono", name: "Monoespaciada Unicode", upper: seq(120432), lower: seq(120458), digits: seq(120822, 10) },
  { id: "wide", name: "Vaporwave", upper: seq(65313), lower: seq(65345), digits: seq(65296, 10) },
  { id: "circle", name: "Burbujas", upper: seq(9398), lower: seq(9424), digits: "\u24EA\u2460\u2461\u2462\u2463\u2464\u2465\u2466\u2467\u2468" },
  { id: "negative-circle", name: "Burbujas oscuras", upper: seq(127312), lower: seq(127312) },
  { id: "square", name: "Cuadrados", upper: seq(127280), lower: seq(127280) },
  { id: "negative-square", name: "Cuadrados oscuros", upper: seq(127344), lower: seq(127344) },
  { id: "small", name: "Versalitas", upper: "\u1D00\u0299\u1D04\u1D05\u1D07\uA730\u0262\u029C\u026A\u1D0A\u1D0B\u029F\u1D0D\u0274\u1D0F\u1D18\u01EB\u0280\uA731\u1D1B\u1D1C\u1D20\u1D21x\u028F\u1D22", lower: "\u1D00\u0299\u1D04\u1D05\u1D07\uA730\u0262\u029C\u026A\u1D0A\u1D0B\u029F\u1D0D\u0274\u1D0F\u1D18\u01EB\u0280\uA731\u1D1B\u1D1C\u1D20\u1D21x\u028F\u1D22" },
  { id: "super", name: "Super\xEDndice", upper: "\u1D2C\u1D2E\u1D9C\u1D30\u1D31\u1DA0\u1D33\u1D34\u1D35\u1D36\u1D37\u1D38\u1D39\u1D3A\u1D3C\u1D3E\u1D60\u1D3F\u02E2\u1D40\u1D41\u2C7D\u1D42\u02E3\u02B8\u1DBB", lower: "\u1D43\u1D47\u1D9C\u1D48\u1D49\u1DA0\u1D4D\u02B0\u2071\u02B2\u1D4F\u02E1\u1D50\u207F\u1D52\u1D56\u146B\u02B3\u02E2\u1D57\u1D58\u1D5B\u02B7\u02E3\u02B8\u1DBB", digits: "\u2070\xB9\xB2\xB3\u2074\u2075\u2076\u2077\u2078\u2079" },
  { id: "underline", name: "Subrayado", mark: "\u0332" },
  { id: "double-line", name: "Doble subrayado", mark: "\u0333" },
  { id: "strike", name: "Tachado fino", mark: "\u0336" },
  { id: "slash", name: "Trazo diagonal", mark: "\u0338" },
  { id: "overline", name: "L\xEDnea superior", mark: "\u0305" },
  { id: "dots", name: "Puntos superiores", mark: "\u0307" },
  { id: "spark", name: "Destellos", mark: "\u0359" },
  { id: "wave", name: "Onda superior", mark: "\u0303" }
];
for (const style of LETTER_STYLES.slice(1, 21)) for (const [id, name, mark] of [["under", "subrayada", "\u0332"], ["double", "doble l\xEDnea", "\u0333"], ["over", "l\xEDnea superior", "\u0305"], ["strike", "tachada", "\u0336"]]) LETTER_STYLES.push({ ...style, id: style.id + "-" + id, name: style.name + " \xB7 " + name, mark });
var source = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
var maps = new Map(LETTER_STYLES.map((s) => [s.id, new Map([...source].map((c, i) => [c, [...i < 26 ? s.upper || source.slice(0, 26) : i < 52 ? s.lower || source.slice(26, 52) : s.digits || source.slice(52)][i < 26 ? i : i < 52 ? i - 26 : i - 52]]))]));
function stylize(text, id) {
  const style = LETTER_STYLES.find((s) => s.id === id) || LETTER_STYLES[0], map = maps.get(style.id);
  return [...readableText(text).normalize("NFD")].map((c) => {
    if (/\p{M}/u.test(c)) return c;
    const next = map.get(c) || c;
    return next + (style.mark && /\p{L}|\p{N}/u.test(c) ? style.mark : "");
  }).join("");
}
function styledInput(previous, next, caret, id, data) {
  let start = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++;
  if (start && /[\uDC00-\uDFFF]/.test(next[start] || "")) start--;
  let a = previous.length, b = next.length;
  while (a > start && b > start && previous[a - 1] === next[b - 1]) {
    a--;
    b--;
  }
  if (b < next.length && /[\uDC00-\uDFFF]/.test(next[b])) b++;
  if (data && next.slice(caret - data.length, caret) === data) {
    start = caret - data.length;
    b = caret;
  }
  const inserted = next.slice(start, b), converted = stylize(inserted, id), value = next.slice(0, start) + converted + next.slice(b);
  return { value, caret: caret >= b ? caret + converted.length - inserted.length : start + converted.length };
}
var reverse = /* @__PURE__ */ new Map();
for (const style of LETTER_STYLES) for (const [i, c] of [...(style.upper || source.slice(0, 26)) + (style.lower || source.slice(26, 52)) + (style.digits || source.slice(52))].entries()) if (c !== source[i]) reverse.set(c, source[i]);
function readableText(text) {
  return [...text.normalize("NFKC")].map((c) => reverse.get(c) || c).join("").replace(/[\u0332\u0333\u0336\u0338\u0305\u0359]/g, "");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LETTER_STYLES,
  readableText,
  styledInput,
  stylize
});
