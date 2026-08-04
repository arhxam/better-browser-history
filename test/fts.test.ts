import { describe, it, expect } from 'vitest';
import { buildIndex, search, searchText } from '../src/core/fts';
import { tokenize } from '../src/core/tokenizer';

const docs = [
  { id: 'https://a.example/rust', text: 'Rust ownership and borrow checker explained. Rust rust rust.' },
  { id: 'https://b.example/go', text: 'Go concurrency with goroutines and channels.' },
  { id: 'https://c.example/rust-vs-go', text: 'Rust vs Go: memory safety and concurrency compared.' },
  { id: 'https://d.example/cooking', text: 'A pasta recipe with tomato and basil.' },
];

describe('fts content search', () => {
  it('finds documents by page content, not just title/url', () => {
    const results = searchText(docs, 'goroutines');
    expect(results.map((r) => r.url)).toEqual(['https://b.example/go']);
  });

  it('ranks the more relevant document first (deterministic rank order)', () => {
    // "rust" appears far more in doc a than doc c.
    const results = searchText(docs, 'rust');
    expect(results.map((r) => r.url)).toEqual([
      'https://a.example/rust',
      'https://c.example/rust-vs-go',
    ]);
  });

  it('multi-term query accumulates score across terms', () => {
    const results = searchText(docs, 'concurrency');
    expect(results.map((r) => r.url).sort()).toEqual([
      'https://b.example/go',
      'https://c.example/rust-vs-go',
    ]);
  });

  it('returns nothing for a term absent from every document', () => {
    expect(searchText(docs, 'kubernetes')).toEqual([]);
  });

  it('ignores stopwords in the query', () => {
    expect(searchText(docs, 'the and of')).toEqual([]);
  });

  it('respects the result limit', () => {
    const idx = buildIndex(docs.map((d) => ({ id: d.id, tokens: tokenize(d.text) })));
    expect(search(idx, 'concurrency', 1).length).toBe(1);
  });

  it('is fully deterministic across repeated runs', () => {
    const a = searchText(docs, 'rust concurrency memory');
    const b = searchText(docs, 'rust concurrency memory');
    expect(a).toEqual(b);
  });

  it('breaks score ties by ascending url', () => {
    const tied = [
      { id: 'https://z.example', text: 'apple' },
      { id: 'https://a.example', text: 'apple' },
    ];
    expect(searchText(tied, 'apple').map((r) => r.url)).toEqual([
      'https://a.example',
      'https://z.example',
    ]);
  });
});
