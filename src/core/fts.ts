// Deterministic full-text search over tokenized documents.
// Ranking is a fixed TF-IDF: score = Σ_term (tf_in_doc × idf), with idf =
// ln(1 + N / df). Ties break by ascending doc id, so results are stable.
import { tokenize, termFrequencies } from './tokenizer';
import type { SearchResult } from './types';

export interface IndexedDoc {
  id: string;
  tokens: string[];
}

export interface FtsIndex {
  docCount: number;
  /** doc id -> (term -> frequency) */
  tf: Map<string, Map<string, number>>;
  /** term -> number of docs containing it */
  df: Map<string, number>;
}

export function buildIndex(docs: IndexedDoc[]): FtsIndex {
  const tf = new Map<string, Map<string, number>>();
  const df = new Map<string, number>();
  for (const doc of docs) {
    const freqs = termFrequencies(doc.tokens);
    tf.set(doc.id, freqs);
    for (const term of freqs.keys()) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  return { docCount: docs.length, tf, df };
}

function idf(index: FtsIndex, term: string): number {
  const dfv = index.df.get(term) ?? 0;
  if (dfv === 0) return 0;
  return Math.log(1 + index.docCount / dfv);
}

/**
 * Search the index. Returns docs matching at least one query term, ranked by
 * descending score then ascending id. `limit` <= 0 means no limit.
 */
export function search(index: FtsIndex, query: string, limit = 0): SearchResult[] {
  const qTerms = Array.from(new Set(tokenize(query)));
  if (qTerms.length === 0) return [];

  const results: SearchResult[] = [];
  for (const [id, freqs] of index.tf) {
    let score = 0;
    for (const term of qTerms) {
      const f = freqs.get(term);
      if (f) score += f * idf(index, term);
    }
    if (score > 0) results.push({ url: id, score });
  }

  results.sort((a, b) => (b.score - a.score) || (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
  return limit > 0 ? results.slice(0, limit) : results;
}

/** Convenience: build an index from {id, text} docs and run one query. */
export function searchText(
  docs: { id: string; text: string }[],
  query: string,
  limit = 0,
): SearchResult[] {
  const index = buildIndex(docs.map((d) => ({ id: d.id, tokens: tokenize(d.text) })));
  return search(index, query, limit);
}
