# History Override and Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Better Browser History from New Tab to the browser History page and add locally persisted capture, privacy, display, retention, import, export, and reset settings.

**Architecture:** Keep one shared React dashboard and expose it as `history.html`; enforce the manifest behavior in the validator. Store a normalized settings object in the IndexedDB meta table, apply capture/privacy controls in the service worker through testable pure helpers, and apply display defaults when the dashboard starts.

**Tech Stack:** Manifest V3, TypeScript, React 18, Dexie/IndexedDB, Vitest, Vite, esbuild.

---

### Task 1: Lock the browser override contract

**Files:**
- Modify: `scripts/validate-manifest.mjs`
- Modify: `scripts/manifest.mjs`
- Modify: `scripts/build-extension.mjs`
- Create: `src/ui/history.html`
- Create: `src/ui/app/entry-history.tsx`
- Delete: `src/ui/newtab.html`
- Delete: `src/ui/app/entry-newtab.tsx`

- [ ] Change the validator first to require `chrome_url_overrides.history`, reject `chrome_url_overrides.newtab`, and verify the history HTML exists.
- [ ] Run `npm run validate` against the current build and confirm it fails because only `newtab` exists.
- [ ] Change the manifest and build input from `newtab` to `history`, add the history entry files, and remove the New Tab entry files.
- [ ] Run `npm run build && npm run validate` and confirm the override contract passes.

### Task 2: Add a typed local settings model

**Files:**
- Create: `src/settings/settings.ts`
- Create: `test/settings.test.ts`
- Modify: `src/db/repository.ts`

- [ ] Write failing tests for default settings, malformed-value normalization, exact/subdomain exclusions, and non-matching sibling hosts.
- [ ] Run `npm test -- test/settings.test.ts` and confirm failure due to the missing module.
- [ ] Implement `ExtensionSettings`, `DEFAULT_SETTINGS`, `normalizeSettings`, `isExcludedUrl`, `getSettings`, and `setSettings` using the existing `meta` table.
- [ ] Re-run the focused test and confirm it passes.

### Task 3: Enforce capture and privacy settings

**Files:**
- Modify: `src/background/capture.ts`
- Modify: `src/background/service-worker.ts`
- Modify: `test/pipeline.test.ts`

- [ ] Write failing pipeline tests proving capture-disabled and excluded-host navigations return `null` and create no visits.
- [ ] Run the focused pipeline tests and confirm the new assertions fail.
- [ ] Add an optional settings argument to the chrome-free capture functions and enforce capture, content, engagement, and exclusions before writes.
- [ ] Read current settings in the service worker and pass them into each pipeline operation.
- [ ] Re-run the focused tests and confirm they pass.

### Task 4: Add import and complete data management

**Files:**
- Modify: `src/db/repository.ts`
- Create: `test/import.test.ts`

- [ ] Write failing tests for rejecting invalid bundles and merging a valid export bundle without clearing existing records.
- [ ] Run the focused test and confirm failure due to the missing import API.
- [ ] Add runtime bundle validation and a transactional `importAll` merge.
- [ ] Re-run the focused test and confirm it passes.

### Task 5: Expand and connect the Settings UI

**Files:**
- Modify: `src/ui/app/Options.tsx`
- Modify: `src/ui/app/styles.css`
- Modify: `src/ui/app/App.tsx`
- Modify: `src/ui/app/useHistory.ts`

- [ ] Load normalized settings alongside storage stats and render Capture, Privacy, Display, Retention, and Data panels.
- [ ] Persist toggles, selects, and excluded hosts with clear success/error feedback.
- [ ] Add file-based JSON import and refresh storage counts after importing.
- [ ] Initialize the dashboard view and time filter from display settings without changing interactive navigation.
- [ ] Run typecheck and lint, then correct all errors before continuing.

### Task 6: Documentation, packaging, and live Brave reload

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `package.json`

- [ ] Update documentation to say `brave://history`/`chrome://history`, remove New Tab instructions, document settings, and bump the version.
- [ ] Run `npm run typecheck && npm run lint && npm test && npm run determinism && npm run build && npm run validate` and require exit code 0.
- [ ] Inspect `dist/manifest.json` and confirm it contains only the History override.
- [ ] Reload the unpacked extension from the existing `dist` directory in Brave, then verify New Tab and History behavior.
- [ ] Package the finalized build and report the exact unpacked folder path.
