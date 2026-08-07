import { describe, expect, it } from 'vitest';
// The build tooling is JavaScript so it can run directly under Node.
// @ts-expect-error JavaScript build helper intentionally has no declaration file.
import { getManifestSafetyErrors } from '../scripts/manifest-safety.mjs';

type TestManifest = {
  manifest_version: number;
  chrome_url_overrides: Record<string, string>;
  chrome_settings_overrides?: Record<string, unknown>;
};

function safeManifest(): TestManifest {
  return {
    manifest_version: 3,
    chrome_url_overrides: { history: 'history.html' },
  };
}

describe('manifest takeover safety', () => {
  it('accepts a History-only browser page override', () => {
    expect(getManifestSafetyErrors(safeManifest())).toEqual([]);
  });

  it('rejects a New Tab override', () => {
    const manifest = safeManifest();
    manifest.chrome_url_overrides.newtab = 'newtab.html';

    expect(getManifestSafetyErrors(manifest)).toContain(
      'chrome_url_overrides.newtab must not be set',
    );
  });

  it('rejects homepage and startup-page settings overrides', () => {
    const manifest: TestManifest = {
      ...safeManifest(),
      chrome_settings_overrides: {
        homepage: 'https://example.com',
        startup_pages: ['https://example.com'],
      },
    };

    expect(getManifestSafetyErrors(manifest)).toContain(
      'chrome_settings_overrides must not be set',
    );
  });

  it('rejects every browser page override except History', () => {
    const manifest = safeManifest();
    manifest.chrome_url_overrides.bookmarks = 'bookmarks.html';

    expect(getManifestSafetyErrors(manifest)).toContain(
      'chrome_url_overrides may only contain history',
    );
  });
});
