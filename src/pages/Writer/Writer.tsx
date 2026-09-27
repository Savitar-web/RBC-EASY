import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';

interface Action {
  name: string;
  content: string;
}

interface Comment {
  id: string;
  type: 'paragraph' | 'selection';
  paragraphIndex?: number;
  selectedText?: string;
  text: string;
  createdAt: number;
}

interface Hoja {
  id: string;
  name: string;
  content: string;
}

type PrefixPlatform = 'whatsapp' | 'amino' | 'kyodo';
type PaperTone = 'dark' | 'light' | 'sepia';

const PREFIX_COMMANDS: Record<
  PrefixPlatform,
  { id: string; label: string; wrap: (s: string) => string }[]
> = {
  whatsapp: [
    { id: 'bold', label: 'Negrita *texto*', wrap: (s) => `*${s}*` },
    { id: 'italic', label: 'Cursiva _texto_', wrap: (s) => `_${s}_` },
    { id: 'strike', label: 'Tachado ~texto~', wrap: (s) => `~${s}~` },
    { id: 'mono', label: 'Mono ```texto```', wrap: (s) => '```' + s + '```' },
    { id: 'code', label: 'Código `texto`', wrap: (s) => '`' + s + '`' },
    { id: 'quote', label: 'Cita > texto', wrap: (s) => `> ${s}` },
  ],
  amino: [
    { id: 'B', label: '[B] Negrita', wrap: (s) => `[B]${s}` },
    { id: 'I', label: '[I] Cursiva', wrap: (s) => `[I]${s}` },
    { id: 'U', label: '[U] Subrayado', wrap: (s) => `[U]${s}` },
    { id: 'S', label: '[S] Tachado', wrap: (s) => `[S]${s}` },
    { id: 'C', label: '[C] Centrado', wrap: (s) => `[C]${s}` },
    { id: 'BI', label: '[BI] N+C', wrap: (s) => `[BI]${s}` },
    { id: 'BICUS', label: '[BICUS] Todo', wrap: (s) => `[BICUS]${s}` },
  ],
  kyodo: [
    { id: 'b', label: '[B] Negrita', wrap: (s) => `[B]${s}` },
    { id: 'i', label: '[I] Cursiva', wrap: (s) => `[I]${s}` },
    { id: 'u', label: '[U] Subrayado', wrap: (s) => `[U]${s}` },
    { id: 's', label: '[S] Tachado', wrap: (s) => `[S]${s}` },
    { id: 'bi', label: '[BI] N+C', wrap: (s) => `[BI]${s}` },
    { id: 'bius', label: '[BIUS] Todo', wrap: (s) => `[BIUS]${s}` },
  ],
};

const ACTIONS_KEY = 'actionStore';
const WRITER_COMMENTS_KEY = 'writer_comments_v1';
const WRITER_SAVE_KEY = 'writer_autosave_text';
const WRITER_HOJAS_KEY = 'writer_hojas_v1';
const WRITER_ACTIVE_KEY = 'writer_active_hoja';
const FIGURES_KEY = 'figureStore';
const BIBLIAS_HOJAS_KEY = 'biblias_hojas_v1';
const BIBLIAS_ACTIVE_KEY = 'biblias_active_hoja';

const PAPER_STYLES: Record<PaperTone, { bg: string; color: string; placeholder: string }> = {
  dark: { bg: 'rgba(0,0,0,0.72)', color: '#e8e8e8', placeholder: '#ff6666' },
  light: { bg: '#f4f1ea', color: '#1a1a1a', placeholder: '#888888' },
  sepia: { bg: '#f0e6d2', color: '#3d2b1f', placeholder: '#8b7355' },
};

