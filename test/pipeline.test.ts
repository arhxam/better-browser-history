import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { getDB, HistoryDB, setDB } from '../src/db/schema';
import {
  recordNavigation as runRecordNavigation,
  recordPageContent as runRecordPageContent,
  recordEngagement as runRecordEngagement,
  type NavigationEvent,
} from '../src/background/capture';
import {
  getAllVisits,
  getEntries,
  searchEntries,
  getSessions,
  getJourneys,
  getAnalytics,
} from '../src/db/repository';
import type { EngagementEvent } from '../src/core/types';
import {
  CURRENT_PRIVACY_CONSENT_VERSION,
  normalizeSettings,
  type ExtensionSettings,
} from '../src/settings/settings';

let dbCounter = 0;
beforeEach(async () => {
  const db = new HistoryDB(`test_${dbCounter++}`);
  setDB(db);
  await db.open();
});

const T0 = Date.UTC(2026, 0, 1, 9, 0, 0);
const MIN = 60 * 1000;
const CONSENTED_SETTINGS = normalizeSettings({
  captureEnabled: true,
  privacyConsentVersion: CURRENT_PRIVACY_CONSENT_VERSION,
});

function recordNavigation(event: NavigationEvent, settings: ExtensionSettings = CONSENTED_SETTINGS) {
  return runRecordNavigation(event, settings);
}

function recordPageContent(
  input: Parameters<typeof runRecordPageContent>[0],
  settings: ExtensionSettings = CONSENTED_SETTINGS,
) {
  return runRecordPageContent(input, settings);
}

function recordEngagement(
  tabId: number,
  events: EngagementEvent[],
  settings: ExtensionSettings = CONSENTED_SETTINGS,
  url?: string,
) {
  return runRecordEngagement(tabId, events, settings, url);
}

function nav(p: Partial<NavigationEvent> & { url: string; tabId: number; timeStamp: number }): NavigationEvent {
  return { frameId: 0, transitionType: 'link', ...p };
}

async function engage(tabId: number, start: number, activeMs: number, scroll: number) {
  const events: EngagementEvent[] = [
    { type: 'focus', timestamp: start },
    { type: 'heartbeat', timestamp: start + activeMs, scrollDepth: scroll },
    { type: 'blur', timestamp: start + activeMs },
  ];
  await recordEngagement(tabId, events);
}

