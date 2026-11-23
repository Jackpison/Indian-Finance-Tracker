// Runs in the sandbox before the page. Exposes only these few functions; the page gets no Node and no network of its own.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pfDesktop', {
  server: () => ipcRenderer.sendSync('srv:get'),
  setServer: (u) => ipcRenderer.sendSync('srv:set', String(u || '')),
  call: (name, o) => ipcRenderer.invoke('srv:call', String(name), { method: String(o && o.method || 'GET'), contentType: String(o && o.contentType || ''), body: o && typeof o.body === 'string' ? o.body : null, form: o && o.form && typeof o.form === 'object' ? o.form : null }),
  openReleases: () => ipcRenderer.send('open:releases'),
});
