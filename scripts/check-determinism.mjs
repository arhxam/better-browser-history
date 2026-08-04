// Guards the deterministic contract: src/core must contain no source of
// nondeterminism or side effects. Prints PASS (exit 0) or offending lines.
import fs from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const coreDir = resolve(root, 'src/core');

// Patterns that would break determinism / purity inside the core.
// `new Date(<arg>)` is deterministic and allowed; only the argument-less
// `new Date()` (reads the wall clock) is banned.
const banned = [
  { re: /Math\.random\s*\(/, name: 'Math.random' },
  { re: /\bfetch\s*\(/, name: 'fetch(' },
  { re: /XMLHttpRequest/, name: 'XMLHttpRequest' },
  { re: /crypto\.getRandomValues/, name: 'crypto.getRandomValues' },
  { re: /\bchrome\./, name: 'chrome.* API' },
  { re: /\bDate\.now\s*\(/, name: 'Date.now()' },
  { re: /new Date\(\s*\)/, name: 'new Date() with no argument' },
  { re: /\bperformance\.now\s*\(/, name: 'performance.now()' },
];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

if (!fs.existsSync(coreDir)) {
  console.error('FAIL: src/core not found');
  process.exit(1);
}

const hits = [];
for (const file of walk(coreDir)) {
  // Blank out block comments (preserving newlines) so JSDoc mentions of banned
  // words are not flagged.
  const src = fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    // ignore line comments
    const code = line.replace(/\/\/.*$/, '');
    for (const b of banned) {
      if (b.re.test(code)) {
        hits.push(`${relative(root, file)}:${i + 1}  ${b.name}  -> ${line.trim()}`);
      }
    }
  });
}

if (hits.length) {
  console.error('FAIL: nondeterministic constructs in src/core:\n - ' + hits.join('\n - '));
  process.exit(1);
}
console.log('PASS');
