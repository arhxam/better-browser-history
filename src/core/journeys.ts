// Deterministic journeys: reconstruct navigation trees within each session from
// explicit referrer links and tab-opener relationships. No heuristics beyond
// these concrete signals, so the same visits always yield the same trees.
import type { Visit, Journey, JourneyNode } from './types';
import { sortVisits } from './sessionizer';

/**
 * Resolve each visit's parent:
 *   1. its referringVisitId, if that visit is in the same session; else
 *   2. the most recent earlier visit in the tab that opened this visit's tab
 *      (openerTabId); else
 *   3. none — it is a journey root.
 */
function buildSessionTree(visits: Visit[]): JourneyNode[] {
  const sorted = sortVisits(visits);
  const byId = new Map(sorted.map((v) => [v.id, v]));
  const nodes = new Map<string, JourneyNode>(
    sorted.map((v) => [v.id, { visitId: v.id, children: [] }]),
  );
  const roots: JourneyNode[] = [];

  for (const v of sorted) {
    let parentId: string | undefined;

    if (v.referringVisitId && byId.has(v.referringVisitId)) {
      parentId = v.referringVisitId;
    } else if (v.openerTabId != null) {
      // Latest earlier visit that occurred in the opener tab.
      let best: Visit | undefined;
      for (const cand of sorted) {
        if (cand.tabId === v.openerTabId && cand.timestamp <= v.timestamp && cand.id !== v.id) {
          if (!best || cand.timestamp > best.timestamp) best = cand;
        }
      }
      if (best) parentId = best.id;
    }

    if (parentId && parentId !== v.id) {
      nodes.get(parentId)!.children.push(nodes.get(v.id)!);
    } else {
      roots.push(nodes.get(v.id)!);
    }
  }

  return roots;
}

/** Group visits by sessionId and build a journey tree per session. */
export function buildJourneys(visits: Visit[]): Journey[] {
  const bySession = new Map<string, Visit[]>();
  for (const v of visits) {
    const sid = v.sessionId ?? 'default';
    if (!bySession.has(sid)) bySession.set(sid, []);
    bySession.get(sid)!.push(v);
  }

  const sessionIds = Array.from(bySession.keys()).sort();
  return sessionIds.map((sid) => ({
    sessionId: sid,
    roots: buildSessionTree(bySession.get(sid)!),
  }));
}
