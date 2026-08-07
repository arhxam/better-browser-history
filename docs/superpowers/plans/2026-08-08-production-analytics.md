# Production Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a production-grade v1.2.0 analytics dashboard that reports active-time percentages by site/category, behavioral trends, top pages, and session metrics without weakening local-first privacy.

**Architecture:** Join filtered visits to per-visit engagement rows in the repository, then compute every metric in pure deterministic core functions. Render dependency-free accessible React/CSS charts, add explicit async error handling, remove the broken legacy New Tab auto-recovery loop, and enforce least-privilege manifest rules.

**Tech Stack:** Manifest V3, TypeScript, React 18, Dexie/IndexedDB, Vitest, Vite, esbuild, CSS/SVG.

---

### Task 1: Active-time analytics core

**Files:**
- Modify: `src/core/analytics.ts`
- Modify: `test/analytics.test.ts`

- [ ] **Step 1: Write failing tests for time shares and coverage**

Add fixtures with measured positive time, measured zero time, and missing measurements. Assert that `activityOverview` distinguishes measured coverage from time, and `siteTimeShare` returns `{ key, activeMs, percentage, visits }` sorted by time then key.

```ts
const activities: ActivityVisit[] = [
  { visit: sample[0], activeMs: 60000, scrollDepth: 1, measured: true },
  { visit: sample[1], activeMs: 30000, scrollDepth: .5, measured: true },
  { visit: sample[2], activeMs: 0, scrollDepth: 0, measured: true },
  { visit: sample[3], activeMs: 0, scrollDepth: 0, measured: false },
];
expect(activityOverview(activities)).toMatchObject({
  totalActiveMs: 90000,
  measuredVisits: 3,
  measurementCoverage: 75,
  averageActiveMs: 30000,
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- test/analytics.test.ts`

Expected: FAIL because the activity analytics exports do not exist.

- [ ] **Step 3: Implement the typed activity calculations**

Add these public contracts and functions:

```ts
export interface ActivityVisit {
  visit: Visit;
  activeMs: number;
  scrollDepth: number;
  measured: boolean;
}
export interface TimeShare {
  key: string;
  activeMs: number;
  percentage: number;
  visits: number;
}
export function activityOverview(rows: ActivityVisit[]): ActivityOverview;
export function siteTimeShare(rows: ActivityVisit[], limit?: number): TimeShare[];
export function categoryTimeShare(rows: ActivityVisit[]): TimeShare[];
```

Clamp invalid/negative milliseconds to zero, use measured rows for coverage and averages, omit zero-time share rows, and calculate percentages from total positive active time.

- [ ] **Step 4: Add failing tests for trends, heatmap, pages, and sessions**

Assert local-day active time, a 168-cell weekday/hour matrix, top-page tie ordering, empty inputs, and session behavior including domain switches.

- [ ] **Step 5: Implement the remaining analytics exports**

```ts
export function dailyActivity(rows: ActivityVisit[], tzOffsetMinutes?: number): ActivityTrend[];
export function weeklyActivity(rows: ActivityVisit[], tzOffsetMinutes?: number): number[][];
export function topPagesByTime(rows: ActivityVisit[], limit?: number): PageTime[];
export function sessionBehavior(visits: Visit[]): SessionBehavior;
```

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `npm test -- test/analytics.test.ts`

Expected: all analytics tests pass with no warnings.

### Task 2: Repository activity join

**Files:**
- Modify: `src/db/repository.ts`
- Modify: `test/pipeline.test.ts`

- [ ] **Step 1: Write a failing repository integration test**

Create filtered visits, add engagement to only some visit IDs, call `getAnalytics`, and assert site/category shares, coverage, daily activity, top pages, and session metrics reflect exactly the filtered visits.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- test/pipeline.test.ts`

Expected: FAIL because `AnalyticsBundle` lacks activity metrics.

- [ ] **Step 3: Join engagement in one bulk read**

Inside `getAnalytics`, call `db().engagement.bulkGet(visits.map(v => v.id))`, map rows to `ActivityVisit`, and return the expanded bundle. Do not write derived analytics to IndexedDB.

- [ ] **Step 4: Run pipeline and analytics tests**

Run: `npm test -- test/analytics.test.ts test/pipeline.test.ts`

Expected: both suites pass.

### Task 3: Accessible chart primitives

**Files:**
- Modify: `src/ui/app/charts.tsx`
- Modify: `src/ui/app/styles.css`

- [ ] **Step 1: Add dependency-free chart components**

Implement:

```tsx
<TimeShareBars data={shares} max={10} />
<ShareDonut data={categoryShares} />
<ActivityTrendChart data={dailyActivity} />
<WeekActivityHeatmap bins={weeklyActivity} />
```

Use semantic `figure`/`figcaption`, visible duration and percentage labels, `aria-label` values, and empty states. Use SVG for the donut and CSS grid/bars for the remaining charts.

- [ ] **Step 2: Add responsive and accessibility styling**

Add chart legends, percentage columns, tooltips via `title`, narrow-screen one-column layout, high-contrast fills, tabular numerals, and `@media (prefers-reduced-motion: reduce)` rules.

- [ ] **Step 3: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`

Expected: exit 0.

### Task 4: Production Analytics view

**Files:**
- Modify: `src/ui/app/views.tsx`
- Modify: `src/ui/app/styles.css`

- [ ] **Step 1: Replace the basic Analytics layout**

