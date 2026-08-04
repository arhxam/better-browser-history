// Deterministic analytics aggregations over visits.
// Time-of-day / day bucketing takes an explicit tz offset (minutes) so results
// never depend on the host machine's locale. Default offset 0 = UTC.
import type { Visit } from './types';
import { getHost, getDomain, normalizeUrl } from './url';

export interface Count<T = string> {
  key: T;
  count: number;
}

function sortCounts(map: Map<string, number>): Count[] {
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

/** Most-visited hosts, descending. */
export function topSites(visits: Visit[], limit = 0): Count[] {
  const map = new Map<string, number>();
  for (const v of visits) {
    const host = v.host || getHost(v.url);
    if (!host) continue;
    map.set(host, (map.get(host) ?? 0) + 1);
  }
  const out = sortCounts(map);
  return limit > 0 ? out.slice(0, limit) : out;
}

/** 24-slot histogram of visit hour-of-day. */
export function hourlyHistogram(visits: Visit[], tzOffsetMinutes = 0): number[] {
  const bins = new Array(24).fill(0);
  for (const v of visits) {
    const d = new Date(v.timestamp + tzOffsetMinutes * 60000);
    bins[d.getUTCHours()] += 1;
  }
  return bins;
}

/** Visits per calendar day (YYYY-MM-DD), ascending by date. */
export function dailyTrend(visits: Visit[], tzOffsetMinutes = 0): Count[] {
  const map = new Map<string, number>();
  for (const v of visits) {
    const d = new Date(v.timestamp + tzOffsetMinutes * 60000);
    const key = d.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

// Static, deterministic domain -> category rules (first match wins).
const CATEGORY_RULES: { category: string; needles: string[] }[] = [
  { category: 'Search', needles: ['google.com', 'bing.com', 'duckduckgo.com', 'search.brave'] },
  { category: 'Social', needles: ['twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'reddit.com', 'linkedin.com', 'mastodon', 'threads.net'] },
  { category: 'Video', needles: ['youtube.com', 'youtu.be', 'vimeo.com', 'twitch.tv', 'netflix.com'] },
  { category: 'Dev', needles: ['github.com', 'gitlab.com', 'stackoverflow.com', 'stackexchange.com', 'npmjs.com', 'developer.mozilla.org', 'news.ycombinator.com'] },
  { category: 'News', needles: ['nytimes.com', 'bbc.', 'theguardian.com', 'cnn.com', 'reuters.com', 'bloomberg.com', 'apnews.com'] },
  { category: 'Shopping', needles: ['amazon.', 'ebay.', 'etsy.com', 'walmart.com', 'aliexpress.'] },
  { category: 'Docs', needles: ['docs.google.com', 'notion.so', 'confluence', 'wikipedia.org', 'readthedocs'] },
  { category: 'AI', needles: ['openai.com', 'chatgpt.com', 'claude.ai', 'anthropic.com', 'gemini.google', 'perplexity.ai'] },
];

export function categorize(url: string): string {
  const domain = getDomain(url);
  const host = getHost(url);
  for (const rule of CATEGORY_RULES) {
    if (rule.needles.some((n) => host.includes(n) || domain.includes(n))) return rule.category;
  }
  return 'Other';
}

/** Visit counts per category, descending. */
export function categoryBreakdown(visits: Visit[]): Count[] {
  const map = new Map<string, number>();
  for (const v of visits) {
    const cat = categorize(v.url);
    map.set(cat, (map.get(cat) ?? 0) + 1);
  }
  return sortCounts(map);
}

export interface OverviewStats {
  totalVisits: number;
  uniqueUrls: number;
  uniqueHosts: number;
}

export function overview(visits: Visit[]): OverviewStats {
  const urls = new Set<string>();
  const hosts = new Set<string>();
  for (const v of visits) {
    urls.add(normalizeUrl(v.url));
    const host = v.host || getHost(v.url);
    if (host) hosts.add(host);
  }
  return { totalVisits: visits.length, uniqueUrls: urls.size, uniqueHosts: hosts.size };
}
