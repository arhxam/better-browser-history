# Chrome Web Store Privacy Practices Answers

Use these answers for Better Browser History v1.3.0. They describe the shipped build and
must be revised before submission if product behavior changes.

## Single purpose

Paste:

> Better Browser History privately captures, searches, organizes and analyzes the user's own browsing history on their device.

## Permission justifications

### `webNavigation`

> Used to detect completed top-level navigations so enabled users receive a complete local history and session timeline, including pages reached without a content-script event.

### `unlimitedStorage`

> Used to protect the user's opted-in local history index, page-text search data, annotations and backups from normal extension quota eviction. Data remains on the user's device and can be pruned or cleared in Settings.

### `idle`

> Used only to exclude away-from-keyboard time from active-time analytics so measured foreground time is not overstated.

### `alarms`

> Used for periodic local retention pruning when the user configures a retention limit.

### `contextMenus`

> Used to provide an extension action context-menu command that opens the Better Browser History dashboard.

### Host permission (`<all_urls>`)

> Required because the extension's user-facing purpose is to create a searchable history across the websites the user chooses to browse. After affirmative consent, the content script can save the current page URL, title, visible text and engagement signals for local search and analytics. Users can pause capture, exclude hostnames, or separately disable content and engagement capture. Protected browser pages remain inaccessible.

### Content scripts

> The packaged content script first checks the user's consent and capture state. Only when enabled does it read visible page text and measure foreground activity/scroll depth for the local history search and analytics features. It does not read form values, passwords, cookies or private messages intentionally.

## Remote code

Select **No, I am not using remote code**.

Explanation if the dashboard requests one:

> All executable JavaScript is bundled inside the submitted extension package. The extension does not load remote scripts, WebAssembly or remotely hosted executable logic.

## Data usage disclosures

Select only these data types:

- **Web history** — URLs, titles, timestamps, referrers, repeat visits and tab-opener relationships.
- **User activity** — active foreground time, visibility, scroll depth and idle state.
- **Website content** — visible page text and description metadata used for local full-text search.

Do **not** select personally identifiable information, health information, financial/payment
information, authentication information, personal communications, precise location, or
any other category not listed above. The extension does not intentionally handle them.

For every purpose matrix shown for the selected data types, select only the option that
means **app functionality / providing the extension's core feature**. Do not select
advertising, personalization, analytics, account management, fraud/credit, or unrelated
purposes.

## Required certifications

Check every certification after verifying the uploaded ZIP is v1.3.0:

- I do not sell or transfer user data to third parties outside approved use cases.
- I do not use or transfer user data for purposes unrelated to the item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.
- My use of data complies with the Chrome Web Store User Data Policy, including Limited Use.

Privacy policy URL:

`https://arhxam.github.io/better-browser-history/privacy.html`

## Why local-only data is disclosed

Chrome considers collection to include data handled or stored locally, even when it is not
sent over a network. For that reason the listing truthfully discloses web history, user
activity and website content, while the in-product consent screen appears before those
categories are captured.
