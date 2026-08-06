import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  isExcludedUrl,
  normalizeSettings,
} from '../src/settings/settings';

describe('extension settings', () => {
  it('uses safe defaults when no stored value exists', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('normalizes malformed values and removes duplicate exclusions', () => {
    expect(normalizeSettings({
      captureEnabled: false,
      indexPageContent: 'yes',
      trackEngagement: false,
      excludedHosts: [' Example.com ', '*.example.com', '', 42, 'news.test:443'],
      defaultRangeDays: 999,
      defaultView: 'unknown',
      retentionDays: 30,
    })).toEqual({
      captureEnabled: false,
      indexPageContent: true,
      trackEngagement: false,
      excludedHosts: ['example.com', 'news.test'],
      defaultRangeDays: 0,
      defaultView: 'history',
      retentionDays: 30,
    });
  });

  it('excludes an exact hostname and all of its subdomains', () => {
    const settings = normalizeSettings({ excludedHosts: ['example.com'] });
    expect(isExcludedUrl('https://example.com/page', settings)).toBe(true);
    expect(isExcludedUrl('https://docs.example.com/page', settings)).toBe(true);
  });

  it('does not exclude sibling or lookalike hostnames', () => {
    const settings = normalizeSettings({ excludedHosts: ['example.com'] });
    expect(isExcludedUrl('https://example.org/page', settings)).toBe(false);
    expect(isExcludedUrl('https://notexample.com/page', settings)).toBe(false);
    expect(isExcludedUrl('chrome://history', settings)).toBe(false);
  });
});
