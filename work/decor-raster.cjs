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

// src/decorations/raster.ts
var raster_exports = {};
__export(raster_exports, {
  rasterArt: () => rasterArt
});
module.exports = __toCommonJS(raster_exports);
function rasterArt(rgba, width, height, dots, invert = false, contrast = 1) {
  const gray = (x, y) => {
    const i = (y * width + x) * 4, a = rgba[i + 3] / 255, l = (0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) * a + 255 * (1 - a);
    const v = Math.max(0, Math.min(255, (l - 128) * contrast + 128));
    return invert ? 255 - v : v;
  };
  if (!dots) {
    const ramp = "@%#*+=-:. ";
    return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_2, x) => ramp[Math.min(ramp.length - 1, Math.floor(gray(x, y) / 256 * ramp.length))]).join("")).join("\n");
  }
  const bits = [[0, 3], [1, 4], [2, 5], [6, 7]], dither = [[0, 4], [6, 2], [1, 5], [7, 3]], rows = [];
  for (let y = 0; y < height; y += 4) {
    let line = "";
    for (let x = 0; x < width; x += 2) {
      let mask = 0;
      for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 2; dx++) if (x + dx < width && y + dy < height && gray(x + dx, y + dy) < 96 + dither[dy][dx] * 9) mask |= 1 << bits[dy][dx];
      line += String.fromCodePoint(10240 + mask);
    }
    rows.push(line);
  }
  return rows.join("\n");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  rasterArt
});
