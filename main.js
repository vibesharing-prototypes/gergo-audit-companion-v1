const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

if (process.env.NODE_ENV === 'development') {
  try {
    // Auto reload on renderer changes
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron')
    });
  } catch (_) {}
}

function createWindow() {
  const win = new BrowserWindow({
    title: 'Diligent Audit Companion',
    width: 1280,
    height: 800,
    minWidth: 320,
    minHeight: 480,
    resizable: true,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
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

