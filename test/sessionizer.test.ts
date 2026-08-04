import { describe, it, expect } from 'vitest';
import { assignSessions, DEFAULT_SESSION_GAP_MS } from '../src/core/sessionizer';
import { visit, T0, MIN } from './helpers';

describe('sessionizer', () => {
  it('groups visits within the gap into one session', () => {
    const visits = [
      visit({ id: 'a', timestamp: T0 }),
      visit({ id: 'b', timestamp: T0 + 5 * MIN }),
      visit({ id: 'c', timestamp: T0 + 20 * MIN }),
    ];
    const { sessions } = assignSessions(visits);
    expect(sessions.length).toBe(1);
    expect(sessions[0].visitIds).toEqual(['a', 'b', 'c']);
  });

  it('starts a new session after a gap greater than the threshold', () => {
    const visits = [
      visit({ id: 'a', timestamp: T0 }),
      visit({ id: 'b', timestamp: T0 + 31 * MIN }), // > 30min gap
    ];
    const { sessions, visits: out } = assignSessions(visits);
    expect(sessions.length).toBe(2);
    expect(out.find((v) => v.id === 'a')!.sessionId).not.toBe(
      out.find((v) => v.id === 'b')!.sessionId,
    );
  });

  it('does not split exactly at the threshold boundary', () => {
    const visits = [
      visit({ id: 'a', timestamp: T0 }),
      visit({ id: 'b', timestamp: T0 + DEFAULT_SESSION_GAP_MS }), // exactly 30min
    ];
    expect(assignSessions(visits).sessions.length).toBe(1);
  });

  it('sorts out-of-order input before sessionizing', () => {
    const visits = [
      visit({ id: 'c', timestamp: T0 + 10 * MIN }),
      visit({ id: 'a', timestamp: T0 }),
      visit({ id: 'b', timestamp: T0 + 5 * MIN }),
    ];
    expect(assignSessions(visits).sessions[0].visitIds).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const visits = [visit({ id: 'a', timestamp: T0 })];
    assignSessions(visits);
    expect(visits[0].sessionId).toBeUndefined();
  });

  it('is deterministic', () => {
    const visits = [
      visit({ id: 'a', timestamp: T0 }),
      visit({ id: 'b', timestamp: T0 + 40 * MIN }),
      visit({ id: 'c', timestamp: T0 + 45 * MIN }),
    ];
    expect(assignSessions(visits)).toEqual(assignSessions(visits));
  });
});
