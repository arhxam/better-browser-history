import { describe, it, expect } from 'vitest';
import { normalizeUrl, getHost, getDomain } from '../src/core/url';

describe('url helpers', () => {
  it('drops the fragment', () => {
    expect(normalizeUrl('https://x.com/p#section')).toBe('https://x.com/p');
  });

  it('strips tracking params but keeps meaningful ones', () => {
    expect(normalizeUrl('https://x.com/p?utm_source=a&id=5')).toBe('https://x.com/p?id=5');
  });

  it('lowercases the host', () => {
    expect(normalizeUrl('https://EXAMPLE.com/Path')).toBe('https://example.com/Path');
  });

  it('removes a trailing slash on non-root paths', () => {
    expect(normalizeUrl('https://x.com/a/b/')).toBe('https://x.com/a/b');
    expect(normalizeUrl('https://x.com/')).toBe('https://x.com/');
  });

  it('returns input unchanged for invalid urls', () => {
    expect(normalizeUrl('not a url')).toBe('not a url');
  });

  it('getHost and getDomain extract host parts', () => {
    expect(getHost('https://news.ycombinator.com/item?id=1')).toBe('news.ycombinator.com');
    expect(getDomain('https://news.ycombinator.com/item')).toBe('ycombinator.com');
    expect(getDomain('https://x.com')).toBe('x.com');
  });

  it('is deterministic', () => {
    const u = 'https://X.com/A/?utm_medium=x&q=1#h';
    expect(normalizeUrl(u)).toBe(normalizeUrl(u));
  });
});
