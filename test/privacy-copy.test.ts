import { describe, expect, it } from 'vitest';
import {
  CONSENT_BUTTON_LABEL,
  PRIVACY_DISCLOSURE,
} from '../src/ui/app/privacy-copy';

describe('prominent privacy disclosure', () => {
  it('names every locally handled browsing-data class and its purpose', () => {
    expect(PRIVACY_DISCLOSURE).toContain('URLs, page titles and visit times');
    expect(PRIVACY_DISCLOSURE).toContain('visible page text');
    expect(PRIVACY_DISCLOSURE).toContain('active time and scroll depth');
    expect(PRIVACY_DISCLOSURE).toContain('search and browsing analytics');
  });

  it('states local-only handling and user controls', () => {
    expect(PRIVACY_DISCLOSURE).toContain('stays on this device');
    expect(PRIVACY_DISCLOSURE).toContain('never sold or shared');
    expect(PRIVACY_DISCLOSURE).toContain('exclude sites');
    expect(PRIVACY_DISCLOSURE).toContain('export or erase');
    expect(CONSENT_BUTTON_LABEL).toBe('I understand — enable private history');
  });
});
