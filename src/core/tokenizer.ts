// Deterministic tokenizer for full-text indexing.
// No randomness, no clocks — same string always yields the same tokens.

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'has',
  'have', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'this',
  'to', 'was', 'were', 'will', 'with', 'you', 'your', 'we', 'they', 'them', 'their',
  'i', 'me', 'my', 'so', 'if', 'no', 'not', 'do', 'does', 'did', 'can', 'could',
  'would', 'should', 'about', 'into', 'over', 'then', 'than', 'up', 'out', 'off',
]);

const MIN_TOKEN_LEN = 2;
const MAX_TOKEN_LEN = 40;

/**
 * Split text into normalized tokens: lowercased, alphanumeric runs, stopwords
 * removed, bounded length. Order is preserved (needed for phrase-ish ranking).
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  const lowered = text.toLowerCase();
  const tokens: string[] = [];
  // Split on any non-alphanumeric (Unicode letters/numbers kept).
  for (const raw of lowered.split(/[^\p{L}\p{N}]+/u)) {
    if (!raw) continue;
    if (raw.length < MIN_TOKEN_LEN || raw.length > MAX_TOKEN_LEN) continue;
    if (STOPWORDS.has(raw)) continue;
    tokens.push(raw);
  }
  return tokens;
}

/** Map of token -> frequency, iterated in first-seen order (deterministic). */
export function termFrequencies(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

/** Unique tokens in first-seen order — used for the DB multiEntry index. */
export function uniqueTokens(tokens: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}
