export type DefaultView = 'history' | 'sessions' | 'journeys' | 'analytics';
export type DefaultRangeDays = 0 | 1 | 7 | 30;
export type RetentionDays = 0 | 30 | 90 | 180 | 365;

export interface ExtensionSettings {
  captureEnabled: boolean;
  privacyConsentVersion: number;
  indexPageContent: boolean;
  trackEngagement: boolean;
  excludedHosts: string[];
  defaultRangeDays: DefaultRangeDays;
  defaultView: DefaultView;
  retentionDays: RetentionDays;
}

export const CURRENT_PRIVACY_CONSENT_VERSION = 1;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  captureEnabled: false,
  privacyConsentVersion: 0,
  indexPageContent: true,
  trackEngagement: true,
  excludedHosts: [],
  defaultRangeDays: 0,
  defaultView: 'history',
  retentionDays: 0,
};

const VIEWS = new Set<DefaultView>(['history', 'sessions', 'journeys', 'analytics']);
const RANGES = new Set<DefaultRangeDays>([0, 1, 7, 30]);
const RETENTIONS = new Set<RetentionDays>([0, 30, 90, 180, 365]);

function normalizeHost(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let candidate = value.trim().toLowerCase().replace(/^\*\./, '').replace(/^\./, '');
  if (!candidate) return null;
  try {
    if (!candidate.includes('://')) candidate = `http://${candidate}`;
    return new URL(candidate).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

export function normalizeSettings(value: unknown): ExtensionSettings {
  const input = value && typeof value === 'object' ? value as Partial<ExtensionSettings> : {};
  const excludedHosts = Array.isArray(input.excludedHosts)
    ? Array.from(new Set(input.excludedHosts.map(normalizeHost).filter((host): host is string => !!host)))
    : [];

  return {
    captureEnabled: typeof input.captureEnabled === 'boolean' ? input.captureEnabled : DEFAULT_SETTINGS.captureEnabled,
    privacyConsentVersion: typeof input.privacyConsentVersion === 'number'
      && Number.isInteger(input.privacyConsentVersion)
      && input.privacyConsentVersion >= 0
      ? input.privacyConsentVersion
      : DEFAULT_SETTINGS.privacyConsentVersion,
    indexPageContent: typeof input.indexPageContent === 'boolean' ? input.indexPageContent : DEFAULT_SETTINGS.indexPageContent,
    trackEngagement: typeof input.trackEngagement === 'boolean' ? input.trackEngagement : DEFAULT_SETTINGS.trackEngagement,
    excludedHosts,
    defaultRangeDays: RANGES.has(input.defaultRangeDays as DefaultRangeDays)
      ? input.defaultRangeDays as DefaultRangeDays
      : DEFAULT_SETTINGS.defaultRangeDays,
    defaultView: VIEWS.has(input.defaultView as DefaultView)
      ? input.defaultView as DefaultView
      : DEFAULT_SETTINGS.defaultView,
    retentionDays: RETENTIONS.has(input.retentionDays as RetentionDays)
      ? input.retentionDays as RetentionDays
      : DEFAULT_SETTINGS.retentionDays,
  };
}

export function canCapture(settings: ExtensionSettings): boolean {
  return settings.captureEnabled
    && settings.privacyConsentVersion >= CURRENT_PRIVACY_CONSENT_VERSION;
}

export function isExcludedUrl(url: string, settings: ExtensionSettings): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return settings.excludedHosts.some((excluded) => host === excluded || host.endsWith(`.${excluded}`));
}
