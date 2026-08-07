// Production build for the unpacked extension.
//   1. Vite builds the React UI pages (root = src/ui) -> dist/*.html + dist/assets
//   2. esbuild bundles the service worker (ESM) and content script (IIFE)
//   3. generate icons and write manifest.json
import { build as viteBuild } from 'vite';
import { build as esbuild } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import fs from 'node:fs';
import { buildManifest } from './manifest.mjs';
import { makeIcon } from './png.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

const alias = {
  '@core': resolve(root, 'src/core'),
  '@db': resolve(root, 'src/db'),
  '@ui': resolve(root, 'src/ui'),
};

async function run() {
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });

  // 1. UI pages via Vite (root src/ui so pages emit at dist root).
  await viteBuild({
    configFile: false,
    root: resolve(root, 'src/ui'),
    base: './',
    resolve: { alias },
    plugins: [(await import('@vitejs/plugin-react')).default()],
    build: {
      outDir: dist,
      emptyOutDir: false,
      modulePreload: false,
      rollupOptions: {
        input: {
          dashboard: resolve(root, 'src/ui/dashboard.html'),
          popup: resolve(root, 'src/ui/popup.html'),
          history: resolve(root, 'src/ui/history.html'),
          newtab: resolve(root, 'src/ui/newtab.html'),
          options: resolve(root, 'src/ui/options.html'),
        },
      },
    },
    logLevel: 'warn',
  });

  // 2a. Service worker (ES module — matches manifest background.type=module).
  await esbuild({
    entryPoints: [resolve(root, 'src/background/service-worker.ts')],
    outfile: resolve(dist, 'service-worker.js'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'chrome110',
    alias,
    logLevel: 'warning',
  });

  // 2b. Content script (IIFE — classic isolated-world script, no imports).
  await esbuild({
    entryPoints: [resolve(root, 'src/content/content-script.ts')],
    outfile: resolve(dist, 'content-script.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'chrome110',
    alias,
    logLevel: 'warning',
  });

  // 3a. Icons.
  const iconsDir = resolve(dist, 'icons');
  fs.mkdirSync(iconsDir, { recursive: true });
  for (const size of [16, 48, 128]) {
    fs.writeFileSync(resolve(iconsDir, `icon${size}.png`), makeIcon(size));
  }

  // 3b. Manifest.
  fs.writeFileSync(
    resolve(dist, 'manifest.json'),
    JSON.stringify(buildManifest(), null, 2),
  );

  console.log('Built extension -> dist/');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
