/// <reference types="vite/client" />

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Window {
  Capacitor?: unknown;
  rbcDesktop?: {
    isElectron?: boolean;
    createShortcut: (payload: { name: string; url: string }) => Promise<{ ok: boolean; path?: string; error?: string }>;
    createAllShortcuts: (list: { name: string; url: string }[]) => Promise<{ ok: boolean; paths?: string[]; errors?: string[] }>;
  };
}
