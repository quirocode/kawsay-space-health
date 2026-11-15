'use strict';
/**
 * Bridge for the in-app Bluetooth device list (P1). Electron has no device chooser of its
 * own, so the main process forwards what it finds and the Connect screen shows the list.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kawsayBluetooth', {
  /** Called with [{ id, name }] each time the scan finds more devices. Returns an unsubscribe. */
  onDevices(callback) {
    const listener = (_event, devices) => callback(devices);
    ipcRenderer.on('bluetooth-devices', listener);
    return () => ipcRenderer.removeListener('bluetooth-devices', listener);
  },
  choose(id) {
    ipcRenderer.send('bluetooth-choose', String(id));
  },
  cancel() {
    ipcRenderer.send('bluetooth-choose', '');
  },
});

// One-time Zepp sign-in that fetches the band key in the main process (desktop/bandKey.cjs).
// The web build has no bridge; the Connect screen then shows the manual methods instead.
contextBridge.exposeInMainWorld('kawsayBandKey', {
  /** Sign in to Zepp and get the band key(s): { ok: true, keys: [{ mac, key }] } | { ok: false, error }. */
  fetch(creds) {
    return ipcRenderer.invoke('band-key:fetch', { email: creds?.email, password: creds?.password });
  },
});
