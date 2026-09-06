const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Add secure IPC methods here
  ping: () => ipcRenderer.invoke('ping'),
  dbQuery: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
  
  // Auto-Updater
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  restartApp: () => ipcRenderer.send('restart-app')
});
