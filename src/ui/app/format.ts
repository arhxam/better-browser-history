// Small presentational helpers for the UI. Not part of the deterministic core,
// but kept pure and dependency-free.

export function relativeTime(ts: number, now = Date.now()): string {
  const diff = now - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function clockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export function dayLabel(ts: number, now = Date.now()): string {
  const d = dayKey(ts);
  if (d === dayKey(now)) return 'Today';
  if (d === dayKey(now - 86400000)) return 'Yesterday';
  return new Date(ts).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

export function hostInitial(host: string): string {
  const clean = host.replace(/^www\./, '');
  return (clean[0] || '?').toUpperCase();
}

// Monochrome: subtle neutral grays so avatars vary gently without adding color.
const PALETTE = ['#f4f4f5', '#eeeeef', '#e9e9ec', '#ededf0', '#ebeaec', '#e9eaeb', '#eeecec', '#e7e7ea'];

/** Deterministic neutral shade from a host string. */
export function hostColor(host: string): string {
  let h = 0;
  for (let i = 0; i < host.length; i++) h = (h * 31 + host.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function prettyUrl(url: string): string {
  try {
    const u = new URL(url);
    return (u.hostname + u.pathname + u.search).replace(/\/$/, '');
  } catch {
    return url;
  }
}
