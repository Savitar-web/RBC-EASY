// src/pages/BibliasMaker/BibliasMaker.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import ThemeSwitcher from '../../components/layout/ThemeSwitcher';

/* ===================== TIPOS ===================== */
interface Figure {
  id: number;
  tag: string;
  src: string;
  isVideo: boolean;
  orientation: 'horizontal' | 'vertical' | 'square';
  name?: string;
}

interface Hoja {
  id: string;
  name: string;
  content: string;
  figures: Figure[];
  lastModified: number;
}

interface Action {
  name: string;
  content: string;
}

interface VoiceInfo {
  name: string;
  lang: string;
  voice: SpeechSynthesisVoice;
}

interface Comment {
  id: string;
  hojaId: string;
  hojaName: string;
  type: 'paragraph' | 'selection';
  paragraphIndex?: number;
  selectedText?: string;
  text: string;
  createdAt: number;
}

interface SpellError {
  offset: number;
  length: number;
  word: string;
  message: string;
  suggestions: string[];
}

type PrefixPlatform = 'whatsapp' | 'amino' | 'kyodo';

const PREFIX_COMMANDS: Record<
  PrefixPlatform,
  { id: string; label: string; wrap: (s: string) => string }[]
> = {
  whatsapp: [
    { id: 'bold', label: 'Negrita *texto*', wrap: (s) => `*${s}*` },
    { id: 'italic', label: 'Cursiva _texto_', wrap: (s) => `_${s}_` },
    { id: 'strike', label: 'Tachado ~texto~', wrap: (s) => `~${s}~` },
    { id: 'mono', label: 'Monoespaciado ```texto```', wrap: (s) => '```' + s + '```' },
    { id: 'code', label: 'Código `texto`', wrap: (s) => '`' + s + '`' },
    { id: 'quote', label: 'Cita > texto', wrap: (s) => `> ${s}` },
  ],
  amino: [
    { id: 'B', label: '[B] Negrita', wrap: (s) => `[B]${s}` },
    { id: 'I', label: '[I] Cursiva', wrap: (s) => `[I]${s}` },
    { id: 'U', label: '[U] Subrayado', wrap: (s) => `[U]${s}` },
    { id: 'S', label: '[S] Tachado', wrap: (s) => `[S]${s}` },
    { id: 'C', label: '[C] Centrado', wrap: (s) => `[C]${s}` },
    { id: 'BI', label: '[BI] Negrita+Cursiva', wrap: (s) => `[BI]${s}` },
    { id: 'BU', label: '[BU] Negrita+Subrayado', wrap: (s) => `[BU]${s}` },
    { id: 'BS', label: '[BS] Negrita+Tachado', wrap: (s) => `[BS]${s}` },
    { id: 'IU', label: '[IU] Cursiva+Subrayado', wrap: (s) => `[IU]${s}` },
    { id: 'IS', label: '[IS] Cursiva+Tachado', wrap: (s) => `[IS]${s}` },
    { id: 'US', label: '[US] Subrayado+Tachado', wrap: (s) => `[US]${s}` },
    { id: 'BIC', label: '[BIC] Centro+N+C', wrap: (s) => `[BIC]${s}` },
    { id: 'BICUS', label: '[BICUS] Todo', wrap: (s) => `[BICUS]${s}` },
  ],
  kyodo: [
    { id: 'b', label: '[B] Negrita', wrap: (s) => `[B]${s}` },
    { id: 'i', label: '[I] Cursiva', wrap: (s) => `[I]${s}` },
    { id: 'u', label: '[U] Subrayado', wrap: (s) => `[U]${s}` },
    { id: 's', label: '[S] Tachado', wrap: (s) => `[S]${s}` },
    { id: 'bi', label: '[BI] Negrita+Cursiva', wrap: (s) => `[BI]${s}` },
    { id: 'bu', label: '[BU] Negrita+Subrayado', wrap: (s) => `[BU]${s}` },
    { id: 'bis', label: '[BIS] N+C+Tachado', wrap: (s) => `[BIS]${s}` },
    { id: 'bius', label: '[BIUS] N+C+S+Tachado', wrap: (s) => `[BIUS]${s}` },
  ],
};

const DB_NAME = 'BibliasMakerDB';
const STORE = 'textStore';
const PROJECTS_DB = 'RpgStorage';
const PROJECTS_STORE = 'items';
const HOJAS_KEY = 'biblias_hojas_v1';
const FIGURES_KEY = 'figureStore';
const ACTIONS_KEY = 'actionStore';
const DICT_KEY = 'palabrasPermitidas';
const COMMENTS_KEY = 'paragraphComments_v2';
const AMINO_LIMIT = 2000;
const TWEET_LIMIT = 280;

const CHATGPT_PROMPT = `Eres un corrector ortográfico estricto del español según la Real Academia Española (RAE) y Fundéu.

REGLAS OBLIGATORIAS:
1. Corrige ÚNICAMENTE errores ortográficos reales: tildes, b/v, g/j, h muda, ll/y, s/z/c, mayúsculas de nombres propios y de inicio de oración, letras repetidas u omitidas.
2. NO cambies el significado, la estructura, la puntuación, la gramática, el estilo ni la elección de palabras.
3. NO sustituyas sinónimos, NO reformules, NO añadas ni elimines contenido.
4. Si encuentras nombres propios, seudónimos, términos de rol o jerga, déjalos exactamente como están salvo error ortográfico inequívoco.
5. Lee el texto completo antes de corregir para respetar el contexto.
6. Devuelve SOLO el texto corregido, sin explicaciones, sin comillas y sin comentarios.

Texto a corregir:

`;

