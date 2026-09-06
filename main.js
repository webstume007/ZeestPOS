const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const net = require('net');
const { initDB, queryDB } = require('./electron/db');

const isDev = process.env.NODE_ENV !== 'production';

// Function to wait for Next.js to start
function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const urlObj = new URL(url);
    const port = urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80);

    const tryConnect = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });

      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for server'));
        } else {
          setTimeout(tryConnect, 1000);
        }
      });

      socket.on('timeout', () => {
        socket.destroy();
        if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for server'));
        } else {
          setTimeout(tryConnect, 1000);
        }
      });

      socket.connect(port, urlObj.hostname);
    };

    tryConnect();
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    const serverUrl = 'http://localhost:3000';
    try {
      console.log(`Waiting for Next.js server at ${serverUrl}...`);
      await waitForServer(serverUrl);
      console.log('Next.js server is ready. Loading window...');
      win.loadURL(serverUrl);
      // Optional: Open DevTools
      // win.webContents.openDevTools();
    } catch (error) {
      console.error('Failed to connect to Next.js server:', error);
    }
  } else {
    // In production, we'll load the statically exported Next.js app
    // Ensure Next.js output is configured to "export" in next.config.ts
    win.loadFile(path.join(__dirname, 'out/index.html'));
  }
}

app.whenReady().then(async () => {
  try {
    await initDB();
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }

  ipcMain.handle('db-query', async (event, sql, params) => {
    try {
      const result = await queryDB(sql, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  });

  createWindow();

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', () => {
      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('update-available'));
    });

    autoUpdater.on('update-downloaded', () => {
      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('update-downloaded'));
    });

    ipcMain.on('restart-app', () => {
      autoUpdater.quitAndInstall();
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
