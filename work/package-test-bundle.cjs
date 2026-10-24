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

// src/pwa/package.ts
var package_exports = {};
__export(package_exports, {
  installPackage: () => installPackage,
  installationPackage: () => installationPackage,
  installed: () => installed
});
module.exports = __toCommonJS(package_exports);

// src/pwa/transfer.ts
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

// src/pwa/package.ts
var STATE = "rbc-offline-state";
var MODELS = "rbc-neural-models-v1";
var native = !!window.rbcDesktop || window.Capacitor?.isNativePlatform?.() === true;
var stateKey = (key) => native ? "https://rbc-internal.invalid/" + key : "/" + key;
var jsonResponse = (data) => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
async function installationPackage() {
  const state = await caches.open(STATE);
  try {
    const [core, voice] = await Promise.all([fetch("/offline-assets.json", { cache: "no-store" }), fetch("/voice-assets.json", { cache: "no-store" })]);
    if (!core.ok || !voice.ok) throw Error("No se pudo consultar el paquete de instalaci\xF3n.");
    const manifest = await core.json(), catalog = await voice.json();
    if (!manifest.entries?.length || !catalog.files?.length) throw Error("Paquete de instalaci\xF3n no disponible.");
    const pack = { cache: native ? "rbc-native-bundle-v1" : manifest.cache, entries: native ? [] : manifest.entries, voices: catalog.files, native };
    await state.put(stateKey("package"), jsonResponse(pack));
    return pack;
  } catch (error) {
    const previous = await state.match(stateKey("package"));
    if (previous) return previous.json();
    throw error;
  }
}
async function valid(cache, a) {
  const hit = await cache.match(a.url);
  return !!hit && hit.headers.get("x-rbc-size") === String(a.size) && (!a.hash || hit.headers.get("x-rbc-hash") === a.hash);
}
async function installed(pack) {
  const state = await caches.open(STATE), record = await state.match(stateKey("installed"));
  if (!record) return false;
  const saved = await record.json();
  if (!await caches.has(saved.cache)) return false;
  const core = await caches.open(saved.cache), voices = await caches.open(MODELS);
  const checks = await Promise.all([...saved.entries.map((a) => valid(core, a)), ...pack.voices.map((a) => valid(voices, a))]);
  return checks.every(Boolean);
}
var active;
var subscribers = /* @__PURE__ */ new Set();
function installPackage(pack, onProgress, signal) {
  subscribers.add(onProgress);
  active ??= run(pack, (p) => subscribers.forEach((fn) => fn(p)), signal).finally(() => {
    active = void 0;
  });
  return active.finally(() => subscribers.delete(onProgress));
}
async function run(pack, onProgress, signal) {
  const assets = [...pack.entries, ...pack.voices], total = assets.reduce((sum, a) => sum + a.size, 0), progress = /* @__PURE__ */ new Map();
  let last = 0, networkBytes = 0;
  const started = performance.now();
  const report = (label, force = false) => {
    const now = performance.now();
    if (force || now - last > 100) {
      last = now;
      onProgress({ done: [...progress.values()].reduce((a, b) => a + b, 0), total, label, bytesPerSecond: networkBytes / Math.max(1, (now - started) / 1e3) });
    }
  };
  const core = await caches.open(pack.cache), voices = await caches.open(MODELS);
  const older = pack.native ? [] : (await caches.keys()).filter((k) => k.startsWith("rbc-easy-shell-") && k !== pack.cache);
  const checkAbort = () => {
    if (signal?.aborted) throw new DOMException("Descarga pausada", "AbortError");
  };
  const transfer = async (a, cache) => {
    checkAbort();
    if (await valid(cache, a)) {
      progress.set(a, a.size);
      report(a.name || a.url);
      return;
    }
    if (a.hash) for (const key of older) {
      const old = await caches.open(key);
      if (await valid(old, a)) {
        await cache.put(a.url, await old.match(a.url));
        progress.set(a, a.size);
        report(a.url);
        return;
      }
    }
    for (let attempt2 = 0; attempt2 < 2; attempt2++) {
      checkAbort();
      progress.set(a, 0);
      report((attempt2 ? "Reintentando \xB7 " : "") + (a.name || a.url), true);
      try {
        const requestUrl = a.hash ? a.url + (a.url.includes("?") ? "&" : "?") + "rbc_asset=" + a.hash : a.url;
        const downloaded = await download(requestUrl, a.size, (n, delta) => {
          networkBytes += delta;
          progress.set(a, n);
          report(a.name || a.url);
        }, signal), blob = downloaded.blob;
        if (a.hash) {
          const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()), hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
          if (hash !== a.hash) throw Error("El contenido cambi\xF3. Cierra y vuelve a abrir la app para actualizar el paquete");
        }
        const headers = new Headers({ "Content-Type": blob.type, "x-rbc-size": String(a.size) });
        if (a.hash) headers.set("x-rbc-hash", a.hash);
        await cache.put(a.url, new Response(blob, { status: 200, headers }));
        await downloaded.cleanup().catch(() => {
        });
        progress.set(a, a.size);
        report(a.name || a.url, true);
        return;
      } catch (error) {
        progress.set(a, 0);
        checkAbort();
        if (error.name === "QuotaExceededError") throw error;
        if (attempt2 === 1) throw Error("No se pudo instalar " + (a.name || a.url) + ": " + (error instanceof Error ? error.message : String(error)) + ". Lo ya instalado se conserva.");
        await new Promise((r) => setTimeout(r, 500 * (attempt2 + 1)));
      }
    }
  };
  const failed = [];
  const attempt = async (a, cache) => {
    try {
      await transfer(a, cache);
    } catch (error) {
      if (signal?.aborted) throw error;
      failed.push({ url: a.url, name: a.name || a.url, error: error instanceof Error ? error.message : String(error) });
      report("Omitido \xB7 " + (a.name || a.url) + ". Continuando con el siguiente archivo\u2026", true);
    }
  };
  let cursor = 0, abortError;
  await Promise.all(Array.from({ length: Math.min(6, parallelism() + 2) }, async () => {
    while (cursor < pack.entries.length && !abortError) {
      try {
        if (signal?.aborted) throw new DOMException("Descarga pausada", "AbortError");
        await attempt(pack.entries[cursor++], core);
      } catch (error) {
        abortError = error;
      }
    }
  }));
  if (abortError) throw abortError;
  const coreReady = !failed.length;
  if (!pack.native && coreReady) await core.put("/__rbc_complete", new Response("ready"));
  for (const a of pack.voices) {
    if (signal?.aborted) throw new DOMException("Descarga pausada", "AbortError");
    await attempt(a, voices);
  }
  if (signal?.aborted) throw new DOMException("Descarga pausada", "AbortError");
  const complete = !failed.length, state = await caches.open(STATE);
  await state.put(stateKey("pending"), jsonResponse(failed));
  if (complete) await state.put(stateKey("installed"), jsonResponse(pack));
  await navigator.storage?.persist?.().catch(() => false);
  report(complete ? "Instalaci\xF3n completa" : failed.length + " archivos pendientes. El resto ya est\xE1 disponible.", true);
  if (!complete) return { complete, failed };
  const retained = older.slice(-2);
  for (const name of older) {
    if (!retained.includes(name)) {
      await caches.delete(name);
      continue;
    }
    const previous = await caches.open(name);
    for (const request of await previous.keys()) {
      const path = new URL(request.url).pathname;
      if (path !== "/index.html" && path !== "/__rbc_complete" && !path.startsWith("/assets/")) await previous.delete(request);
    }
  }
  return { complete, failed };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  installPackage,
  installationPackage,
  installed
});
