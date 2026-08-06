import { describe, expect, it } from 'vitest';
import { migrateLegacyNewTab } from '../src/ui/app/newtab-migration';

describe('legacy New Tab migration', () => {
  it('reloads the extension exactly once so the cached override is discarded', () => {
    let reloads = 0;
    migrateLegacyNewTab({ reload: () => { reloads += 1; } });
    expect(reloads).toBe(1);
  });
});
