# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.3] - 2026-08-07

### Fixed
- Hardened build validation so New Tab, Bookmarks, homepage, search, and startup-page
  takeover fields cannot be shipped; the sole allowed browser-page override is History.
- Added `npm run doctor` to print the exact unpacked build directory, version, and
  takeover-safety status before loading the extension into Brave.
- Documented the data-safe migration from a temporary unpacked folder to a permanent
  repository, including the required extension reload/reinstall behavior.

## [1.1.2] - 2026-08-07

### Fixed
- After discarding a cached legacy New Tab override, automatically replaces the
  already-open recovery tab with a browser-owned New Tab. This prevents the
  one-time recovery screen from being mistaken for a continuing homepage takeover.

## [1.1.1] - 2026-08-07

### Fixed
- Added a one-time recovery page for Brave/Chrome installations that cached the
  removed New Tab override during the v1.1.0 upgrade. The page reloads the
  extension into its History-only manifest, preventing a missing-file screen.
- Kept the recovery page outside `chrome_url_overrides`; Better Browser History
  does not own or modify the browser's normal New Tab page.

## [1.1.0] - 2026-08-07

### Changed
- Replaced the New Tab override with the browser History override. New tabs now
  use the browser's normal page, while `brave://history` and `chrome://history`
  open Better Browser History.
- Expanded Settings with capture toggles, page-content and engagement controls,
  excluded-host privacy rules, default section/time range, and a 30-day retention option.
- JSON exports now include versioned settings and can be safely imported and merged.
- Added manifest and capture-pipeline regression checks for the new browser behavior.

## [1.0.0] - 2026-08-04

### Added
- Local-first history capture for Chromium (Chrome, Brave, Edge) using its own
  IndexedDB store, independent of the browser's native history.
- Deterministic intelligence layer: full-text page-content search (TF-IDF),
  real dwell/engagement time, time-gap sessions, referrer/opener journeys,
  smart dedup with visit counts, tags/notes/stars, and an analytics dashboard.
- Three UI surfaces sharing one store: full-page dashboard, toolbar popup, and
  a New Tab override.
- Settings page for data management: storage overview, retention policy, JSON
  export, and clear-all.
- shadcn-inspired monochrome theme.
- Test suite (Vitest + fake-indexeddb): 61 tests covering the deterministic core
  and a headless capture-to-storage integration pipeline.
- Determinism guard (`scripts/check-determinism.mjs`) enforcing that `src/core`
  stays pure — no network, randomness, or wall-clock reads.
- Continuous integration (GitHub Actions): typecheck, tests, determinism check,
  build, and manifest validation on every push and pull request.

[1.0.0]: https://github.com/arhxam/better-browser-history/releases/tag/v1.0.0
[1.1.0]: https://github.com/arhxam/better-browser-history/compare/v1.0.0...v1.1.0
[1.1.1]: https://github.com/arhxam/better-browser-history/compare/v1.1.0...v1.1.1
[1.1.2]: https://github.com/arhxam/better-browser-history/compare/v1.1.1...v1.1.2
[1.1.3]: https://github.com/arhxam/better-browser-history/compare/v1.1.2...v1.1.3
