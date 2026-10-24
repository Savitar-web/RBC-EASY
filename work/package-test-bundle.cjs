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
function installPackage(pack, onProgress, signal) {
  if (active) return active;
  active = run(pack, onProgress, signal).finally(() => {
    active = void 0;
  });
  return active;
}
async function run(pack, onProgress, signal) {
  const total = [...pack.entries, ...pack.voices].reduce((sum, a) => sum + a.size, 0);
  let done = 0, last = 0;
  const report = (label, force = false) => {
    const now = performance.now();
    if (force || now - last > 100) {
      last = now;
      onProgress({ done, total, label });
    }
  };
  const core = await caches.open(pack.cache), voices = await caches.open(MODELS);
  const older = pack.native ? [] : (await caches.keys()).filter((k) => k.startsWith("rbc-easy-shell-") && k !== pack.cache);
  const transfer = async (a, cache) => {
    if (signal?.aborted) throw new DOMException("Descarga pausada", "AbortError");
    if (await valid(cache, a)) {
      done += a.size;
      report(a.name || a.url);
      return;
    }
    if (a.hash) for (const key of older) {
      const old = await caches.open(key);
      if (await valid(old, a)) {
        await cache.put(a.url, await old.match(a.url));
        done += a.size;
        report(a.url);
        return;
      }
    }
    const start = done;
    report(a.name || a.url, true);
    try {
      const response = await fetch(a.url, { signal, cache: "no-store" });
      if (!response.ok || !response.body) throw Error("No se pudo descargar " + (a.name || a.url));
      let received = 0;
      const headers = new Headers(response.headers);
      headers.set("x-rbc-size", String(a.size));
      if (a.hash) headers.set("x-rbc-hash", a.hash);
      const stream = response.body.pipeThrough(new TransformStream({ transform(chunk, controller) {
        received += chunk.byteLength;
        done += chunk.byteLength;
        report(a.name || a.url);
        controller.enqueue(chunk);
      }, flush() {
        if (received !== a.size) throw Error("El archivo cambi\xF3 o est\xE1 incompleto. Reintenta para actualizar el paquete.");
      } }));
      await cache.put(a.url, new Response(stream, { status: 200, headers }));
    } catch (error) {
      done = start;
      await cache.delete(a.url);
      report("Descarga interrumpida", true);
      throw error;
    }
  };
  for (const a of pack.entries) await transfer(a, core);
  if (!pack.native) await core.put("/__rbc_complete", new Response("ready"));
  for (const a of pack.voices) await transfer(a, voices);
  if (signal?.aborted) throw signal.reason;
  await (await caches.open(STATE)).put(stateKey("installed"), jsonResponse(pack));
  await navigator.storage?.persist?.().catch(() => false);
  report("Instalaci\xF3n completa", true);
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
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  installPackage,
  installationPackage,
  installed
});
