import { describe, it, expect } from 'vitest';
import {
  topSites,
  hourlyHistogram,
  dailyTrend,
  categorize,
  categoryBreakdown,
  overview,
} from '../src/core/analytics';
import { visit, T0, MIN } from './helpers';

const HOUR = 60 * MIN;

const sample = [
  visit({ id: 'a', url: 'https://github.com/x', host: 'github.com', timestamp: T0 }),
  visit({ id: 'b', url: 'https://github.com/y', host: 'github.com', timestamp: T0 + HOUR }),
  visit({ id: 'c', url: 'https://youtube.com/w', host: 'youtube.com', timestamp: T0 + 2 * HOUR }),
  visit({ id: 'd', url: 'https://news.ycombinator.com/', host: 'news.ycombinator.com', timestamp: T0 + 25 * HOUR }),
];

describe('analytics', () => {
  it('topSites counts hosts, descending then alphabetical', () => {
    expect(topSites(sample)).toEqual([
      { key: 'github.com', count: 2 },
      { key: 'news.ycombinator.com', count: 1 },
      { key: 'youtube.com', count: 1 },
    ]);
  });

  it('hourlyHistogram buckets by hour of day (UTC by default)', () => {
    const bins = hourlyHistogram(sample);
    expect(bins.length).toBe(24);
    // T0 is 09:00 UTC; visits at +0h,+1h,+2h and +25h(=10:00 next day)
    expect(bins[9]).toBe(1);
    expect(bins[10]).toBe(2); // +1h and +25h both land on hour 10
    expect(bins[11]).toBe(1);
  });

  it('hourlyHistogram respects an explicit tz offset', () => {
    const bins = hourlyHistogram([visit({ id: 'a', timestamp: T0 })], -60); // shift back 1h
    expect(bins[8]).toBe(1);
  });

  it('dailyTrend groups visits by calendar day ascending', () => {
    expect(dailyTrend(sample)).toEqual([
      { key: '2026-01-01', count: 3 },
      { key: '2026-01-02', count: 1 },
    ]);
  });

  it('categorize maps known domains deterministically', () => {
    expect(categorize('https://github.com/a')).toBe('Dev');
    expect(categorize('https://www.youtube.com/watch')).toBe('Video');
    expect(categorize('https://x.com/status')).toBe('Social');
    expect(categorize('https://claude.ai/chat')).toBe('AI');
    expect(categorize('https://unknown-site.test/')).toBe('Other');
  });

  it('categoryBreakdown counts by category descending', () => {
    expect(categoryBreakdown(sample)).toEqual([
      { key: 'Dev', count: 3 }, // 2 github + 1 hacker news
      { key: 'Video', count: 1 },
    ]);
  });

  it('overview reports totals, unique urls and hosts', () => {
    expect(overview(sample)).toEqual({ totalVisits: 4, uniqueUrls: 4, uniqueHosts: 3 });
  });

  it('is deterministic across runs', () => {
    expect(topSites(sample)).toEqual(topSites(sample));
    expect(dailyTrend(sample)).toEqual(dailyTrend(sample));
    expect(categoryBreakdown(sample)).toEqual(categoryBreakdown(sample));
  });
});