Render summary cards for total active time, measured coverage, average measured time, and sessions. Render time allocation, daily/weekly patterns, top engaged pages, session behavior, and retain visit-count context charts.

- [ ] **Step 2: Add truthful measurement copy and empty states**

Display: “Active time counts foreground, non-idle engagement on supported web pages. Coverage shows how many filtered visits include a measurement.” When no active time exists, keep visit charts visible and show a clear time-measurement empty state.

- [ ] **Step 3: Add top-pages table**

Use real links with `target="_blank" rel="noreferrer"`, display title/host, active duration, visit count, and percentage, and preserve complete values in accessible labels/titles.

- [ ] **Step 4: Run typecheck, lint, and unit tests**

Run: `npm run typecheck && npm run lint && npm test`

Expected: all checks pass.

### Task 5: Async reliability and retry state

**Files:**
- Modify: `src/ui/app/useHistory.ts`
- Modify: `src/ui/app/App.tsx`
- Modify: `src/ui/app/styles.css`

- [ ] **Step 1: Extend `HistoryState` with errors**

Add `error: string | null`. In `reload`, increment a request generation ref, clear the error, and only commit results when the generation is current. Catch unknown errors into a stable user message and always clear loading in `finally` for the current generation.

- [ ] **Step 2: Render a retryable dashboard error**

When initial loading fails, render an alert with the message and a Retry button calling `reload`. When stale data exists, keep it visible and show a non-blocking alert.

- [ ] **Step 3: Verify static quality gates**

Run: `npm run typecheck && npm run lint`

Expected: exit 0.

### Task 6: New Tab recovery cleanup and least privilege

**Files:**
- Delete: `src/background/recover-newtab.ts`
- Delete: `src/ui/app/newtab-migration.ts`
- Delete: `src/ui/app/entry-newtab-migration.ts`
- Delete: `src/ui/app/newtab-migration.css`
- Delete: `test/recover-newtab.test.ts`
- Delete: `test/newtab-migration.test.ts`
- Modify: `src/background/service-worker.ts`
- Modify: `src/ui/newtab.html`
- Modify: `scripts/manifest.mjs`
- Modify: `scripts/validate-manifest.mjs`
- Modify: `test/manifest-safety.test.ts`

- [ ] **Step 1: Write failing exact-permission assertions**

Assert the built manifest uses only `tabs`, `webNavigation`, `unlimitedStorage`, `idle`, `alarms`, and `contextMenus`, plus `<all_urls>` host access, and still has exactly `{ history: 'history.html' }` as its browser-page override.

- [ ] **Step 2: Run the manifest test and verify RED**

Run: `npm test -- test/manifest-safety.test.ts`

Expected: FAIL because unused permissions remain.

- [ ] **Step 3: Remove unused permissions and automatic recovery**

Remove `history`, `storage`, `scripting`, and `favicon`. Delete runtime reload/tab recovery imports and implementation. Keep `newtab.html` as static recovery instructions with no script and no automatic behavior.

- [ ] **Step 4: Strengthen manifest validation**

Validate the exact permission set and assert `newtab.html` contains no script tag. Build and validate.

Run: `npm run build && npm run validate && npm run doctor`

Expected: all three commands pass and doctor reports History-only override.

### Task 7: Release documentation and visual QA

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `scripts/manifest.mjs`

- [ ] **Step 1: Prepare v1.2.0 documentation**

Document active-time analytics, measurement coverage, charts, local-only behavior, reduced permissions, and the permanent Desktop install path workflow. Remove claims that unused permissions are requested.

- [ ] **Step 2: Build demo mode and inspect desktop width**

Run the Vite development server, open `src/ui/history.html?demo=1`, select Analytics, and verify cards, donut, bars, daily trend, heatmap, tables, and empty/error states have no overlap or console errors.

- [ ] **Step 3: Inspect narrow width**

Resize below 800 pixels and verify one-column chart flow, readable labels, keyboard focus, scrolling, and no horizontal overflow.

- [ ] **Step 4: Correct every visual or console defect and repeat QA**

Re-run the same desktop and narrow checks until there are no known defects.

### Task 8: Verification, review, publication, and permanent install

**Files:**
- Verify all modified files

- [ ] **Step 1: Run the complete local gate**

Run:

```bash
npm run typecheck && npm run lint && npm test && npm run determinism \
  && npm run build && npm run validate && npm run doctor \
  && npm audit --audit-level=high && npm run package
```

Expected: zero failures and zero high/critical audit findings.

- [ ] **Step 2: Review the final diff**

Run `git diff --check`, inspect every changed file, verify no New Tab override or automatic migration script remains, and confirm only intended files are staged.

- [ ] **Step 3: Commit, push, and merge through GitHub CI**

Push `better-browser-history-extension`, open a PR to `master`, wait for CI, and merge only after the build job succeeds.

- [ ] **Step 4: Publish v1.2.0**

Create the GitHub release and attach `better-browser-history-v1.2.0.zip`.

- [ ] **Step 5: Sync the permanent Desktop repository**

Fast-forward `/Users/ab/Desktop/better-browser-history` to `origin/master`, run `npm ci`, rerun the full gate, and rebuild `/Users/ab/Desktop/better-browser-history/dist`.

- [ ] **Step 6: Reload and verify Brave**

Reload the unpacked extension from `/Users/ab/Desktop/better-browser-history/dist`. Confirm version 1.2.0, no New Tab permission, normal Brave New Tab, Better Browser History at `brave://history`, populated analytics, and no extension console errors.
