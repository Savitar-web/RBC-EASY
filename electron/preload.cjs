const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rbcDesktop', {
  isElectron: true,
  saveBegin: payload => ipcRenderer.invoke('rbc:save-begin',payload),
  saveChunk: payload => ipcRenderer.invoke('rbc:save-chunk',payload),
  saveFinish: payload => ipcRenderer.invoke('rbc:save-finish',payload),
  saveCancel: payload => ipcRenderer.invoke('rbc:save-cancel',payload),
  onNavigate: (listener) => { const handler=(_event,route)=>listener(route);ipcRenderer.on('rbc:navigate',handler);return ()=>ipcRenderer.removeListener('rbc:navigate',handler); },
  createShortcut: (payload) => ipcRenderer.invoke('create-shortcut', payload),
  createAllShortcuts: (list) => ipcRenderer.invoke('create-all-shortcuts', list),
  openFloat: () => ipcRenderer.invoke('open-float'),
});
