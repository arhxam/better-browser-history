// Zip the built dist/ into a distributable extension archive.
// Runs after `npm run build`. Uses the system `zip` (present on macOS, Linux CI).
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

if (!existsSync(dist)) {
  console.error('dist/ not found — run `npm run build` first');
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const out = resolve(root, `better-browser-history-v${version}.zip`);
rmSync(out, { force: true });

execFileSync('zip', ['-r', '-q', out, '.'], { cwd: dist, stdio: 'inherit' });
console.log(`Packaged -> ${out}`);
