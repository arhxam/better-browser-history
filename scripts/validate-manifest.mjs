// Validates dist/manifest.json against the extension's requirements.
// Prints PASS (exit 0) or the failures (exit 1).
import fs from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'dist/manifest.json');

const errors = [];
function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

if (!fs.existsSync(manifestPath)) {
  console.error('FAIL: dist/manifest.json not found — run `npm run build` first');
  process.exit(1);
}

const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

assert(m.manifest_version === 3, 'manifest_version must be 3');

const requiredPerms = [
  'history',
  'tabs',
  'webNavigation',
  'storage',
  'unlimitedStorage',
  'scripting',
  'idle',
  'alarms',
];
const perms = new Set(m.permissions || []);
for (const p of requiredPerms) assert(perms.has(p), `missing permission: ${p}`);

assert(
  Array.isArray(m.host_permissions) && m.host_permissions.includes('<all_urls>'),
  'host_permissions must include <all_urls>',
);

assert(m.background && m.background.service_worker, 'background.service_worker must be set');
assert(m.action && m.action.default_popup, 'action.default_popup must be set');
assert(
  m.chrome_url_overrides && m.chrome_url_overrides.history,
  'chrome_url_overrides.history must be set',
);
assert(
  !m.chrome_url_overrides?.newtab,
  'chrome_url_overrides.newtab must not be set',
);

const cs = (m.content_scripts || [])[0];
assert(cs && Array.isArray(cs.matches) && cs.matches.includes('<all_urls>'), 'content_scripts must match <all_urls>');
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

// Keep one inert compatibility page for installations that still have the old
// New Tab manifest cached. Opening it reloads the extension into this manifest,
// where New Tab is no longer overridden.
assert(
  fs.existsSync(resolve(root, 'dist', 'newtab.html')),
  'legacy New Tab migration page must exist without being an override',
);

if (errors.length) {
  console.error('FAIL:\n - ' + errors.join('\n - '));
  process.exit(1);
}
console.log('PASS');
