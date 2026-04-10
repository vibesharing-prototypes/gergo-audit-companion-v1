const { contextBridge } = require('electron');

// Keep this minimal and safe; renderer uses localStorage for persistence.
contextBridge.exposeInMainWorld('dec', {
  version: '0.1.0'
});

