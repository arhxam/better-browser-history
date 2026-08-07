// Content script (isolated world, injected on <all_urls>). It:
//   1. extracts the page's visible text + metadata for full-text search
//   2. tracks real engagement — active foreground time and scroll depth —
//      reporting it to the service worker as deterministic event streams.
import type {
  CaptureStateResponse,
  ContentMessage,
  EngagementEvent,
} from '../shared/messages';
import { createCaptureController } from './capture-controller';

const MAX_CONTENT = 20000;
const HEARTBEAT_MS = 15000;

function send(msg: ContentMessage): void {
  try {
    chrome.runtime.sendMessage(msg).catch(() => {});
  } catch {
    /* extension context may be gone during unload */
  }
}

function scrollDepth(): number {
  const doc = document.documentElement;
  const total = Math.max(doc.scrollHeight, document.body?.scrollHeight ?? 0);
  if (total <= 0) return 0;
  return Math.min(1, (window.scrollY + window.innerHeight) / total);
}

function isForeground(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus();
}

function startCapture(): () => void {
  const buffer: EngagementEvent[] = [];
  let stopped = false;

  function push(type: EngagementEvent['type']): void {
    if (!stopped) buffer.push({ type, timestamp: Date.now(), scrollDepth: scrollDepth() });
  }

  function flush(): void {
    if (stopped || buffer.length === 0) return;
    send({ type: 'ENGAGEMENT', url: location.href, events: buffer.splice(0, buffer.length) });
  }

  function extractContent(): void {
    if (stopped) return;
    const title = document.title || '';
    const desc =
      document.querySelector('meta[name="description"]')?.getAttribute('content') ||
      document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      undefined;
    const content = (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, MAX_CONTENT);
    send({ type: 'PAGE_CONTENT', url: location.href, title, content, description: desc ?? undefined });
  }

  const onVisibility = () => {
    push(document.visibilityState === 'visible' ? 'focus' : 'blur');
    flush();
  };
  const onFocus = () => push('focus');
  const onBlur = () => {
    push('blur');
    flush();
  };
  const onPageHide = () => {
    push('unload');
    flush();
  };

  push(isForeground() ? 'focus' : 'blur');
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', onFocus);
  window.addEventListener('blur', onBlur);
  window.addEventListener('pagehide', onPageHide);

  const heartbeat = window.setInterval(() => {
    if (isForeground()) {
      push('heartbeat');
      flush();
    }
  }, HEARTBEAT_MS);

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    extractContent();
  } else {
    window.addEventListener('DOMContentLoaded', extractContent, { once: true });
  }

  return () => {
    stopped = true;
    buffer.length = 0;
    window.clearInterval(heartbeat);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('DOMContentLoaded', extractContent);
  };
}

const controller = createCaptureController(startCapture);
chrome.runtime.onMessage.addListener((message: ContentMessage) => {
  if (message.type === 'CAPTURE_STATE') controller.update(message.enabled);
  return false;
});

void chrome.runtime.sendMessage({ type: 'GET_CAPTURE_STATE' } satisfies ContentMessage)
  .then((response: CaptureStateResponse | undefined) => controller.update(response?.enabled === true))
  .catch(() => controller.update(false));
