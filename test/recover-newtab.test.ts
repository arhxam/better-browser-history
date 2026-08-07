import { describe, expect, it } from 'vitest';
import { recoverLegacyNewTabs } from '../src/background/recover-newtab';

describe('legacy New Tab recovery', () => {
  it('opens a browser-owned New Tab before closing the stale extension tab', async () => {
    const actions: string[] = [];
    const tabs = {
      query: async () => [{ id: 12, active: true, windowId: 3, index: 4 }],
      create: async (options: object) => { actions.push(`create:${JSON.stringify(options)}`); },
      remove: async (id: number) => { actions.push(`remove:${id}`); },
    };

    await recoverLegacyNewTabs(tabs, 'chrome-extension://extension-id/newtab.html');

    expect(actions).toEqual([
      'create:{"active":true,"windowId":3,"index":4}',
      'remove:12',
    ]);
  });

  it('does nothing when no stale recovery tab is open', async () => {
    let changed = false;
    const tabs = {
      query: async () => [],
      create: async () => { changed = true; },
      remove: async () => { changed = true; },
    };

    await recoverLegacyNewTabs(tabs, 'chrome-extension://extension-id/newtab.html');
    expect(changed).toBe(false);
  });
});
