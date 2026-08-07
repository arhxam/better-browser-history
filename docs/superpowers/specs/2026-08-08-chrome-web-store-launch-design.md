# Chrome Web Store Production Launch Design

## Objective

Ship Better Browser History as a policy-compliant, public Chrome Web Store
extension whose primary acquisition channel is Chrome Web Store and Google
search. The release must preserve the product's local-first promise, avoid New
Tab or homepage takeover, and give reviewers a direct explanation for every
permission and data-use declaration.

## Constraints and decisions

- The single purpose is: privately capture, search, organize, and analyze the
  user's own browser history on their device.
- The store name will be **Better Browser History**. The manifest and store
  summary will use natural search terms, but will not repeat irrelevant keywords
  or make unverifiable ranking claims.
- Capture is opt-in. A new installation will not read page text, navigation
  details, or engagement events until the user accepts an in-product prominent
  disclosure.
- History data remains in extension-owned IndexedDB. It is not transmitted to
  the developer, advertisers, analytics vendors, or other third parties.
- The extension will continue to override only the browser History page. It
  will never replace New Tab, homepage, startup pages, bookmarks, or search.
- The GitHub repository will become public and host the canonical landing,
  privacy, and support pages through GitHub Pages.
- Version `1.3.0` is the Chrome Web Store launch candidate because consent
  gating changes first-run behavior.

## Compliance onboarding

`ExtensionSettings` gains a versioned privacy-consent field. Safe defaults keep
capture disabled and consent unset. On first installation, the service worker
opens the options page. The options page places a prominent disclosure before
all controls and explains, in plain language, that the extension can save:

- URLs, page titles, visit timestamps, referrer/opener relationships;
- visible page text and descriptions for full-text search;
- active foreground time and scroll depth for analytics.

The disclosure states that this data stays on the device, is not sold, shared,
or used for advertising, and can be excluded, exported, or erased. The only
positive action is **I understand — enable private history**. A secondary
**Keep capture off** action leaves consent unset and capture disabled.

Static content scripts must not inspect page content before consent. They first
ask the service worker for capture state, initialize extraction/listeners only
when allowed, and stop when capture is disabled. Settings changes broadcast the
new state to open tabs.

## Permission and package hardening

The production validator will enforce:

- Manifest V3 and a History-only URL override;
- the exact permission allowlist and `<all_urls>` host access;
- no remotely hosted code, inline executable helpers, or module preloads;
- no unnecessary `web_accessible_resources` exposure;
- a 132-character-or-shorter manifest description;
- store icon presence and expected package files.

Permission use is limited to the single purpose:

- `tabs`: active-tab title/opener metadata and opening extension pages;
- `webNavigation`: top-level navigation and SPA history transitions;
- `idle`: exclude device-idle time from engagement analytics;
- `alarms`: scheduled local retention pruning;
- `contextMenus`: the extension-action shortcut;
- `unlimitedStorage`: a user-controlled local history archive;
- `<all_urls>`: visible text and engagement measurement on sites the user
  chooses to browse after consent.

## Public web presence

GitHub Pages under `https://arhxam.github.io/better-browser-history/` will host:

- an indexable product page with a unique title, description, canonical URL,
  Product/SoftwareApplication structured data, clear install explanation, and
  links to privacy, support, source, and releases;
- a complete privacy policy covering collection, local use, no transmission,
  retention, controls, security, children, changes, contact, and the Chrome Web
  Store Limited Use disclosure;
- a support page with installation, onboarding, use, troubleshooting, data
  deletion, and issue-reporting instructions.

The pages will not claim the extension is already available in the Chrome Web
Store until the final listing URL exists.

## Store positioning

Primary intent cluster: browser history, Chrome history, history manager,
search browsing history. Secondary intent cluster: full-text history search,
browsing analytics, time spent on websites, history sessions, local/private
history.

The title remains concise and unique. The 132-character summary leads with the
core outcome. The detailed description uses the important terms only where they
describe real features. It begins with a direct value proposition, then concise
feature and privacy sections. Category is **Workflow & Planning**, English is
the initial/default language, visibility is public, all regions are selected,
and publishing is deferred until approval so the final listing can be checked.

Ranking work prioritizes the factors Google documents: complete accurate
metadata, crisp assets, intuitive onboarding, low uninstall rate, sustained
usage, ratings, and policy compliance. Search Console is used for the public
landing page and verified-publisher URL; Chrome Web Store metadata and product
quality drive store search.

## Listing assets

The submission kit will contain:

- a compliant 128×128 PNG icon;
- five 1280×800 current-product screenshots covering history search,
  analytics, sessions/journeys, settings/privacy, and the toolbar surface;
- a 440×280 small promo tile;
- a 1400×560 marquee image;
- the exact `better-browser-history-v1.3.0.zip` uploaded to GitHub Releases.

Assets must be full-bleed, consistent with the monochrome product identity,
accurate to the current UI, readable when downscaled, and free of unsupported
badges or superlatives.

## Submission and verification

The launch gate includes typecheck, lint, unit/integration tests, determinism,
manifest validation, extension doctor, dependency audit, package generation,
ZIP-root inspection, consent red/green tests, and visual review of first-run and
store assets. GitHub CI must pass before `master` is updated.

If the logged-in Chrome dashboard is not controllable, no fragile desktop
automation will be used. Instead, the repository will include a dashboard-ready
submission dossier containing exact answers for Package, Store Listing, Privacy
Practices, Distribution, Test Instructions, and the final submission dialog.
