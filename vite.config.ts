/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

// Dev server uses the project root, so pages are served at
// /src/ui/dashboard.html, /src/ui/popup.html, /src/ui/newtab.html.
// The production build (scripts/build-extension.mjs) overrides `root` to
// src/ui so the HTML pages land at the dist root for the extension manifest.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@core': resolve(root, 'src/core'),
      '@db': resolve(root, 'src/db'),
      '@ui': resolve(root, 'src/ui'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
