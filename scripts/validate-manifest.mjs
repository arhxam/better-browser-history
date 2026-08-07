// Validates dist/manifest.json against the extension's requirements.
// Prints PASS (exit 0) or the failures (exit 1).
import fs from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getManifestSafetyErrors } from './manifest-safety.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'dist/manifest.json');
const packageJson = JSON.parse(fs.readFileSync(resolve(root, 'package.json'), 'utf8'));

const errors = [];
function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

if (!fs.existsSync(manifestPath)) {
  console.error('FAIL: dist/manifest.json not found — run `npm run build` first');
  process.exit(1);
}

const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
errors.push(...getManifestSafetyErrors(m));

assert(m.manifest_version === 3, 'manifest_version must be 3');
assert(m.name === 'Better Browser History', 'manifest name must match the public product name');
assert(m.version === packageJson.version, 'manifest version must match package.json');

assert(
  Array.isArray(m.host_permissions)
    && m.host_permissions.includes('http://*/*')
    && m.host_permissions.includes('https://*/*'),
  'host_permissions must include HTTP and HTTPS pages',
);

assert(m.background && m.background.service_worker, 'background.service_worker must be set');
assert(m.action && m.action.default_popup, 'action.default_popup must be set');
assert(
  m.chrome_url_overrides && m.chrome_url_overrides.history,
  'chrome_url_overrides.history must be set',
);
const cs = (m.content_scripts || [])[0];
assert(
  cs && Array.isArray(cs.matches)
    && cs.matches.length === 2
    && cs.matches.includes('http://*/*')
    && cs.matches.includes('https://*/*'),
  'content_scripts must match only HTTP and HTTPS pages',
);
assert(cs && Array.isArray(cs.js) && cs.js.length > 0, 'content_scripts must declare js');

// Referenced files exist in dist.
const distFiles = [
  m.background?.service_worker,
  m.action?.default_popup,
  m.chrome_url_overrides?.history,
  ...(cs?.js || []),
].filter(Boolean);
for (const f of distFiles) {
  assert(fs.existsSync(resolve(root, 'dist', f)), `referenced file missing in dist: ${f}`);
}

// Chromium extension pages can report Vite's modulepreload hints as
// cross-world resource mismatches. Extension scripts load normally without
// those speculative hints, so keep every emitted HTML page preload-free.
for (const file of fs.readdirSync(resolve(root, 'dist')).filter((name) => name.endsWith('.html'))) {
  const html = fs.readFileSync(resolve(root, 'dist', file), 'utf8');
  assert(!/rel=["']modulepreload["']/i.test(html), `${file} must not contain modulepreload links`);
  assert(!/<script[^>]+src=["']https?:\/\//i.test(html), `${file} must not load remote scripts`);
}

assert(
  !fs.readdirSync(resolve(root, 'dist'), { recursive: true }).some((name) => String(name).endsWith('.map')),
  'dist must not contain source maps',
);

assert(
  !fs.existsSync(resolve(root, 'dist', 'newtab.html')),
  'production package must not contain a New Tab page',
);

if (errors.length) {
  console.error('FAIL:\n - ' + errors.join('\n - '));
  process.exit(1);
}
console.log('PASS');
