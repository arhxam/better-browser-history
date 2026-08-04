// Deterministic sessionization: a session is a run of visits with no gap
// larger than `gapMs`. Given the same visits and threshold, always the same
// assignment. Session id = the timestamp of the session's first visit (stable).
import type { Visit, Session } from './types';

export const DEFAULT_SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes

/** Sort visits chronologically; ties break by id for stability. */
export function sortVisits(visits: Visit[]): Visit[] {
  return [...visits].sort(
    (a, b) => a.timestamp - b.timestamp || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/**
 * Assign a sessionId to each visit and return the visits (new array) plus the
 * derived sessions. Pure — input is not mutated.
 */
export function assignSessions(
  visits: Visit[],
  gapMs: number = DEFAULT_SESSION_GAP_MS,
): { visits: Visit[]; sessions: Session[] } {
  const sorted = sortVisits(visits);
  const outVisits: Visit[] = [];
  const sessions: Session[] = [];

  let current: Session | null = null;
  let lastTs = 0;

  for (const v of sorted) {
    if (!current || v.timestamp - lastTs > gapMs) {
      current = { id: `s_${v.timestamp}`, start: v.timestamp, end: v.timestamp, visitIds: [] };
      sessions.push(current);
    }
    current.visitIds.push(v.id);
    current.end = v.timestamp;
    lastTs = v.timestamp;
    outVisits.push({ ...v, sessionId: current.id });
  }

  return { visits: outVisits, sessions };
}
