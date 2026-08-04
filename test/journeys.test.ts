import { describe, it, expect } from 'vitest';
import { buildJourneys } from '../src/core/journeys';
import { visit, T0, MIN } from './helpers';

describe('journeys', () => {
  it('builds a referrer chain within a session', () => {
    const visits = [
      visit({ id: 'a', timestamp: T0, tabId: 1, sessionId: 's1' }),
      visit({ id: 'b', timestamp: T0 + MIN, tabId: 1, sessionId: 's1', referringVisitId: 'a' }),
      visit({ id: 'd', timestamp: T0 + 3 * MIN, tabId: 1, sessionId: 's1', referringVisitId: 'b' }),
    ];
    const [journey] = buildJourneys(visits);
    expect(journey.roots.map((r) => r.visitId)).toEqual(['a']);
    expect(journey.roots[0].children.map((c) => c.visitId)).toEqual(['b']);
    expect(journey.roots[0].children[0].children.map((c) => c.visitId)).toEqual(['d']);
  });

  it('links a tab opened by another tab to the opener visit', () => {
    const visits = [
      visit({ id: 'a', timestamp: T0, tabId: 1, sessionId: 's1' }),
      visit({ id: 'b', timestamp: T0 + MIN, tabId: 1, sessionId: 's1', referringVisitId: 'a' }),
      // opened in a new tab from tab 1 (openerTabId 1) after b
      visit({ id: 'c', timestamp: T0 + 2 * MIN, tabId: 2, openerTabId: 1, sessionId: 's1' }),
    ];
    const [journey] = buildJourneys(visits);
    const b = journey.roots[0].children[0];
    expect(b.children.map((c) => c.visitId)).toEqual(['c']);
  });

  it('treats visits with no resolvable parent as roots', () => {
    const visits = [
      visit({ id: 'a', timestamp: T0, tabId: 1, sessionId: 's1' }),
      visit({ id: 'x', timestamp: T0 + MIN, tabId: 9, sessionId: 's1' }),
    ];
    const [journey] = buildJourneys(visits);
    expect(journey.roots.map((r) => r.visitId).sort()).toEqual(['a', 'x']);
  });

  it('separates journeys by session', () => {
    const visits = [
      visit({ id: 'a', timestamp: T0, tabId: 1, sessionId: 's1' }),
      visit({ id: 'b', timestamp: T0 + 60 * MIN, tabId: 1, sessionId: 's2' }),
    ];
    expect(buildJourneys(visits).length).toBe(2);
  });

  it('is deterministic', () => {
    const visits = [
      visit({ id: 'a', timestamp: T0, tabId: 1, sessionId: 's1' }),
      visit({ id: 'b', timestamp: T0 + MIN, tabId: 1, sessionId: 's1', referringVisitId: 'a' }),
      visit({ id: 'c', timestamp: T0 + 2 * MIN, tabId: 2, openerTabId: 1, sessionId: 's1' }),
    ];
    expect(buildJourneys(visits)).toEqual(buildJourneys(visits));
  });
});
