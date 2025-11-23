/**
 * Script de precarga para Electron
 * Este archivo se ejecuta antes de que la página web se cargue
 * y puede exponer APIs seguras al renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs protegidas al renderer process
contextBridge.exposeInMainWorld('electron', {
  // Obtener información de la aplicación
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  getAppName: () => ipcRenderer.invoke('app-name'),
  
  // Aquí puedes agregar más APIs que necesites exponer de forma segura
});