export default function BibliasMaker() {
  const navigate = useNavigate();
  useTheme();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const progressTimer = useRef<number | null>(null);
  const speakStart = useRef(0);
  const historyRef = useRef<string[]>([]);
  const historyIndex = useRef(-1);
  const isUndoRedo = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const startVoiceRef = useRef<(onlySelection?: boolean) => void>(() => {});
  const stopVoiceRef = useRef<() => void>(() => {});
  const longPressTimer = useRef<number | null>(null);

  const [hojas, setHojas] = useState<Hoja[]>([]);
  const [activeHojaId, setActiveHojaId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [figures, setFigures] = useState<Figure[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [charCount, setCharCount] = useState(0);
  const [allowedWords, setAllowedWords] = useState<Record<string, string>>({});

  const [showOptions, setShowOptions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHojaId, setPreviewHojaId] = useState<string | null>(null);
  const [showTheme, setShowTheme] = useState(false);
  const [showMediaPanel, setShowMediaPanel] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showActionEditor, setShowActionEditor] = useState(false);
  const [showBibleCreator, setShowBibleCreator] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'txt' | 'mp3' | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [showSaveToProjects, setShowSaveToProjects] = useState(false);
  const [saveAfterExport, setSaveAfterExport] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHojasMenu, setShowHojasMenu] = useState(false);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [showSpellAI, setShowSpellAI] = useState(false);
  const [showSpellManual, setShowSpellManual] = useState(false);
  const [spellErrors, setSpellErrors] = useState<SpellError[]>([]);
  const [spellIdx, setSpellIdx] = useState(0);
  const [spellLoading, setSpellLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const [showSelBar, setShowSelBar] = useState(false);
  const [selBarPos, setSelBarPos] = useState({ x: 0, y: 0 });
  const [showPrefixPlatform, setShowPrefixPlatform] = useState(false);
  const [showPrefixCommands, setShowPrefixCommands] = useState(false);
  const [prefixPlatform, setPrefixPlatform] = useState<PrefixPlatform>('whatsapp');
  const [showSelComment, setShowSelComment] = useState(false);
  const [selCommentText, setSelCommentText] = useState('');

  const [showParaComment, setShowParaComment] = useState(false);
  const [paraIndex, setParaIndex] = useState(-1);
  const [paraCommentText, setParaCommentText] = useState('');

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showVoiceBar, setShowVoiceBar] = useState(false);
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [speechRate, setSpeechRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [selectionOnly, setSelectionOnly] = useState(false);

  const [editingAction, setEditingAction] = useState<{ name: string; content: string; index: number | null }>({
    name: '', content: '', index: null,
  });
  const [askPrefixes, setAskPrefixes] = useState(false);

  const showNotif = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const playClick = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 380;
      g.gain.value = 0.025;
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      o.stop(ctx.currentTime + 0.07);
    } catch { /* */ }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  /* ===================== DB ===================== */
  const openDB = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  const saveToDB = async (content: string) => {
    try {
      const db = await openDB();
      db.transaction(STORE, 'readwrite').objectStore(STORE).put({ id: 'biblias_maker_auto_save', text: content });
    } catch { /* */ }
  };

  const openProjectsDB = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(PROJECTS_DB, 3);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  const saveHojaToProjects = async (name: string, content: string) => {
    const db = await openProjectsDB();
    const tx = db.transaction(PROJECTS_STORE, 'readwrite');
    const store = tx.objectStore(PROJECTS_STORE);
    const all: unknown[] = await new Promise((res) => {
      const r = store.getAll();
      r.onsuccess = () => res(r.result || []);
    });
    store.put({
      id: 'file_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name,
      type: 'file',
      parentId: null,
      content,
      order: all.length,
    });
    await new Promise<void>((r) => { tx.oncomplete = () => r(); });
  };

  const saveAllHojasToProjects = async () => {
    const currentHojas = hojas.map((h) =>
      h.id === activeHojaId ? { ...h, content: text } : h
    );
    for (const h of currentHojas) {
      const defaultName = h.name || 'Biblia';
      const name = prompt(`Nombre para guardar la hoja "${h.name}":`, defaultName);
      if (name?.trim()) {
        const hojaComments = comments.filter((c) => c.hojaId === h.id);
        let content = h.id === activeHojaId ? text : h.content;
        if (hojaComments.length) {
          content += '\n\n--- COMENTARIOS ---\n';
          hojaComments.forEach((c) => {
            content += c.type === 'selection'
              ? `[Selección: "${(c.selectedText || '').slice(0, 40)}…"] ${c.text}\n`
              : `[Párrafo ${(c.paragraphIndex ?? 0) + 1}] ${c.text}\n`;
          });
        }
        await saveHojaToProjects(name.trim(), content);
      }
    }
    showNotif('Guardado en Mis Biblias');
    setShowSaveToProjects(false);
  };

  /* ===================== HISTORIAL ===================== */
  const pushHistory = (val: string) => {
    if (isUndoRedo.current) return;
    const h = historyRef.current.slice(0, historyIndex.current + 1);
    if (h[h.length - 1] === val) return;
    h.push(val);
    if (h.length > 100) h.shift();
    historyRef.current = h;
    historyIndex.current = h.length - 1;
  };

  const undo = () => {
    if (historyIndex.current <= 0) return;
    isUndoRedo.current = true;
    historyIndex.current -= 1;
    setText(historyRef.current[historyIndex.current]);
    setTimeout(() => { isUndoRedo.current = false; }, 40);
    playClick();
  };

  const redo = () => {
    if (historyIndex.current >= historyRef.current.length - 1) return;
    isUndoRedo.current = true;
    historyIndex.current += 1;
    setText(historyRef.current[historyIndex.current]);
    setTimeout(() => { isUndoRedo.current = false; }, 40);
    playClick();
  };

  /* ===================== VOZ ===================== */
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as Navigator & { wakeLock: { request: (t: string) => Promise<WakeLockSentinel> } }).wakeLock.request('screen');
      }
    } catch { /* */ }
  };

  const releaseWakeLock = async () => {
    try {
      await wakeLockRef.current?.release();
      wakeLockRef.current = null;
    } catch { /* */ }
  };

  const stopVoice = useCallback(() => {
    try { speechSynthesis.cancel(); } catch { /* */ }
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    setIsSpeaking(false);
    setProgress(0);
    setElapsed(0);
    setRemaining(0);
    releaseWakeLock();
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = 'paused'; } catch { /* */ }
    }
  }, []);

  const startVoice = useCallback((onlySelection = false) => {
    const source = onlySelection && selection?.text ? selection.text : text;
    if (!source.trim()) {
      alert('No hay texto para leer');
      return;
    }
    try { speechSynthesis.cancel(); } catch { /* */ }
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }

    const utterance = new SpeechSynthesisUtterance(source);
    utterance.lang = 'es-ES';
    utterance.rate = Math.min(2, Math.max(0.5, speechRate));
    utterance.pitch = 1;
    utterance.volume = 1;
    const v = voices.find((x) => x.name === selectedVoice);
    if (v) utterance.voice = v.voice;

    const estimate = Math.max(1, (source.length / 14) * (1 / speechRate));
    setElapsed(0);
    setRemaining(estimate);
    setProgress(0);
    speakStart.current = Date.now();
    setSelectionOnly(onlySelection);

    utterance.onend = () => {
      setIsSpeaking(false);
      setProgress(100);
      setElapsed(estimate);
      setRemaining(0);
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
      releaseWakeLock();
      if ('mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'none'; } catch { /* */ }
      }
    };
    utterance.onerror = () => stopVoice();

    progressTimer.current = window.setInterval(() => {
      const el = (Date.now() - speakStart.current) / 1000;
      setProgress(Math.min(99, (el / estimate) * 100));
      setElapsed(el);
      setRemaining(Math.max(0, estimate - el));
    }, 200);

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: hojas.find((h) => h.id === activeHojaId)?.name || 'Biblias Maker',
          artist: 'RBC-EASY',
          album: onlySelection ? 'Selección' : 'Lectura completa',
        });
        navigator.mediaSession.playbackState = 'playing';
      } catch { /* */ }
    }

    requestWakeLock();
    try {
      if (speechSynthesis.paused) speechSynthesis.resume();
    } catch { /* */ }
    speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setShowVoiceBar(true);
    setShowSelBar(false);
    playClick();
  }, [text, selection, speechRate, selectedVoice, voices, activeHojaId, hojas, stopVoice]);

  startVoiceRef.current = startVoice;
  stopVoiceRef.current = stopVoice;

  const toggleVoice = () => {
    if (isSpeaking) stopVoice();
    else startVoice(false);
  };

  /* ===================== CARGA ===================== */
  useEffect(() => {
    try {
      const figs = localStorage.getItem(FIGURES_KEY);
      if (figs) setFigures(JSON.parse(figs));
      const acts = localStorage.getItem(ACTIONS_KEY);
      if (acts) setActions(JSON.parse(acts));
      const dict = localStorage.getItem(DICT_KEY);
      if (dict) setAllowedWords(JSON.parse(dict));
      const com = localStorage.getItem(COMMENTS_KEY);
      if (com) setComments(JSON.parse(com));
    } catch { /* */ }

    const saved = localStorage.getItem(HOJAS_KEY);
    if (saved) {
      try {
        const parsed: Hoja[] = JSON.parse(saved);
        setHojas(parsed);
        if (parsed.length) {
          setActiveHojaId(parsed[0].id);
          setText(parsed[0].content);
          historyRef.current = [parsed[0].content];
          historyIndex.current = 0;
        }
      } catch {
        createDefaultHoja();
      }
    } else {
      createDefaultHoja();
    }

    const imported = localStorage.getItem('currentFileContent');
    if (imported) {
      const name = localStorage.getItem('currentFileName') || 'Importada';
      const mime = localStorage.getItem('currentFileMime') || '';
      let content = imported;
      if (mime.includes('pdf') || name.toLowerCase().endsWith('.pdf')) {
        content = `[PDF] ${name}\n\n(Extracción automática de PDF no disponible. Usa TXT o pega el texto.)`;
      } else if (imported.startsWith('data:')) {
        try {
          const b64 = imported.split(',')[1] || '';
          const bin = atob(b64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          content = new TextDecoder().decode(bytes);
        } catch {
          content = '[Error al decodificar]';
        }
      }
      const nueva: Hoja = {
        id: crypto.randomUUID(),
        name: name.replace(/\.[^/.]+$/, ''),
        content,
        figures: [],
        lastModified: Date.now(),
      };
      setHojas((p) => [...p, nueva]);
      setActiveHojaId(nueva.id);
      setText(content);
      localStorage.removeItem('currentFileContent');
      localStorage.removeItem('currentFileName');
      localStorage.removeItem('currentFileMime');
    }

    const loadVoices = () => {
      const list = speechSynthesis
        .getVoices()
        .filter((v) => v.lang.startsWith('es') || v.lang.startsWith('en') || v.lang.startsWith('pt'))
        .map((v) => ({ name: v.name, lang: v.lang, voice: v }));
      setVoices(list);
      setSelectedVoice((prev) => {
        if (prev) return prev;
        if (!list.length) return '';
        const es = list.find((v) => v.lang.startsWith('es'));
        return es ? es.name : list[0].name;
      });
    };
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    setTimeout(loadVoices, 300);
    setTimeout(loadVoices, 1000);

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => startVoiceRef.current(false));
        navigator.mediaSession.setActionHandler('pause', () => stopVoiceRef.current());
        navigator.mediaSession.setActionHandler('stop', () => stopVoiceRef.current());
      } catch { /* */ }
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'Escape') setShowPreview(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      speechSynthesis.cancel();
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createDefaultHoja = () => {
    const n: Hoja = { id: crypto.randomUUID(), name: 'Hoja 1', content: '', figures: [], lastModified: Date.now() };
    setHojas([n]);
    setActiveHojaId(n.id);
    historyRef.current = [''];
    historyIndex.current = 0;
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      if (activeHojaId) {
        setHojas((prev) => {
          const next = prev.map((h) =>
            h.id === activeHojaId ? { ...h, content: text, lastModified: Date.now() } : h
          );
          try { localStorage.setItem(HOJAS_KEY, JSON.stringify(next)); } catch { /* */ }
          return next;
        });
        saveToDB(text);
      }
      try {
        localStorage.setItem(FIGURES_KEY, JSON.stringify(figures));
        localStorage.setItem(ACTIONS_KEY, JSON.stringify(actions));
        localStorage.setItem(DICT_KEY, JSON.stringify(allowedWords));
        localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
      } catch { /* */ }
    }, 500);
    return () => clearInterval(id);
  }, [text, activeHojaId, figures, actions, allowedWords, comments]);

  useEffect(() => {
    setCharCount(text.length);
    pushHistory(text);
  }, [text]);

  /* ===================== HOJAS ===================== */
  const createHoja = (name = `Hoja ${hojas.length + 1}`, content = '') => {
    const n: Hoja = { id: crypto.randomUUID(), name, content, figures: [], lastModified: Date.now() };
    setHojas((p) => [...p, n]);
    setActiveHojaId(n.id);
    setText(content);
    setShowHojasMenu(false);
  };

  const switchHoja = (id: string) => {
    setHojas((p) => p.map((h) => (h.id === activeHojaId ? { ...h, content: text } : h)));
    const h = hojas.find((x) => x.id === id);
    if (h) {
      setActiveHojaId(id);
      setText(h.content);
    }
  };

  const closeHoja = (id: string) => {
    if (hojas.length <= 1) {
      alert('Debes tener al menos una hoja');
      return;
    }
    const rest = hojas.filter((h) => h.id !== id);
    setHojas(rest);
    if (activeHojaId === id) {
      setActiveHojaId(rest[0].id);
      setText(rest[0].content);
    }
  };

  /* ===================== FIGURAS ===================== */
  const insertTagAtCursor = (tag: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    setText(text.substring(0, start) + '\n' + tag + '\n' + text.substring(end));
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
    }, 0);
  };

  const insertImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = () => {
        let orientation: Figure['orientation'] = 'square';
        if (img.width > img.height) orientation = 'horizontal';
        if (img.height > img.width) orientation = 'vertical';
        const id = figures.length ? Math.max(...figures.map((f) => f.id)) + 1 : 1;
        const tag = `[Figura ${id}.0]`;
        setFigures((p) => [
          ...p,
          { id, tag, src: result, isVideo: file.type.startsWith('video'), orientation, name: file.name },
        ]);
        insertTagAtCursor(tag);
        showNotif('Figura guardada en caché');
        playClick();
      };
      img.onerror = () => {
        const id = figures.length ? Math.max(...figures.map((f) => f.id)) + 1 : 1;
        const tag = `[Figura ${id}.0]`;
        setFigures((p) => [
          ...p,
          { id, tag, src: result, isVideo: true, orientation: 'horizontal', name: file.name },
        ]);
        insertTagAtCursor(tag);
        showNotif('Media guardada');
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  /* ===================== PREVIEW HTML ===================== */
  const buildPreviewHtml = (content: string) => {
    let html = content
      .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
      .replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
      .replace(/_([^_\n]+)_/g, '<i>$1</i>')
      .replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
      .replace(/~([^~\n]+)~/g, '<s>$1</s>')
      .replace(/__([^_\n]+)__/g, '<u>$1</u>')
      .replace(/```([^`]+)```/g, '<code class="wa-code">$1</code>')
      .replace(/`([^`\n]+)`/g, '<code class="wa-code">$1</code>')
      .replace(/^> (.*)$/gm, '<div class="wa-quote">$1</div>');

    html = html
      .split('\n')
      .map((line) => {
        const m = line.match(/^\[([BUISC]+)\]/i);
        if (!m) return line;
        const codes = m[1].toUpperCase();
        let open = '';
        let close = '';
        if (codes.includes('B')) { open += '<b>'; close = '</b>' + close; }
        if (codes.includes('I')) { open += '<i>'; close = '</i>' + close; }
        if (codes.includes('U')) { open += '<u>'; close = '</u>' + close; }
        if (codes.includes('S')) { open += '<s>'; close = '</s>' + close; }
        if (codes.includes('C')) {
          open = '<div style="text-align:center">' + open;
          close = close + '</div>';
        }
        return open + line.slice(m[0].length) + close;
      })
      .join('<br/>');

    figures.forEach((fig) => {
      const media = fig.isVideo
        ? `<video controls style="max-width:100%;border-radius:8px;margin:12px 0"><source src="${fig.src}"></video>`
        : `<img src="${fig.src}" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0;display:block" alt="" />`;
      html = html.split(fig.tag).join(`<div class="preview-figure" style="text-align:center">${media}</div>`);
    });
    return html;
  };

  /* ===================== PDF REAL (iframe + print + fallback HTML) ===================== */
  const generatePdfDocument = () => {
    const title = hojas.find((h) => h.id === activeHojaId)?.name || 'Biblia';
    const bodyHtml = buildPreviewHtml(text);
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>${title.replace(/</g, '')}</title>
  <style>
    @page { margin: 18mm; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.55;
      color: #111;
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }
    h1 { font-size: 18pt; margin-bottom: 16px; border-bottom: 1px solid #ccc; padding-bottom: 8px; }
    img, video { max-width: 100%; height: auto; }
    .wa-code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    .wa-quote { border-left: 3px solid #c00; padding-left: 12px; color: #444; margin: 8px 0; }
    .preview-figure { margin: 14px 0; text-align: center; }
    b { font-weight: 700; }
    i { font-style: italic; }
    u { text-decoration: underline; }
    s { text-decoration: line-through; }
  </style>
</head>
<body>
  <h1>${title.replace(/</g, '')}</h1>
  ${bodyHtml}
</body>
</html>`;
  };

  const exportAsPdf = async () => {
    const html = generatePdfDocument();
    const fileName = (hojas.find((h) => h.id === activeHojaId)?.name || 'biblia') + '.pdf';

    // 1) Intento con iframe oculto + print (usuario elige "Guardar como PDF")
    try {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none';
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        // Esperar a que carguen las imágenes base64
        await new Promise((r) => setTimeout(r, 600));
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          try { document.body.removeChild(iframe); } catch { /* */ }
        }, 2000);
        showNotif('Elige "Guardar como PDF" en el diálogo de impresión');
        return true;
      }
    } catch { /* */ }

    // 2) Fallback: descargar HTML imprimible
    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName.replace(/\.pdf$/i, '') + '_imprimible.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      showNotif('Descargado HTML. Ábrelo y usa Ctrl+P → Guardar como PDF');
      return true;
    } catch {
      showNotif('No se pudo generar el documento');
      return false;
    }
  };

  /* ===================== SELECCIÓN ===================== */
  const updateSelection = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (end > start) {
      setSelection({ start, end, text: text.substring(start, end) });
      const rect = ta.getBoundingClientRect();
      setSelBarPos({
        x: Math.min(rect.left + 16, window.innerWidth - 160),
        y: Math.min(rect.top + 48, window.innerHeight - 90),
      });
      setShowSelBar(true);
    } else {
      setSelection(null);
      setShowSelBar(false);
    }
  };

  const applyPrefixCommand = (wrap: (s: string) => string) => {
    if (!selection) return;
    const { start, end, text: sel } = selection;
    setText(text.substring(0, start) + wrap(sel) + text.substring(end));
    setShowPrefixCommands(false);
    setShowPrefixPlatform(false);
    setShowSelBar(false);
    playClick();
  };

  const saveSelectionComment = () => {
    if (!selection || !selCommentText.trim() || !activeHojaId) return;
    const hoja = hojas.find((h) => h.id === activeHojaId);
    setComments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        hojaId: activeHojaId,
        hojaName: hoja?.name || 'Hoja',
        type: 'selection',
        selectedText: selection.text,
        text: selCommentText.trim(),
        createdAt: Date.now(),
      },
    ]);
    setShowSelComment(false);
    setSelCommentText('');
    setShowSelBar(false);
    showNotif('Comentario guardado');
  };

  const getParagraphIndex = (pos: number) =>
    text.substring(0, pos).split(/\n\s*\n/).length - 1;

  const openParaComment = (pos: number) => {
    const idx = getParagraphIndex(pos);
    setParaIndex(idx);
    const existing = comments.find(
      (c) => c.hojaId === activeHojaId && c.type === 'paragraph' && c.paragraphIndex === idx
    );
    setParaCommentText(existing?.text || '');
    setShowParaComment(true);
  };

  const onTouchStart = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    longPressTimer.current = window.setTimeout(() => openParaComment(ta.selectionStart), 550);
  };

  const onTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const saveParaComment = () => {
    if (paraIndex < 0 || !activeHojaId) return;
    const hoja = hojas.find((h) => h.id === activeHojaId);
    setComments((prev) => {
      const others = prev.filter(
        (c) => !(c.hojaId === activeHojaId && c.type === 'paragraph' && c.paragraphIndex === paraIndex)
      );
      if (!paraCommentText.trim()) return others;
      return [
        ...others,
        {
          id: crypto.randomUUID(),
          hojaId: activeHojaId,
          hojaName: hoja?.name || 'Hoja',
          type: 'paragraph',
          paragraphIndex: paraIndex,
          text: paraCommentText.trim(),
          createdAt: Date.now(),
        },
      ];
    });
    setShowParaComment(false);
    showNotif('Comentario de párrafo guardado');
  };

  /* ===================== ORTOGRAFÍA (reemplazo real + offsets) ===================== */
  const runSpellManual = async () => {
    setSpellLoading(true);
    setShowSpellManual(true);
    setSpellErrors([]);
    setSpellIdx(0);
    try {
      const res = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ text, language: 'es' }),
      });
      const data = await res.json();
      const errors: SpellError[] = (data.matches || [])
        .filter((m: { offset: number; length: number }) => {
          const w = text.substr(m.offset, m.length).toLowerCase();
          return !allowedWords[w];
        })
        .map((m: { offset: number; length: number; message: string; replacements?: { value: string }[] }) => ({
          offset: m.offset,
          length: m.length,
          word: text.substr(m.offset, m.length),
          message: m.message,
          suggestions: (m.replacements || []).slice(0, 5).map((r) => r.value),
        }));
      setSpellErrors(errors);
      if (!errors.length) showNotif('Sin errores detectados');
    } catch {
      showNotif('Sin conexión al corrector');
    }
    setSpellLoading(false);
  };

  /** Reemplaza la palabra errónea y recalcula offsets del resto */
  const applySpellSuggestion = (suggestion: string) => {
    const err = spellErrors[spellIdx];
    if (!err) return;

    const before = text.substring(0, err.offset);
    const after = text.substring(err.offset + err.length);
    const newText = before + suggestion + after;
    const delta = suggestion.length - err.length;

    setText(newText);

    // Recalcular offsets de errores posteriores
    const nextErrors = spellErrors
      .filter((_, i) => i !== spellIdx)
      .map((e) => {
        if (e.offset > err.offset) {
          return { ...e, offset: e.offset + delta };
        }
        return e;
      });

    setSpellErrors(nextErrors);
    setSpellIdx((i) => Math.min(i, Math.max(0, nextErrors.length - 1)));
    playClick();
  };

  const allowWord = () => {
    const err = spellErrors[spellIdx];
    if (!err) return;
    setAllowedWords((p) => ({ ...p, [err.word.toLowerCase()]: '1' }));
    setSpellErrors((prev) => prev.filter((_, i) => i !== spellIdx));
    setSpellIdx((i) => Math.min(i, Math.max(0, spellErrors.length - 2)));
  };

  /* ===================== EXPORT ===================== */
  const doExport = async () => {
    if (!exportFormat) return;
    setExporting(true);
    setExportProgress(15);

    try {
      if (exportFormat === 'txt') {
        setExportProgress(50);
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (hojas.find((h) => h.id === activeHojaId)?.name || 'biblia') + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        setExportProgress(100);
      }

      if (exportFormat === 'pdf') {
        setExportProgress(40);
        await exportAsPdf();
        setExportProgress(100);
      }

      if (exportFormat === 'mp3') {
        setExportProgress(50);
        showNotif('Reproduciendo. Usa grabación del sistema para guardar audio.');
        startVoice(false);
        setExportProgress(100);
      }
    } catch {
      showNotif('Error al exportar');
    }

    setTimeout(() => {
      setExporting(false);
      setShowExport(false);
      setExportFormat(null);
      setExportProgress(0);
      setSaveAfterExport(true);
      setShowSaveToProjects(true);
    }, 800);
  };

  const createBibles = (mode: 'amino' | 'twitter') => {
    const limit = mode === 'amino' ? AMINO_LIMIT : TWEET_LIMIT;
    const parts: string[] = [];
    let rem = text;
    while (rem.length > 0) {
      if (rem.length <= limit) {
        parts.push(rem);
        break;
      }
      let cut = rem.lastIndexOf(' ', limit);
      if (cut < limit * 0.4) cut = limit;
      parts.push(rem.slice(0, cut));
      rem = rem.slice(cut).trimStart();
    }
    const box = document.createElement('div');
    box.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px';
    const inner = document.createElement('div');
    inner.style.cssText =
      'background:rgba(12,12,12,0.95);border:1px solid var(--accent,#ff0000);border-radius:16px;padding:22px;max-width:400px;width:100%;max-height:80vh;overflow:auto';
    inner.innerHTML = `<h3 style="color:var(--accent,#ff0000);margin:0 0 14px">Biblias (${parts.length})</h3>`;
    parts.forEach((p, i) => {
      const b = document.createElement('button');
      b.textContent = `Copiar ${i + 1} (${p.length})`;
      b.style.cssText =
        'display:block;width:100%;margin:8px 0;padding:12px;background:var(--accent,#ff0000);color:#fff;border:none;border-radius:10px;cursor:pointer';
      b.onclick = () => {
        navigator.clipboard.writeText(p);
        showNotif(`Biblia ${i + 1} copiada`);
      };
      inner.appendChild(b);
    });
    const close = document.createElement('button');
    close.textContent = 'Cerrar';
    close.style.cssText =
      'display:block;width:100%;margin-top:10px;padding:12px;background:transparent;border:1px solid #444;color:#ccc;border-radius:10px;cursor:pointer';
    close.onclick = () => box.remove();
    inner.appendChild(close);
    box.appendChild(inner);
    document.body.appendChild(box);
    setShowBibleCreator(false);
  };

  const commentsByHoja = (() => {
    const map = new Map<string, Comment[]>();
    comments.forEach((c) => {
      const list = map.get(c.hojaId) || [];
      list.push(c);
      map.set(c.hojaId, list);
    });
    return map;
  })();

  /* ===================== RENDER ===================== */
  return (
    <div className="bm-page">
      <style>{`
        *{box-sizing:border-box}
        .bm-page{margin:0;padding:0;height:100vh;height:100dvh;overflow:hidden;background-color:var(--bg-primary,#111);background-image:url('/images/backgrounds/FT.png');background-size:cover;background-position:center;background-blend-mode:overlay;font-family:'Lora',serif;color:var(--accent,#ff0000);display:flex;flex-direction:column;user-select:none}
        .particles{position:fixed;inset:0;background:radial-gradient(circle,rgba(255,255,255,.1) 1px,transparent 1px);background-size:5px 5px;z-index:-1;pointer-events:none}
        .top-row{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:10px 14px 4px;gap:8px}
        .icon-btn{width:40px;height:40px;border-radius:50%;border:none;background:var(--accent);color:#fff;font-size:16px;cursor:pointer;box-shadow:0 0 14px var(--glow);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .bm-title{background:var(--accent);color:#fff;padding:8px 20px;border-radius:50px;font-weight:700;font-size:16px;box-shadow:0 0 14px var(--glow)}
        .hojas-bar{flex-shrink:0;display:flex;gap:5px;overflow-x:auto;padding:4px 12px 6px}
        .hoja-tab{flex-shrink:0;background:rgba(0,0,0,.7);border:1px solid var(--border,var(--accent));color:#fff;padding:4px 10px;border-radius:16px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:4px}
        .hoja-tab.active{background:var(--accent)}
        .main-area{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;align-items:center;padding:0 12px;overflow:hidden}
        .bm-textarea{flex:1 1 auto;min-height:0;width:100%;max-width:920px;color:#fff;background:rgba(0,0,0,.85);border:2px solid var(--accent);resize:none;padding:16px 18px;font-size:16px;line-height:1.5;border-radius:22px;outline:none;font-family:'Lora',serif}
        .bm-textarea::-webkit-scrollbar,.scroll-thin::-webkit-scrollbar{width:5px}
        .bm-textarea::-webkit-scrollbar-track,.scroll-thin::-webkit-scrollbar-track{background:#111}
        .bm-textarea::-webkit-scrollbar-thumb,.scroll-thin::-webkit-scrollbar-thumb{background:#333;border-radius:8px;border:1px solid color-mix(in srgb,var(--accent) 35%,transparent)}
        .bm-textarea,.scroll-thin{scrollbar-width:thin;scrollbar-color:#333 #111}
        .bottom-row{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:10px 14px 14px;gap:10px}
        .bottom-left,.bottom-right{display:flex;gap:8px;align-items:center}
        .char-bubble{
          background:var(--accent);color:#fff;
          padding:12px 28px;border-radius:28px;
          font-size:18px;font-weight:700;letter-spacing:0.04em;
          box-shadow:0 0 16px var(--glow);
          min-width:140px;text-align:center;
        }
        .round-btn{width:42px;height:42px;border-radius:50%;border:none;background:var(--accent);color:#fff;font-size:16px;cursor:pointer;box-shadow:0 0 12px var(--glow)}
        .options-btn{background:var(--accent);color:#fff;border:none;border-radius:22px;padding:10px 16px;font-size:14px;cursor:pointer;box-shadow:0 0 12px var(--glow);font-family:'Lora',serif}
        .options-dropdown{position:fixed;bottom:68px;right:12px;z-index:80;background:rgba(10,10,10,.95);backdrop-filter:blur(14px);border:1px solid color-mix(in srgb,var(--accent) 45%,transparent);border-radius:14px;padding:8px;width:230px;max-height:42vh;overflow-y:auto;box-shadow:0 8px 28px rgba(0,0,0,.55);display:flex;flex-direction:column;gap:2px}
        .options-dropdown button{background:transparent;border:none;color:#fff;text-align:left;padding:10px 12px;border-radius:8px;font-size:13px;cursor:pointer;font-family:'Lora',serif}
        .options-dropdown button:hover{background:color-mix(in srgb,var(--accent) 20%,transparent)}
        .sel-bar{position:fixed;z-index:100;background:rgba(10,10,10,.96);border:1px solid var(--accent);border-radius:14px;padding:8px 10px;display:flex;gap:10px;box-shadow:0 6px 22px rgba(0,0,0,.55)}
        .sel-bar button{width:40px;height:40px;border-radius:50%;border:none;background:var(--accent);color:#fff;font-size:16px;cursor:pointer;box-shadow:0 0 10px var(--glow)}
        .voice-bar{position:fixed;bottom:70px;left:50%;transform:translateX(-50%);z-index:90;width:min(94vw,460px);background:rgba(8,8,8,.94);backdrop-filter:blur(16px);border:1px solid var(--accent);border-radius:16px;padding:12px 14px;box-shadow:0 8px 28px rgba(0,0,0,.5)}
        .voice-bar .row{display:flex;align-items:center;gap:8px;margin-bottom:8px}
        .voice-bar select{flex:1;min-width:0;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:8px;padding:6px 8px;font-size:12px}
        .voice-bar input[type=range]{flex:1;min-width:0;height:6px;accent-color:var(--accent)}
        .voice-bar .ctrl{background:var(--accent);color:#fff;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:13px;flex-shrink:0}
        .voice-bar .progress-row{display:flex;align-items:center;gap:8px;font-size:11px;color:#aaa}
        .voice-bar .progress-track{flex:1;height:5px;background:#1a1a1a;border-radius:4px;overflow:hidden}
        .voice-bar .progress-fill{height:100%;background:var(--accent);border-radius:4px}
        .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px}
        .modal{background:rgba(10,10,10,.96);border:1px solid var(--accent);border-radius:18px;padding:22px;width:92%;max-width:400px;color:#fff;max-height:85vh;overflow-y:auto;box-shadow:0 0 40px color-mix(in srgb,var(--accent) 30%,transparent);position:relative}
        .modal h3{margin:0 0 16px;color:var(--accent);text-align:center;font-size:1.3rem;text-shadow:0 0 12px var(--glow)}
        .modal .close-x{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;border:none;background:var(--accent);color:#fff;font-size:18px;cursor:pointer}
        .export-formats{display:flex;justify-content:center;gap:12px;margin:18px 0;flex-wrap:wrap}
        .export-formats button{background:var(--accent);color:#fff;border:none;border-radius:24px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 0 12px var(--glow)}
        .export-formats button.active{outline:2px solid #fff;outline-offset:2px}
        .export-progress{height:10px;background:#1a1a1a;border-radius:20px;border:1px solid color-mix(in srgb,var(--accent) 40%,transparent);margin:16px 0;overflow:hidden}
        .export-progress-fill{height:100%;background:var(--accent);border-radius:20px;transition:width .3s}
        .export-actions{display:flex;gap:12px;justify-content:center;margin-top:12px;flex-wrap:wrap}
        .export-actions button{background:var(--accent);color:#fff;border:none;border-radius:24px;padding:12px 20px;font-size:14px;font-weight:600;cursor:pointer}
        .export-actions button.cancel{background:transparent;border:1px solid var(--accent);color:var(--accent)}
        .export-hint{text-align:center;font-size:12px;color:color-mix(in srgb,var(--accent) 70%,#888);margin-top:10px}
        .modal button.full{display:block;width:100%;margin:8px 0;padding:12px;border-radius:12px;border:none;background:var(--accent);color:#fff;font-size:14px;cursor:pointer;font-family:'Lora',serif}
        .modal button.cancel{background:transparent;border:1px solid #444;color:#ccc}
        .modal input,.modal textarea,.modal select{width:100%;padding:10px;border-radius:10px;border:1px solid #444;background:#111;color:#fff;margin:6px 0;font-family:'Lora',serif}
        .modal textarea{min-height:90px;resize:vertical}
        /* Vista previa: layout sin choques */
        .preview-overlay{position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:250;display:flex;align-items:center;justify-content:center;padding:12px}
        .preview-box{
          background:rgba(10,10,10,.97);border:1px solid var(--accent);border-radius:16px;
          width:94%;max-width:900px;max-height:90vh;display:flex;flex-direction:column;
          color:#fff;position:relative;overflow:hidden;
        }
        .preview-header{
          flex-shrink:0;display:flex;align-items:center;justify-content:space-between;
          padding:12px 14px;border-bottom:1px solid color-mix(in srgb,var(--accent) 35%,transparent);
          gap:10px;
        }
        .preview-header .title-nav{
          flex:1;display:flex;align-items:center;justify-content:center;gap:10px;min-width:0;
        }
        .preview-header .title-nav span{
          color:var(--accent);font-weight:600;font-size:14px;
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;
        }
        .preview-header button.nav-btn{
          background:var(--accent);color:#fff;border:none;border-radius:8px;
          padding:8px 12px;cursor:pointer;font-size:14px;flex-shrink:0;
        }
        .preview-header button.nav-btn:disabled{opacity:0.35;cursor:default}
        .preview-close-btn{
          flex-shrink:0;width:40px;height:40px;border-radius:50%;
          background:var(--accent);color:#fff;border:none;font-size:18px;cursor:pointer;
          box-shadow:0 0 12px var(--glow);
        }
        .preview-body{flex:1;min-height:0;overflow-y:auto;padding:16px 20px;line-height:1.55}
        .preview-footer{
          flex-shrink:0;padding:10px 14px;border-top:1px solid color-mix(in srgb,var(--accent) 25%,transparent);
          display:flex;justify-content:center;
        }
        .preview-footer button{
          background:var(--accent);color:#fff;border:none;border-radius:20px;
          padding:10px 28px;font-size:14px;cursor:pointer;font-family:'Lora',serif;
          box-shadow:0 0 12px var(--glow);
        }
        .preview-figure{text-align:center;margin:14px 0}
        .wa-code{background:#2a2a2a;padding:2px 7px;border-radius:6px;font-family:monospace}
        .wa-quote{border-left:4px solid var(--accent);padding-left:10px;margin:6px 0;color:#ccc}
        .figure-item{display:flex;align-items:center;gap:10px;padding:8px;background:rgba(255,255,255,.04);border-radius:10px;margin-bottom:6px}
        .figure-item img,.figure-item video{width:48px;height:48px;object-fit:cover;border-radius:8px}
        .figure-item button{background:var(--accent);color:#fff;border:none;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer}
        .action-item{display:flex;justify-content:space-between;align-items:center;padding:9px 11px;background:#1e1e1e;border-radius:9px;margin:5px 0}
        .action-item .name{flex:1;color:var(--accent);cursor:pointer}
        .comment-group{margin-bottom:14px}
        .comment-group h4{color:var(--accent);margin:0 0 8px;font-size:14px}
        .comment-card{background:#1a1a1a;border:1px solid #333;border-radius:10px;padding:10px;margin-bottom:6px;font-size:13px}
        .comment-card .meta{color:#888;font-size:11px;margin-bottom:4px}
        .spell-box{background:#1a1a1a;border:1px solid #333;border-radius:10px;padding:12px;margin:10px 0}
        .spell-box .word{color:var(--accent);font-weight:700}
        .spell-sugs{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
        .spell-sugs button{background:#222;border:1px solid #444;color:#fff;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer}
        .notif{position:fixed;top:16px;left:50%;transform:translateX(-50%);background:rgba(20,20,20,.93);border:1px solid var(--accent);color:#fff;padding:10px 20px;border-radius:22px;z-index:400;font-size:13px}
        @media(max-width:600px){
          .bm-title{font-size:14px;padding:6px 14px}
          .bm-textarea{font-size:15px;border-radius:18px}
          .char-bubble{font-size:16px;padding:10px 20px;min-width:120px}
          .sel-bar{left:50%!important;transform:translateX(-50%);bottom:120px;top:auto!important}
          .preview-header .title-nav span{max-width:100px;font-size:12px}
        }
      `}</style>

      <div className="particles" />

      <div className="top-row">
        <button className="icon-btn" onClick={() => startVoice(false)} title="Leer">🎤</button>
        <div className="bm-title">Biblias Maker</div>
        <button
          className="icon-btn"
          onClick={() => { setPreviewHojaId(activeHojaId); setShowPreview(true); }}
          title="Vista previa"
        >
          👁
        </button>
      </div>

      <div className="hojas-bar">
        {hojas.map((h) => (
          <div
            key={h.id}
            className={`hoja-tab ${h.id === activeHojaId ? 'active' : ''}`}
            onClick={() => switchHoja(h.id)}
          >
            <span>{h.name}</span>
            {hojas.length > 1 && (
              <span onClick={(e) => { e.stopPropagation(); closeHoja(h.id); }}>×</span>
            )}
          </div>
        ))}
        <button className="hoja-tab" onClick={() => createHoja()}>+</button>
      </div>

      <div className="main-area">
        <textarea
          ref={textareaRef}
          className="bm-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onSelect={updateSelection}
          onMouseUp={updateSelection}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && askPrefixes) {
              e.preventDefault();
              setShowPrefixPlatform(true);
            }
          }}
          placeholder="Escribe tu turno aquí... uwu"
          spellCheck
        />
      </div>

      <div className="bottom-row">
        <div className="bottom-left">
          <button className="round-btn" onClick={undo} title="Deshacer">↶</button>
          <button className="round-btn" onClick={redo} title="Rehacer">↷</button>
        </div>
        <div className="char-bubble">Contador: {charCount}</div>
        <div className="bottom-right">
          <button className="round-btn" onClick={() => setShowMediaPanel(true)}>🖼</button>
          <button className="options-btn" onClick={() => { setShowOptions(!showOptions); playClick(); }}>
            Opciones
          </button>
        </div>
      </div>

      {showOptions && (
        <div className="options-dropdown scroll-thin">
          <button onClick={() => { setPreviewHojaId(activeHojaId); setShowPreview(true); setShowOptions(false); }}>👁 Vista previa</button>
          <button onClick={() => { localStorage.setItem('textContent', text); navigate('/Writer'); }}>✍ Modo Escritor</button>
          <button onClick={() => navigate('/proyectos')}>📂 Mis Proyectos</button>
          <button onClick={() => { setShowHojasMenu(true); setShowOptions(false); }}>📄 Hojas</button>
          <button onClick={() => { setShowActions(true); setShowOptions(false); }}>📋 Marcos</button>
          <button onClick={() => { setShowCommentsPanel(true); setShowOptions(false); }}>💬 Comentarios</button>
          <button onClick={() => { setShowBibleCreator(true); setShowOptions(false); }}>📚 Crear Biblias</button>
          <button onClick={() => { setShowExport(true); setShowOptions(false); }}>⬇️ Exportar Biblia</button>
          <button onClick={() => { setShowSaveToProjects(true); setSaveAfterExport(false); setShowOptions(false); }}>💾 Guardar en Mis Biblias</button>
          <button onClick={() => { navigator.clipboard.writeText(text); showNotif('Copiado'); setShowOptions(false); }}>📋 Copiar Todo</button>
          <button onClick={() => { setAskPrefixes(!askPrefixes); showNotif(askPrefixes ? 'Prefijos OFF' : 'Prefijos ON'); }}>
            {askPrefixes ? 'Apagar prefijos' : 'Encender prefijos'}
          </button>
          <button onClick={() => { setShowSpellAI(true); setShowOptions(false); }}>✨ Limpiar ortografía</button>
          <button onClick={() => { setShowTheme(true); setShowOptions(false); }}>🎨 Temas</button>
          <button onClick={() => navigate('/calcular')}>☣ Calculadora</button>
        </div>
      )}

      {showSelBar && selection && (
        <div className="sel-bar" style={{ left: selBarPos.x, top: selBarPos.y }}>
          <button title="Comentar" onClick={() => { setSelCommentText(''); setShowSelComment(true); }}>💬</button>
          <button title="Prefijos" onClick={() => setShowPrefixPlatform(true)}>𝒯</button>
          <button title="Leer selección" onClick={() => startVoice(true)}>▶</button>
        </div>
      )}

      {showPrefixPlatform && (
        <div className="modal-backdrop" onClick={() => setShowPrefixPlatform(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Formato</h3>
            <button className="full" onClick={() => { setPrefixPlatform('whatsapp'); setShowPrefixPlatform(false); setShowPrefixCommands(true); }}>WhatsApp</button>
            <button className="full" onClick={() => { setPrefixPlatform('amino'); setShowPrefixPlatform(false); setShowPrefixCommands(true); }}>Amino</button>
            <button className="full" onClick={() => { setPrefixPlatform('kyodo'); setShowPrefixPlatform(false); setShowPrefixCommands(true); }}>Kyodo</button>
            <button className="full cancel" onClick={() => setShowPrefixPlatform(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {showPrefixCommands && (
        <div className="modal-backdrop" onClick={() => setShowPrefixCommands(false)}>
          <div className="modal scroll-thin" onClick={(e) => e.stopPropagation()}>
            <h3>{prefixPlatform === 'whatsapp' ? 'WhatsApp' : prefixPlatform === 'amino' ? 'Amino' : 'Kyodo'}</h3>
            {PREFIX_COMMANDS[prefixPlatform].map((cmd) => (
              <button key={cmd.id} className="full" onClick={() => applyPrefixCommand(cmd.wrap)}>
                {cmd.label}
              </button>
            ))}
            <button className="full cancel" onClick={() => setShowPrefixCommands(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {showSelComment && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Comentar selección</h3>
            <p style={{ fontSize: 12, color: '#888' }}>«{(selection?.text || '').slice(0, 80)}…»</p>
            <textarea value={selCommentText} onChange={(e) => setSelCommentText(e.target.value)} placeholder="Tu comentario…" />
            <button className="full" onClick={saveSelectionComment}>Guardar</button>
            <button className="full cancel" onClick={() => setShowSelComment(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {showParaComment && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Comentario párrafo {paraIndex + 1}</h3>
            <textarea value={paraCommentText} onChange={(e) => setParaCommentText(e.target.value)} placeholder="Nota…" />
            <button className="full" onClick={saveParaComment}>Guardar</button>
            <button className="full cancel" onClick={() => setShowParaComment(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {showCommentsPanel && (
        <div className="modal-backdrop" onClick={() => setShowCommentsPanel(false)}>
          <div className="modal scroll-thin" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h3>Comentarios</h3>
            {comments.length === 0 && <p style={{ color: '#666', textAlign: 'center' }}>Sin comentarios</p>}
            {[...commentsByHoja.entries()].map(([hojaId, list]) => (
              <div key={hojaId} className="comment-group">
                <h4>{list[0]?.hojaName || 'Hoja'}</h4>
                {list.map((c) => (
                  <div key={c.id} className="comment-card">
                    <div className="meta">
                      {c.type === 'selection'
                        ? `Selección: “${(c.selectedText || '').slice(0, 36)}…”`
                        : `Párrafo ${(c.paragraphIndex ?? 0) + 1}`}
                    </div>
                    {c.text}
                  </div>
                ))}
              </div>
            ))}
            <button className="full cancel" onClick={() => setShowCommentsPanel(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {showVoiceBar && (
        <div className="voice-bar">
          <div className="row">
            <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}>
              {voices.map((v) => (
                <option key={v.name} value={v.name}>{v.name.slice(0, 28)}</option>
              ))}
            </select>
            <button className="ctrl" onClick={toggleVoice}>{isSpeaking ? '⏹' : '▶'}</button>
            <button className="ctrl" onClick={() => { stopVoice(); setShowVoiceBar(false); }}>✕</button>
          </div>
          <div className="row">
            <span style={{ fontSize: 11, color: '#888' }}>Vel</span>
            <input type="range" min="0.5" max="2" step="0.1" value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))} />
            <span style={{ fontSize: 11, width: 28 }}>{speechRate.toFixed(1)}</span>
          </div>
          <div className="progress-row">
            <span>{formatTime(elapsed)}</span>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span>{formatTime(remaining)}</span>
          </div>
          {selectionOnly && <div style={{ fontSize: 11, color: '#888' }}>Selección</div>}
        </div>
      )}

      {showExport && (
        <div className="modal-backdrop" onClick={() => !exporting && setShowExport(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-x" onClick={() => setShowExport(false)}>×</button>
            <h3>Exportar Biblia</h3>
            <div className="export-formats">
              <button className={exportFormat === 'pdf' ? 'active' : ''} onClick={() => setExportFormat('pdf')}>PDF</button>
              <button className={exportFormat === 'txt' ? 'active' : ''} onClick={() => setExportFormat('txt')}>TXT</button>
              <button className={exportFormat === 'mp3' ? 'active' : ''} onClick={() => setExportFormat('mp3')}>MP3</button>
            </div>
            <div className="export-progress">
              <div className="export-progress-fill" style={{ width: `${exportProgress}%` }} />
            </div>
            <div className="export-actions">
              <button onClick={doExport} disabled={!exportFormat || exporting}>
                {exporting ? 'Generando…' : 'Generar y Descargar'}
              </button>
              <button className="cancel" onClick={() => setShowExport(false)}>Cancelar</button>
            </div>
            <button
              className="full"
              style={{ marginTop: 12 }}
              onClick={() => {
                setShowExport(false);
                setSaveAfterExport(false);
                setShowSaveToProjects(true);
              }}
            >
              💾 Guardar en Mis Biblias
            </button>
            <div className="export-hint">
              {exportFormat === 'pdf'
                ? 'PDF: se abre impresión → elige “Guardar como PDF”'
                : exportFormat
                  ? `Formato: ${exportFormat.toUpperCase()}`
                  : 'Selecciona un formato'}
            </div>
          </div>
        </div>
      )}

      {showSaveToProjects && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>{saveAfterExport ? '¿Guardar en Mis Biblias?' : 'Guardar en Mis Biblias'}</h3>
            <p style={{ fontSize: 13, color: '#aaa', textAlign: 'center', marginBottom: 12 }}>
              {hojas.length > 1
                ? `Se guardarán ${hojas.length} biblias (una por hoja), con comentarios.`
                : 'Se guardará la hoja actual con sus comentarios.'}
            </p>
            <button className="full" onClick={saveAllHojasToProjects}>Sí, guardar</button>
            <button className="full cancel" onClick={() => setShowSaveToProjects(false)}>
              {saveAfterExport ? 'No, solo exporté' : 'Cancelar'}
            </button>
          </div>
        </div>
      )}

      {showMediaPanel && (
        <div className="modal-backdrop" onClick={() => setShowMediaPanel(false)}>
          <div className="modal scroll-thin" onClick={(e) => e.stopPropagation()}>
            <h3>Figuras (caché permanente)</h3>
            <button className="full" onClick={() => mediaInputRef.current?.click()}>➕ Subir</button>
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) insertImage(f);
              }}
            />
            {figures.map((fig) => (
              <div key={fig.id} className="figure-item">
                {fig.isVideo ? (
                  <video src={fig.src} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                ) : (
                  <img src={fig.src} alt="" />
                )}
                <div style={{ flex: 1, fontSize: 12, color: 'var(--accent)' }}>{fig.tag}</div>
                <button onClick={() => { insertTagAtCursor(fig.tag); setShowMediaPanel(false); }}>Insertar</button>
              </div>
            ))}
            <button className="full cancel" onClick={() => setShowMediaPanel(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {showActions && (
        <div className="modal-backdrop" onClick={() => setShowActions(false)}>
          <div className="modal scroll-thin" onClick={(e) => e.stopPropagation()}>
            <h3>Marcos</h3>
            <button className="full" onClick={() => { setEditingAction({ name: '', content: '', index: null }); setShowActionEditor(true); }}>➕ Nuevo</button>
            {actions.map((a, i) => (
              <div key={i} className="action-item">
                <span
                  className="name"
                  onClick={() => {
                    const ta = textareaRef.current;
                    if (!ta) return;
                    const s = ta.selectionStart;
                    setText(text.substring(0, s) + a.content + text.substring(s));
                    setShowActions(false);
                  }}
                >
                  {a.name}
                </span>
              </div>
            ))}
            <button className="full cancel" onClick={() => setShowActions(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {showActionEditor && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Marco</h3>
            <input placeholder="Nombre" value={editingAction.name} onChange={(e) => setEditingAction({ ...editingAction, name: e.target.value })} />
            <textarea placeholder="Contenido" value={editingAction.content} onChange={(e) => setEditingAction({ ...editingAction, content: e.target.value })} />
            <button
              className="full"
              onClick={() => {
                if (!editingAction.name.trim() || !editingAction.content.trim()) return;
                if (editingAction.index !== null) {
                  setActions((p) =>
                    p.map((a, i) =>
                      i === editingAction.index
                        ? { name: editingAction.name, content: editingAction.content }
                        : a
                    )
                  );
                } else {
                  setActions((p) => [...p, { name: editingAction.name, content: editingAction.content }]);
                }
                setShowActionEditor(false);
              }}
            >
              Guardar
            </button>
            <button className="full cancel" onClick={() => setShowActionEditor(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {showBibleCreator && (
        <div className="modal-backdrop" onClick={() => setShowBibleCreator(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Crear Biblias</h3>
            <button className="full" onClick={() => createBibles('amino')}>Amino / Kyodo (2000)</button>
            <button className="full" onClick={() => createBibles('twitter')}>Twitter / X (280)</button>
            <button className="full cancel" onClick={() => setShowBibleCreator(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {showHojasMenu && (
        <div className="modal-backdrop" onClick={() => setShowHojasMenu(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Hojas</h3>
            <button className="full" onClick={() => createHoja()}>Nueva</button>
            <button className="full" onClick={() => { setShowHojasMenu(false); setShowImportModal(true); }}>Importar</button>
            <button className="full cancel" onClick={() => setShowHojasMenu(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal-backdrop" onClick={() => setShowImportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Importar</h3>
            <button
              className="full"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.txt,.md,text/plain';
                input.onchange = (ev) => {
                  const f = (ev.target as HTMLInputElement).files?.[0];
                  if (!f) return;
                  if (f.name.toLowerCase().endsWith('.pdf')) {
                    createHoja(f.name.replace(/\.[^/.]+$/, ''), `[PDF] ${f.name}\n\nUsa TXT o pega el texto.`);
                    setShowImportModal(false);
                    return;
                  }
                  const r = new FileReader();
                  r.onload = () => {
                    createHoja(f.name.replace(/\.[^/.]+$/, ''), r.result as string);
                    setShowImportModal(false);
                  };
                  r.readAsText(f);
                };
                input.click();
              }}
            >
              Archivo (TXT)
            </button>
            <button
              className="full"
              onClick={async () => {
                try {
                  const c = await navigator.clipboard.readText();
                  createHoja(prompt('Nombre:', 'Portapapeles') || 'Portapapeles', c);
                  setShowImportModal(false);
                } catch {
                  alert('Sin acceso al portapapeles');
                }
              }}
            >
              Portapapeles
            </button>
            <button className="full cancel" onClick={() => setShowImportModal(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {showSpellAI && (
        <div className="modal-backdrop" onClick={() => setShowSpellAI(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Limpiar ortografía</h3>
            <button
              className="full"
              onClick={() => {
                navigator.clipboard.writeText(CHATGPT_PROMPT + text).then(() => {
                  window.open('https://chatgpt.com', '_blank');
                  showNotif('Instrucciones + texto copiados');
                });
                setShowSpellAI(false);
              }}
            >
              ✨ Con IA (ChatGPT)
            </button>
            <p style={{ fontSize: 12, color: '#888', margin: '8px 0' }}>
              Se copia el texto con reglas estrictas RAE. Pégalo en ChatGPT y trae la respuesta.
            </p>
            <button
              className="full"
              onClick={() => {
                setShowSpellAI(false);
                runSpellManual();
              }}
            >
              🔍 Manual (LanguageTool)
            </button>
            <button className="full cancel" onClick={() => setShowSpellAI(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {showSpellManual && (
        <div className="modal-backdrop" onClick={() => setShowSpellManual(false)}>
          <div className="modal scroll-thin" onClick={(e) => e.stopPropagation()}>
            <h3>Revisión ortográfica</h3>
            {spellLoading && <p style={{ textAlign: 'center', color: '#888' }}>Analizando…</p>}
            {!spellLoading && spellErrors.length === 0 && (
              <p style={{ textAlign: 'center', color: '#888' }}>Sin errores o sin conexión</p>
            )}
            {!spellLoading && spellErrors.length > 0 && (
              <>
                <p style={{ fontSize: 12, color: '#aaa' }}>
                  {spellIdx + 1} / {spellErrors.length}
                </p>
                <div className="spell-box">
                  <div>
                    Palabra: <span className="word">{spellErrors[spellIdx]?.word}</span>
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>{spellErrors[spellIdx]?.message}</div>
                  <div className="spell-sugs">
                    {(spellErrors[spellIdx]?.suggestions || []).map((s) => (
                      <button key={s} onClick={() => applySpellSuggestion(s)}>{s}</button>
                    ))}
                  </div>
                </div>
                <button className="full" onClick={allowWord}>Añadir al diccionario</button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="full cancel"
                    style={{ flex: 1 }}
                    disabled={spellIdx <= 0}
                    onClick={() => setSpellIdx((i) => Math.max(0, i - 1))}
                  >
                    ←
                  </button>
                  <button
                    className="full cancel"
                    style={{ flex: 1 }}
                    disabled={spellIdx >= spellErrors.length - 1}
                    onClick={() => setSpellIdx((i) => Math.min(spellErrors.length - 1, i + 1))}
                  >
                    →
                  </button>
                </div>
              </>
            )}
            <button className="full cancel" onClick={() => setShowSpellManual(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {/* ========== VISTA PREVIA: cerrar siempre visible, sin choque ========== */}
      {showPreview && (
        <div className="preview-overlay" onClick={() => setShowPreview(false)}>
          <div className="preview-box" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <div className="title-nav">
                {hojas.length > 1 && (
                  <button
                    className="nav-btn"
                    onClick={() => {
                      const idx = hojas.findIndex((h) => h.id === previewHojaId);
                      setPreviewHojaId(hojas[(idx - 1 + hojas.length) % hojas.length].id);
                    }}
                  >
                    ←
                  </button>
                )}
                <span>{hojas.find((h) => h.id === previewHojaId)?.name || 'Vista previa'}</span>
                {hojas.length > 1 && (
                  <button
                    className="nav-btn"
                    onClick={() => {
                      const idx = hojas.findIndex((h) => h.id === previewHojaId);
                      setPreviewHojaId(hojas[(idx + 1) % hojas.length].id);
                    }}
                  >
                    →
                  </button>
                )}
              </div>
              {/* Cerrar siempre, separado de las flechas */}
              <button
                className="preview-close-btn"
                onClick={() => setShowPreview(false)}
                title="Cerrar (Esc)"
              >
                ×
              </button>
            </div>
            <div
              className="preview-body scroll-thin"
              dangerouslySetInnerHTML={{
                __html: buildPreviewHtml(
                  previewHojaId === activeHojaId
                    ? text
                    : hojas.find((h) => h.id === previewHojaId)?.content || ''
                ),
              }}
            />
            <div className="preview-footer">
              <button onClick={() => setShowPreview(false)}>Cerrar vista previa</button>
            </div>
          </div>
        </div>
      )}

      {showTheme && (
        <div className="modal-backdrop" onClick={() => setShowTheme(false)}>
          <div style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <ThemeSwitcher onClose={() => setShowTheme(false)} />
          </div>
        </div>
      )}

      {notification && <div className="notif">{notification}</div>}
    </div>
  );
}

//No recibe datos de Projects / Mis Biblias.
//No envía datos a Writes / Modo escritor.