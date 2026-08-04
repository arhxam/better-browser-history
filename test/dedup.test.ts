import { describe, it, expect } from 'vitest';
import { dedupeVisits } from '../src/core/dedup';
import { visit, T0, MIN } from './helpers';

describe('dedup', () => {
  it('collapses repeat visits to the same url and counts them', () => {
    const visits = [
      visit({ id: 'a', url: 'https://x.com/page', timestamp: T0 }),
      visit({ id: 'b', url: 'https://x.com/page', timestamp: T0 + 5 * MIN }),
      visit({ id: 'c', url: 'https://x.com/page', timestamp: T0 + 10 * MIN }),
    ];
    const entries = dedupeVisits(visits);
    expect(entries.length).toBe(1);
    expect(entries[0].visitCount).toBe(3);
    expect(entries[0].firstSeen).toBe(T0);
    expect(entries[0].lastSeen).toBe(T0 + 10 * MIN);
    expect(entries[0].visitIds).toEqual(['a', 'b', 'c']);
  });

  it('treats urls differing only by tracking params as identical', () => {
    const visits = [
      visit({ id: 'a', url: 'https://x.com/p?utm_source=news', timestamp: T0 }),
      visit({ id: 'b', url: 'https://x.com/p', timestamp: T0 + MIN }),
    ];
    expect(dedupeVisits(visits).length).toBe(1);
  });

  it('keeps distinct urls separate', () => {
    const visits = [
      visit({ id: 'a', url: 'https://x.com/one', timestamp: T0 }),
      visit({ id: 'b', url: 'https://x.com/two', timestamp: T0 + MIN }),
    ];
    expect(dedupeVisits(visits).length).toBe(2);
  });

  it('sorts entries by most recent lastSeen first', () => {
    const visits = [
      visit({ id: 'a', url: 'https://x.com/old', timestamp: T0 }),
      visit({ id: 'b', url: 'https://x.com/new', timestamp: T0 + 100 * MIN }),
    ];
    expect(dedupeVisits(visits).map((e) => e.url)).toEqual([
      'https://x.com/new',
      'https://x.com/old',
    ]);
  });

  it('is deterministic', () => {
    const visits = [
      visit({ id: 'a', url: 'https://x.com/p', timestamp: T0 }),
      visit({ id: 'b', url: 'https://y.com/q', timestamp: T0 + MIN }),
      visit({ id: 'c', url: 'https://x.com/p', timestamp: T0 + 2 * MIN }),
    ];
    expect(dedupeVisits(visits)).toEqual(dedupeVisits(visits));
  });
});
