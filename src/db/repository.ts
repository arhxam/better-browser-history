// Data-access layer over the IndexedDB schema. All derived views (dedup,
// sessions, journeys, analytics, ranked search) are produced by the pure core,
// so the same stored visits always yield the same views.
import { getDB } from './schema';
import type { HistoryDB } from './schema';
import type {
  Visit,
  Page,
  Engagement,
  Annotation,
  EngagementEvent,
  Session,
  Journey,
  DedupedEntry,
} from '../core/types';
import { normalizeUrl, getHost } from '../core/url';
import { tokenize } from '../core/tokenizer';
import { dedupeVisits } from '../core/dedup';
import { assignSessions } from '../core/sessionizer';
import { buildJourneys } from '../core/journeys';
import { computeEngagement, mergeEngagement } from '../core/engagement';
import { buildIndex, search as ftsSearch } from '../core/fts';
import {
  topSites,
  hourlyHistogram,
  dailyTrend,
  categoryBreakdown,
  overview,
  type Count,
  type OverviewStats,
} from '../core/analytics';

const MAX_CONTENT_CHARS = 20000;
const MAX_TOKENS = 1500;

export interface VisitInput {
  id: string;
  url: string;
  title?: string;
  transition?: Visit['transition'];
  referrer?: string;
  referringVisitId?: string;
  tabId: number;
  openerTabId?: number;
  timestamp: number;
}

export interface PageInput {
  url: string;
  title?: string;
  content?: string;
  description?: string;
  capturedAt: number;
}

export interface HistoryFilter {
  from?: number;
  to?: number;
  host?: string;
  tag?: string;
  starred?: boolean;
}

export interface EnrichedEntry extends DedupedEntry {
  representativeVisitId: string;
  page?: Page;
  engagement?: Engagement;
  annotation?: Annotation;
  score?: number;
}

export interface SessionView {
  session: Session;
  visits: Visit[];
}

function db(): HistoryDB {
  return getDB();
}

// ---------- writes ----------

export async function recordVisit(input: VisitInput): Promise<Visit> {
  const visit: Visit = {
    id: input.id,
    url: input.url,
    host: getHost(input.url),
    title: input.title ?? '',
    transition: input.transition ?? 'other',
    referrer: input.referrer,
    referringVisitId: input.referringVisitId,
    tabId: input.tabId,
    openerTabId: input.openerTabId,
    timestamp: input.timestamp,
  };
  await db().visits.put(visit);
  return visit;
}

export async function upsertPage(input: PageInput): Promise<Page> {
  const url = normalizeUrl(input.url);
  const content = (input.content ?? '').slice(0, MAX_CONTENT_CHARS);
  const title = input.title ?? '';
  const tokens = tokenize(`${title} ${content}`).slice(0, MAX_TOKENS);
  const page: Page = {
    url,
    host: getHost(url),
    title,
    content,
    description: input.description,
    tokens,
    lastCapturedAt: input.capturedAt,
  };
  await db().pages.put(page);
  return page;
}

/** Fold new engagement events into the stored aggregate for a visit. */
export async function addEngagement(
  visitId: string,
  events: EngagementEvent[],
): Promise<Engagement> {
  const computed = computeEngagement(visitId, events);
  const existing = await db().engagement.get(visitId);
  const merged = existing ? mergeEngagement(existing, computed) : computed;
  await db().engagement.put(merged);
  return merged;
}

export async function setAnnotation(
  url: string,
  patch: Partial<Omit<Annotation, 'url'>>,
  updatedAt: number,
): Promise<Annotation> {
  const key = normalizeUrl(url);
  const existing = await db().annotations.get(key);
  const next: Annotation = {
    url: key,
    tags: patch.tags ?? existing?.tags ?? [],
    note: patch.note ?? existing?.note ?? '',
    starred: patch.starred ?? existing?.starred ?? false,
    updatedAt,
  };
  await db().annotations.put(next);
  return next;
}

// ---------- reads ----------

export async function getAllVisits(): Promise<Visit[]> {
  return db().visits.orderBy('timestamp').toArray();
}

