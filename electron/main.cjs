const { app, BrowserWindow, protocol, net, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
  },
]);

function distRoot() {
  return path.resolve(__dirname, '..', 'dist');
}

function safeFile(urlPath) {
  const root = distRoot();
  let rel = decodeURIComponent(urlPath || '/');
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root)) return null;
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  if (!path.extname(rel)) {
    const index = path.join(root, 'index.html');
    if (fs.existsSync(index)) return index;
  }
  return null;
}

function writeShortcut(name, url) {
  const safe = String(name || 'RBC').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').trim() || 'RBC';
  const desk = app.getPath('desktop');
  if (process.platform === 'win32') {
    const file = path.join(desk, `${safe}.url`);
    fs.writeFileSync(file, `[InternetShortcut]\r\nURL=${url}\r\n`);
    return file;
  }
  if (process.platform === 'darwin') {
    const file = path.join(desk, `${safe}.webloc`);
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>URL</key><string>${url}</string></dict></plist>\n`;
    fs.writeFileSync(file, body);
    return file;
  }
  const file = path.join(desk, `${safe}.desktop`);
  fs.writeFileSync(
    file,
    `[Desktop Entry]\nType=Application\nName=${safe}\nExec=xdg-open ${url}\nTerminal=false\nCategories=Utility;\n`,
  );
  try { fs.chmodSync(file, 0o755); } catch { /* ignore */ }
  return file;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 380,
    minHeight: 640,
    backgroundColor: '#07070c',
    title: 'RBC EASY',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadURL('app://local/');
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    const file = safeFile(url.pathname);
    if (!file) return new Response('No encontrado', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });

  ipcMain.handle('create-shortcut', (_event, payload) => {
    try {
      const file = writeShortcut(payload?.name, payload?.url);
      return { ok: true, path: file };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  });

  ipcMain.handle('create-all-shortcuts', (_event, list) => {
    const paths = [];
    const errors = [];
    for (const item of list || []) {
      try {
        paths.push(writeShortcut(item.name, item.url));
      } catch (error) {
        errors.push(String(error));
      }
    }
    return { ok: errors.length === 0, paths, errors };
  });

  ipcMain.handle('open-float', () => {
    const float = new BrowserWindow({
      width: 460,
      height: 760,
      minWidth: 360,
      minHeight: 560,
      alwaysOnTop: true,
      frame: false,
      resizable: true,
      title: 'RBC Calculadora',
      backgroundColor: '#07070c',
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    float.loadURL('app://local/calcular?float=1');
    return { ok: true };
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
