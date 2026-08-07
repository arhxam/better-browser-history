# Chrome Web Store Production Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a consent-gated, policy-compliant v1.3.0 extension, public product/privacy/support pages, store assets, and a field-complete Chrome Web Store submission dossier.

**Architecture:** Add a versioned consent boundary to settings and enforce it in both the service worker and content script before any browsing data is read or persisted. Keep all user data in extension-owned IndexedDB, remove unnecessary resource exposure, and publish static GitHub Pages plus a reproducible store-submission kit from the same repository.

**Tech Stack:** Manifest V3, TypeScript, React 18, Dexie/IndexedDB, Vitest, Vite, esbuild, static HTML/CSS, GitHub Pages, Chrome Web Store Developer Dashboard.

---

### Task 1: Versioned capture consent

**Files:**
- Modify: `src/settings/settings.ts`
- Modify: `test/settings.test.ts`
- Modify: `test/pipeline.test.ts`

- [ ] **Step 1: Write failing safe-default tests**

Assert that `DEFAULT_SETTINGS.captureEnabled` is false,
`DEFAULT_SETTINGS.privacyConsentVersion` is zero, malformed consent values
normalize to zero, and `canCapture(settings)` requires both capture enabled and
the current consent version.

- [ ] **Step 2: Verify RED**

Run: `npm test -- test/settings.test.ts`

Expected: failure because `privacyConsentVersion`,
`CURRENT_PRIVACY_CONSENT_VERSION`, and `canCapture` do not exist.

- [ ] **Step 3: Implement the consent contract**

Add `privacyConsentVersion: number`, export
`CURRENT_PRIVACY_CONSENT_VERSION = 1`, default capture to false, normalize
non-integer/negative consent to zero, and implement:

```ts
export function canCapture(settings: ExtensionSettings): boolean {
  return settings.captureEnabled
    && settings.privacyConsentVersion >= CURRENT_PRIVACY_CONSENT_VERSION;
}
```

Use `canCapture` in all three capture-pipeline write gates.

- [ ] **Step 4: Make test fixtures explicitly consented**

Add a helper in `test/pipeline.test.ts` that returns normalized settings with
capture enabled and current consent. Pass it to successful navigation, content,
and engagement calls; retain explicit tests proving unconsented calls write
nothing.

- [ ] **Step 5: Verify GREEN and commit**

Run: `npm test -- test/settings.test.ts test/pipeline.test.ts`

Commit: `feat: require consent before history capture`

### Task 2: Gate content inspection and broadcast capture state

**Files:**
- Create: `src/content/capture-controller.ts`
- Modify: `src/content/content-script.ts`
- Modify: `src/shared/messages.ts`
- Modify: `src/background/service-worker.ts`
- Create: `test/capture-controller.test.ts`

- [ ] **Step 1: Write failing controller tests**

Test a controller whose `start()` callback runs once when state becomes true,
whose `stop()` callback runs once when state becomes false, and which is inert
until the first state message.

- [ ] **Step 2: Verify RED**

Run: `npm test -- test/capture-controller.test.ts`

Expected: failure because `createCaptureController` does not exist.

- [ ] **Step 3: Implement the pure controller**

Export `createCaptureController({ start, stop })` with an `update(enabled)`
method and idempotent transitions.

- [ ] **Step 4: Add capture-state messages**

Extend the shared message union with `GET_CAPTURE_STATE` and `CAPTURE_STATE`.
The service worker answers the query with `canCapture(await getSettings())`.
The content script asks for state before reading `document.title`,
`document.body.innerText`, focus, scroll, or visibility data.

- [ ] **Step 5: Make content listeners disposable**

Move DOM extraction, event listeners, heartbeat, and pagehide wiring into a
single `startCapture()` function that returns a cleanup callback. Stopping must
remove listeners, clear the interval, and clear buffered events without sending
them.

- [ ] **Step 6: Broadcast settings changes**

When options save capture/consent state, send `CAPTURE_STATE` to the service
worker. Query all HTTP(S) tabs and broadcast the boolean to their content
scripts, ignoring tabs without a receiver.

- [ ] **Step 7: Verify and commit**

Run: `npm run typecheck && npm run lint && npm test`

Commit: `feat: gate page inspection behind consent`

### Task 3: Prominent first-run disclosure

**Files:**
- Modify: `src/ui/app/Options.tsx`
- Modify: `src/ui/app/styles.css`
- Modify: `src/background/service-worker.ts`
- Create: `src/ui/app/privacy-copy.ts`
- Create: `test/privacy-copy.test.ts`

- [ ] **Step 1: Write failing disclosure-copy tests**

Assert the exported disclosure contains the handled data classes (URLs/page
titles, visible page text, active time/scroll depth), local-only use, no sale or
sharing, user controls, and the affirmative button label.

- [ ] **Step 2: Verify RED**

Run: `npm test -- test/privacy-copy.test.ts`

- [ ] **Step 3: Render onboarding before settings**

For consent version zero, render a `role="dialog"` disclosure with two actions:
`I understand — enable private history` sets current consent plus capture true;
`Keep capture off` records no consent and leaves capture false. The remaining
settings stay visible below, but capture/content/engagement switches are
disabled until consent is present.

- [ ] **Step 4: Add ongoing privacy controls**

After consent, show a compact “Local data promise” panel linking to the bundled
privacy page. Turning the master switch off immediately broadcasts false.
Turning it on after consent broadcasts true.

