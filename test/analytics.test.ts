import { describe, it, expect } from 'vitest';
import {
  topSites,
  hourlyHistogram,
  dailyTrend,
  categorize,
  categoryBreakdown,
  overview,
  activityOverview,
  siteTimeShare,
  categoryTimeShare,
  dailyActivity,
  weeklyActivity,
  topPagesByTime,
  sessionBehavior,
  type ActivityVisit,
} from '../src/core/analytics';
import { visit, T0, MIN } from './helpers';

const HOUR = 60 * MIN;

const sample = [
  visit({ id: 'a', url: 'https://github.com/x', host: 'github.com', timestamp: T0 }),
  visit({ id: 'b', url: 'https://github.com/y', host: 'github.com', timestamp: T0 + HOUR }),
  visit({ id: 'c', url: 'https://youtube.com/w', host: 'youtube.com', timestamp: T0 + 2 * HOUR }),
  visit({ id: 'd', url: 'https://news.ycombinator.com/', host: 'news.ycombinator.com', timestamp: T0 + 25 * HOUR }),
];

const activitySample: ActivityVisit[] = [
  { visit: sample[0], activeMs: 60000, scrollDepth: 1, measured: true },
  { visit: sample[1], activeMs: 30000, scrollDepth: 0.5, measured: true },
  { visit: sample[2], activeMs: 30000, scrollDepth: 0.25, measured: true },
  { visit: sample[3], activeMs: 0, scrollDepth: 0, measured: false },
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

  it('reports measured active time and coverage without inventing missing time', () => {
    expect(activityOverview(activitySample)).toEqual({
      totalActiveMs: 120000,
      measuredVisits: 3,
      measurementCoverage: 75,
      averageActiveMs: 40000,
    });
  });

  it('calculates site and category shares from active time', () => {
    expect(siteTimeShare(activitySample)).toEqual([
      { key: 'github.com', activeMs: 90000, percentage: 75, visits: 2 },
      { key: 'youtube.com', activeMs: 30000, percentage: 25, visits: 1 },
    ]);
    expect(categoryTimeShare(activitySample)).toEqual([
      { key: 'Dev', activeMs: 90000, percentage: 75, visits: 3 },
      { key: 'Video', activeMs: 30000, percentage: 25, visits: 1 },
    ]);
  });

  it('returns safe empty activity analytics when no active time was measured', () => {
    const rows: ActivityVisit[] = [
      { visit: sample[0], activeMs: -100, scrollDepth: 0, measured: true },
      { visit: sample[1], activeMs: Number.NaN, scrollDepth: 0, measured: false },
    ];
    expect(activityOverview(rows)).toEqual({
      totalActiveMs: 0,
      measuredVisits: 1,
      measurementCoverage: 50,
      averageActiveMs: 0,
    });
    expect(siteTimeShare(rows)).toEqual([]);
    expect(categoryTimeShare([])).toEqual([]);
  });

  it('buckets active time by local day and weekday/hour', () => {
    const rows: ActivityVisit[] = [
      { visit: visit({ id: 'late', timestamp: Date.UTC(2026, 0, 4, 23, 30) }), activeMs: 60000, scrollDepth: 0, measured: true },
      { visit: visit({ id: 'morning', timestamp: Date.UTC(2026, 0, 5, 8, 0) }), activeMs: 120000, scrollDepth: 0, measured: true },
    ];
    expect(dailyActivity(rows, 60)).toEqual([
      { key: '2026-01-05', activeMs: 180000, visits: 2 },
    ]);
    const matrix = weeklyActivity(rows, 60);
    expect(matrix).toHaveLength(7);
    expect(matrix.every((day) => day.length === 24)).toBe(true);
    expect(matrix[1][0]).toBe(60000);
    expect(matrix[1][9]).toBe(120000);
  });

  it('ranks pages by active time with deterministic ties', () => {
    const rows: ActivityVisit[] = [
      { visit: visit({ id: 'a1', url: 'https://a.test/page', host: 'a.test', title: 'Older A', timestamp: T0 }), activeMs: 30000, scrollDepth: 0, measured: true },
      { visit: visit({ id: 'a2', url: 'https://a.test/page', host: 'a.test', title: 'Latest A', timestamp: T0 + MIN }), activeMs: 30000, scrollDepth: 0, measured: true },
      { visit: visit({ id: 'b', url: 'https://b.test/page', host: 'b.test', title: 'B', timestamp: T0 + 2 * MIN }), activeMs: 60000, scrollDepth: 0, measured: true },
    ];
    expect(topPagesByTime(rows)).toEqual([
      { url: 'https://a.test/page', title: 'Latest A', host: 'a.test', activeMs: 60000, percentage: 50, visits: 2 },
      { url: 'https://b.test/page', title: 'B', host: 'b.test', activeMs: 60000, percentage: 50, visits: 1 },
    ]);
  });

  it('summarizes sessions and domain switches', () => {
    const visits = [
      visit({ id: 'a', host: 'a.test', timestamp: T0 }),
      visit({ id: 'b', host: 'b.test', timestamp: T0 + 5 * MIN }),
      visit({ id: 'c', host: 'b.test', timestamp: T0 + 10 * MIN }),
      visit({ id: 'd', host: 'c.test', timestamp: T0 + 50 * MIN }),
    ];
    expect(sessionBehavior(visits)).toEqual({
      sessionCount: 2,
      averageSessionMs: 300000,
      longestSessionMs: 600000,
      averagePagesPerSession: 2,
      domainSwitches: 1,
    });
  });
});
