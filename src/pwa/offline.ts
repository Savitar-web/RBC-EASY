/** Existing backgrounds are cached without changing their files. */
export const BACKGROUND_IMAGES = [
  '/images/backgrounds/Cuenta.png', '/images/backgrounds/FCC.png', '/images/backgrounds/FNP.png',
  '/images/backgrounds/FSH.png', '/images/backgrounds/FT.png',
  '/images/backgrounds/FMA.png', '/images/backgrounds/MA.png',
  '/images/backgrounds/TA.png', '/images/backgrounds/sTP.png',
  '/images/backgrounds/FMA2.png', '/images/backgrounds/FdCC.png',
  '/images/backgrounds/HN.png', '/images/backgrounds/T.png',
] as const;
let registration: Promise<ServiceWorkerRegistration> | undefined;
function nativeApp() {
  const w = window as Window & { rbcDesktop?: unknown; Capacitor?: { isNativePlatform?: () => boolean } };
  return !!w.rbcDesktop || w.Capacitor?.isNativePlatform?.() === true;
}
export function registerServiceWorker() {
  if (import.meta.env.DEV || nativeApp() || !('serviceWorker' in navigator)) return;
  registration ??= navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
  registration.catch(error => console.warn('No se pudo preparar el modo offline:', error));
  return registration;
}
export async function cacheForOffline(): Promise<{ saved: string[]; missing: string[] }> {
  if (nativeApp()) return { saved: ['Contenido incluido en la aplicación'], missing: [] };
  const registered = registerServiceWorker();
  if (!registered) return { saved: [], missing: ['Service worker no disponible'] };
  await registered;
  let timer:ReturnType<typeof setTimeout>;
  const ready = await Promise.race([navigator.serviceWorker.ready,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('No se pudo activar el modo offline. Revisa la conexión y reintenta.')),120000);})]).finally(()=>clearTimeout(timer));
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => { channel.port1.close(); reject(new Error('La descarga offline continúa; revisa tu conexión.')); }, 180000);
    channel.port1.onmessage = ({ data }) => {
      clearTimeout(timeout); channel.port1.close();
      if (data.error) reject(new Error(data.error)); else resolve(data);
    };
    ready.active!.postMessage({ type: 'CACHE_OFFLINE' }, [channel.port2]);
  });
}
