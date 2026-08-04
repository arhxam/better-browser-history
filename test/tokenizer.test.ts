import { describe, it, expect } from 'vitest';
import { tokenize, termFrequencies, uniqueTokens } from '../src/core/tokenizer';

describe('tokenizer', () => {
  it('lowercases, strips punctuation and stopwords', () => {
    expect(tokenize('The Quick, Brown FOX!')).toEqual(['quick', 'brown', 'fox']);
  });

  it('drops tokens shorter than 2 chars', () => {
    expect(tokenize('a I go to it')).toEqual(['go']);
  });

  it('handles unicode letters and numbers', () => {
    expect(tokenize('café 2024 über')).toEqual(['café', '2024', 'über']);
  });

  it('returns empty for empty/whitespace input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   \n\t ')).toEqual([]);
  });

  it('is deterministic (same input -> same output)', () => {
    const text = 'Deterministic Systems: build the same output every time, 100%.';
    expect(tokenize(text)).toEqual(tokenize(text));
  });

  it('termFrequencies counts occurrences in first-seen order', () => {
    const tf = termFrequencies(tokenize('dog cat dog bird dog cat'));
    expect(Array.from(tf.entries())).toEqual([
      ['dog', 3],
      ['cat', 2],
      ['bird', 1],
    ]);
  });

  it('uniqueTokens preserves first-seen order without duplicates', () => {
    expect(uniqueTokens(['b', 'a', 'b', 'c', 'a'])).toEqual(['b', 'a', 'c']);
  });
});
