'use strict';
/**
 * KAWSAY desktop shell (P1). Wraps the built web app (dist/) in a window that
 * never touches the network: every request is answered from disk, anything else
 * is cancelled. There is no server and no backend process.
 *
 * Run:    npm run desktop:dev      (needs `npm run build` first)
 * Build:  npm run desktop:build    (writes release/KAWSAY-win32-x64/KAWSAY.exe)
 */
const { app, BrowserWindow, dialog, ipcMain, protocol, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { fetchBandKey } = require('./bandKey.cjs');

const SCHEME = 'kawsay';
const ORIGIN = `${SCHEME}://app`;
const DIST = path.join(__dirname, '..', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
};

// A standard, secure scheme gives the page a real origin: absolute asset paths,
// localStorage and fetch() all behave as they do on https, with no web server.
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

/** Map a kawsay://app/... URL to a file inside dist/. Unknown paths get the app (app/index.html). */
function resolveAsset(requestUrl) {
  const rel = decodeURIComponent(new URL(requestUrl).pathname).replace(/^\/+/, '');
  const file = path.resolve(DIST, rel || 'app/index.html');
  const inside = file.startsWith(DIST + path.sep);
  if (inside && fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  return path.join(DIST, 'app', 'index.html'); // the desktop window is the app, not the landing page
}

function serveFromDisk(request) {
  const file = resolveAsset(request.url);
  const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  return new Response(fs.readFileSync(file), { headers: { 'content-type': type } });
}

/** Sources link to nasa.gov: hand those to the system browser, never load them in the app. */
function openOutside(url) {
  if (url.startsWith('https://')) void shell.openExternal(url);
}

let blockedRequests = 0;

// ── Bluetooth band ──────────────────────────────────────────────────────────
// Web Bluetooth works in Electron, but Electron has no device chooser of its own.
// Each scan update is forwarded to the page (desktop/preload.cjs), which shows the list
// and sends back the crew member's choice. Bluetooth is local radio: no internet.
let bluetoothPick = null; // { callback, devices: Map<id, name> }

function onSelectBluetoothDevice(win, event, devices, callback) {
  event.preventDefault();
  if (!bluetoothPick) bluetoothPick = { callback, devices: new Map() };
  bluetoothPick.callback = callback; // Chromium sends a fresh callback with each updated list
  for (const d of devices) bluetoothPick.devices.set(d.deviceId, d.deviceName || '');
  const list = [...bluetoothPick.devices].map(([id, name]) => ({ id, name }));
  win.webContents.send('bluetooth-devices', list);
}

ipcMain.on('bluetooth-choose', (_event, id) => {
  const pick = bluetoothPick;
  bluetoothPick = null;
  if (pick) pick.callback(typeof id === 'string' ? id : '');
});

// One-time Zepp sign-in to fetch the band key. Runs here (Node TLS), never in the page, and
// only when the crew submits the form. The password is used for this request and then dropped.
ipcMain.handle('band-key:fetch', (_event, creds) => fetchBandKey(creds?.email, creds?.password));

/** Windows may ask to confirm pairing. Confirm plain requests; we cannot type a PIN for the user. */
function onBluetoothPairing(details, respond) {
  if (details.pairingKind === 'confirm') return respond({ confirmed: true });
  if (details.pairingKind === 'confirmPin') {
    const [win] = BrowserWindow.getAllWindows();
    void dialog.showMessageBox(win, {
      type: 'question', title: 'KAWSAY', message: `Does the band show ${details.pin}?`,
      buttons: ['Yes, pair', 'Cancel'], cancelId: 1, noLink: true,
    }).then(({ response }) => respond({ confirmed: response === 0 }));
    return;
  }
  respond({ confirmed: false });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    title: 'KAWSAY',
    backgroundColor: '#0F1517',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.cjs') },
  });

  win.webContents.on('select-bluetooth-device', (event, devices, callback) => onSelectBluetoothDevice(win, event, devices, callback));

  win.webContents.setWindowOpenHandler(({ url }) => {
    openOutside(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(`${ORIGIN}/`)) return;
    event.preventDefault();
    openOutside(url);
  });

  void win.loadURL(`${ORIGIN}/app/index.html`);
  return win;
}

/** `--smoke <png>`: load the app, report what rendered, save a screenshot, exit. */
async function smokeTest(win, pngPath) {
  await new Promise((resolve) => win.webContents.once('did-finish-load', resolve));
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const page = await win.webContents.executeJavaScript(`({
    title: document.title,
    origin: location.origin,
    rootChildren: document.getElementById('root')?.childElementCount ?? 0,
    navLinks: document.querySelectorAll('nav a').length,
    heading: document.querySelector('h1, h2')?.textContent ?? null,
    secureContext: window.isSecureContext,
    webBluetooth: 'bluetooth' in navigator,
    deviceListBridge: 'kawsayBluetooth' in window,
    bandKeyBridge: 'kawsayBandKey' in window,
  })`);
  if (pngPath) fs.writeFileSync(pngPath, (await win.webContents.capturePage()).toPNG());
  console.log(JSON.stringify({ ...page, blockedRequests }));
  app.exit(page.rootChildren > 0 ? 0 : 1);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    protocol.handle(SCHEME, serveFromDisk);
    session.defaultSession.setBluetoothPairingHandler(onBluetoothPairing);

    // Offline by construction: cancel anything that is not the app itself.
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const allowed = ['kawsay:', 'devtools:', 'data:', 'blob:'].some((p) => details.url.startsWith(p));
      if (!allowed) blockedRequests += 1;
      callback({ cancel: !allowed });
    });

    const win = createWindow();
    const smoke = process.argv.indexOf('--smoke');
    if (smoke !== -1) void smokeTest(win, process.argv[smoke + 1]);
  });

  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  app.on('window-all-closed', () => app.quit());
}
