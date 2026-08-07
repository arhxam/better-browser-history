import fs from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getManifestSafetyErrors } from './manifest-safety.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const manifestPath = resolve(dist, 'manifest.json');

if (!fs.existsSync(manifestPath)) {
  console.error('FAIL: dist/manifest.json is missing. Run `npm run build` first.');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const errors = getManifestSafetyErrors(manifest);

if (manifest.chrome_url_overrides?.history !== 'history.html') {
  errors.push('chrome_url_overrides.history must point to history.html');
}

if (errors.length) {
  console.error(`FAIL:\n - ${errors.join('\n - ')}`);
  process.exit(1);
}

console.log('PASS: this build cannot replace New Tab or the homepage.');
console.log(`Version: ${manifest.version}`);
console.log(`Load unpacked from: ${dist}`);
console.log('History override: history.html');
