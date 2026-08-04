// MV3 service worker: adapts real chrome.* events into the chrome-free capture
// pipeline. All history is written to our own IndexedDB store, so it survives
// even when the browser keeps no native history (e.g. Brave clearing on exit).
//
// Extension pages (dashboard/popup/newtab) read the same IndexedDB directly —
// they share the extension origin — so there is no query bridge here.
import {
  recordNavigation,
  recordPageContent,
  recordEngagement,
  type NavigationEvent,
} from './capture';
import { getDB } from '../db/schema';
import { pruneBefore } from '../db/repository';
import type { ContentMessage } from '../shared/messages';

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
  await recordNavigation(ev);
}

chrome.webNavigation.onCommitted.addListener((d) => void handleNavigation(d));
chrome.webNavigation.onHistoryStateUpdated.addListener((d) => void handleNavigation(d));

// Content script messages (writes only).
chrome.runtime.onMessage.addListener((msg: ContentMessage, sender) => {
  const tabId = sender.tab?.id;
  if (msg.type === 'PAGE_CONTENT') {
    void recordPageContent({
      url: msg.url,
      title: msg.title,
      content: msg.content,
      description: msg.description,
      capturedAt: Date.now(),
    });
  } else if (msg.type === 'ENGAGEMENT' && tabId != null) {
    void recordEngagement(tabId, msg.events);
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
  void recordEngagement(activeTabId, [{ type, timestamp: Date.now() }]);
});

// Retention pruning (opt-in; default keeps everything).
chrome.alarms.create(PRUNE_ALARM, { periodInMinutes: 60 * 12 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== PRUNE_ALARM) return;
  const row = await getDB().meta.get('retentionDays');
  const days = typeof row?.value === 'number' ? row.value : 0;
  if (days > 0) await pruneBefore(Date.now() - days * 24 * 60 * 60 * 1000);
});

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: 'bbh-open',
    title: 'Open Better Browser History',
    contexts: ['action'],
  });
  // Seed sensible defaults if absent.
  const existing = await getDB().meta.get('retentionDays');
  if (!existing) await getDB().meta.put({ key: 'retentionDays', value: 0 });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'bbh-open') {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  }
});
