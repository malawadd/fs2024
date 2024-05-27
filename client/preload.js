/**
 * The preload script runs before `index.html` is loaded
 * in the renderer. It has access to web APIs as well as
 * Electron's renderer process modules and some polyfilled
 * Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandboxF
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  screenInfo: () => ipcRenderer.invoke('init-position'),
  petStep: (dx, dy) => ipcRenderer.invoke('pet-step', dx, dy),
  submitMessage: (type, message) => ipcRenderer.send('submit-message', type, message),
  onReceiveMessage: (callback) => ipcRenderer.on('message', (_event, message) => callback(message)),
  onShow: (callback) => ipcRenderer.on('show', (_event) => callback()),
})

ipcRenderer.on('petPosition', (event, newPosition) => {
  window.dispatchEvent(new CustomEvent('petPosition', { detail: newPosition }));
});
  
