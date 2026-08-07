// Deterministic analytics aggregations over visits.
// Time-of-day / day bucketing takes an explicit tz offset (minutes) so results
// never depend on the host machine's locale. Default offset 0 = UTC.
import type { Visit } from './types';
import { getHost, getDomain, normalizeUrl } from './url';
import { assignSessions } from './sessionizer';

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

export interface ActivityVisit {
  visit: Visit;
  activeMs: number;
  scrollDepth: number;
  measured: boolean;
}

export interface ActivityOverview {
  totalActiveMs: number;
  measuredVisits: number;
  measurementCoverage: number;
  averageActiveMs: number;
}

export interface TimeShare {
  key: string;
  activeMs: number;
  percentage: number;
  visits: number;
}

export interface ActivityTrend {
  key: string;
  activeMs: number;
  visits: number;
}

export interface PageTime {
  url: string;
  title: string;
  host: string;
  activeMs: number;
  percentage: number;
  visits: number;
}

export interface SessionBehavior {
  sessionCount: number;
  averageSessionMs: number;
  longestSessionMs: number;
  averagePagesPerSession: number;
  domainSwitches: number;
}

function safeActiveMs(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function activityOverview(rows: ActivityVisit[]): ActivityOverview {
  let totalActiveMs = 0;
  let measuredVisits = 0;
  for (const row of rows) {
    totalActiveMs += safeActiveMs(row.activeMs);
    if (row.measured) measuredVisits += 1;
  }
  return {
    totalActiveMs,
    measuredVisits,
    measurementCoverage: rows.length > 0 ? (measuredVisits / rows.length) * 100 : 0,
    averageActiveMs: measuredVisits > 0 ? Math.round(totalActiveMs / measuredVisits) : 0,
  };
}

function timeShareBy(
  rows: ActivityVisit[],
  keyFor: (row: ActivityVisit) => string,
  limit = 0,
): TimeShare[] {
  const grouped = new Map<string, { activeMs: number; visits: number }>();
  for (const row of rows) {
    const key = keyFor(row);
    if (!key) continue;
    const current = grouped.get(key) ?? { activeMs: 0, visits: 0 };
    current.activeMs += safeActiveMs(row.activeMs);
    current.visits += 1;
    grouped.set(key, current);
  }
  const total = Array.from(grouped.values()).reduce((sum, item) => sum + item.activeMs, 0);
  if (total === 0) return [];
  const shares = Array.from(grouped.entries())
    .filter(([, item]) => item.activeMs > 0)
    .map(([key, item]) => ({
      key,
      activeMs: item.activeMs,
      percentage: (item.activeMs / total) * 100,
      visits: item.visits,
    }))
    .sort((a, b) => b.activeMs - a.activeMs || a.key.localeCompare(b.key));
  return limit > 0 ? shares.slice(0, limit) : shares;
}

export function siteTimeShare(rows: ActivityVisit[], limit = 0): TimeShare[] {
  return timeShareBy(rows, (row) => row.visit.host || getHost(row.visit.url), limit);
}

export function categoryTimeShare(rows: ActivityVisit[]): TimeShare[] {
  return timeShareBy(rows, (row) => categorize(row.visit.url));
}

export function dailyActivity(
  rows: ActivityVisit[],
  tzOffsetMinutes = 0,
): ActivityTrend[] {
  const grouped = new Map<string, { activeMs: number; visits: number }>();
  for (const row of rows) {
    const date = new Date(row.visit.timestamp + tzOffsetMinutes * 60000);
    const key = date.toISOString().slice(0, 10);
    const current = grouped.get(key) ?? { activeMs: 0, visits: 0 };
    current.activeMs += safeActiveMs(row.activeMs);
    current.visits += 1;
    grouped.set(key, current);
  }
  return Array.from(grouped.entries())
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function weeklyActivity(
  rows: ActivityVisit[],
  tzOffsetMinutes = 0,
): number[][] {
  const matrix = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (const row of rows) {
    const date = new Date(row.visit.timestamp + tzOffsetMinutes * 60000);
    matrix[date.getUTCDay()][date.getUTCHours()] += safeActiveMs(row.activeMs);
  }
  return matrix;
}

export function topPagesByTime(rows: ActivityVisit[], limit = 0): PageTime[] {
  const grouped = new Map<string, {
    title: string;
    host: string;
    activeMs: number;
    visits: number;
    latestTimestamp: number;
  }>();
  for (const row of rows) {
    const url = normalizeUrl(row.visit.url);
    const current = grouped.get(url) ?? {
      title: row.visit.title,
      host: row.visit.host || getHost(url),
      activeMs: 0,
      visits: 0,
      latestTimestamp: Number.NEGATIVE_INFINITY,
    };
    current.activeMs += safeActiveMs(row.activeMs);
    current.visits += 1;
    if (row.visit.timestamp >= current.latestTimestamp) {
      current.latestTimestamp = row.visit.timestamp;
      current.title = row.visit.title;
      current.host = row.visit.host || getHost(url);
    }
    grouped.set(url, current);
  }
  const total = Array.from(grouped.values()).reduce((sum, page) => sum + page.activeMs, 0);
  if (total === 0) return [];
  const pages = Array.from(grouped.entries())
    .filter(([, page]) => page.activeMs > 0)
    .map(([url, page]) => ({
      url,
      title: page.title,
      host: page.host,
      activeMs: page.activeMs,
      percentage: (page.activeMs / total) * 100,
      visits: page.visits,
    }))
    .sort((a, b) => b.activeMs - a.activeMs || a.url.localeCompare(b.url));
  return limit > 0 ? pages.slice(0, limit) : pages;
}

export function sessionBehavior(visits: Visit[]): SessionBehavior {
  const { visits: assigned, sessions } = assignSessions(visits);
  if (sessions.length === 0) {
    return {
      sessionCount: 0,
      averageSessionMs: 0,
      longestSessionMs: 0,
      averagePagesPerSession: 0,
      domainSwitches: 0,
    };
  }
  const visitById = new Map(assigned.map((visit) => [visit.id, visit]));
  let totalSessionMs = 0;
  let longestSessionMs = 0;
  let domainSwitches = 0;
  for (const session of sessions) {
    const span = Math.max(0, session.end - session.start);
    totalSessionMs += span;
    longestSessionMs = Math.max(longestSessionMs, span);
    const sessionVisits = session.visitIds
      .map((id) => visitById.get(id))
      .filter((visit): visit is Visit => visit != null);
    for (let index = 1; index < sessionVisits.length; index += 1) {
      if (sessionVisits[index - 1].host !== sessionVisits[index].host) domainSwitches += 1;
    }
  }
  return {
    sessionCount: sessions.length,
    averageSessionMs: Math.round(totalSessionMs / sessions.length),
    longestSessionMs,
    averagePagesPerSession: visits.length / sessions.length,
    domainSwitches,
  };
}
