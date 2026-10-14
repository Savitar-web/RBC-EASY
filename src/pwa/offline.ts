/** Imágenes de public/images/backgrounds, en el orden en que las usa la app. No se regeneran. */
export const BACKGROUND_IMAGES = [
  '/images/backgrounds/FCC.png',
  '/images/backgrounds/FNP.png',
  '/images/backgrounds/FSH.png',
  '/images/backgrounds/FT.png',
  '/images/backgrounds/FMA.png',
  '/images/backgrounds/MA.png',
  '/images/backgrounds/TA.png',
] as const;

export const SHELL_CACHE = 'rbc-easy-shell-v3';

export const OFFLINE_ASSETS: string[] = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/sw.js',
  ...BACKGROUND_IMAGES,
];

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* el caché manual sigue disponible sin service worker */
    });
  });
}

export async function cacheForOffline(): Promise<{ saved: string[]; missing: string[] }> {
  if (typeof caches === 'undefined') return { saved: [], missing: [...OFFLINE_ASSETS] };
  const cache = await caches.open(SHELL_CACHE);
  const saved: string[] = [];
  const missing: string[] = [];
  for (const url of OFFLINE_ASSETS) {
    try {
      const res = await fetch(url, { cache: 'reload' });
      if (!res.ok) {
        missing.push(url);
        continue;
      }
      await cache.put(url, res.clone());
      saved.push(url);
    } catch {
      missing.push(url);
    }
  }
  return { saved, missing };
}
