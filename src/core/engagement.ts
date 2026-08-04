// Deterministic engagement accounting: turn a stream of foreground/idle events
// into total active milliseconds and max scroll depth for a visit.
//
// Model: time accrues only while the page is "active" (focused and not idle).
// 'focus'/'active' open an active span; 'blur'/'idle'/'unload' close it.
// 'heartbeat' is a checkpoint — it both advances the accrued time and updates
// scroll depth, so a lost close event can never over-count beyond the last
// heartbeat.
import type { EngagementEvent, Engagement } from './types';

export function computeEngagement(visitId: string, events: EngagementEvent[]): Engagement {
  // Stable chronological order (Array.prototype.sort is stable in modern JS).
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  let activeSince: number | null = null;
  let activeMs = 0;
  let scrollDepth = 0;

  for (const e of sorted) {
    if (e.scrollDepth != null && e.scrollDepth > scrollDepth) {
      scrollDepth = Math.min(1, e.scrollDepth);
    }
    switch (e.type) {
      case 'focus':
      case 'active':
        if (activeSince == null) activeSince = e.timestamp;
        break;
      case 'heartbeat':
        if (activeSince != null) {
          activeMs += Math.max(0, e.timestamp - activeSince);
          activeSince = e.timestamp;
        }
        break;
      case 'blur':
      case 'idle':
      case 'unload':
        if (activeSince != null) {
          activeMs += Math.max(0, e.timestamp - activeSince);
          activeSince = null;
        }
        break;
    }
  }

  return { visitId, activeMs, scrollDepth };
}

/** Combine a stored aggregate with a newly computed one (idempotent-ish sum). */
export function mergeEngagement(a: Engagement, b: Engagement): Engagement {
  return {
    visitId: a.visitId,
    activeMs: a.activeMs + b.activeMs,
    scrollDepth: Math.max(a.scrollDepth, b.scrollDepth),
  };
}

/** Human-friendly duration, deterministic. e.g. 95000 -> "1m 35s". */
export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return sec ? `${min}m ${sec}s` : `${min}m`;
  const hr = Math.floor(min / 60);
  const rem = min % 60;
  return rem ? `${hr}h ${rem}m` : `${hr}h`;
}
