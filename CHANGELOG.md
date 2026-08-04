# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
