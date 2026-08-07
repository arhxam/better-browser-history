import fs from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeIcon, makePromo } from './png.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'docs/chrome-web-store/assets');
fs.mkdirSync(out, { recursive: true });

fs.writeFileSync(resolve(out, 'store-icon-128.png'), makeIcon(128));
fs.writeFileSync(resolve(out, 'small-promo-440x280.png'), makePromo(440, 280));
fs.writeFileSync(resolve(out, 'marquee-promo-1400x560.png'), makePromo(1400, 560));

console.log(`Generated Store icon and promotional tiles -> ${out}`);