- [ ] **Step 5: Open onboarding on first install**

In `runtime.onInstalled`, initialize safe settings and call
`chrome.runtime.openOptionsPage()` only when consent is absent. Do not open or
replace New Tab.

- [ ] **Step 6: Verify and commit**

Run: `npm run typecheck && npm run lint && npm test`

Commit: `feat: add privacy-first onboarding`

### Task 4: Package and manifest hardening

**Files:**
- Modify: `scripts/manifest.mjs`
- Modify: `scripts/validate-manifest.mjs`
- Modify: `scripts/manifest-safety.mjs`
- Modify: `test/manifest-safety.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add failing package assertions**

Assert version `1.3.0`, a description no longer than 132 characters, no
`web_accessible_resources`, exact History-only overrides, and the existing
permission allowlist.

- [ ] **Step 2: Verify RED**

Run: `npm test -- test/manifest-safety.test.ts`

- [ ] **Step 3: Harden the manifest**

Remove `web_accessible_resources`, change the public name to
`Better Browser History`, set a concise search-relevant description, and bump
package/lockfile/manifest/changelog to `1.3.0`.

- [ ] **Step 4: Strengthen build validation**

Reject New Tab/home/search/bookmark overrides, remote-code patterns,
modulepreloads, inline scripts on the legacy New Tab page, missing icons,
overlong summaries, unexpected permissions, and web-accessible resources.

- [ ] **Step 5: Verify and commit**

Run: `npm run build && npm run validate && npm run doctor`

Commit: `chore: prepare compliant v1.3.0 package`

### Task 5: Public privacy, support, and search landing pages

**Files:**
- Create: `docs/index.html`
- Create: `docs/privacy.html`
- Create: `docs/support.html`
- Create: `docs/site.css`
- Create: `docs/robots.txt`
- Create: `docs/sitemap.xml`
- Create: `PRIVACY.md`
- Modify: `README.md`

- [ ] **Step 1: Create the privacy policy**

Cover data handled, local-only storage, purposes, no transmission/sharing/sale,
retention, exclusions, export/deletion, security, children, policy updates,
contact, and this Limited Use statement:

> Better Browser History's use of information complies with the Chrome Web
> Store User Data Policy, including the Limited Use requirements.

- [ ] **Step 2: Create the product landing page**

Use a unique title/H1, accurate meta description, canonical URL, Open Graph
metadata, SoftwareApplication structured data, feature sections, privacy proof,
and links to support/source/releases. Do not claim Store availability before a
listing URL exists.

- [ ] **Step 3: Create support and crawl files**

Document install/onboarding, opening `chrome://history`, search, analytics,
settings, excluded sites, export/import, deletion, and GitHub issue reporting.
Add a sitemap for all three public pages and allow crawling in `robots.txt`.

- [ ] **Step 4: Validate static pages and commit**

Run HTML link/path checks and ensure no placeholder text, fake testimonials, or
unverifiable claims remain.

Commit: `docs: add public product privacy and support site`

### Task 6: Chrome Web Store submission kit

**Files:**
- Create: `docs/chrome-web-store/SUBMISSION.md`
- Create: `docs/chrome-web-store/LISTING.md`
- Create: `docs/chrome-web-store/PRIVACY-PRACTICES.md`
- Create: `docs/chrome-web-store/assets/`

- [ ] **Step 1: Write finalized listing copy**

Provide exact title, 132-character-or-shorter summary, detailed description,
category, language, homepage/support/privacy URLs, and screenshot captions.
Keep every search phrase contextual and avoid repeating a keyword more than
five times.

- [ ] **Step 2: Write every dashboard answer**

Include permission justifications, no-remote-code selection, data checkboxes
for Web history/User activity/Website content, all Limited Use certifications,
public/all-regions/free distribution, reviewer test steps, and deferred publish.

- [ ] **Step 3: Prepare graphic assets**

Create/store a compliant icon, five current 1280×800 screenshots, 440×280 small
tile, and 1400×560 marquee image. Verify file formats and exact dimensions.

- [ ] **Step 4: Commit the submission kit**

Commit: `docs: add Chrome Web Store submission kit`

### Task 7: Final verification and publication

**Files:**
- Verify all changed files

- [ ] **Step 1: Run the full local gate**

Run:

```bash
npm run typecheck && npm run lint && npm test && npm run determinism \
  && npm run build && npm run validate && npm run doctor \
  && npm audit --audit-level=high && npm run package && git diff --check
```

- [ ] **Step 2: Inspect the exact ZIP**

Confirm `manifest.json` is at ZIP root, version is `1.3.0`, no source maps or
temporary helpers are present, and the SHA-256 is recorded in the submission
dossier.

- [ ] **Step 3: Publish through GitHub CI**

Push the feature branch, create a PR to `master`, wait for all CI checks, merge,
then fast-forward `/Users/ab/Desktop/better-browser-history` and rerun the gate.

- [ ] **Step 4: Make the repository and Pages public**

Change repository visibility to public, enable GitHub Pages from `/docs` on
`master`, confirm landing/privacy/support return HTTP 200, and set the repository
homepage URL.

- [ ] **Step 5: Publish v1.3.0**

Create the GitHub release and attach the verified Web Store ZIP.

- [ ] **Step 6: Complete the dashboard handoff**

If Chrome control becomes available, upload and fill all fields but leave the
irreversible **Submit for review** action for explicit confirmation. Otherwise,
open the correct dashboard and deliver the exact click-by-click dossier.
