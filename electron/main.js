import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Store from 'electron-store';
import fs from 'node:fs';
import { parseFile } from 'music-metadata';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = new Store();
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'), // Keep preload as CJS
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false // Allow loading local files
        },
        autoHideMenuBar: true,
        frame: false, // Remove native title bar completely
    });

    // In development, load the vite dev server
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        // mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
    });
    if (!result.canceled && result.filePaths.length > 0) {
        const folderPath = result.filePaths[0];
        store.set('musicFolder', folderPath);
        return folderPath;
    }
    return null;
});

ipcMain.handle('get-initial-state', () => {
    return {
        musicFolder: store.get('musicFolder'),
        library: store.get('library', []),
    };
});

// Get system theme/platform for window controls
ipcMain.handle('get-system-theme', () => {
    if (process.platform === 'darwin') return 'mac';
    if (process.platform === 'win32') return 'windows';

    // Linux detection
    const desktopEnv = (process.env.XDG_CURRENT_DESKTOP || process.env.DESKTOP_SESSION || '').toLowerCase();
    if (desktopEnv.includes('gnome')) return 'gnome';
    if (desktopEnv.includes('kde') || desktopEnv.includes('plasma')) return 'kde';

    return 'default'; // Fallback for other Linux DEs
});

// Update window title (for currently playing song)
ipcMain.handle('update-title', (event, title) => {
    if (mainWindow) {
        mainWindow.setTitle(title || 'Low Music');
    }
});

// Window controls
ipcMain.handle('window-minimize', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

ipcMain.handle('window-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.handle('window-close', () => {
    if (mainWindow) {
        mainWindow.close();
    }
});


// Recursive file scan
async function scanDirectory(dir) {
    let results = [];
    const list = await fs.promises.readdir(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = await fs.promises.stat(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(await scanDirectory(filePath));
        } else {
            const ext = path.extname(file).toLowerCase();
            if (['.mp3', '.wav', '.ogg', '.flac'].includes(ext)) {
                try {
                    const metadata = await parseFile(filePath);
                    // Generate stable ID based on file path
                    const id = crypto.createHash('md5').update(filePath).digest('hex');

                    results.push({
                        id: id,
                        path: filePath,
                        title: metadata.common.title || file,
                        artist: metadata.common.artist || 'Unknown Artist',
                        album: metadata.common.album || 'Unknown Album',
                        duration: metadata.format.duration,
                        // Don't load picture here to save memory
                        // picture: metadata.common.picture ? metadata.common.picture[0] : null
                    });
                } catch (err) {
                    console.error(`Error parsing ${file}:`, err);
                }
            }
        }
    }
    return results;
}

ipcMain.handle('scan-library', async (event, folderPath) => {
    try {
        const songs = await scanDirectory(folderPath);
        store.set('library', songs);
        return songs;
    } catch (error) {
        console.error("Scan error:", error);
        return [];
    }
});

ipcMain.handle('get-playlists', () => {
    return store.get('playlists', []);
});

ipcMain.handle('save-playlists', (event, playlists) => {
    store.set('playlists', playlists);
    return true;
});

ipcMain.handle('get-stats', () => {
    return store.get('stats', {});
});

ipcMain.handle('save-stats', (event, stats) => {
    store.set('stats', stats);
    return true;
});

ipcMain.handle('get-cover-art', async (event, filePath) => {
    try {
        const metadata = await parseFile(filePath);
        if (metadata.common.picture && metadata.common.picture.length > 0) {
            const pic = metadata.common.picture[0];
            return {
                format: pic.format,
                data: pic.data
            };
        }
    } catch (error) {
        console.error("Error getting cover:", error);
    }
    return null;
});
