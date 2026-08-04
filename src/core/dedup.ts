// Deterministic dedup: collapse repeated visits to the same normalized URL into
// a single entry carrying the visit count and first/last-seen timestamps.
import type { Visit, DedupedEntry } from './types';
import { normalizeUrl } from './url';

/**
 * Group visits by normalized URL. Output is sorted by lastSeen descending, then
 * url ascending, so the ordering is stable across runs.
 */
export function dedupeVisits(visits: Visit[]): DedupedEntry[] {
  const byUrl = new Map<string, DedupedEntry>();

  for (const v of visits) {
    const url = normalizeUrl(v.url);
    const existing = byUrl.get(url);
    if (!existing) {
      byUrl.set(url, {
        url,
        host: v.host,
        title: v.title,
        visitCount: 1,
        firstSeen: v.timestamp,
        lastSeen: v.timestamp,
        visitIds: [v.id],
      });
    } else {
      existing.visitCount += 1;
      existing.firstSeen = Math.min(existing.firstSeen, v.timestamp);
      // Keep the most recent non-empty title.
      if (v.timestamp >= existing.lastSeen && v.title) existing.title = v.title;
      existing.lastSeen = Math.max(existing.lastSeen, v.timestamp);
      existing.visitIds.push(v.id);
    }
  }

  const entries = Array.from(byUrl.values());
  for (const e of entries) {
    e.visitIds.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }
  entries.sort(
    (a, b) => b.lastSeen - a.lastSeen || (a.url < b.url ? -1 : a.url > b.url ? 1 : 0),
  );
  return entries;
}