async function getFilteredVisits(filter: HistoryFilter = {}): Promise<Visit[]> {
  let visits = await getAllVisits();
  if (filter.from != null) visits = visits.filter((v) => v.timestamp >= filter.from!);
  if (filter.to != null) visits = visits.filter((v) => v.timestamp <= filter.to!);
  if (filter.host) visits = visits.filter((v) => v.host === filter.host);

  if (filter.tag || filter.starred) {
    const anns = await db().annotations.toArray();
    const byUrl = new Map(anns.map((a) => [a.url, a]));
    visits = visits.filter((v) => {
      const a = byUrl.get(normalizeUrl(v.url));
      if (filter.starred && !a?.starred) return false;
      if (filter.tag && !(a?.tags ?? []).includes(filter.tag)) return false;
      return true;
    });
  }
  return visits;
}

async function enrich(entries: DedupedEntry[], scores?: Map<string, number>): Promise<EnrichedEntry[]> {
  const urls = entries.map((e) => e.url);
  const [pages, anns] = await Promise.all([
    db().pages.bulkGet(urls),
    db().annotations.bulkGet(urls),
  ]);
  const pageByUrl = new Map<string, Page>();
  pages.forEach((p) => p && pageByUrl.set(p.url, p));
  const annByUrl = new Map<string, Annotation>();
  anns.forEach((a) => a && annByUrl.set(a.url, a));

  // Aggregate engagement across each entry's visits.
  const allVisitIds = entries.flatMap((e) => e.visitIds);
  const engRows = await db().engagement.bulkGet(allVisitIds);
  const engByVisit = new Map<string, Engagement>();
  engRows.forEach((e) => e && engByVisit.set(e.visitId, e));

  return entries.map((e) => {
    let eng: Engagement | undefined;
    for (const vid of e.visitIds) {
      const row = engByVisit.get(vid);
      if (row) eng = eng ? mergeEngagement(eng, row) : { ...row };
    }
    const representativeVisitId = e.visitIds[e.visitIds.length - 1] ?? e.visitIds[0];
    return {
      ...e,
      representativeVisitId,
      page: pageByUrl.get(e.url),
      engagement: eng,
      annotation: annByUrl.get(e.url),
      score: scores?.get(e.url),
    };
  });
}

/** Browse view: deduped entries (recent first) matching the filter. */
export async function getEntries(filter: HistoryFilter = {}, limit = 0): Promise<EnrichedEntry[]> {
  const visits = await getFilteredVisits(filter);
  const deduped = dedupeVisits(visits); // already sorted lastSeen desc
  const scoped = limit > 0 ? deduped.slice(0, limit) : deduped;
  return enrich(scoped);
}

/** Full-text search over page content, deterministically ranked. */
export async function searchEntries(
  text: string,
  filter: HistoryFilter = {},
  limit = 0,
): Promise<EnrichedEntry[]> {
  const qTokens = Array.from(new Set(tokenize(text)));
  if (qTokens.length === 0) return getEntries(filter, limit);

  const visits = await getFilteredVisits(filter);
  const deduped = dedupeVisits(visits);
  const entryByUrl = new Map(deduped.map((e) => [e.url, e]));

  // Candidate pages via the multiEntry token index; fall back to matching
  // titles/urls of in-scope entries even when no page content was captured.
  const candidatePages = await db().pages.where('tokens').anyOf(qTokens).distinct().toArray();
  const docs = candidatePages
    .filter((p) => entryByUrl.has(p.url))
    .map((p) => ({ id: p.url, tokens: p.tokens }));

  // Also index title/url tokens of in-scope entries (covers uncaptured pages).
  for (const e of deduped) {
    if (!candidatePages.some((p) => p.url === e.url)) {
      docs.push({ id: e.url, tokens: tokenize(`${e.title} ${e.url}`) });
    }
  }

  const index = buildIndex(docs);
  const ranked = ftsSearch(index, text, limit);
  const scores = new Map(ranked.map((r) => [r.url, r.score]));
  const orderedEntries = ranked
    .map((r) => entryByUrl.get(r.url))
    .filter((e): e is DedupedEntry => !!e);
  return enrich(orderedEntries, scores);
}

