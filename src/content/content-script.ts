// Content script (isolated world, injected on <all_urls>). It:
//   1. extracts the page's visible text + metadata for full-text search
//   2. tracks real engagement — active foreground time and scroll depth —
//      reporting it to the service worker as deterministic event streams.
import type { ContentMessage, EngagementEvent } from '../shared/messages';

const MAX_CONTENT = 20000;
const HEARTBEAT_MS = 15000;

function send(msg: ContentMessage): void {
  try {
    chrome.runtime.sendMessage(msg).catch(() => {});
  } catch {
    /* extension context may be gone during unload */
  }
}

function extractContent(): void {
  const title = document.title || '';
  const desc =
    document.querySelector('meta[name="description"]')?.getAttribute('content') ||
    document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    undefined;
  // innerText gives roughly what the user can see (respects display:none).
  const content = (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, MAX_CONTENT);
  send({ type: 'PAGE_CONTENT', url: location.href, title, content, description: desc ?? undefined });
}

function scrollDepth(): number {
  const doc = document.documentElement;
  const total = Math.max(doc.scrollHeight, document.body?.scrollHeight ?? 0);
  if (total <= 0) return 0;
  return Math.min(1, (window.scrollY + window.innerHeight) / total);
}

const buffer: EngagementEvent[] = [];
function push(type: EngagementEvent['type']): void {
  buffer.push({ type, timestamp: Date.now(), scrollDepth: scrollDepth() });
}
function flush(): void {
  if (buffer.length === 0) return;
  send({ type: 'ENGAGEMENT', url: location.href, events: buffer.splice(0, buffer.length) });
}

function isForeground(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus();
}

// Lifecycle wiring.
push(isForeground() ? 'focus' : 'blur');

document.addEventListener('visibilitychange', () => {
  push(document.visibilityState === 'visible' ? 'focus' : 'blur');
  flush();
});
window.addEventListener('focus', () => {
  push('focus');
});
window.addEventListener('blur', () => {
  push('blur');
  flush();
});

setInterval(() => {
  if (isForeground()) {
    push('heartbeat');
    flush();
  }
}, HEARTBEAT_MS);

window.addEventListener('pagehide', () => {
  push('unload');
  flush();
});

// Extract content once the DOM is ready enough.
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  extractContent();
} else {
  window.addEventListener('DOMContentLoaded', extractContent, { once: true });
}
