// Capture pipeline — chrome-free so it can be unit-tested by feeding it plain
// event objects. The service worker adapts real chrome.* events into these
// calls. Every write goes through the repository into IndexedDB, independent of
// the browser's native history store (which Brave may not persist).
import {
  recordVisit,
  addEngagement,
  upsertPage,
  getLatestVisitInTab,
} from '../db/repository';
import type { TransitionType, Visit, EngagementEvent, Engagement, Page } from '../core/types';
import {
  DEFAULT_SETTINGS,
  isExcludedUrl,
  type ExtensionSettings,
} from '../settings/settings';

/** Shape mirroring chrome.webNavigation onCommitted/onHistoryStateUpdated. */
export interface NavigationEvent {
  tabId: number;
  url: string;
  timeStamp: number;
  frameId: number;
  transitionType?: string;
  title?: string;
  /** tab that opened this tab, when known (from chrome.tabs). */
  openerTabId?: number;
}

const TRANSITIONS: Record<string, TransitionType> = {
  link: 'link',
  typed: 'typed',
  auto_bookmark: 'auto_bookmark',
  auto_subframe: 'auto_subframe',
  manual_subframe: 'manual_subframe',
  generated: 'generated',
  reload: 'reload',
  keyword: 'keyword',
  keyword_generated: 'keyword',
  form_submit: 'form_submit',
  start_page: 'typed',
};

function mapTransition(t?: string): TransitionType {
  return (t && TRANSITIONS[t]) || 'other';
}

const CHAIN_TRANSITIONS = new Set<TransitionType>(['link', 'form_submit']);

function isRecordableUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function visitId(ev: NavigationEvent): string {
  return `v_${ev.timeStamp}_${ev.tabId}_${ev.frameId}`;
}

/**
 * Record a top-frame navigation as a visit. Same-tab link/form navigations link
 * back to the previous visit in the tab, enabling deterministic journeys.
 * Returns the stored visit, or null if the event was ignored.
 */
export async function recordNavigation(
  ev: NavigationEvent,
  settings: ExtensionSettings = DEFAULT_SETTINGS,
): Promise<Visit | null> {
  if (ev.frameId !== 0) return null; // top frame only
  if (!isRecordableUrl(ev.url)) return null;
  if (!settings.captureEnabled || isExcludedUrl(ev.url, settings)) return null;

  const transition = mapTransition(ev.transitionType);
  let referringVisitId: string | undefined;
  if (CHAIN_TRANSITIONS.has(transition)) {
    const prev = await getLatestVisitInTab(ev.tabId);
    if (prev && prev.timestamp <= ev.timeStamp) referringVisitId = prev.id;
  }

  return recordVisit({
    id: visitId(ev),
    url: ev.url,
    title: ev.title,
    transition,
    tabId: ev.tabId,
    openerTabId: ev.openerTabId,
    referringVisitId,
    timestamp: ev.timeStamp,
  });
}

/** Store extracted page content for full-text search. */
export async function recordPageContent(input: {
  url: string;
  title: string;
  content: string;
  description?: string;
  capturedAt: number;
}, settings: ExtensionSettings = DEFAULT_SETTINGS): Promise<Page | null> {
  if (!settings.captureEnabled || !settings.indexPageContent || isExcludedUrl(input.url, settings)) {
    return null;
  }
  return upsertPage(input);
}

/**
 * Attribute engagement events to the most recent visit in the tab (the page the
 * user is currently on). Returns the merged aggregate, or null if no visit.
 */
export async function recordEngagement(
  tabId: number,
  events: EngagementEvent[],
  settings: ExtensionSettings = DEFAULT_SETTINGS,
  url?: string,
): Promise<Engagement | null> {
  if (!settings.captureEnabled || !settings.trackEngagement) return null;
  if (url && isExcludedUrl(url, settings)) return null;
  const visit = await getLatestVisitInTab(tabId);
  if (!visit) return null;
  return addEngagement(visit.id, events);
}