/** Sessions derived deterministically from the filtered visits. */
export async function getSessions(filter: HistoryFilter = {}): Promise<SessionView[]> {
  const visits = await getFilteredVisits(filter);
  const { visits: assigned, sessions } = assignSessions(visits);
  const byId = new Map(assigned.map((v) => [v.id, v]));
  // Most recent session first.
  return sessions
    .slice()
    .sort((a, b) => b.start - a.start)
    .map((session) => ({
      session,
      visits: session.visitIds.map((id) => byId.get(id)!).filter(Boolean),
    }));
}

/** Journey trees derived from filtered, sessionized visits. */
export async function getJourneys(filter: HistoryFilter = {}): Promise<Journey[]> {
  const visits = await getFilteredVisits(filter);
  const { visits: assigned } = assignSessions(visits);
  return buildJourneys(assigned);
}

export interface AnalyticsBundle {
  overview: OverviewStats;
  topSites: Count[];
  hourly: number[];
  daily: Count[];
  categories: Count[];
}

export async function getAnalytics(
  filter: HistoryFilter = {},
  tzOffsetMinutes = 0,
): Promise<AnalyticsBundle> {
  const visits = await getFilteredVisits(filter);
  return {
    overview: overview(visits),
    topSites: topSites(visits, 10),
    hourly: hourlyHistogram(visits, tzOffsetMinutes),
    daily: dailyTrend(visits, tzOffsetMinutes),
    categories: categoryBreakdown(visits),
  };
}

export async function getVisitById(id: string): Promise<Visit | undefined> {
  return db().visits.get(id);
}

export async function getLatestVisitInTab(tabId: number): Promise<Visit | undefined> {
  const inTab = await db().visits.where('tabId').equals(tabId).toArray();
  if (inTab.length === 0) return undefined;
  return inTab.sort((a, b) => b.timestamp - a.timestamp)[0];
}

export async function getStats(): Promise<OverviewStats> {
  return overview(await getAllVisits());
}

export async function getAllHosts(): Promise<string[]> {
  const visits = await getAllVisits();
  return Array.from(new Set(visits.map((v) => v.host).filter(Boolean))).sort();
}

export async function getAllTags(): Promise<string[]> {
  const anns = await db().annotations.toArray();
  return Array.from(new Set(anns.flatMap((a) => a.tags))).sort();
}

/** Delete visits older than `beforeTs` (retention/pruning). */
export async function pruneBefore(beforeTs: number): Promise<number> {
  return db().visits.where('timestamp').below(beforeTs).delete();
}

export async function clearAll(): Promise<void> {
  await db().transaction('rw', db().visits, db().pages, db().engagement, db().annotations, async () => {
    await Promise.all([
      db().visits.clear(),
      db().pages.clear(),
      db().engagement.clear(),
      db().annotations.clear(),
    ]);
  });
}

export interface ExportBundle {
  visits: Visit[];
  pages: Page[];
  engagement: Engagement[];
  annotations: Annotation[];
}

export async function exportAll(): Promise<ExportBundle> {
  const [visits, pages, engagement, annotations] = await Promise.all([
    db().visits.toArray(),
    db().pages.toArray(),
    db().engagement.toArray(),
    db().annotations.toArray(),
  ]);
  return { visits, pages, engagement, annotations };
}

/** Retention policy in days; 0 = keep everything (the default). */
export async function getRetentionDays(): Promise<number> {
  const row = await db().meta.get('retentionDays');
  return typeof row?.value === 'number' ? row.value : 0;
}

export async function setRetentionDays(days: number): Promise<void> {
  await db().meta.put({ key: 'retentionDays', value: days });
}

export interface StorageStats extends OverviewStats {
  pages: number;
  annotations: number;
}

export async function getStorageStats(): Promise<StorageStats> {
  const [base, pages, annotations] = await Promise.all([
    getStats(),
    db().pages.count(),
    db().annotations.count(),
  ]);
  return { ...base, pages, annotations };
}
