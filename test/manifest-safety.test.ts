import { describe, expect, it } from 'vitest';
// The build tooling is JavaScript so it can run directly under Node.
// @ts-expect-error JavaScript build helper intentionally has no declaration file.
import { getManifestSafetyErrors } from '../scripts/manifest-safety.mjs';
// @ts-expect-error JavaScript build helper intentionally has no declaration file.
import { buildManifest } from '../scripts/manifest.mjs';

type TestManifest = {
  manifest_version: number;
  permissions: string[];
  host_permissions: string[];
  chrome_url_overrides: Record<string, string>;
  chrome_settings_overrides?: Record<string, unknown>;
  description?: string;
  web_accessible_resources?: unknown[];
};

function safeManifest(): TestManifest {
  return {
    manifest_version: 3,
    permissions: ['webNavigation', 'unlimitedStorage', 'idle', 'alarms', 'contextMenus'],
    host_permissions: ['http://*/*', 'https://*/*'],
    chrome_url_overrides: { history: 'history.html' },
    description: 'Private browser history search and analytics stored locally on your device.',
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

  it('rejects permissions outside the production allowlist', () => {
    const manifest = safeManifest();
    manifest.permissions.push('history', 'storage', 'scripting', 'favicon');

    expect(getManifestSafetyErrors(manifest)).toContain(
      'permissions must exactly match the production allowlist',
    );
  });

  it('rejects host access outside normal web pages', () => {
    const manifest = safeManifest();
    manifest.host_permissions = ['<all_urls>'];

    expect(getManifestSafetyErrors(manifest)).toContain(
      'host_permissions must be limited to HTTP and HTTPS pages',
    );
  });

  it('rejects unnecessary web-accessible resources and overlong summaries', () => {
    const manifest = safeManifest();
    manifest.web_accessible_resources = [{ resources: ['assets/*'], matches: ['<all_urls>'] }];
    manifest.description = 'x'.repeat(133);
    expect(getManifestSafetyErrors(manifest)).toEqual(expect.arrayContaining([
      'web_accessible_resources must not be set',
      'description must be between 1 and 132 characters',
    ]));
  });

  it('builds the v1.3.0 Chrome Web Store manifest', () => {
    const manifest = buildManifest();
    expect(manifest.name).toBe('Better Browser History');
    expect(manifest.version).toBe('1.3.0');
    expect(manifest.description.length).toBeLessThanOrEqual(132);
    expect(manifest.web_accessible_resources).toBeUndefined();
  });
});
