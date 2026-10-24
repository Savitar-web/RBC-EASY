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

// src/lib/roleFormat.ts
var roleFormat_exports = {};
__export(roleFormat_exports, {
  localFigures: () => localFigures,
  roleCSS: () => roleCSS,
  roleHtml: () => roleHtml
});
module.exports = __toCommonJS(roleFormat_exports);
var esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
function roleHtml(text, figures = []) {
  const tokens = [];
  const token = (html2) => {
    tokens.push(html2);
    return `\uE000${tokens.length - 1}\uE001`;
  };
  let source = String(text || "");
  source = source.replace(/```([\s\S]*?)```/g, (_, code) => token(`<pre class="role-code"><code>${esc(code.replace(/^\n/, ""))}</code></pre>`));
  source = source.replace(/`([^`\n]+)`/g, (_, code) => token(`<code class="role-inline-code">${esc(code)}</code>`));
  for (const fig of figures) {
    if (!/^\[(?:Figura \d+\.\d+|PDF página \d+)\]$/.test(fig.tag)) continue;
    if (!/^(data:image\/(?:png|jpeg|webp|gif|bmp);base64,|blob:|https:\/\/|\/images\/)/i.test(fig.src) || fig.isVideo) continue;
    source = source.split(fig.tag).join(token(`<figure class="role-figure"><img src="${esc(fig.src)}" alt="${esc(fig.tag)}" loading="lazy" draggable="false"/></figure>`));
  }
  const inline = (s) => s.replace(/\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g, (_, a, b) => `<strong>${a || b}</strong>`).replace(/__([^_\n]+)__/g, "<u>$1</u>").replace(/_([^_\n]+)_/g, "<em>$1</em>").replace(/~~([^~\n]+)~~|~([^~\n]+)~/g, (_, a, b) => `<s>${a || b}</s>`);
  let html = esc(source).split("\n").map((line) => {
    const prefix = line.match(/^((?:\[[BUISC]+\])+)/i);
    if (prefix) {
      const codes = prefix[1].replace(/[\[\]]/g, "").toUpperCase();
      line = inline(line.slice(prefix[0].length));
      for (const [key, tag] of [["B", "strong"], ["I", "em"], ["U", "u"], ["S", "s"]]) if (codes.includes(key)) line = `<${tag}>${line}</${tag}>`;
      if (codes.includes("C")) line = `<div class="role-center">${line}</div>`;
      return line;
    }
    if (line.startsWith("&gt; ")) return `<blockquote>${inline(line.slice(5))}</blockquote>`;
    return inline(line);
  }).join("<br/>");
  html = html.replace(/\uE000(\d+)\uE001/g, (_, n) => tokens[+n] || "");
  return html;
}
function localFigures() {
  try {
    const list = JSON.parse(localStorage.getItem("figureStore") || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
var roleCSS = `.role-content{font:18px/1.85 Georgia,var(--rbc-unicode,serif),serif;overflow-wrap:anywhere;white-space:normal}.role-content strong{font-weight:700}.role-content em{font-style:italic}.role-center{text-align:center}.role-code{display:block;white-space:pre;max-width:100%;overflow-wrap:normal;overflow:auto;padding:18px;border:1px solid currentColor;border-radius:12px;background:#80808012;font:14px/1.65 monospace,var(--rbc-unicode,monospace)}.role-inline-code{padding:2px 5px;border-radius:4px;background:#80808020;font-family:monospace}.role-content blockquote{border-left:3px solid var(--ui-accent,#bc2238);padding:6px 18px;margin:12px 0;opacity:.85}.role-figure{margin:18px 0;text-align:center;break-inside:avoid}.role-figure img{max-width:100%;height:auto;display:block;margin:auto;border-radius:8px}`;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  localFigures,
  roleCSS,
  roleHtml
});
