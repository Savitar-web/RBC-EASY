const { app, BrowserWindow, protocol, net, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const {randomUUID}=require('crypto');
const saves=new Map();
function trusted(event){const url=new URL(event.senderFrame.url);if(url.protocol!=='app:'||url.host!=='local')throw Error('Origen no permitido');}
async function cancelSave(id){const state=saves.get(id);if(!state)return;saves.delete(id);await state.handle.close().catch(()=>{});await fs.promises.unlink(state.temp).catch(()=>{});}
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

  ipcMain.handle('rbc:save-begin',async(event,payload)=>{
    trusted(event);if([...saves.values()].some(s=>s.owner===event.sender.id))throw Error('Termina el guardado anterior primero.');
    if(!Number.isSafeInteger(payload?.size)||payload.size<=0||payload.size>2147483648)throw Error('Tamaño de archivo no compatible.');
    const name=String(payload.name||'RBC-archivo').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,180);
    const result=await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender),{title:'Guardar archivo RBC EASY',defaultPath:path.join(app.getPath('downloads'),name),properties:['showOverwriteConfirmation','createDirectory']});
    if(result.canceled||!result.filePath)return{canceled:true};const id=randomUUID(),temp=result.filePath+'.rbc-'+id+'.tmp',handle=await fs.promises.open(temp,'wx');saves.set(id,{handle,temp,target:result.filePath,size:payload.size,written:0,owner:event.sender.id});return{id};
  });
  const owned=(event,id)=>{trusted(event);const s=saves.get(id);if(!s||s.owner!==event.sender.id)throw Error('Guardado no válido.');return s;};
  ipcMain.handle('rbc:save-chunk',async(event,payload)=>{const s=owned(event,payload?.id),bytes=Buffer.from(payload.bytes);if(!bytes.length||bytes.length>262144||s.written+bytes.length>s.size)throw Error('Fragmento de archivo no válido.');let offset=0;while(offset<bytes.length){const result=await s.handle.write(bytes,offset,bytes.length-offset);if(!result.bytesWritten)throw Error('No se pudo escribir el archivo.');offset+=result.bytesWritten;}s.written+=bytes.length;});
  ipcMain.handle('rbc:save-finish',async(event,payload)=>{const s=owned(event,payload?.id);if(s.written!==s.size)throw Error('El archivo no está completo.');await s.handle.sync();await s.handle.close();await fs.promises.rename(s.temp,s.target);saves.delete(payload.id);return{ok:true};});
  ipcMain.handle('rbc:save-cancel',async(event,payload)=>{owned(event,payload?.id);await cancelSave(payload.id);});
  app.on('web-contents-created',(_event,contents)=>contents.once('destroyed',()=>{for(const [id,s]of saves)if(s.owner===contents.id)void cancelSave(id);}));

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
