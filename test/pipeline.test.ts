import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryDB, setDB } from '../src/db/schema';
import {
  recordNavigation,
  recordPageContent,
  recordEngagement,
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
import { normalizeSettings } from '../src/settings/settings';

let dbCounter = 0;
beforeEach(async () => {
  const db = new HistoryDB(`test_${dbCounter++}`);
  setDB(db);
  await db.open();
});

const T0 = Date.UTC(2026, 0, 1, 9, 0, 0);
const MIN = 60 * 1000;

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

  it('does not record visits from excluded hosts or their subdomains', async () => {
    const settings = normalizeSettings({ excludedHosts: ['example.com'] });
    const result = await recordNavigation(
      nav({ url: 'https://docs.example.com/page', tabId: 1, timeStamp: T0 }),
      settings,
    );
    expect(result).toBeNull();
    expect(await getAllVisits()).toEqual([]);
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
    await recordNavigation(nav({ url: 'https://github.com/b', tabId: 1, timeStamp: T0 + MIN }));
    await recordNavigation(nav({ url: 'https://youtube.com/c', tabId: 1, timeStamp: T0 + 2 * MIN }));
    const a = await getAnalytics();
    expect(a.overview.totalVisits).toBe(3);
    expect(a.topSites[0]).toEqual({ key: 'github.com', count: 2 });
    expect(a.categories.find((c) => c.key === 'Dev')?.count).toBe(2);
  });
});