describe('capture pipeline (recordVisit, headless, independent of native history)', () => {
  it('persists visits, pages and engagement from synthetic navigation events', async () => {
    // Nothing here touches chrome.history — the store is fully our own.
    await recordNavigation(nav({ url: 'https://g.com/search', tabId: 1, timeStamp: T0, transitionType: 'typed' }));
    await recordPageContent({ url: 'https://g.com/search', title: 'Search', content: 'query rust ownership', capturedAt: T0 });
    await engage(1, T0, 15 * 1000, 0.2);

    await recordNavigation(nav({ url: 'https://news.ycombinator.com/', tabId: 1, timeStamp: T0 + 2 * MIN }));
    await recordPageContent({ url: 'https://news.ycombinator.com/', title: 'Hacker News', content: 'programming rust go databases', capturedAt: T0 + 2 * MIN });
    await engage(1, T0 + 2 * MIN, 90 * 1000, 0.6);

    // New tab opened from tab 1
    await recordNavigation(nav({ url: 'https://doc.rust-lang.org/ownership', tabId: 2, timeStamp: T0 + 3 * MIN, openerTabId: 1 }));
    await recordPageContent({ url: 'https://doc.rust-lang.org/ownership', title: 'Ownership', content: 'rust ownership borrow checker memory safety', capturedAt: T0 + 3 * MIN });
    await engage(2, T0 + 3 * MIN, 300 * 1000, 0.9);

    await recordNavigation(nav({ url: 'https://go.dev/concurrency', tabId: 1, timeStamp: T0 + 5 * MIN }));
    await recordPageContent({ url: 'https://go.dev/concurrency', title: 'Concurrency', content: 'go goroutines channels concurrency', capturedAt: T0 + 5 * MIN });
    await engage(1, T0 + 5 * MIN, 150 * 1000, 0.5);

    const visits = await getAllVisits();
    expect(visits.length).toBe(4);

    // Engagement attributed to the right visits.
    const entries = await getEntries();
    const rust = entries.find((e) => e.host === 'doc.rust-lang.org')!;
    expect(rust.engagement?.activeMs).toBe(300 * 1000);
    expect(rust.engagement?.scrollDepth).toBe(0.9);
  });

  it('drops sub-frame and non-http navigations', async () => {
    await recordNavigation(nav({ url: 'https://a.com/', tabId: 1, timeStamp: T0, frameId: 1 })); // subframe
    await recordNavigation(nav({ url: 'chrome://settings', tabId: 1, timeStamp: T0 + MIN })); // non-http
    await recordNavigation(nav({ url: 'https://a.com/real', tabId: 1, timeStamp: T0 + 2 * MIN }));
    expect((await getAllVisits()).length).toBe(1);
  });

  it('does not record visits when capture is disabled', async () => {
    const settings = normalizeSettings({ captureEnabled: false });
    const result = await recordNavigation(
      nav({ url: 'https://private.example/page', tabId: 1, timeStamp: T0 }),
      settings,
    );
    expect(result).toBeNull();
    expect(await getAllVisits()).toEqual([]);
  });

  it('does not inspect or persist browsing data before privacy consent', async () => {
    const settings = normalizeSettings({ captureEnabled: true, privacyConsentVersion: 0 });
    expect(await runRecordNavigation(
      nav({ url: 'https://private.example/page', tabId: 1, timeStamp: T0 }),
      settings,
    )).toBeNull();
    expect(await runRecordPageContent({
      url: 'https://private.example/page',
      title: 'Private',
      content: 'must not be indexed',
      capturedAt: T0,
    }, settings)).toBeNull();
    expect(await runRecordEngagement(1, [
      { type: 'focus', timestamp: T0 },
      { type: 'blur', timestamp: T0 + 1000 },
    ], settings, 'https://private.example/page')).toBeNull();
    expect(await getAllVisits()).toEqual([]);
  });

  it('does not record visits from excluded hosts or their subdomains', async () => {
    const settings = normalizeSettings({ excludedHosts: ['example.com'] });
    const result = await recordNavigation(
      nav({ url: 'https://docs.example.com/page', tabId: 1, timeStamp: T0 }),
      settings,
    );
    expect(result).toBeNull();
    expect(await getAllVisits()).toEqual([]);
  });

  it('does not store page content from non-web URLs', async () => {
    const page = await recordPageContent({
      url: 'file:///Users/example/private-notes.txt',
      title: 'Private notes',
      content: 'must not be stored',
      capturedAt: Date.now(),
    }, CONSENTED_SETTINGS);

    expect(page).toBeNull();
    expect(await getDB().pages.count()).toBe(0);
  });

  it('full-text content search finds pages by their body text', async () => {
    await recordNavigation(nav({ url: 'https://go.dev/x', tabId: 1, timeStamp: T0 }));
    await recordPageContent({ url: 'https://go.dev/x', title: 'Go', content: 'goroutines and channels', capturedAt: T0 });
    await recordNavigation(nav({ url: 'https://rust.org/y', tabId: 1, timeStamp: T0 + MIN }));
    await recordPageContent({ url: 'https://rust.org/y', title: 'Rust', content: 'ownership and borrow checker', capturedAt: T0 + MIN });

    const results = await searchEntries('goroutines');
    expect(results.map((r) => r.host)).toEqual(['go.dev']);

    const both = await searchEntries('borrow');
    expect(both.map((r) => r.host)).toEqual(['rust.org']);
  });

  it('dedups repeat visits and counts them', async () => {
    await recordNavigation(nav({ url: 'https://x.com/p', tabId: 1, timeStamp: T0 }));
    await recordNavigation(nav({ url: 'https://x.com/p', tabId: 1, timeStamp: T0 + 40 * MIN, transitionType: 'typed' }));
    await recordNavigation(nav({ url: 'https://x.com/p', tabId: 1, timeStamp: T0 + 80 * MIN, transitionType: 'typed' }));
    const entries = await getEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].visitCount).toBe(3);
  });

  it('derives sessions and journeys from the captured visits', async () => {
    await recordNavigation(nav({ url: 'https://g.com/s', tabId: 1, timeStamp: T0, transitionType: 'typed' }));
    await recordNavigation(nav({ url: 'https://hn.com/', tabId: 1, timeStamp: T0 + 2 * MIN, transitionType: 'link' }));
    await recordNavigation(nav({ url: 'https://rust.org/', tabId: 2, timeStamp: T0 + 3 * MIN, openerTabId: 1 }));

    const sessions = await getSessions();
    expect(sessions.length).toBe(1);
    expect(sessions[0].visits.length).toBe(3);

    const journeys = await getJourneys();
    const roots = journeys[0].roots;
    // g.com/s is the root; hn is its child (same-tab link); rust hangs off hn (opener).
    expect(roots.map((r) => r.visitId).length).toBe(1);
  });

  it('produces deterministic search results across runs', async () => {
    await recordNavigation(nav({ url: 'https://a.com/', tabId: 1, timeStamp: T0 }));
    await recordPageContent({ url: 'https://a.com/', title: 'A', content: 'deterministic reproducible output', capturedAt: T0 });
    const a = await searchEntries('deterministic');
    const b = await searchEntries('deterministic');
    expect(a.map((r) => r.url)).toEqual(b.map((r) => r.url));
  });

  it('computes analytics over captured visits', async () => {
    await recordNavigation(nav({ url: 'https://github.com/a', tabId: 1, timeStamp: T0, transitionType: 'typed' }));
    await engage(1, T0, 60 * 1000, 0.8);
    await recordNavigation(nav({ url: 'https://github.com/b', tabId: 2, timeStamp: T0 + MIN }));
    await engage(2, T0 + MIN, 30 * 1000, 0.4);
    await recordNavigation(nav({ url: 'https://youtube.com/c', tabId: 3, timeStamp: T0 + 2 * MIN }));
    const a = await getAnalytics();
    expect(a.overview.totalVisits).toBe(3);
    expect(a.topSites[0]).toEqual({ key: 'github.com', count: 2 });
    expect(a.categories.find((c) => c.key === 'Dev')?.count).toBe(2);
    expect(a.activity).toMatchObject({
      totalActiveMs: 90000,
      measuredVisits: 2,
      averageActiveMs: 45000,
    });
    expect(a.activity.measurementCoverage).toBeCloseTo(200 / 3);
    expect(a.siteTime).toEqual([
      { key: 'github.com', activeMs: 90000, percentage: 100, visits: 2 },
    ]);
    expect(a.categoryTime).toEqual([
      { key: 'Dev', activeMs: 90000, percentage: 100, visits: 2 },
    ]);
    expect(a.topPages.map((page) => page.activeMs)).toEqual([60000, 30000]);

    const githubOnly = await getAnalytics({ host: 'github.com' });
    expect(githubOnly.overview.totalVisits).toBe(2);
    expect(githubOnly.activity.measurementCoverage).toBe(100);
    expect(githubOnly.dailyActivity).toEqual([
      { key: '2026-01-01', activeMs: 90000, visits: 2 },
    ]);
  });
});
