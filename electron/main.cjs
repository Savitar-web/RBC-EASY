const { app, BrowserWindow, protocol, net, ipcMain, shell } = require('electron');
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
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  if (!path.extname(rel)) {
    const index = path.join(root, 'index.html');
    if (fs.existsSync(index)) return index;
  }
  return null;
}

const ROUTES = new Set(['/', '/proyectos', '/biblias', '/Writer', '/calcular', '/balistica', '/conversion', '/modo-ascendido', '/contacto']);
function shortcutRoute(value) {
  const url = new URL(value, 'app://local');
  if (url.origin !== 'null' && url.host !== 'local') throw new Error('Destino no permitido');
  if (!ROUTES.has(url.pathname)) throw new Error('Pantalla no permitida');
  return url.pathname;
}
function launchRoute(argv) {
  const arg = argv.find(value => value.startsWith('--rbc-route='));
  try { return arg ? shortcutRoute(arg.slice('--rbc-route='.length)) : '/'; }
  catch { return '/'; }
}
function writeShortcut(name, url) {
  const route = shortcutRoute(url);
  const safe = String(name || 'RBC').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').trim().slice(0, 80) || 'RBC';
  const desktop = app.getPath('desktop');
  const args = [...(app.isPackaged ? [] : [app.getAppPath()]), `--rbc-route=${route}`];
  const iconKey = route === '/' ? 'inicio' : route.slice(1).toLowerCase();
  const icon = path.join(distRoot(), 'icons', 'windows', 'app-icon.ico');
  if (process.platform === 'win32') {
    const file = path.join(desktop, `${safe}.lnk`);
    // Windows shortcuts launch the executable and pass the selected screen.
    const iconDir = path.join(app.getPath('userData'), 'shortcut-icons');
    fs.mkdirSync(iconDir, { recursive: true });
    const localIcon = path.join(iconDir, `${iconKey}.ico`);
    fs.copyFileSync(icon, localIcon);
    const ok = shell.writeShortcutLink(file, 'create', {
      target: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath,
      args: args.map(arg => `"${arg}"`).join(' '),
      cwd: path.dirname(process.execPath), description: safe,
      icon: localIcon, iconIndex: 0,
    });
    if (!ok) throw new Error('Windows no pudo guardar el acceso');
    return file;
  }
  const quote = value => "'" + value.replace(/'/g, "'\\''") + "'";
  const executable = process.env.APPIMAGE || process.execPath;
  if (process.platform === 'darwin') {
    const folder = path.join(desktop, `${safe}.app`);
    fs.mkdirSync(path.join(folder, 'Contents', 'MacOS'), { recursive: true });
    fs.mkdirSync(path.join(folder, 'Contents', 'Resources'), { recursive: true });
    fs.copyFileSync(path.join(distRoot(), 'icons', 'macos', 'app-icon.icns'), path.join(folder, 'Contents', 'Resources', 'module.icns'));
    fs.writeFileSync(path.join(folder, 'Contents', 'Info.plist'), '<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleExecutable</key><string>launch</string><key>CFBundleIconFile</key><string>module.icns</string><key>CFBundlePackageType</key><string>APPL</string></dict></plist>');
    const launch = path.join(folder, 'Contents', 'MacOS', 'launch');
    fs.writeFileSync(launch, '#!/bin/sh\nexec ' + [executable, ...args].map(quote).join(' ') + '\n');
    fs.chmodSync(launch, 0o755);
    return folder;
  }
  const file = path.join(desktop, `${safe}.desktop`);
  const iconDir = path.join(app.getPath('userData'), 'shortcut-icons');
  fs.mkdirSync(iconDir, { recursive: true });
  const localIcon = path.join(iconDir, `${iconKey}.png`);
  fs.copyFileSync(path.join(distRoot(), 'icons', 'linux', 'icon-512x512.png'), localIcon);
  const desktopQuote = value => '"' + value.replace(/[\\"`$]/g, '\\$&').replace(/%/g, '%%') + '"';
  fs.writeFileSync(file, `[Desktop Entry]\nType=Application\nName=${safe}\nExec=${[executable, ...args].map(desktopQuote).join(' ')}\nIcon=${localIcon}\nTerminal=false\nCategories=Utility;\n`);
  fs.chmodSync(file, 0o755);
  return file;
}

function createWindow(route = '/') {
  const win = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 380,
    minHeight: 640,
    backgroundColor: '#07070c',
    title: 'RBC EASY',
    icon: path.join(distRoot(), 'icons', 'pwa', 'icon-512x512.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadURL('app://local' + route);
}

function activateRoute(route) {
  const existing=BrowserWindow.getAllWindows().find(win=>!win.isDestroyed()&&!win.webContents.getURL().includes('float=1'));
  if(!existing){createWindow(route);return;}
  if(existing.isMinimized())existing.restore();
  existing.show();existing.focus();
  existing.webContents.send('rbc:navigate',route);
}
const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();
else app.whenReady().then(() => {
  if(process.platform==='win32')app.setAppUserModelId('app.rbc.easy');
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

  createWindow(launchRoute(process.argv));
  app.on('second-instance', (_event, argv) => activateRoute(launchRoute(argv)));
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
