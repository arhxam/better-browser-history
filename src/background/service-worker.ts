// MV3 service worker: adapts real chrome.* events into the chrome-free capture
// pipeline. All history is written to our own IndexedDB store, so it survives
// even when the browser keeps no native history (e.g. Brave clearing on exit).
//
// Extension pages (dashboard/popup/history) read the same IndexedDB directly —
// they share the extension origin — so there is no query bridge here.
import {
  recordNavigation,
  recordPageContent,
  recordEngagement,
  type NavigationEvent,
} from './capture';
import { getDB } from '../db/schema';
import { getSettings, pruneBefore, setSettings } from '../db/repository';
import type { ContentMessage } from '../shared/messages';
import {
  CURRENT_PRIVACY_CONSENT_VERSION,
  canCapture,
} from '../settings/settings';

const IDLE_SECONDS = 60;
const PRUNE_ALARM = 'bbh-prune';

let activeTabId: number | undefined;

async function getOpenerTabId(tabId: number): Promise<number | undefined> {
  try {
    const tab = await chrome.tabs.get(tabId);
    return tab.openerTabId;
  } catch {
    return undefined;
  }
}

async function handleNavigation(details: chrome.webNavigation.WebNavigationTransitionCallbackDetails) {
  if (details.frameId !== 0) return;
  const settings = await getSettings();
  if (!canCapture(settings)) return;
  let title: string | undefined;
  try {
    title = (await chrome.tabs.get(details.tabId)).title;
  } catch {
    /* tab may be gone */
  }
  const ev: NavigationEvent = {
    tabId: details.tabId,
    url: details.url,
    timeStamp: Math.round(details.timeStamp),
    frameId: details.frameId,
    transitionType: details.transitionType,
    title,
    openerTabId: await getOpenerTabId(details.tabId),
  };
  await recordNavigation(ev, settings);
}

chrome.webNavigation.onCommitted.addListener((d) => void handleNavigation(d));
chrome.webNavigation.onHistoryStateUpdated.addListener((d) => void handleNavigation(d));

// Content script messages (writes only).
async function broadcastCaptureState(): Promise<void> {
  const enabled = canCapture(await getSettings());
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map(async (tab) => {
    if (tab.id == null || !/^https?:\/\//i.test(tab.url ?? '')) return;
    await chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_STATE', enabled } satisfies ContentMessage)
      .catch(() => undefined);
  }));
}

chrome.runtime.onMessage.addListener((msg: ContentMessage, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  if (msg.type === 'GET_CAPTURE_STATE') {
    void getSettings().then((settings) => sendResponse({ enabled: canCapture(settings) }));
    return true;
  } else if (msg.type === 'SET_CAPTURE_STATE' && sender.id === chrome.runtime.id) {
    void broadcastCaptureState();
  } else if (msg.type === 'PAGE_CONTENT') {
    void getSettings().then((settings) => recordPageContent({
        url: msg.url,
        title: msg.title,
        content: msg.content,
        description: msg.description,
        capturedAt: Date.now(),
      }, settings));
  } else if (msg.type === 'ENGAGEMENT' && tabId != null) {
    void getSettings().then((settings) => recordEngagement(tabId, msg.events, settings, msg.url));
  }
  return false;
});

// Track the active tab so OS-level idle can be attributed correctly.
chrome.tabs.onActivated.addListener((info) => {
  activeTabId = info.tabId;
});
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    activeTabId = tab?.id;
  } catch {
    /* ignore */
  }
});

// OS idle -> mark the active visit idle/active so dwell time excludes AFK time.
chrome.idle.setDetectionInterval(IDLE_SECONDS);
chrome.idle.onStateChanged.addListener((state) => {
  if (activeTabId == null) return;
  const type = state === 'active' ? 'active' : 'idle';
  void getSettings().then(async (settings) => {
    if (!canCapture(settings)) return;
    const tab = await chrome.tabs.get(activeTabId!).catch(() => undefined);
    await recordEngagement(
        activeTabId!,
        [{ type, timestamp: Date.now() }],
        settings,
        tab?.url,
      );
  });
});

// Retention pruning (opt-in; default keeps everything).
chrome.alarms.create(PRUNE_ALARM, { periodInMinutes: 60 * 12 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== PRUNE_ALARM) return;
  const days = (await getSettings()).retentionDays;
  if (days > 0) await pruneBefore(Date.now() - days * 24 * 60 * 60 * 1000);
});

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: 'bbh-open',
    title: 'Open Better Browser History',
    contexts: ['action'],
  });
  // Seed sensible defaults if absent.
  const existing = await getDB().meta.get('settings');
  const settings = await getSettings();
  if (!existing) await setSettings(settings);
  if (settings.privacyConsentVersion < CURRENT_PRIVACY_CONSENT_VERSION) {
    await chrome.runtime.openOptionsPage();
  }
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'bbh-open') {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  }
});
