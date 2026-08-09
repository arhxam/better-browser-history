import fs from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest } from './manifest.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(relative) {
  const absolute = resolve(root, relative);
  assert(fs.existsSync(absolute), `${relative} must exist`);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute) : Buffer.alloc(0);
}

function pngDimensions(relative) {
  const png = read(relative);
  assert(png.length >= 24 && png.subarray(1, 4).toString() === 'PNG', `${relative} must be a PNG`);
  return png.length >= 24 ? [png.readUInt32BE(16), png.readUInt32BE(20)] : [0, 0];
}

const publicPages = ['docs/index.html', 'docs/privacy.html', 'docs/support.html'];
for (const page of publicPages) {
  const html = read(page).toString('utf8');
  assert(/<title>[^<]+<\/title>/.test(html), `${page} must have a title`);
  assert(/<meta name="description" content="[^"]+">/.test(html), `${page} must have a meta description`);
  assert(/<link rel="canonical" href="https:\/\/better-browsing-history\.opengrounds\.org\//.test(html), `${page} must use the public canonical origin`);
  assert(!/<script[^>]+src=["']https?:\/\//i.test(html), `${page} must not load remote scripts`);
}

const privacy = read('docs/privacy.html').toString('utf8');
assert(privacy.includes('Capture is off until you enable it'), 'privacy policy must state the consent default');
assert(privacy.includes('Limited Use requirements'), 'privacy policy must contain the Limited Use disclosure');
assert(privacy.includes('do not sell personal or sensitive user data'), 'privacy policy must state that data is not sold');

const manifest = buildManifest();
const listing = read('docs/chrome-web-store/LISTING.md').toString('utf8');
assert(listing.includes(`**${manifest.name}**`), 'listing name must match the manifest');
assert(listing.includes(`**${manifest.description}**`), 'listing summary must match the manifest');
assert(manifest.description.length <= 132, 'manifest/listing summary must be at most 132 characters');

const imageSizes = new Map([
  ['docs/chrome-web-store/assets/store-icon-128.png', [128, 128]],
  ['docs/chrome-web-store/assets/small-promo-440x280.png', [440, 280]],
  ['docs/chrome-web-store/assets/marquee-promo-1400x560.png', [1400, 560]],
  ['docs/chrome-web-store/assets/01-search-history-1280x800.png', [1280, 800]],
  ['docs/chrome-web-store/assets/02-time-analytics-1280x800.png', [1280, 800]],
  ['docs/chrome-web-store/assets/03-site-and-category-insights-1280x800.png', [1280, 800]],
  ['docs/chrome-web-store/assets/04-hourly-heatmap-1280x800.png', [1280, 800]],
  ['docs/chrome-web-store/assets/05-visit-patterns-1280x800.png', [1280, 800]],
]);
for (const [file, expected] of imageSizes) {
  const actual = pngDimensions(file);
  assert(actual[0] === expected[0] && actual[1] === expected[1], `${file} must be ${expected.join('×')}`);
}

if (errors.length) {
  console.error(`FAIL:\n - ${errors.join('\n - ')}`);
  process.exit(1);
}
console.log('PASS: public pages, listing copy, privacy disclosures, and Store assets');
