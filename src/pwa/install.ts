export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable' | 'installed';

type BeforeInstall = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: BeforeInstall | null = null;
const listeners = new Set<(ready: boolean) => void>();

function notify() {
  listeners.forEach((fn) => fn(deferred != null));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstall;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function onInstallReady(listener: (ready: boolean) => void): () => void {
  listeners.add(listener);
  listener(deferred != null);
  return () => listeners.delete(listener);
}

export function canPromptInstall(): boolean {
  return deferred != null;
}

export async function promptInstall(): Promise<InstallOutcome> {
  if (isStandalone()) return 'installed';
  if (!deferred) return 'unavailable';
  await deferred.prompt();
  const choice = await deferred.userChoice;
  deferred = null;
  notify();
  return choice.outcome;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    nav.standalone === true
  );
}

export type DeviceKind = 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'electron' | 'capacitor' | 'other';

export function deviceKind(): DeviceKind {
  if (typeof window === 'undefined') return 'other';
  const w = window as Window & { Capacitor?: unknown; rbcDesktop?: { isElectron?: boolean } };
  if (w.rbcDesktop?.isElectron) return 'electron';
  if (w.Capacitor) return 'capacitor';
  const ua = navigator.userAgent;
  if (/Electron/i.test(ua)) return 'electron';
  if (/iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Win/i.test(ua)) return 'windows';
  if (/Mac/i.test(ua)) return 'mac';
  if (/Linux/i.test(ua)) return 'linux';
  return 'other';
}

export function absoluteUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  const base = window.location.origin && window.location.origin !== 'null' ? window.location.origin : '';
  if (!base) return path;
  return new URL(path, base).toString();
}

export function shortcutFile(name: string, url: string, kind: DeviceKind): { filename: string; mime: string; body: string } {
  const safe = name.replace(/[^\w\sáéíóúñÁÉÍÓÚÑÜü.-]+/g, '').trim() || 'RBC';
  if (kind === 'windows') {
    return {
      filename: `${safe}.url`,
      mime: 'application/internet-shortcut',
      body: `[InternetShortcut]\r\nURL=${url}\r\n`,
    };
  }
  if (kind === 'mac') {
    return {
      filename: `${safe}.webloc`,
      mime: 'application/xml',
      body: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>URL</key><string>${url}</string></dict></plist>
`,
    };
  }
  return {
    filename: `${safe}.desktop`,
    mime: 'application/x-desktop',
    body: `[Desktop Entry]
Type=Application
Version=1.0
Name=${safe}
Comment=Acceso directo de RBC EASY
Exec=xdg-open ${url}
Terminal=false
Categories=Utility;
StartupNotify=true
`,
  };
}

export function downloadTextFile(filename: string, mime: string, body: string) {
  const blob = new Blob([body], { type: mime });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1500);
}
