const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    getInitialState: () => ipcRenderer.invoke('get-initial-state'),
    scanLibrary: (folderPath) => ipcRenderer.invoke('scan-library', folderPath),
    getCoverArt: (filePath) => ipcRenderer.invoke('get-cover-art', filePath),
    getPlaylists: () => ipcRenderer.invoke('get-playlists'),
    savePlaylists: (playlists) => ipcRenderer.invoke('save-playlists', playlists),
    getStats: () => ipcRenderer.invoke('get-stats'),
    saveStats: (stats) => ipcRenderer.invoke('save-stats', stats),
});
