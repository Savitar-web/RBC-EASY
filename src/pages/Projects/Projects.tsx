// src/pages/Projects/Projects.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface Item {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parentId: string | null;
  content?: string;
  order: number;
}

const DB_NAME = 'RpgStorage';
const STORE = 'items';
const FIGURES_KEY = 'figureStore';

export default function Projects() {
  const navigate = useNavigate();
  const { theme, setTheme, themes } = useTheme();
  const [items, setItems] = useState<Item[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: Item } | null>(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [clipboardModal, setClipboardModal] = useState(false);
  const [clipboardText, setClipboardText] = useState('');
  const [clipboardName, setClipboardName] = useState('');
  const [confirmImport, setConfirmImport] = useState(false);
  const [shortcutsModal, setShortcutsModal] = useState(false);

  const dragItem = useRef<Item | null>(null);

  const initDB = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 3);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  const loadItems = async () => {
    const db = await initDB();
    const tx = db.transaction(STORE, 'readonly');
    const all = await new Promise<Item[]>((res) => {
      const r = tx.objectStore(STORE).getAll();
      r.onsuccess = () => res(r.result || []);
    });
    setItems(all.sort((a, b) => a.order - b.order));
  };

  useEffect(() => {
    loadItems();
  }, []);

  const saveItem = async (item: Item) => {
    const db = await initDB();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(item);
    await new Promise((r) => (tx.oncomplete = r));
    await loadItems();
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm('¿Eliminar este elemento y todo su contenido?')) return;
    const db = await initDB();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const all = await new Promise<Item[]>((res) => {
      const r = store.getAll();
      r.onsuccess = () => res(r.result || []);
    });
    const toDelete = new Set<string>();
    const collect = (pid: string) => {
      toDelete.add(pid);
      all.filter((i) => i.parentId === pid).forEach((c) => collect(c.id));
    };
    collect(id);
    toDelete.forEach((d) => store.delete(d));
    await new Promise((r) => (tx.oncomplete = r));
    await loadItems();
  };

  const createFolder = async () => {
    const name = prompt('Nombre del Rol / Carpeta:');
    if (!name?.trim()) return;
    await saveItem({
      id: 'folder_' + Date.now(),
      name: name.trim(),
      type: 'folder',
      parentId: currentFolder,
      order: items.length,
    });
  };

  /* ---------- Abrir en BibliasMaker como NUEVA hoja (texto + comentarios + figuras) ---------- */
  const openInBiblias = (item: Item) => {
    const content = item.content || '';

    // Contenido completo (incluye bloque --- COMENTARIOS --- si se guardó desde BibliasMaker)
    localStorage.setItem('currentFileContent', content);
    localStorage.setItem('currentFileName', item.name || 'Importada');
    localStorage.setItem('currentFileMime', 'text/plain');
    // BibliasMaker crea siempre una hoja nueva
    localStorage.setItem('openAsNewHoja', '1');

    // Si el texto menciona [Figura N.0], las figuras ya viven en figureStore (caché global).
    // Aun así re-sincronizamos por si el contenido trae data:image embebidas.
    try {
      const existing: Array<{
        id: number;
        tag: string;
        src: string;
        isVideo: boolean;
        orientation: string;
        name?: string;
      }> = JSON.parse(localStorage.getItem(FIGURES_KEY) || '[]');

      // Extraer data URLs sueltas del contenido (imágenes/GIF embebidos)
      const dataUrlRegex = /data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+/g;
      const found: string[] = content.match(dataUrlRegex) || [];
      let nextId = existing.length ? Math.max(...existing.map((f) => f.id)) + 1 : 1;
      const added = [...existing];

      found.forEach((src) => {
        if (added.some((f) => f.src === src)) return;
        const isGif = src.startsWith('data:image/gif');
        const tag = `[Figura ${nextId}.0]`;
        added.push({
          id: nextId,
          tag,
          src,
          isVideo: false,
          orientation: 'square',
          name: isGif ? `gif_${nextId}.gif` : `img_${nextId}`,
        });
        nextId += 1;
      });

      if (added.length !== existing.length) {
        localStorage.setItem(FIGURES_KEY, JSON.stringify(added));
      }
    } catch {
      /* ignore */
    }

    navigate('/Biblias');
  };

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept =
      '.txt,.pdf,.epub,.docx,.doc,.md,.png,.jpg,.jpeg,.gif,.webp,.bmp,image/*,text/plain';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const defaultName = file.name.replace(/\.[^/.]+$/, '');
      const finalName = prompt('Nombre de la Biblia:', defaultName) || defaultName;
      let content = '';

      // Imágenes / GIF → data URL + figura en caché global
      if (file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name)) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        try {
          const existing: Array<{
            id: number;
            tag: string;
            src: string;
            isVideo: boolean;
            orientation: string;
            name?: string;
          }> = JSON.parse(localStorage.getItem(FIGURES_KEY) || '[]');
          const id = existing.length ? Math.max(...existing.map((f) => f.id)) + 1 : 1;
          const tag = `[Figura ${id}.0]`;
          existing.push({
            id,
            tag,
            src: dataUrl,
            isVideo: false,
            orientation: 'square',
            name: file.name,
          });
          localStorage.setItem(FIGURES_KEY, JSON.stringify(existing));
          content = `${tag}\n`;
        } catch {
          content = dataUrl;
        }
      } else if (file.type.startsWith('text') || file.name.match(/\.(txt|md)$/i)) {
        content = await file.text();
      } else if (file.name.match(/\.pdf$/i) || file.type.includes('pdf')) {
        content = `[PDF] ${file.name}\n\n(Extracción automática de PDF no disponible. Usa TXT o pega el texto.)`;
      } else {
        // Intentar leer como texto; si falla, placeholder
        try {
          content = await file.text();
        } catch {
          content = `[Archivo: ${file.name}]\n\n(Formato no parseado automáticamente)`;
        }
      }

      await saveItem({
        id: 'file_' + Date.now(),
        name: finalName,
        type: 'file',
        parentId: currentFolder,
        content,
        order: items.length,
      });
      setUploadModal(false);
    };
    input.click();
  };

  const saveFromClipboard = async () => {
    if (!clipboardName.trim()) {
      alert('Debes poner un nombre');
      return;
    }
    await saveItem({
      id: 'file_' + Date.now(),
      name: clipboardName.trim(),
      type: 'file',
      parentId: currentFolder,
      content: clipboardText,
      order: items.length,
    });
    setClipboardModal(false);
    setClipboardText('');
    setClipboardName('');
  };

  const exportAll = async () => {
    if (!window.confirm('⚠️ Se exportará TODO el almacenamiento. ¿Continuar?')) return;
    const db = await initDB();
    const tx = db.transaction(STORE, 'readonly');
    const all = await new Promise<Item[]>((res) => {
      const r = tx.objectStore(STORE).getAll();
      r.onsuccess = () => res(r.result || []);
    });
    const data = { localStorage: { ...localStorage }, indexedDB: { items: all } };
    saveAs(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'RBC_EASY_BACKUP.json');
  };

  const doImport = () => {
    setConfirmImport(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        localStorage.clear();
        Object.entries(data.localStorage || {}).forEach(([k, v]) => localStorage.setItem(k, v as string));
        const db = await initDB();
        const tx = db.transaction(STORE, 'readwrite');
        await new Promise((r) => {
          tx.objectStore(STORE).clear().onsuccess = r;
        });
        for (const item of data.indexedDB?.items || []) {
          tx.objectStore(STORE).put(item);
        }
        await new Promise((r) => (tx.oncomplete = r));
        alert('✅ Datos importados. Recargando...');
        location.reload();
      } catch {
        alert('Error al importar');
      }
    };
    input.click();
  };

  const downloadAllAsZip = async () => {
    const zip = new JSZip();
    const db = await initDB();
    const tx = db.transaction(STORE, 'readonly');
    const all = await new Promise<Item[]>((res) => {
      const r = tx.objectStore(STORE).getAll();
      r.onsuccess = () => res(r.result || []);
    });
    const build = (parentId: string | null, folder: JSZip) => {
      all
        .filter((i) => i.parentId === parentId)
        .sort((a, b) => a.order - b.order)
        .forEach((child) => {
          if (child.type === 'folder') {
            build(child.id, folder.folder(child.name)!);
          } else {
            folder.file(`${child.name}.txt`, child.content || '');
          }
        });
    };
    build(null, zip);
    saveAs(await zip.generateAsync({ type: 'blob' }), 'RBC_EASY_Biblias.zip');
  };

  const onDragStart = (e: React.DragEvent, item: Item) => {
    if (!editMode) return;
    dragItem.current = item;
    e.dataTransfer.effectAllowed = 'move';
    (e.currentTarget as HTMLElement).classList.add('dragging');
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = async (e: React.DragEvent, target: Item) => {
    e.preventDefault();
    if (!editMode || !dragItem.current) return;
    const dragged = dragItem.current;
    if (dragged.id === target.id) return;

    if (target.type === 'folder') {
      await saveItem({ ...dragged, parentId: target.id });
    } else {
      await saveItem({ ...dragged, order: target.order, parentId: target.parentId });
      await saveItem({ ...target, order: dragged.order });
    }
    dragItem.current = null;
    document.querySelectorAll('.dragging').forEach((el) => el.classList.remove('dragging'));
  };

  const visibleItems = items
    .filter((i) => i.parentId === currentFolder)
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  const breadcrumb = (() => {
    const path: Item[] = [];
    let id = currentFolder;
    while (id) {
      const found = items.find((i) => i.id === id);
      if (!found) break;
      path.unshift(found);
      id = found.parentId;
    }
    return path;
  })();

  const pages = [
    { name: 'Mis Proyectos', path: '/Projects' },
    { name: 'Biblias Maker', path: '/Biblias' },
    { name: 'Calculadora', path: '/calcular' },
    { name: 'Balística', path: '/balistica' },
    { name: 'Conversiones', path: '/conversor' },
    { name: 'Modo Ascendido', path: '/ascendido' },
    { name: 'Modo Escritor', path: '/Writer' },
  ];

  return (
    <>
      <style>{`
        .projects-page {
          min-height: 100vh;
          background-color: var(--bg-primary);
          background-image: url('/images/backgrounds/FNP.png');
          background-size: cover;
          background-position: center;
          background-blend-mode: overlay;
          color: var(--text-primary);
          position: relative;
          overflow: hidden;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }

        .projects-title {
          position: fixed;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          margin: 0;
          padding: 20px 30px 16px;
          font-size: 38px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--accent);
          text-shadow:
            0 0 5px var(--glow),
            0 0 10px var(--glow),
            0 0 20px var(--glow),
            0 0 40px color-mix(in srgb, var(--accent) 40%, transparent);
          animation: glitchFlicker 3s infinite alternate;
          z-index: 5;
          white-space: nowrap;
          pointer-events: none;
        }
        .projects-title::before {
          content: "MIS PROYECTOS";
          position: absolute;
          left: 2px;
          top: 0;
          color: var(--accent);
          opacity: 0.55;
          z-index: -1;
          animation: glitchShift 2s infinite linear alternate-reverse;
        }
        .projects-title::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 8px;
          transform: translateX(-50%);
          width: 80%;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--accent), transparent);
          box-shadow: 0 0 10px var(--glow);
        }
        @keyframes glitchFlicker {
          0% { opacity: 1; }
          50% { opacity: 0.95; }
          100% { opacity: 1; }
        }
        @keyframes glitchShift {
          0% { transform: translate(0); }
          25% { transform: translate(-2px, 1px); }
          50% { transform: translate(2px, -1px); }
          75% { transform: translate(-1px, -1px); }
          100% { transform: translate(1px, 1px); }
        }

        .menu-btn {
          position: fixed;
          top: 18px;
          z-index: 10;
          padding: 11px 18px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          letter-spacing: 0.06em;
          font-weight: 600;
          font-size: 0.9rem;
          box-shadow: 0 0 18px var(--glow);
          transition: all 0.25s ease;
        }
        .menu-btn:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 0 32px var(--glow);
        }
        .left-btn { left: 40px; }
        .right-btn { right: 40px; }

        .center-content {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          height: 100vh;
          flex-wrap: wrap;
          padding: 0 16px;
        }
        .main-btn {
          padding: 12px 28px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: 0.07em;
          box-shadow: 0 0 18px var(--glow);
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .main-btn:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 0 32px var(--glow);
        }

        .sidebar {
          width: 280px;
          max-width: 85vw;
          background: rgba(0, 0, 0, 0.94);
          position: fixed;
          top: 0;
          height: 100%;
          padding: 18px 16px;
          box-shadow: 0 0 28px var(--glow);
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 30;
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(8px);
          border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
          overflow: hidden;
        }

        .sidebar.left {
          left: 0;
          transform: translateX(calc(-100% + 16px));
          border-right: 2px solid var(--border);
        }
        .sidebar.left.open { transform: translateX(0); }
        .sidebar.right {
          right: 0;
          transform: translateX(calc(100% - 16px));
          border-left: 2px solid var(--border);
        }
        .sidebar.right.open { transform: translateX(0); }

        .sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          flex-shrink: 0;
        }
        .sidebar-header h2 {
          color: var(--accent);
          font-size: 15px;
          letter-spacing: 0.07em;
          text-shadow: 0 0 10px var(--glow);
          margin: 0;
        }
        .sidebar-header button {
          background: var(--accent);
          color: #fff;
          border: none;
          padding: 6px 12px;
          border-radius: 7px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.8rem;
        }

        .sidebar-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
          margin-bottom: 12px;
          flex-shrink: 0;
        }
        .sidebar-actions button {
          padding: 9px 6px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }

        .search-input {
          width: 100%;
          padding: 9px 12px;
          margin-bottom: 10px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: #111;
          color: var(--text-primary);
          outline: none;
          flex-shrink: 0;
        }

        .breadcrumb {
          padding: 8px 10px;
          background: color-mix(in srgb, var(--accent) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
          border-radius: 8px;
          margin-bottom: 10px;
          font-size: 12px;
          color: var(--accent);
          display: flex;
          flex-wrap: wrap;
          gap: 3px;
          flex-shrink: 0;
        }
        .breadcrumb span { cursor: pointer; }
        .breadcrumb span:not(:last-child)::after {
          content: " → ";
          opacity: 0.55;
        }

        .sidebar-scroll {
          flex: 1 1 auto;
          overflow-y: auto;
          overflow-x: hidden;
          min-height: 0;
          padding-right: 4px;
        }

        .file-list {
          list-style: none;
          padding: 0;
          margin: 0 0 12px 0;
        }
        .file-list li {
          padding: 11px 12px;
          background: rgba(255,255,255,0.04);
          margin-bottom: 6px;
          border-radius: 8px;
          cursor: grab;
          border: 1px solid color-mix(in srgb, var(--accent) 15%, transparent);
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 0.9rem;
          user-select: none;
        }
        .file-list li:hover {
          background: color-mix(in srgb, var(--accent) 15%, transparent);
          box-shadow: 0 0 12px var(--glow);
        }
        .file-list li.folder {
          background: color-mix(in srgb, var(--accent) 10%, transparent);
          border-left: 3px solid var(--accent);
        }
        .file-list li.dragging {
          opacity: 0.55;
          transform: scale(1.02);
          box-shadow: 0 0 16px var(--glow);
        }

        .info-box {
          margin-top: 8px;
          padding: 12px 14px;
          font-size: 12px;
          line-height: 1.55;
          color: #ccc;
          background: rgba(255,255,255,0.04);
          border-left: 3px solid var(--accent);
          border-radius: 8px;
          position: relative;
          overflow: hidden;
          animation: cyberPulse 3s infinite ease-in-out;
        }
        .info-box::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(120deg, transparent, color-mix(in srgb, var(--accent) 18%, transparent), transparent);
          animation: scanline 4s infinite;
        }
        @keyframes cyberPulse {
          0% { box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 12%, transparent); }
          50% { box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 25%, transparent); }
          100% { box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 12%, transparent); }
        }
        @keyframes scanline {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        .export-content {
          display: flex;
          flex-direction: column;
          gap: 9px;
          flex: 1 1 auto;
          overflow-y: auto;
          min-height: 0;
          padding-right: 4px;
        }
        .export-content button {
          padding: 11px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.88rem;
          flex-shrink: 0;
        }

        .theme-select {
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: #111;
          color: var(--text-primary);
          font-size: 0.88rem;
        }

        .sidebar-scroll::-webkit-scrollbar,
        .export-content::-webkit-scrollbar {
          width: 5px;
        }
        .sidebar-scroll::-webkit-scrollbar-track,
        .export-content::-webkit-scrollbar-track {
          background: #111;
          border-radius: 10px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb,
        .export-content::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
          border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover,
        .export-content::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        .sidebar-scroll,
        .export-content {
          scrollbar-width: thin;
          scrollbar-color: #333 #111;
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(4px);
          z-index: 25;
        }

        .context-menu {
          position: fixed;
          background: rgba(12,12,12,0.97);
          border: 2px solid var(--accent);
          border-radius: 10px;
          box-shadow: 0 0 24px var(--glow);
          z-index: 99999;
          padding: 5px 0;
          min-width: 170px;
        }
        .context-menu button {
          display: block;
          width: 100%;
          padding: 11px 16px;
          background: transparent;
          border: none;
          color: #ffaaaa;
          text-align: left;
          font-size: 14px;
          cursor: pointer;
        }
        .context-menu button:hover {
          background: color-mix(in srgb, var(--accent) 25%, transparent);
          color: #fff;
          padding-left: 20px;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .modal {
          background: rgba(10,10,10,0.96);
          border: 2px solid var(--border);
          border-radius: 14px;
          padding: 22px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 0 40px var(--glow);
        }
        .modal h3 {
          color: var(--accent);
          margin: 0 0 14px;
          font-size: 1.15rem;
        }
        .modal button {
          width: 100%;
          padding: 11px;
          margin-top: 8px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 9px;
          font-weight: 600;
          cursor: pointer;
        }
        .modal .cancel {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-primary);
        }
        .modal textarea,
        .modal input {
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: #111;
          color: var(--text-primary);
          margin: 8px 0;
        }
        .modal textarea {
          min-height: 120px;
          resize: vertical;
        }

        @media (max-width: 768px) {
          .projects-title {
            font-size: 22px;
            letter-spacing: 0.12em;
            padding: 14px 16px 10px;
            animation: none;
          }
          .projects-title::after {
            height: 1px;
            bottom: 5px;
            width: 70%;
          }
          .left-btn,
          .right-btn {
            top: auto;
            bottom: 28px;
          }
          .left-btn { left: 16px; }
          .right-btn { right: 16px; }
          .sidebar.left:not(.open) {
            transform: translateX(calc(-100% + 16px));
          }
          .sidebar.right:not(.open) {
            transform: translateX(calc(100% - 16px));
          }
        }
      `}</style>

      <div className="projects-page">
        <h1 className="projects-title">MIS PROYECTOS</h1>

        <button className="menu-btn left-btn" onClick={() => setLeftOpen(true)}>
          📂 Mis Biblias
        </button>
        <button className="menu-btn right-btn" onClick={() => setRightOpen(true)}>
          💾 Datos
        </button>

        <div className="center-content">
          <button className="main-btn" onClick={() => navigate('/calcular')}>
            Calcular
          </button>
          <button className="main-btn" onClick={() => navigate('/Biblias')}>
            Escribir
          </button>
        </div>

        {/* SIDEBAR IZQUIERDO */}
        <div className={`sidebar left ${leftOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2>Gestión de Biblias</h2>
            <button onClick={() => setLeftOpen(false)}>Cerrar</button>
          </div>

          <div className="sidebar-actions">
            <button onClick={() => setUploadModal(true)}>📥 Subir Biblia</button>
            <button
              onClick={() => setEditMode(!editMode)}
              style={{ background: editMode ? 'var(--accent-hover)' : undefined }}
            >
              {editMode ? '✅ Aplicar' : '🛠️ Editar'}
            </button>
            <button onClick={createFolder}>✚ Crear Rol</button>
            <button onClick={() => setShowSearch(!showSearch)}>🔍 Buscar</button>
          </div>

          {showSearch && (
            <input
              className="search-input"
              placeholder="Buscar rol o biblia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          )}

          <div className="breadcrumb">
            <span onClick={() => setCurrentFolder(null)}>Raíz</span>
            {breadcrumb.map((b) => (
              <span key={b.id} onClick={() => setCurrentFolder(b.id)}>
                {b.name}
              </span>
            ))}
          </div>

          <div className="sidebar-scroll">
            <ul className="file-list">
              {visibleItems.map((item) => (
                <li
                  key={item.id}
                  className={item.type === 'folder' ? 'folder' : ''}
                  draggable={editMode}
                  onDragStart={(e) => onDragStart(e, item)}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, item)}
                  onClick={() => {
                    if (editMode) return;
                    if (item.type === 'folder') setCurrentFolder(item.id);
                    else openInBiblias(item);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, item });
                  }}
                >
                  {item.type === 'folder' ? '📁' : '📄'} {item.name}
                </li>
              ))}
            </ul>

            <div className="info-box">
              Aquí puedes importar tus biblias en formato .txt, imagen o .gif; también podrás personalizar el nombre y el orden. Al abrir una biblia se crea una <b>nueva hoja</b> en Biblias Maker con el texto, comentarios e imágenes asociadas.
              <br /><br />
              <b>Importante:</b> el borrador activo de Biblias Maker no se borra: la biblia se añade como hoja nueva.
            </div>

            <div className="info-box">
              Organiza tus turnos por partida.<br />
              Crea carpetas (roles), arrastra archivos entre ellas.<br />
              Mantén presionado un ítem para renombrar o eliminar.
            </div>
          </div>
        </div>

        {/* SIDEBAR DERECHO */}
        <div className={`sidebar right ${rightOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2>Gestión Global</h2>
            <button onClick={() => setRightOpen(false)}>Cerrar</button>
          </div>

          <div className="export-content">
            <button onClick={exportAll}>📤 Exportar Todo</button>
            <button onClick={() => setConfirmImport(true)}>📥 Importar Todo</button>
            <button onClick={downloadAllAsZip}>⬇️ Descargar Todo (ZIP)</button>
            <button onClick={() => setShortcutsModal(true)}>🔗 Accesos directos</button>

            <div style={{ marginTop: 6 }}>
              <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--accent)', fontSize: 13 }}>
                🎨 Temas
              </p>
              <select
                className="theme-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
              >
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="info-box">
              Esto te permitirá agregar tus datos desde otro dispositivo, el transplante es compatible entre aplicaciones y la versión web.
              <br /><br />
              (Windows, Android, iOS, Mac, Linux; entre otros compatibles con RBC-EASY)
              <br /><br />
              <b>Importante:</b> Importar nuevos datos reemplazará todas las biblias, borradores, cálculos y marcos actuales por los del archivo importado.
            </div>
          </div>
        </div>

        {(leftOpen || rightOpen) && (
          <div
            className="overlay"
            onClick={() => {
              setLeftOpen(false);
              setRightOpen(false);
            }}
          />
        )}

        {contextMenu && (
          <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button
              onClick={() => {
                const name = prompt('Nuevo nombre:', contextMenu.item.name);
                if (name?.trim()) saveItem({ ...contextMenu.item, name: name.trim() });
                setContextMenu(null);
              }}
            >
              ✏️ Renombrar
            </button>
            <button
              onClick={() => {
                deleteItem(contextMenu.item.id);
                setContextMenu(null);
              }}
            >
              🗑️ Eliminar
            </button>
            {contextMenu.item.type === 'file' && (
              <button
                onClick={() => {
                  openInBiblias(contextMenu.item);
                  setContextMenu(null);
                }}
              >
                ✍ Abrir en Biblias
              </button>
            )}
            {contextMenu.item.type === 'folder' && (
              <button
                onClick={() => {
                  setCurrentFolder(contextMenu.item.id);
                  setContextMenu(null);
                }}
              >
                📂 Entrar
              </button>
            )}
            <button onClick={() => setContextMenu(null)}>Cancelar</button>
          </div>
        )}

        {uploadModal && (
          <div className="modal-overlay" onClick={() => setUploadModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Subir Biblia</h3>
              <button onClick={handleFileUpload}>📄 Importar desde archivo</button>
              <button
                onClick={() => {
                  setUploadModal(false);
                  setClipboardModal(true);
                }}
              >
                📋 Desde portapapeles
              </button>
              <button className="cancel" onClick={() => setUploadModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {clipboardModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Desde Portapapeles</h3>
              <input
                placeholder="Nombre (obligatorio)"
                value={clipboardName}
                onChange={(e) => setClipboardName(e.target.value)}
              />
              <textarea
                placeholder="Pega el texto..."
                value={clipboardText}
                onChange={(e) => setClipboardText(e.target.value)}
              />
              <button onClick={saveFromClipboard}>Guardar</button>
              <button className="cancel" onClick={() => setClipboardModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {confirmImport && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>⚠️ Importar Todo</h3>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: '#ccc' }}>
                Esto <b>BORRARÁ todos los datos actuales</b> (roles, biblias, carpetas, borradores…).
                <br /><br />
                ¿Continuar?
              </p>
              <button onClick={doImport}>Sí, importar</button>
              <button className="cancel" onClick={() => setConfirmImport(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {shortcutsModal && (
          <div className="modal-overlay" onClick={() => setShortcutsModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Accesos directos</h3>
              {pages.map((p) => (
                <button
                  key={p.path}
                  onClick={() => {
                    navigate(p.path);
                    setShortcutsModal(false);
                  }}
                >
                  {p.name}
                </button>
              ))}
              <button className="cancel" onClick={() => setShortcutsModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}