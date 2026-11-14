/**
 * Packages the built web app (dist/) and the desktop shell (desktop/) into a
 * Windows executable. Run through `npm run desktop:build`, which builds dist/ first.
 *
 * Output: release/KAWSAY-win32-x64/KAWSAY.exe (copy the whole folder, not just the exe).
 * Needs the network once, to download the Electron runtime; the result runs offline.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packager } from '@electron/packager';

export const ELECTRON_VERSION = '45.3.2';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
if (!existsSync(join(root, 'dist', 'index.html'))) {
  console.error('dist/ is missing. Run `npm run build` first (or use `npm run desktop:build`).');
  process.exit(1);
}

// Only these reach the executable. Everything the UI needs is already bundled in dist/.
const SHIPPED = ['/dist', '/desktop', '/package.json'];

const [appPath] = await packager({
  dir: root,
  name: 'KAWSAY',
  platform: 'win32',
  arch: 'x64',
  electronVersion: ELECTRON_VERSION,
  out: join(root, 'release'),
  overwrite: true,
  prune: false,
  ignore: (file) => file !== '' && !SHIPPED.some((keep) => file === keep || file.startsWith(`${keep}/`)),
});

console.log(`Built ${join(appPath, 'KAWSAY.exe')}`);
