# Security Policy

## Supported version

Security fixes are applied to the latest release of Better Browser History.

## Reporting a vulnerability

Please report suspected vulnerabilities through GitHub's
[private security advisory form](https://github.com/arhxam/better-browser-history/security/advisories/new).
Do not open a public issue and do not include real browsing history, exported databases,
credentials, private URLs, or page contents in a report.

Include the affected version, impact, reproduction steps, and a minimal proof of concept.
The maintainer will acknowledge actionable reports as soon as practical, investigate them,
and coordinate a fix and disclosure timeline with the reporter.

## Security model

- Captured data stays in extension-local IndexedDB and is not synchronized by the project.
- Capture requires affirmative user consent and can be paused or cleared in Settings.
- Production packages contain no remotely hosted executable code.
- The manifest overrides only the browser History page, never New Tab, homepage, startup,
  search, or bookmarks.
