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

// src/pwa/transfer.ts
var transfer_exports = {};
__export(transfer_exports, {
  download: () => download,
  parallelism: () => parallelism
});
module.exports = __toCommonJS(transfer_exports);
var PARTS = "rbc-download-parts-v1";
var CHUNK = 4 * 1024 * 1024;
function parallelism() {
  const n = navigator;
  return n.connection?.saveData || /^(slow-)?2g$/.test(n.connection?.effectiveType || "") ? 1 : (n.deviceMemory || 4) < 4 ? 2 : /Android|iPhone|iPad/i.test(n.userAgent || "") ? 3 : 4;
}
var aborted = () => new DOMException("Descarga pausada", "AbortError");
function requestSignal(signal) {
  const controller = new AbortController();
  let timer;
  const reset = () => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(new Error("La conexi\xF3n no respondi\xF3 durante 45 segundos")), 45e3);
  };
  const cancel = () => controller.abort(aborted());
  if (signal?.aborted) cancel();
  else signal?.addEventListener("abort", cancel, { once: true });
  reset();
  return { signal: controller.signal, reset, close() {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  } };
}
async function body(response, size, progress, request) {
  if (!response.ok || !response.body) throw Error("Servidor HTTP " + response.status);
  const reader = response.body.getReader(), chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      request.reset();
      bytes += part.value.byteLength;
      if (bytes > size) throw Error("Tama\xF1o de archivo inesperado");
      chunks.push(part.value);
      progress(bytes, part.value.byteLength);
    }
    if (bytes !== size) throw Error("Archivo incompleto (" + bytes + " de " + size + " bytes)");
    return new Blob(chunks, { type: response.headers.get("content-type") || "application/octet-stream" });
  } catch (error) {
    await reader.cancel().catch(() => {
    });
    throw error;
  } finally {
    reader.releaseLock();
  }
}
async function download(url, size, onProgress, signal) {
  const one = async () => {
    const request = requestSignal(signal);
    try {
      return { blob: await body(await fetch(url, { signal: request.signal, cache: "default" }), size, onProgress, request), cleanup: async () => {
      } };
    } finally {
      request.close();
    }
  };
  if (size < 8 * 1024 * 1024) return one();
  const probe = requestSignal(signal);
  let version = "";
  try {
    const response = await fetch(url + (url.includes("?") ? "&" : "?") + "rbc_range=probe", { headers: { Range: "bytes=0-0" }, signal: probe.signal });
    const range = response.headers.get("content-range");
    version = response.headers.get("etag") || "";
    if (response.status !== 206 || range !== "bytes 0-0/" + size || !version) {
      if (response.status === 200) return { blob: await body(response, size, onProgress, probe), cleanup: async () => {
      } };
      await response.body?.cancel();
      return one();
    }
    await response.body?.cancel();
  } catch (error) {
    if (signal?.aborted) throw aborted();
    return one();
  } finally {
    probe.close();
  }
  const cache = await caches.open(PARTS), key = (start, end) => "https://rbc-parts.invalid/" + encodeURIComponent(url) + "?version=" + encodeURIComponent(version) + "&range=" + start + "-" + end;
  const parts = Array.from({ length: Math.ceil(size / CHUNK) }, (_, i) => ({ start: i * CHUNK, end: Math.min(size - 1, (i + 1) * CHUNK - 1) })), progress = /* @__PURE__ */ new Map(), keys = parts.map((p) => key(p.start, p.end));
  const report = (delta = 0) => onProgress([...progress.values()].reduce((a, b) => a + b, 0), delta);
  let cursor = 0, failure;
  await Promise.all(Array.from({ length: parallelism() }, async () => {
    while (cursor < parts.length && !failure) {
      const part = parts[cursor++], length = part.end - part.start + 1, k = key(part.start, part.end);
      try {
        const hit = await cache.match(k);
        if (hit && hit.headers.get("x-rbc-size") === String(length)) {
          progress.set(part.start, length);
          report();
          continue;
        }
        for (let attempt = 0; attempt < 3; attempt++) {
          const request = requestSignal(signal);
          try {
            const response = await fetch(url + (url.includes("?") ? "&" : "?") + "rbc_range=" + part.start + "-" + part.end, { headers: { Range: "bytes=" + part.start + "-" + part.end }, signal: request.signal, cache: attempt ? "reload" : "default" });
            if (response.status !== 206 || response.headers.get("content-range") !== "bytes " + part.start + "-" + part.end + "/" + size || response.headers.get("etag") !== version) {
              await response.body?.cancel();
              throw Error("El servidor cambi\xF3 la versi\xF3n o no respet\xF3 el segmento solicitado");
            }
            const blob = await body(response, length, (n, delta) => {
              progress.set(part.start, n);
              report(delta);
            }, request);
            await cache.put(k, new Response(blob, { headers: { "x-rbc-size": String(length) } }));
            progress.set(part.start, length);
            report();
            break;
          } catch (error) {
            progress.set(part.start, 0);
            report();
            if (signal?.aborted) throw aborted();
            if (error.name === "QuotaExceededError" || attempt === 2) throw error;
          } finally {
            request.close();
          }
        }
      } catch (error) {
        failure = error;
      }
    }
  }));
  if (signal?.aborted) throw aborted();
  if (failure) throw failure;
  const blobs = [];
  for (let i = 0; i < parts.length; i++) {
    const hit = await cache.match(keys[i]);
    if (!hit) throw Error("Un segmento fue eliminado. Reintenta para recuperarlo.");
    const blob = await hit.blob();
    if (blob.size !== parts[i].end - parts[i].start + 1) {
      await cache.delete(keys[i]);
      throw Error("Segmento incompleto; reintenta la descarga");
    }
    blobs.push(blob);
  }
  return { blob: new Blob(blobs, { type: "application/octet-stream" }), cleanup: async () => {
    for (const k of keys) await cache.delete(k);
  } };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  download,
  parallelism
});
