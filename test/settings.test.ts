import { describe, expect, it } from 'vitest';
import {
  CURRENT_PRIVACY_CONSENT_VERSION,
  DEFAULT_SETTINGS,
  canCapture,
  isExcludedUrl,
  normalizeSettings,
} from '../src/settings/settings';

describe('extension settings', () => {
  it('uses safe defaults when no stored value exists', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.captureEnabled).toBe(false);
    expect(DEFAULT_SETTINGS.privacyConsentVersion).toBe(0);
    expect(canCapture(DEFAULT_SETTINGS)).toBe(false);
  });

  it('normalizes malformed values and removes duplicate exclusions', () => {
    expect(normalizeSettings({
      captureEnabled: false,
      indexPageContent: 'yes',
      trackEngagement: false,
      privacyConsentVersion: -4,
      excludedHosts: [' Example.com ', '*.example.com', '', 42, 'news.test:443'],
      defaultRangeDays: 999,
      defaultView: 'unknown',
      retentionDays: 30,
    })).toEqual({
      captureEnabled: false,
      indexPageContent: true,
      trackEngagement: false,
      privacyConsentVersion: 0,
      excludedHosts: ['example.com', 'news.test'],
      defaultRangeDays: 0,
      defaultView: 'history',
      retentionDays: 30,
    });
  });

  it('requires current affirmative consent before capture', () => {
    const unconsented = normalizeSettings({ captureEnabled: true, privacyConsentVersion: 0 });
    const consented = normalizeSettings({
      captureEnabled: true,
      privacyConsentVersion: CURRENT_PRIVACY_CONSENT_VERSION,
    });
    expect(canCapture(unconsented)).toBe(false);
    expect(canCapture(consented)).toBe(true);
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
