import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';

/**
 * Resolve the absolute path to the bundled `adb` executable.
 *
 * - In a packaged app, the platform-tools live under `process.resourcesPath/adb`
 *   (see `extraResource` in `forge.config.ts`).
 * - In development, they live at `<project>/resources/adb`. We walk up from
 *   `__dirname` (which is `<project>/.vite/build` during dev) to find them.
 * - If neither location contains `adb.exe` / `adb`, we fall back to the bare
 *   command name so the OS can still resolve it from `PATH` (useful while
 *   running the dev script before `scripts/fetch-adb.ps1` has been executed).
 */
let cached: string | undefined;

export function getAdbPath(): string {
  if (cached) return cached;
  const exeName = process.platform === 'win32' ? 'adb.exe' : 'adb';

  const candidates: string[] = [];
  if (app.isPackaged) {
    candidates.push(path.join(process.resourcesPath, 'adb', exeName));
  } else {
    // dev: __dirname === <project>/.vite/build
    candidates.push(
      path.resolve(__dirname, '..', '..', 'resources', 'adb', exeName),
    );
    candidates.push(path.resolve(process.cwd(), 'resources', 'adb', exeName));
  }

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        cached = p;
        return p;
      }
    } catch {
      /* ignore */
    }
  }

  cached = exeName;
  return cached;
}