export default function Writer() {
  const navigate = useNavigate();
  useTheme();

  const taRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndex = useRef(-1);
  const isUndoRedo = useRef(false);
  const progressTimer = useRef<number | null>(null);
  const speakStart = useRef(0);
  const longPressTimer = useRef<number | null>(null);

  const [hojas, setHojas] = useState<Hoja[]>([{ id: 'h1', name: 'Hoja 1', content: '' }]);
  const [activeHojaId, setActiveHojaId] = useState('h1');
  const [text, setText] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [actions, setActions] = useState<Action[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [paperTone, setPaperTone] = useState<PaperTone>('dark');

  const [showOptions, setShowOptions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showActionEditor, setShowActionEditor] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showHojas, setShowHojas] = useState(false);
  const [showPaper, setShowPaper] = useState(false);
  const [showPrefixPlatform, setShowPrefixPlatform] = useState(false);
  const [showPrefixCommands, setShowPrefixCommands] = useState(false);
  const [prefixPlatform, setPrefixPlatform] = useState<PrefixPlatform>('whatsapp');
  const [askPrefixes, setAskPrefixes] = useState(false);

  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const [showSelBar, setShowSelBar] = useState(false);
  const [selBarPos, setSelBarPos] = useState({ x: 0, y: 0 });
  const [showSelComment, setShowSelComment] = useState(false);
  const [selCommentText, setSelCommentText] = useState('');
  const [showParaComment, setShowParaComment] = useState(false);
  const [paraIndex, setParaIndex] = useState(-1);
  const [paraCommentText, setParaCommentText] = useState('');

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showVoiceBar, setShowVoiceBar] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState(0);
  const [speechRate, setSpeechRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(0);

  const [editingAction, setEditingAction] = useState<{ name: string; content: string; index: number | null }>({
    name: '', content: '', index: null,
  });
  const [notification, setNotification] = useState<string | null>(null);

  const showNotif = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2800);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const activeHoja = hojas.find((h) => h.id === activeHojaId) || hojas[0];

  /* ---------- Sincronizar texto ↔ hoja activa ---------- */
  const commitTextToHojas = useCallback(
    (nextText: string, hojaId = activeHojaId) => {
      setHojas((prev) =>
        prev.map((h) => (h.id === hojaId ? { ...h, content: nextText } : h))
      );
    },
    [activeHojaId]
  );

  const switchHoja = (id: string) => {
    commitTextToHojas(text);
    const target = hojas.find((h) => h.id === id);
    if (!target) return;
    setActiveHojaId(id);
    setText(target.content);
    historyRef.current = [target.content];
    historyIndex.current = 0;
    setShowHojas(false);
  };

  const addHoja = () => {
    commitTextToHojas(text);
    const id = 'h' + Date.now();
    const name = `Hoja ${hojas.length + 1}`;
    setHojas((p) => [...p, { id, name, content: '' }]);
    setActiveHojaId(id);
    setText('');
    historyRef.current = [''];
    historyIndex.current = 0;
    setShowHojas(false);
    showNotif('Hoja creada');
  };

  const renameHoja = (id: string) => {
    const h = hojas.find((x) => x.id === id);
    if (!h) return;
    const name = prompt('Nombre de la hoja:', h.name);
    if (!name?.trim()) return;
    setHojas((p) => p.map((x) => (x.id === id ? { ...x, name: name.trim() } : x)));
  };

  const closeHoja = (id: string) => {
    if (hojas.length <= 1) {
      alert('Debe quedar al menos una hoja');
      return;
    }
    const next = hojas.filter((h) => h.id !== id);
    setHojas(next);
    if (activeHojaId === id) {
      setActiveHojaId(next[0].id);
      setText(next[0].content);
      historyRef.current = [next[0].content];
      historyIndex.current = 0;
    }
  };

  /** Importar hojas desde BibliasMaker (localStorage compartido) */
  const importFromBiblias = () => {
    try {
      const raw = localStorage.getItem(BIBLIAS_HOJAS_KEY);
      if (!raw) {
        showNotif('No hay hojas en Biblias Maker');
        return;
      }
      const list: Hoja[] = JSON.parse(raw);
      if (!Array.isArray(list) || list.length === 0) {
        showNotif('No hay hojas en Biblias Maker');
        return;
      }
      commitTextToHojas(text);
      const merged = [...hojas];
      list.forEach((bh) => {
        if (!merged.some((m) => m.id === bh.id)) {
          merged.push({ id: bh.id, name: bh.name || 'Importada', content: bh.content || '' });
        } else {
          const i = merged.findIndex((m) => m.id === bh.id);
          merged[i] = { ...merged[i], content: bh.content || merged[i].content, name: bh.name || merged[i].name };
        }
      });
      setHojas(merged);
      showNotif(`Importadas ${list.length} hoja(s) de Biblias`);
      setShowHojas(false);
    } catch {
      showNotif('Error al importar hojas');
    }
  };

  /* ---------- Carga inicial ---------- */
  useEffect(() => {
    let initialHojas: Hoja[] = [{ id: 'h1', name: 'Hoja 1', content: '' }];
    let activeId = 'h1';

    try {
      const savedHojas = localStorage.getItem(WRITER_HOJAS_KEY);
      const savedActive = localStorage.getItem(WRITER_ACTIVE_KEY);
      if (savedHojas) {
        const parsed = JSON.parse(savedHojas) as Hoja[];
        if (Array.isArray(parsed) && parsed.length) {
          initialHojas = parsed;
          activeId = savedActive && parsed.some((h) => h.id === savedActive) ? savedActive : parsed[0].id;
        }
      }
    } catch { /* */ }

    // Contenido que viene de BibliasMaker
    const fromBiblias = localStorage.getItem('textContent');
    if (fromBiblias !== null) {
      localStorage.removeItem('textContent');
      const first = initialHojas[0];
      initialHojas = [{ ...first, content: fromBiblias }, ...initialHojas.slice(1)];
      activeId = first.id;
    } else {
      const autosaved = localStorage.getItem(WRITER_SAVE_KEY);
      if (autosaved && !initialHojas[0].content) {
        initialHojas = [{ ...initialHojas[0], content: autosaved }, ...initialHojas.slice(1)];
      }
    }

    setHojas(initialHojas);
    setActiveHojaId(activeId);
    const startText = initialHojas.find((h) => h.id === activeId)?.content || '';
    setText(startText);
    historyRef.current = [startText];
    historyIndex.current = 0;

    try {
      const acts = localStorage.getItem(ACTIONS_KEY);
      if (acts) setActions(JSON.parse(acts));
      const com = localStorage.getItem(WRITER_COMMENTS_KEY);
      if (com) setComments(JSON.parse(com));
      const tone = localStorage.getItem('writer_paper_tone') as PaperTone | null;
      if (tone && PAPER_STYLES[tone]) setPaperTone(tone);
    } catch { /* */ }

    const loadVoices = () => {
      const list = speechSynthesis
        .getVoices()
        .filter((v) => v.lang.startsWith('es') || v.lang.startsWith('en'));
      setVoices(list);
    };
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    setTimeout(loadVoices, 400);

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'Escape') {
        setShowPreview(false);
        setShowOptions(false);
        setShowActions(false);
        setShowHojas(false);
        setShowPaper(false);
        setShowVoiceBar(false);
        stopVoice();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      speechSynthesis.cancel();
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Autosave 500 ms ---------- */
  useEffect(() => {
    const id = window.setInterval(() => {
      try {
        const synced = hojas.map((h) =>
          h.id === activeHojaId ? { ...h, content: text } : h
        );
        localStorage.setItem(WRITER_SAVE_KEY, text);
        localStorage.setItem(WRITER_HOJAS_KEY, JSON.stringify(synced));
        localStorage.setItem(WRITER_ACTIVE_KEY, activeHojaId);
        localStorage.setItem(ACTIONS_KEY, JSON.stringify(actions));
        localStorage.setItem(WRITER_COMMENTS_KEY, JSON.stringify(comments));
        localStorage.setItem('writer_paper_tone', paperTone);
      } catch { /* quota */ }
    }, 500);
    return () => clearInterval(id);
  }, [text, hojas, activeHojaId, actions, comments, paperTone]);

  useEffect(() => {
    setCharCount(text.length);
    if (isUndoRedo.current) return;
    const h = historyRef.current.slice(0, historyIndex.current + 1);
    if (h[h.length - 1] === text) return;
    h.push(text);
    if (h.length > 80) h.shift();
    historyRef.current = h;
    historyIndex.current = h.length - 1;
  }, [text]);

  /* ---------- Undo / Redo ---------- */
  const undo = () => {
    if (historyIndex.current <= 0) return;
    isUndoRedo.current = true;
    historyIndex.current -= 1;
    setText(historyRef.current[historyIndex.current]);
    setTimeout(() => { isUndoRedo.current = false; }, 40);
  };

  const redo = () => {
    if (historyIndex.current >= historyRef.current.length - 1) return;
    isUndoRedo.current = true;
    historyIndex.current += 1;
    setText(historyRef.current[historyIndex.current]);
    setTimeout(() => { isUndoRedo.current = false; }, 40);
  };

  /* ---------- Salir → BibliasMaker con todas las hojas ---------- */
  const exitToBiblias = () => {
    speechSynthesis.cancel();
    const synced = hojas.map((h) =>
      h.id === activeHojaId ? { ...h, content: text } : h
    );
    try {
      localStorage.setItem(WRITER_HOJAS_KEY, JSON.stringify(synced));
      localStorage.setItem(WRITER_ACTIVE_KEY, activeHojaId);
      localStorage.setItem(WRITER_SAVE_KEY, text);
      // Handoff a BibliasMaker
      localStorage.setItem('textContent', text);
      localStorage.setItem(BIBLIAS_HOJAS_KEY, JSON.stringify(synced));
      localStorage.setItem(BIBLIAS_ACTIVE_KEY, activeHojaId);
      localStorage.setItem('writer_to_biblias', '1');
    } catch { /* */ }
    navigate('/Biblias');
  };

  /* ---------- Voz ---------- */
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
  }, []);

  const startVoice = useCallback(
    (onlySelection = false) => {
      const source = onlySelection && selection?.text ? selection.text : text;
      if (!source.trim()) {
        alert('No hay texto para leer');
        return;
      }
      try { speechSynthesis.cancel(); } catch { /* */ }
      if (progressTimer.current) clearInterval(progressTimer.current);

      const utterance = new SpeechSynthesisUtterance(source);
      utterance.lang = 'es-ES';
      utterance.rate = speechRate;
      if (voices[selectedVoice]) utterance.voice = voices[selectedVoice];

      const estimate = Math.max(1, (source.length / 14) * (1 / speechRate));
      setElapsed(0);
      setRemaining(estimate);
      setProgress(0);
      speakStart.current = Date.now();

      utterance.onend = () => {
        setIsSpeaking(false);
        setProgress(100);
        setElapsed(estimate);
        setRemaining(0);
        if (progressTimer.current) clearInterval(progressTimer.current);
      };
      utterance.onerror = () => stopVoice();

      progressTimer.current = window.setInterval(() => {
        const el = (Date.now() - speakStart.current) / 1000;
        setProgress(Math.min(99, (el / estimate) * 100));
        setElapsed(el);
        setRemaining(Math.max(0, estimate - el));
      }, 200);

      try {
        if (speechSynthesis.paused) speechSynthesis.resume();
      } catch { /* */ }
      speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      setShowVoiceBar(true);
      setShowSelBar(false);
    },
    [text, selection, speechRate, selectedVoice, voices, stopVoice]
  );

  const toggleVoice = () => {
    if (isSpeaking) stopVoice();
    else startVoice(false);
  };

  /* ---------- Preview ---------- */
  const buildPreviewHtml = (content: string) => {
    let html = content
      .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
      .replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
      .replace(/_([^_\n]+)_/g, '<i>$1</i>')
      .replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
      .replace(/~([^~\n]+)~/g, '<s>$1</s>')
      .replace(/__([^_\n]+)__/g, '<u>$1</u>')
      .replace(/```([^`]+)```/g, '<code class="pv-code">$1</code>')
      .replace(/`([^`\n]+)`/g, '<code class="pv-code">$1</code>')
      .replace(/^> (.*)$/gm, '<div class="pv-quote">$1</div>');

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

    try {
      const figs: Array<{ tag: string; src: string; isVideo?: boolean }> = JSON.parse(
        localStorage.getItem(FIGURES_KEY) || '[]'
      );
      figs.forEach((fig) => {
        const media = fig.isVideo
          ? `<video controls style="max-width:100%;border-radius:8px"><source src="${fig.src}"></video>`
          : `<img src="${fig.src}" style="max-width:100%;border-radius:8px" alt="" />`;
        html = html.split(fig.tag).join(`<div style="text-align:center;margin:12px 0">${media}</div>`);
      });
    } catch { /* */ }

    return html;
  };

  /* ---------- Selección ---------- */
  const updateSelection = () => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (end > start) {
      setSelection({ start, end, text: text.substring(start, end) });
      const rect = ta.getBoundingClientRect();
      setSelBarPos({
        x: Math.min(rect.left + 12, window.innerWidth - 150),
        y: Math.min(rect.top + 40, window.innerHeight - 100),
      });
      setShowSelBar(true);
    } else {
      setSelection(null);
      setShowSelBar(false);
    }
  };

  const applyPrefix = (wrap: (s: string) => string) => {
    if (!selection) return;
    const { start, end, text: sel } = selection;
    setText(text.substring(0, start) + wrap(sel) + text.substring(end));
    setShowPrefixCommands(false);
    setShowPrefixPlatform(false);
    setShowSelBar(false);
  };

  /* ---------- Comentarios ---------- */
  const getParagraphIndex = (pos: number) =>
    text.substring(0, pos).split(/\n\s*\n/).length - 1;

  const saveSelectionComment = () => {
    if (!selection || !selCommentText.trim()) return;
    setComments((p) => [
      ...p,
      {
        id: crypto.randomUUID(),
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

  const openParaComment = (pos: number) => {
    const idx = getParagraphIndex(pos);
    setParaIndex(idx);
    const existing = comments.find((c) => c.type === 'paragraph' && c.paragraphIndex === idx);
    setParaCommentText(existing?.text || '');
    setShowParaComment(true);
  };

  const saveParaComment = () => {
    if (paraIndex < 0) return;
    setComments((prev) => {
      const others = prev.filter((c) => !(c.type === 'paragraph' && c.paragraphIndex === paraIndex));
      if (!paraCommentText.trim()) return others;
      return [
        ...others,
        {
          id: crypto.randomUUID(),
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

  const onTouchStart = () => {
    const ta = taRef.current;
    if (!ta) return;
    longPressTimer.current = window.setTimeout(() => openParaComment(ta.selectionStart), 550);
  };

  const onTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  /* ---------- Marcos ---------- */
  const insertAction = (content: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    setText(text.substring(0, s) + content + text.substring(s));
    setShowActions(false);
  };

  const saveAction = () => {
    if (!editingAction.name.trim() || !editingAction.content.trim()) {
      alert('Nombre y contenido requeridos');
      return;
    }
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
  };

  const paper = PAPER_STYLES[paperTone];

  return (
    <div className="writer-page">
      <style>{`
        * { box-sizing: border-box; }
        .writer-page {
          margin: 0;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          background: var(--bg-primary, #0a0a0a);
          color: var(--text-primary, #fff);
          display: flex;
          flex-direction: column;
          font-family: 'Lora', Georgia, serif;
          user-select: none;
        }

        .w-top {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid color-mix(in srgb, var(--accent, #ff0000) 45%, transparent);
          box-shadow: 0 4px 24px color-mix(in srgb, var(--accent, #ff0000) 18%, transparent);
          z-index: 30;
        }
        .w-top .icon {
          width: 42px; height: 42px;
          border-radius: 12px;
          border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
          background: color-mix(in srgb, var(--accent) 12%, transparent);
          color: var(--accent);
          font-size: 18px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s, transform 0.15s;
        }
        .w-top .icon:hover {
          background: color-mix(in srgb, var(--accent) 28%, transparent);
          transform: translateY(-1px);
        }
        .w-top .title {
          font-size: 14px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent);
          font-weight: 600;
          text-shadow: 0 0 12px var(--glow, rgba(255,0,0,0.4));
          max-width: 45vw;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .w-main {
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        .w-textarea {
          flex: 1 1 auto;
          min-height: 0;
          width: 100%;
          border: none;
          padding: 18px 20px 90px;
          font-size: 17px;
          line-height: 1.55;
          resize: none;
          outline: none;
          font-family: 'Lora', Georgia, serif;
          transition: background 0.25s, color 0.25s;
        }
        .w-textarea::-webkit-scrollbar { width: 6px; }
        .w-textarea::-webkit-scrollbar-track { background: transparent; }
        .w-textarea::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 8px;
          border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
        }
        .w-textarea { scrollbar-width: thin; scrollbar-color: #333 transparent; }

        .w-counter {
          position: fixed;
          top: 64px;
          right: 14px;
          z-index: 25;
          background: color-mix(in srgb, var(--accent) 85%, #000);
          color: #fff;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 0 16px var(--glow, rgba(255,0,0,0.45));
          backdrop-filter: blur(8px);
          border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent);
          pointer-events: none;
        }

        /* Botones flotantes (sin barra inferior) */
        .w-float {
          position: fixed;
          z-index: 35;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .w-float.left {
          left: 12px;
          bottom: 20px;
        }
        .w-float.right {
          right: 12px;
          bottom: 20px;
        }
        .w-float button {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
          background: rgba(8,8,8,0.78);
          backdrop-filter: blur(14px);
          color: var(--accent);
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 18px rgba(0,0,0,0.4);
          transition: background 0.2s, transform 0.15s;
        }
        .w-float button:hover {
          background: color-mix(in srgb, var(--accent) 22%, transparent);
          transform: translateY(-2px);
        }

        .w-menu {
          position: fixed;
          bottom: 78px;
          right: 12px;
          z-index: 40;
          width: 230px;
          max-height: 55vh;
          overflow-y: auto;
          padding: 8px;
          border-radius: 16px;
          background: rgba(10,10,10,0.94);
          backdrop-filter: blur(20px);
          border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
          box-shadow: 0 12px 40px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .w-menu button {
          background: transparent;
          border: none;
          color: #eee;
          text-align: left;
          padding: 11px 14px;
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
          font-family: 'Lora', serif;
        }
        .w-menu button:hover {
          background: color-mix(in srgb, var(--accent) 18%, transparent);
        }
        .w-menu::-webkit-scrollbar { width: 5px; }
        .w-menu::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }

        .w-sel {
          position: fixed;
          z-index: 50;
          display: flex;
          gap: 8px;
          padding: 8px;
          border-radius: 14px;
          background: rgba(10,10,10,0.95);
          border: 1px solid var(--accent);
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }
        .w-sel button {
          width: 38px; height: 38px;
          border-radius: 50%;
          border: none;
          background: var(--accent);
          color: #fff;
          font-size: 15px;
          cursor: pointer;
        }

        .w-voice {
          position: fixed;
          bottom: 78px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 45;
          width: min(94vw, 420px);
          padding: 12px 14px;
          border-radius: 16px;
          background: rgba(8,8,8,0.94);
          backdrop-filter: blur(16px);
          border: 1px solid var(--accent);
          box-shadow: 0 8px 28px rgba(0,0,0,0.5);
        }
        .w-voice .row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .w-voice select {
          flex: 1; min-width: 0;
          background: #1a1a1a; border: 1px solid #333; color: #fff;
          border-radius: 8px; padding: 6px 8px; font-size: 12px;
        }
        .w-voice input[type=range] { flex: 1; accent-color: var(--accent); height: 6px; }
        .w-voice .ctrl {
          background: var(--accent); color: #fff; border: none;
          border-radius: 8px; padding: 6px 10px; cursor: pointer; font-size: 13px;
        }
        .w-voice .prog-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #aaa; }
        .w-voice .track { flex: 1; height: 5px; background: #1a1a1a; border-radius: 4px; overflow: hidden; }
        .w-voice .fill { height: 100%; background: var(--accent); border-radius: 4px; }

        .w-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(8px);
          z-index: 60;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
        }
        .w-modal {
          width: 92%; max-width: 400px; max-height: 85vh;
          overflow-y: auto;
          padding: 20px;
          border-radius: 18px;
          background: rgba(12,12,12,0.94);
          backdrop-filter: blur(20px);
          border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
          box-shadow: 0 0 40px color-mix(in srgb, var(--accent) 20%, transparent);
          color: #fff;
        }
        .w-modal h3 {
          margin: 0 0 14px;
          color: var(--accent);
          text-align: center;
          font-size: 1.2rem;
          text-shadow: 0 0 10px var(--glow);
        }
        .w-modal button.full {
          display: block; width: 100%; margin: 8px 0; padding: 12px;
          border-radius: 12px; border: none;
          background: var(--accent); color: #fff;
          font-size: 14px; cursor: pointer; font-family: 'Lora', serif;
        }
        .w-modal button.cancel {
          background: transparent;
          border: 1px solid #444;
          color: #ccc;
        }
        .w-modal input, .w-modal textarea {
          width: 100%; padding: 10px; margin: 6px 0;
          border-radius: 10px; border: 1px solid #444;
          background: #111; color: #fff; font-family: 'Lora', serif;
        }
        .w-modal textarea { min-height: 100px; resize: vertical; }

        .hoja-row {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 12px; margin: 4px 0;
          background: rgba(255,255,255,0.04); border-radius: 10px;
          cursor: pointer;
        }
        .hoja-row.active {
          border: 1px solid var(--accent);
          background: color-mix(in srgb, var(--accent) 12%, transparent);
        }
        .hoja-row .name { flex: 1; color: #eee; font-size: 13px; }
        .hoja-row .sm { font-size: 12px; opacity: 0.7; cursor: pointer; }

        .w-preview-box {
          width: 94%; max-width: 880px; max-height: 88vh;
          display: flex; flex-direction: column;
          border-radius: 16px;
          background: rgba(10,10,10,0.96);
          border: 1px solid var(--accent);
          overflow: hidden;
        }
        .w-preview-head {
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px;
          border-bottom: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
        }
        .w-preview-head span { color: var(--accent); font-weight: 600; }
        .w-preview-head button {
          width: 36px; height: 36px; border-radius: 50%;
          border: none; background: var(--accent); color: #fff;
          font-size: 16px; cursor: pointer;
        }
        .w-preview-body {
          flex: 1; min-height: 0; overflow-y: auto;
          padding: 16px 20px; line-height: 1.55; color: #eee;
        }
        .w-preview-body::-webkit-scrollbar { width: 5px; }
        .w-preview-body::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        .pv-code { background: #2a2a2a; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
        .pv-quote { border-left: 3px solid var(--accent); padding-left: 10px; color: #bbb; margin: 6px 0; }

        .action-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 12px; margin: 5px 0;
          background: rgba(255,255,255,0.04); border-radius: 10px;
        }
        .action-item .name { flex: 1; color: var(--accent); cursor: pointer; }
        .comment-card {
          background: #1a1a1a; border: 1px solid #333; border-radius: 10px;
          padding: 10px; margin-bottom: 6px; font-size: 13px;
        }
        .comment-card .meta { color: #888; font-size: 11px; margin-bottom: 4px; }

        .paper-opt {
          display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin: 12px 0;
        }
        .paper-opt button {
          width: 72px; height: 72px; border-radius: 12px;
          border: 2px solid #444; cursor: pointer; font-size: 12px;
          display: flex; align-items: flex-end; justify-content: center;
          padding-bottom: 8px; font-weight: 600;
        }
        .paper-opt button.active { border-color: var(--accent); box-shadow: 0 0 12px var(--glow); }
        .paper-opt .p-dark { background: #111; color: #eee; }
        .paper-opt .p-light { background: #f4f1ea; color: #222; }
        .paper-opt .p-sepia { background: #f0e6d2; color: #3d2b1f; }

        .w-notif {
          position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
          z-index: 100;
          background: rgba(16,16,16,0.94);
          border: 1px solid var(--accent);
          color: #fff; padding: 10px 20px; border-radius: 22px; font-size: 13px;
        }

        @media (max-width: 600px) {
          .w-textarea { font-size: 16px; padding: 14px 14px 100px; }
          .w-counter { top: 58px; right: 10px; font-size: 12px; padding: 6px 12px; }
          .w-float.left { left: 10px; bottom: 24px; }
          .w-float.right { right: 10px; bottom: 24px; }
          .w-menu { bottom: 86px; right: 10px; }
          .w-voice { bottom: 86px; }
        }
      `}</style>

      <div className="w-top">
        <button className="icon" onClick={exitToBiblias} title="Volver a Biblias Maker">↲</button>
        <span className="title">{activeHoja?.name || 'Modo Escritor'}</span>
        <div className="w-counter">Contador: {charCount}</div>
        <button className="icon" onClick={toggleVoice} title="Voz">
          {isSpeaking ? '⏹' : '▶'}
        </button>
      </div>

      <div className="w-main">
        <textarea
          ref={taRef}
          className="w-textarea"
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
          style={{
            background: paper.bg,
            color: paper.color,
          }}
        />
      </div>

      {/* Flotantes izq: undo / redo */}
      <div className="w-float left">
        <button onClick={undo} title="Deshacer (Ctrl+Z)">↶</button>
        <button onClick={redo} title="Rehacer (Ctrl+Y)">↷</button>
      </div>

      {/* Flotante der: menú */}
      <div className="w-float right">
        <button
          onClick={() => setShowOptions(!showOptions)}
          title="Opciones"
          aria-label="Menú"
        >
          ☰
        </button>
      </div>

      {showOptions && (
        <div className="w-menu">
          <button onClick={() => { setShowHojas(true); setShowOptions(false); }}>📄 Hojas</button>
          <button onClick={() => { setShowPaper(true); setShowOptions(false); }}>🎨 Color de hoja</button>
          <button onClick={() => { setShowPreview(true); setShowOptions(false); }}>👁 Vista previa</button>
          <button onClick={() => { setShowActions(true); setShowOptions(false); }}>📋 Marcos</button>
          <button onClick={() => { setShowComments(true); setShowOptions(false); }}>💬 Comentarios</button>
          <button
            onClick={() => {
              setAskPrefixes(!askPrefixes);
              showNotif(askPrefixes ? 'Prefijos OFF' : 'Prefijos ON (Enter)');
            }}
          >
            {askPrefixes ? 'Apagar prefijos' : 'Encender prefijos'}
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(text);
              showNotif('Copiado');
              setShowOptions(false);
            }}
          >
            📋 Copiar
          </button>
          <button onClick={() => { startVoice(false); setShowOptions(false); }}>▶ Leer todo</button>
          <button
            onClick={() => {
              navigate('/calcular');
              setShowOptions(false);
            }}
          >
            ☣ Calculadora
          </button>
          <button onClick={exitToBiblias}>↲ Volver a Biblias Maker</button>
        </div>
      )}

      {showSelBar && selection && (
        <div className="w-sel" style={{ left: selBarPos.x, top: selBarPos.y }}>
          <button title="Comentar" onClick={() => { setSelCommentText(''); setShowSelComment(true); }}>💬</button>
          <button title="Prefijos" onClick={() => setShowPrefixPlatform(true)}>𝒯</button>
          <button title="Leer selección" onClick={() => startVoice(true)}>▶</button>
        </div>
      )}

      {showVoiceBar && (
        <div className="w-voice">
          <div className="row">
            <select value={selectedVoice} onChange={(e) => setSelectedVoice(Number(e.target.value))}>
              {voices.map((v, i) => (
                <option key={v.name + i} value={i}>{v.name.slice(0, 26)}</option>
              ))}
            </select>
            <button className="ctrl" onClick={toggleVoice}>{isSpeaking ? '⏹' : '▶'}</button>
            <button className="ctrl" onClick={() => { stopVoice(); setShowVoiceBar(false); }}>✕</button>
          </div>
          <div className="row">
            <span style={{ fontSize: 11, color: '#888' }}>Vel</span>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            />
            <span style={{ fontSize: 11, width: 28 }}>{speechRate.toFixed(1)}</span>
          </div>
          <div className="prog-row">
            <span>{formatTime(elapsed)}</span>
            <div className="track"><div className="fill" style={{ width: `${progress}%` }} /></div>
            <span>{formatTime(remaining)}</span>
          </div>
        </div>
      )}

      {/* Hojas */}
      {showHojas && (
        <div className="w-backdrop" onClick={() => setShowHojas(false)}>
          <div className="w-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Hojas</h3>
            <button className="full" onClick={addHoja}>➕ Nueva hoja</button>
            <button className="full" onClick={importFromBiblias}>📥 Importar de Biblias Maker</button>
            {hojas.map((h) => (
              <div
                key={h.id}
                className={`hoja-row ${h.id === activeHojaId ? 'active' : ''}`}
                onClick={() => switchHoja(h.id)}
              >
                <span className="name">{h.name}</span>
                <span className="sm" onClick={(e) => { e.stopPropagation(); renameHoja(h.id); }}>✏️</span>
                <span className="sm" onClick={(e) => { e.stopPropagation(); closeHoja(h.id); }}>✕</span>
              </div>
            ))}
            <button className="full cancel" onClick={() => setShowHojas(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Color de hoja */}
      {showPaper && (
        <div className="w-backdrop" onClick={() => setShowPaper(false)}>
          <div className="w-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Color de la hoja</h3>
            <div className="paper-opt">
              <button
                className={`p-dark ${paperTone === 'dark' ? 'active' : ''}`}
                onClick={() => { setPaperTone('dark'); setShowPaper(false); }}
              >
                Oscuro
              </button>
              <button
                className={`p-light ${paperTone === 'light' ? 'active' : ''}`}
                onClick={() => { setPaperTone('light'); setShowPaper(false); }}
              >
                Claro
              </button>
              <button
                className={`p-sepia ${paperTone === 'sepia' ? 'active' : ''}`}
                onClick={() => { setPaperTone('sepia'); setShowPaper(false); }}
              >
                Sepia
              </button>
            </div>
            <button className="full cancel" onClick={() => setShowPaper(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {showPrefixPlatform && (
        <div className="w-backdrop" onClick={() => setShowPrefixPlatform(false)}>
          <div className="w-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Formato</h3>
            <button className="full" onClick={() => { setPrefixPlatform('whatsapp'); setShowPrefixPlatform(false); setShowPrefixCommands(true); }}>WhatsApp</button>
            <button className="full" onClick={() => { setPrefixPlatform('amino'); setShowPrefixPlatform(false); setShowPrefixCommands(true); }}>Amino</button>
            <button className="full" onClick={() => { setPrefixPlatform('kyodo'); setShowPrefixPlatform(false); setShowPrefixCommands(true); }}>Kyodo</button>
            <button className="full cancel" onClick={() => setShowPrefixPlatform(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {showPrefixCommands && (
        <div className="w-backdrop" onClick={() => setShowPrefixCommands(false)}>
          <div className="w-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{prefixPlatform}</h3>
            {PREFIX_COMMANDS[prefixPlatform].map((cmd) => (
              <button key={cmd.id} className="full" onClick={() => applyPrefix(cmd.wrap)}>
                {cmd.label}
              </button>
            ))}
            <button className="full cancel" onClick={() => setShowPrefixCommands(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {showSelComment && (
        <div className="w-backdrop">
          <div className="w-modal">
            <h3>Comentar selección</h3>
            <p style={{ fontSize: 12, color: '#888' }}>«{(selection?.text || '').slice(0, 80)}…»</p>
            <textarea value={selCommentText} onChange={(e) => setSelCommentText(e.target.value)} placeholder="Comentario…" />
            <button className="full" onClick={saveSelectionComment}>Guardar</button>
            <button className="full cancel" onClick={() => setShowSelComment(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {showParaComment && (
        <div className="w-backdrop">
          <div className="w-modal">
            <h3>Comentario párrafo {paraIndex + 1}</h3>
            <textarea value={paraCommentText} onChange={(e) => setParaCommentText(e.target.value)} placeholder="Nota…" />
            <button className="full" onClick={saveParaComment}>Guardar</button>
            <button className="full cancel" onClick={() => setShowParaComment(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {showComments && (
        <div className="w-backdrop" onClick={() => setShowComments(false)}>
          <div className="w-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Comentarios</h3>
            {comments.length === 0 && <p style={{ textAlign: 'center', color: '#666' }}>Sin comentarios</p>}
            {comments.map((c) => (
              <div key={c.id} className="comment-card">
                <div className="meta">
                  {c.type === 'selection'
                    ? `Selección: “${(c.selectedText || '').slice(0, 36)}…”`
                    : `Párrafo ${(c.paragraphIndex ?? 0) + 1}`}
                </div>
                {c.text}
              </div>
            ))}
            <button className="full cancel" onClick={() => setShowComments(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {showActions && (
        <div className="w-backdrop" onClick={() => setShowActions(false)}>
          <div className="w-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Marcos</h3>
            <button
              className="full"
              onClick={() => {
                setEditingAction({ name: '', content: '', index: null });
                setShowActionEditor(true);
              }}
            >
              ➕ Nuevo marco
            </button>
            {actions.map((a, i) => (
              <div key={i} className="action-item">
                <span className="name" onClick={() => insertAction(a.content)}>{a.name}</span>
                <span
                  style={{ cursor: 'pointer', marginLeft: 8 }}
                  onClick={() => {
                    setEditingAction({ name: a.name, content: a.content, index: i });
                    setShowActionEditor(true);
                  }}
                >
                  ✏️
                </span>
              </div>
            ))}
            <button className="full cancel" onClick={() => setShowActions(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {showActionEditor && (
        <div className="w-backdrop">
          <div className="w-modal">
            <h3>{editingAction.index !== null ? 'Editar marco' : 'Nuevo marco'}</h3>
            <input
              placeholder="Nombre"
              value={editingAction.name}
              onChange={(e) => setEditingAction({ ...editingAction, name: e.target.value })}
            />
            <textarea
              placeholder="Contenido"
              value={editingAction.content}
              onChange={(e) => setEditingAction({ ...editingAction, content: e.target.value })}
            />
            <button className="full" onClick={saveAction}>Guardar</button>
            <button className="full cancel" onClick={() => setShowActionEditor(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="w-backdrop" onClick={() => setShowPreview(false)}>
          <div className="w-preview-box" onClick={(e) => e.stopPropagation()}>
            <div className="w-preview-head">
              <span>Vista previa — {activeHoja?.name}</span>
              <button onClick={() => setShowPreview(false)}>×</button>
            </div>
            <div
              className="w-preview-body"
              dangerouslySetInnerHTML={{ __html: buildPreviewHtml(text) }}
            />
          </div>
        </div>
      )}

      {notification && <div className="w-notif">{notification}</div>}
    </div>
  );
}

//Acomodar el contador dentro del banner de Modo Escritor