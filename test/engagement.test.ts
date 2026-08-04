import { describe, it, expect } from 'vitest';
import { computeEngagement, mergeEngagement, formatDuration } from '../src/core/engagement';
import type { EngagementEvent } from '../src/core/types';

const S = 1000;

describe('engagement', () => {
  it('accrues active time between focus and blur', () => {
    const events: EngagementEvent[] = [
      { type: 'focus', timestamp: 0 },
      { type: 'blur', timestamp: 10 * S },
    ];
    expect(computeEngagement('v1', events).activeMs).toBe(10 * S);
  });

  it('does not count time while blurred or idle', () => {
    const events: EngagementEvent[] = [
      { type: 'focus', timestamp: 0 },
      { type: 'blur', timestamp: 5 * S },
      { type: 'focus', timestamp: 20 * S },
      { type: 'blur', timestamp: 25 * S },
    ];
    expect(computeEngagement('v1', events).activeMs).toBe(10 * S);
  });

  it('bounds active time to the last heartbeat when close event is lost', () => {
    const events: EngagementEvent[] = [
      { type: 'focus', timestamp: 0 },
      { type: 'heartbeat', timestamp: 8 * S },
      // tab crashed: no blur/unload
    ];
    expect(computeEngagement('v1', events).activeMs).toBe(8 * S);
  });

  it('tracks max scroll depth capped at 1', () => {
    const events: EngagementEvent[] = [
      { type: 'focus', timestamp: 0 },
      { type: 'heartbeat', timestamp: 2 * S, scrollDepth: 0.4 },
      { type: 'heartbeat', timestamp: 4 * S, scrollDepth: 0.9 },
      { type: 'heartbeat', timestamp: 6 * S, scrollDepth: 0.5 },
      { type: 'unload', timestamp: 7 * S, scrollDepth: 2 },
    ];
    expect(computeEngagement('v1', events).scrollDepth).toBe(1);
  });

  it('sorts unordered events before computing', () => {
    const events: EngagementEvent[] = [
      { type: 'blur', timestamp: 10 * S },
      { type: 'focus', timestamp: 0 },
    ];
    expect(computeEngagement('v1', events).activeMs).toBe(10 * S);
  });

  it('is deterministic', () => {
    const events: EngagementEvent[] = [
      { type: 'focus', timestamp: 0 },
      { type: 'heartbeat', timestamp: 3 * S, scrollDepth: 0.3 },
      { type: 'blur', timestamp: 9 * S },
    ];
    expect(computeEngagement('v1', events)).toEqual(computeEngagement('v1', events));
  });

  it('mergeEngagement sums time and maxes scroll', () => {
    const merged = mergeEngagement(
      { visitId: 'v1', activeMs: 4000, scrollDepth: 0.3 },
      { visitId: 'v1', activeMs: 6000, scrollDepth: 0.8 },
    );
    expect(merged).toEqual({ visitId: 'v1', activeMs: 10000, scrollDepth: 0.8 });
  });

  it('formatDuration renders human-friendly strings', () => {
    expect(formatDuration(45 * S)).toBe('45s');
    expect(formatDuration(95 * S)).toBe('1m 35s');
    expect(formatDuration(3600 * S)).toBe('1h');
    expect(formatDuration(3660 * S)).toBe('1h 1m');
  });
});
