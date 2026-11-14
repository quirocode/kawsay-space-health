'use strict';
/**
 * KAWSAY desktop shell (P1). Wraps the built web app (dist/) in a window that
 * never touches the network: every request is answered from disk, anything else
 * is cancelled. There is no server and no backend process.
 *
 * Run:    npm run desktop:dev      (needs `npm run build` first)
 * Build:  npm run desktop:build    (writes release/KAWSAY-win32-x64/KAWSAY.exe)
 */
const { app, BrowserWindow, protocol, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

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

/** Map a kawsay://app/... URL to a file inside dist/. Unknown paths get index.html. */
function resolveAsset(requestUrl) {
  const rel = decodeURIComponent(new URL(requestUrl).pathname).replace(/^\/+/, '');
  const file = path.resolve(DIST, rel || 'index.html');
  const inside = file.startsWith(DIST + path.sep);
  if (inside && fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  return path.join(DIST, 'index.html');
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

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    title: 'KAWSAY',
    backgroundColor: '#F7EFE8',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    openOutside(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(`${ORIGIN}/`)) return;
    event.preventDefault();
    openOutside(url);
  });

  void win.loadURL(`${ORIGIN}/index.html`);
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
