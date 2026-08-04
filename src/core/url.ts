// Pure URL helpers. `new URL` is deterministic; no clocks or randomness here.

/**
 * Normalize a URL for storage & dedup:
 *  - lowercase host
 *  - drop the fragment (#...)
 *  - strip common tracking query params
 *  - remove a trailing slash on the path (except root)
 * Invalid URLs are returned trimmed, unchanged.
 */
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'mc_cid',
  'mc_eid',
  'ref',
  'ref_src',
  '_ga',
]);

export function normalizeUrl(input: string): string {
  try {
    const u = new URL(input);
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    const keep: [string, string][] = [];
    for (const [k, v] of u.searchParams.entries()) {
      if (!TRACKING_PARAMS.has(k.toLowerCase())) keep.push([k, v]);
    }
    // Rebuild search deterministically in original order (sans tracking).
    u.search = '';
    for (const [k, v] of keep) u.searchParams.append(k, v);
    let out = u.toString();
    // Remove trailing slash on non-root paths with no query.
    if (u.search === '' && u.pathname !== '/' && out.endsWith('/')) {
      out = out.slice(0, -1);
    }
    return out;
  } catch {
    return input.trim();
  }
}

/** Extract a lowercased host, or '' for invalid URLs. */
export function getHost(input: string): string {
  try {
    return new URL(input).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** Registrable-ish domain: last two labels (best-effort, deterministic). */
export function getDomain(input: string): string {
  const host = getHost(input);
  if (!host) return '';
  const parts = host.split('.');
  if (parts.length <= 2) return host;
  return parts.slice(-2).join('.');
}
