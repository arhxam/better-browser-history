// Demo data seeder. Used by the UI's `?demo=1` mode so the dashboard, popup and
// new-tab surfaces render (and search/filter/analytics work) in an ordinary tab
// without loading the unpacked extension. Not part of the deterministic core.
import { getDB } from './schema';
import { recordVisit, upsertPage, addEngagement, setAnnotation } from './repository';
import type { EngagementEvent } from '../core/types';

interface SeedPage {
  slug: string;
  url: string;
  title: string;
  content: string;
}

const PAGES: SeedPage[] = [
  {
    slug: 'rust',
    url: 'https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html',
    title: 'What Is Ownership? - The Rust Programming Language',
    content:
      'Ownership is Rust’s most unique feature. The borrow checker enforces memory safety without a garbage collector. Rust ownership rules govern how the program manages memory.',
  },
  {
    slug: 'go',
    url: 'https://go.dev/blog/concurrency-is-not-parallelism',
    title: 'Concurrency is not parallelism - The Go Blog',
    content:
      'Go concurrency uses goroutines and channels to structure programs. Concurrency is about dealing with many things at once; parallelism is doing many things at once.',
  },
  {
    slug: 'hn',
    url: 'https://news.ycombinator.com/',
    title: 'Hacker News',
    content:
      'Hacker News front page: startups, programming, rust, go, databases, and technology discussions.',
  },
  {
    slug: 'indexeddb',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API',
    title: 'IndexedDB API - Web APIs | MDN',
    content:
      'IndexedDB is a low-level API for client-side storage of significant amounts of structured data, including files and blobs. It uses indexes to enable high-performance searches.',
  },
  {
    slug: 'dexie',
    url: 'https://dexie.org/docs/Tutorial/Getting-started',
    title: 'Getting started - Dexie.js',
    content:
      'Dexie.js is a minimalistic wrapper for IndexedDB. Define your database schema with stores and indexes, then query with a fluent API.',
  },
  {
    slug: 'youtube',
    url: 'https://www.youtube.com/watch?v=deterministic',
    title: 'Building Deterministic Systems - YouTube',
    content:
      'A talk about deterministic systems, reproducible builds, and pure functions that always produce the same output for the same input.',
  },
  {
    slug: 'react',
    url: 'https://react.dev/learn/thinking-in-react',
    title: 'Thinking in React - React',
    content:
      'Thinking in React: break the UI into a component hierarchy, build a static version, then add state and data flow.',
  },
  {
    slug: 'brave',
    url: 'https://brave.com/privacy/browser/',
    title: 'Brave Browser Privacy',
    content:
      'Brave is a privacy-focused Chromium browser. It blocks trackers and ads by default and can clear browsing history on exit.',
  },
  {
    slug: 'search',
    url: 'https://www.google.com/search?q=deterministic+browser+history',
    title: 'deterministic browser history - Google Search',
    content: 'Search results for deterministic browser history extension.',
  },
];

