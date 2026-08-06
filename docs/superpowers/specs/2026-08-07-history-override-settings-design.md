# History Override and Settings Design

## Outcome

Better Browser History must stop replacing Brave or Chrome's New Tab page. It will instead replace the browser's built-in History page, so opening `brave://history` or `chrome://history` shows the existing full Better History dashboard. New tabs remain entirely browser-owned.

The Settings page will grow from data-management-only controls into a practical control center for capture, privacy, display, retention, and data portability. All settings remain local to the extension.

## Browser Integration

The manifest will use the single supported `chrome_url_overrides.history` entry pointing to `history.html`. It will not declare `newtab`. The existing dashboard remains available from the toolbar popup and extension context menu. The redundant New Tab HTML and entry point will be removed from the production build.

The manifest validator will treat “History override exists” and “New Tab override does not exist” as required invariants. This prevents the original behavior from returning in a later build.

## Settings

Settings are represented by a typed `ExtensionSettings` object stored in the existing IndexedDB `meta` table. Missing or malformed values resolve to safe defaults, allowing existing installations to upgrade without a schema migration.

The options page provides:

- Capture: enable/disable visit capture, page-content indexing, and engagement tracking.
- Privacy: exclude a newline-separated list of hostnames. A hostname excludes itself and its subdomains.
- Display: default dashboard time range (all time, 24 hours, 7 days, or 30 days) and default landing view (History, Sessions, Journeys, or Analytics).
- Retention: keep everything or prune after 30, 90, 180, or 365 days.
- Data: export a complete JSON bundle, import a compatible bundle, and clear all locally stored history with confirmation.

Capture settings are enforced in the service worker before visits, content, or engagement are written. Exclusion matching is handled by a pure utility so it can be tested without Chrome APIs. Display defaults are read when the dashboard initializes and affect only the initial view/filter; users can still navigate and filter freely during a session.

## Data Flow and Failure Handling

The options page reads defaults immediately, persists each deliberate change, and shows a concise success/error status. Import validates the JSON shape before writing and merges records by their existing primary keys. Invalid files produce an error and do not mutate the database.

The capture worker reads the latest settings for each incoming event. This favors correctness after a settings change over caching complexity. If settings cannot be read, safe defaults preserve capture. Browser-internal and extension URLs remain ignored.

## UI

The existing monochrome, minimal-outline design remains. Settings are grouped into short panels with native-accessible controls, clear descriptions, and no emoji. Destructive controls remain visually separated and require confirmation.

## Verification

- A manifest regression check must fail against a New Tab override and pass only for a History override.
- Unit tests cover defaults, normalization, excluded-host matching, and import validation/merge behavior.
- Capture pipeline tests prove disabled capture and excluded hosts are not recorded.
- Fresh typecheck, lint, unit tests, deterministic-core check, production build, and manifest validation must pass.
- The rebuilt unpacked extension must be reloaded in Brave; opening a New Tab must show Brave's normal page, while `brave://history` must show Better Browser History.
