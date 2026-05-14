// Rasterizes public/logo.svg into PNGs and a Windows .ico for use as the
// Electron app icon (BrowserWindow + electron-forge packagerConfig).
//
// Outputs:
//   assets/icon.png        (512x512, used by BrowserWindow and Linux build)
//   assets/icon@256.png
//   assets/icon@1024.png
//   assets/icon.ico        (multi-size, used by Windows build)
//
// Run automatically before `start`, `package`, and `make`.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'public', 'logo.svg');
const OUT = path.join(ROOT, 'assets');

const SIZES = [256, 512, 1024];
const ICO_SIZES = [16, 32, 48, 64, 128, 256];

async function main() {
  const svg = await readFile(SRC);
  await mkdir(OUT, { recursive: true });

  // Main PNGs.
  await Promise.all(
    SIZES.map(async (size) => {
      const buf = await sharp(svg, { density: 384 })
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      const name = size === 512 ? 'icon.png' : `icon@${size}.png`;
      await writeFile(path.join(OUT, name), buf);
      console.log(`  wrote assets/${name}`);
    }),
  );

  // Windows .ico (multi-resolution).
  const icoBuffers = await Promise.all(
    ICO_SIZES.map((size) =>
      sharp(svg, { density: 384 })
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer(),
    ),
  );
  const ico = await pngToIco(icoBuffers);
  await writeFile(path.join(OUT, 'icon.ico'), ico);
  console.log('  wrote assets/icon.ico');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
