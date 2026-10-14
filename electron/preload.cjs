const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rbcDesktop', {
  isElectron: true,
  createShortcut: (payload) => ipcRenderer.invoke('create-shortcut', payload),
  createAllShortcuts: (list) => ipcRenderer.invoke('create-all-shortcuts', list),
  openFloat: () => ipcRenderer.invoke('open-float'),
});
