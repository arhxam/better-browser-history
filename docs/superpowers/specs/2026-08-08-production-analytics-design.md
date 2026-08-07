# Production Analytics Design

## Goal

Turn the existing Analytics screen into a trustworthy local browsing-intelligence
dashboard, centered on the percentage of active browsing time spent by site and
category, while hardening the extension's reliability, accessibility, privacy,
and release workflow.

## Product principles

1. **Active time, not tab-open time.** Percentages use the foreground, non-idle
   engagement already captured by the content script. Background tabs never
   inflate the result.
2. **Honest coverage.** The UI always reports how many filtered visits contain
   engagement measurements. Internal browser pages and older/imported visits may
   have no active-time record.
3. **Local and deterministic.** Analytics are derived from IndexedDB on demand.
   No telemetry, accounts, network services, machine learning, or stored derived
   aggregates are introduced.
4. **Filters apply everywhere.** Existing date, host, tag, and starred filters
   scope every card and chart in the Analytics screen.
5. **No New Tab ownership.** History remains the only browser-page override.

## Analytics model

The repository joins each filtered visit with its optional `Engagement` row and
passes pure `ActivityVisit` records to deterministic analytics functions.

An activity record contains:

- the visit;
- `activeMs`, defaulting to zero when no engagement row exists;
- `scrollDepth`, defaulting to zero;
- whether engagement was actually measured, kept separate from the numeric zero.

The analytics bundle contains:

- existing visit totals, unique pages, and unique sites;
- total active time;
- average active time per measured visit;
- measured-visit count and coverage percentage;
- site time shares with active time, percentage, and visit count;
- category time shares with active time, percentage, and visit count;
- active time and visit count per local calendar day;
- a 7-by-24 local-time activity matrix;
- top pages by active time;
- session count, average session span, longest session span, average pages per
  session, and domain-switch count;
- existing visit-count site/category charts for comparison.

Time-share percentages use total measured active milliseconds as the denominator.
Zero-time rows do not appear in time-share rankings. Empty input and zero measured
time return empty share lists and zeroed summary values, never `NaN` or `Infinity`.
Ties sort deterministically by key.

## Analytics interface

The Analytics view is organized in this order:

1. **Summary cards:** active time, measured coverage, average active time, and
   session count.
2. **Time allocation:** a category donut and a site percentage bar list. Each
   entry shows both a percentage and a formatted duration.
3. **Activity patterns:** a daily active-time trend and a weekday/hour heatmap.
4. **Focused pages:** a ranked table of pages by active time with site, visits,
   duration, and share.
5. **Session behavior:** average/longest span, pages per session, and domain
   switches.
6. **Visit context:** the existing visit-by-hour, top-sites-by-visits, category
   counts, and visits-per-day views remain available below the time analytics.

Every chart has a textual title, accessible description, usable high-contrast
labels, visible values that do not depend on color, and an empty state. Layouts
collapse to one column on narrow windows. Long host/page names truncate visually
but remain available through titles and accessible labels.

## Reliability and production hardening

### Loading and errors

`useHistory` exposes an error message and uses a request generation guard so an
older async reload cannot overwrite newer filter results. All reload paths clear
loading state in `finally`. The dashboard renders a retryable error panel instead
of remaining stuck on “Loading history…”.

### Legacy New Tab recovery

The automatic recovery loop is removed. The compatibility `newtab.html` remains
only as a static explanation for obsolete installations; it never calls
`runtime.reload`, creates tabs, removes tabs, or runs background recovery code.
Fresh installs do not register this page in the manifest.

### Least privilege

Unused `history`, `storage`, `scripting`, and `favicon` permissions are removed.
The build validator asserts the exact approved permission set and continues to
reject New Tab, Bookmarks, homepage, search-provider, and startup-page overrides.

### Data safety

Exports remain versioned JSON and destructive clearing keeps its confirmation.
Analytics add no schema migration because they remain derived. Release notes warn
that uninstalling an unpacked extension deletes its local IndexedDB unless the
user exports first.

## Testing

Pure tests cover:

- active-time shares and exact percentages;
- deterministic tie ordering;
- zero-time and empty inputs;
- local-time daily and weekday/hour bucketing;
- measured coverage versus measured zero time;
- top-page ranking;
- session metrics and domain switches.

Repository integration tests prove engagement rows join to filtered visits and
that filters scope the entire analytics bundle. Existing analytics, capture,
settings, import/export, manifest-safety, determinism, typecheck, lint, and build
tests remain required.

The finished production build is manually exercised in demo mode at desktop and
narrow widths, checked for console errors, packaged, published through CI, synced
to the permanent Desktop repository, and reloaded from that repository's `dist`.

## Release

This is version `1.2.0`. GitHub `master`, the tagged release package, the Desktop
`master` checkout, and `/Users/ab/Desktop/better-browser-history/dist` must all
resolve to the same release source and manifest.