function pageBySlug(slug: string): SeedPage {
  return PAGES.find((p) => p.slug === slug)!;
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

interface SeedVisit {
  slug: string;
  tOffset: number; // ms before "now"
  tabId: number;
  transition?: 'link' | 'typed' | 'generated';
  refSlug?: string;
  openerTabId?: number;
  activeMs: number;
  scroll: number;
}

// Three sessions across two days, with referrer chains and a repeat visit.
const VISITS: SeedVisit[] = [
  // Session A (now-ish): search -> hn -> rust -> go
  { slug: 'search', tOffset: 40 * MIN, tabId: 1, transition: 'typed', activeMs: 20 * 1000, scroll: 0.2 },
  { slug: 'hn', tOffset: 38 * MIN, tabId: 1, transition: 'link', refSlug: 'search', activeMs: 90 * 1000, scroll: 0.6 },
  { slug: 'rust', tOffset: 34 * MIN, tabId: 2, transition: 'link', openerTabId: 1, activeMs: 300 * 1000, scroll: 0.9 },
  { slug: 'go', tOffset: 28 * MIN, tabId: 1, transition: 'link', refSlug: 'hn', activeMs: 150 * 1000, scroll: 0.5 },
  { slug: 'youtube', tOffset: 22 * MIN, tabId: 1, transition: 'link', refSlug: 'go', activeMs: 240 * 1000, scroll: 0.3 },

  // Session B (earlier today): indexeddb -> dexie -> react
  { slug: 'indexeddb', tOffset: 5 * HOUR, tabId: 3, transition: 'typed', activeMs: 200 * 1000, scroll: 0.8 },
  { slug: 'dexie', tOffset: 5 * HOUR - 8 * MIN, tabId: 3, transition: 'link', refSlug: 'indexeddb', activeMs: 260 * 1000, scroll: 0.7 },
  { slug: 'react', tOffset: 5 * HOUR - 20 * MIN, tabId: 3, transition: 'link', activeMs: 180 * 1000, scroll: 0.5 },

  // Session C (yesterday): brave -> rust (repeat) -> hn (repeat)
  { slug: 'brave', tOffset: 27 * HOUR, tabId: 4, transition: 'typed', activeMs: 120 * 1000, scroll: 0.9 },
  { slug: 'rust', tOffset: 27 * HOUR - 6 * MIN, tabId: 4, transition: 'link', refSlug: 'brave', activeMs: 220 * 1000, scroll: 0.6 },
  { slug: 'hn', tOffset: 27 * HOUR - 15 * MIN, tabId: 4, transition: 'typed', activeMs: 60 * 1000, scroll: 0.4 },
];

const ANNOTATIONS: { slug: string; tags: string[]; note: string; starred: boolean }[] = [
  { slug: 'rust', tags: ['learning', 'rust'], note: 'Re-read the ownership rules.', starred: true },
  { slug: 'dexie', tags: ['reference'], note: '', starred: true },
  { slug: 'indexeddb', tags: ['reference'], note: 'Multi-entry indexes for FTS.', starred: false },
];

export async function isSeeded(): Promise<boolean> {
  const flag = await getDB().meta.get('demoSeeded');
  return !!flag?.value;
}

/** Populate the DB with demo data. Clears any existing rows first. */
export async function seedDemoData(now: number = Date.now()): Promise<void> {
  const dbi = getDB();
  await Promise.all([
    dbi.visits.clear(),
    dbi.pages.clear(),
    dbi.engagement.clear(),
    dbi.annotations.clear(),
  ]);

  for (const p of PAGES) {
    await upsertPage({ url: p.url, title: p.title, content: p.content, capturedAt: now });
  }

  // Map slug -> visit id so referrers resolve.
  const idBySlugTab = new Map<string, string>();
  let counter = 0;
  for (const sv of VISITS) {
    const page = pageBySlug(sv.slug);
    const id = `demo_${counter++}`;
    const ts = now - sv.tOffset;
    const refKey = sv.refSlug ? `${sv.refSlug}:${sv.tabId}` : undefined;
    await recordVisit({
      id,
      url: page.url,
      title: page.title,
      transition: sv.transition ?? 'link',
      tabId: sv.tabId,
      openerTabId: sv.openerTabId,
      referringVisitId: refKey ? idBySlugTab.get(refKey) : undefined,
      timestamp: ts,
    });
    idBySlugTab.set(`${sv.slug}:${sv.tabId}`, id);

    const events: EngagementEvent[] = [
      { type: 'focus', timestamp: ts },
      { type: 'heartbeat', timestamp: ts + sv.activeMs, scrollDepth: sv.scroll },
      { type: 'blur', timestamp: ts + sv.activeMs },
    ];
    await addEngagement(id, events);
  }

  for (const a of ANNOTATIONS) {
    await setAnnotation(pageBySlug(a.slug).url, { tags: a.tags, note: a.note, starred: a.starred }, now);
  }

  await dbi.meta.put({ key: 'demoSeeded', value: true });
}

/** Seed only if the DB has no visits yet. Returns true if it seeded. */
export async function seedIfEmpty(now: number = Date.now()): Promise<boolean> {
  const count = await getDB().visits.count();
  if (count > 0) return false;
  await seedDemoData(now);
  return true;
}
