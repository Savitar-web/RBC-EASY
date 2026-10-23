const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rbcDesktop', {
  isElectron: true,
  onNavigate: (listener) => { const handler=(_event,route)=>listener(route);ipcRenderer.on('rbc:navigate',handler);return ()=>ipcRenderer.removeListener('rbc:navigate',handler); },
  createShortcut: (payload) => ipcRenderer.invoke('create-shortcut', payload),
  createAllShortcuts: (list) => ipcRenderer.invoke('create-all-shortcuts', list),
  openFloat: () => ipcRenderer.invoke('open-float'),
});
