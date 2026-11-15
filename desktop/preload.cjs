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
