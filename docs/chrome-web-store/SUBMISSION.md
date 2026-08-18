# Better Browser History: Chrome Web Store Submission Runbook

This runbook covers every launch field for v1.3.1. Use the production archive attached to
the GitHub release, not an unpacked development folder.

## 1. Account and item setup

1. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Confirm the displayed publisher account is the intended account and that two-step
   verification is enabled on its Google Account.
3. Complete the one-time developer registration/payment if the dashboard still requests it.
4. Complete any publisher contact-email verification or trader/non-trader declaration the
   dashboard requires for the account. Answer those identity/legal questions truthfully;
   they are publisher-specific and cannot be inferred from the extension code.
5. Select **New item**.
6. Upload `better-browser-history-v1.3.1.zip` from the v1.3.1 GitHub release.
7. Confirm the parsed name is **Better Browser History** and version is **1.3.1**.

## 2. Store Listing tab

Fill the tab as follows:

| Dashboard field | Exact answer |
|---|---|
| Product name | Better Browser History (comes from the uploaded manifest) |
| Summary | Search and analyze browser history with full-text search, sessions and time insights—all stored locally on your device. |
| Detailed description | Paste the complete Detailed description from `LISTING.md` |
| Category | Workflow & Planning |
| Language | English |
| Store icon | Upload `assets/store-icon-128.png` |
| Screenshot 1 | Upload `assets/01-search-history-1280x800.png` |
| Screenshot 2 | Upload `assets/02-time-analytics-1280x800.png` |
| Screenshot 3 | Upload `assets/03-site-and-category-insights-1280x800.png` |
| Screenshot 4 | Upload `assets/04-hourly-heatmap-1280x800.png` |
| Screenshot 5 | Upload `assets/05-visit-patterns-1280x800.png` |
| YouTube video | Leave blank |
| Small promo tile | Upload `assets/small-promo-440x280.png` |
| Marquee promo tile | Upload `assets/marquee-promo-1400x560.png` |
| Homepage URL | https://better-browsing-history.openappsstudio.com/ |
| Support URL | https://better-browsing-history.openappsstudio.com/support.html |
| Official URL | Choose the verified `https://better-browsing-history.openappsstudio.com/` Search Console property after verification; if unavailable, leave blank until verification is complete |
| Mature content | No / leave the checkbox off |

The screenshots are real product UI at Chrome's recommended 1280×800 size. Keep them in
the numbered order so search comes first, analytics depth follows, and no image promises a
feature absent from the uploaded version.

## 3. Privacy Practices tab

1. In **Single purpose**, paste the exact single-purpose sentence from
   `PRIVACY-PRACTICES.md`.
2. Paste each permission justification beside the matching permission. If the dashboard
   groups `tabs` and host/content access, combine the corresponding paragraphs without
   changing their meaning.
3. For remote code, select **No, I am not using remote code**.
4. For data usage, select **Web history**, **User activity**, and **Website content** only.
5. For each selected data category, choose only **App functionality** (or the current
   equivalent wording for providing the core feature).
6. Set the privacy policy URL to
   `https://better-browsing-history.openappsstudio.com/privacy.html`.
7. Check all Limited Use certifications listed in `PRIVACY-PRACTICES.md`.
8. Save the tab and resolve every red validation message before continuing.

## 4. Distribution tab

| Dashboard field | Selection |
|---|---|
| Visibility | Public |
| Geographic distribution | All regions |
| In-app purchases | No |
| Pricing | Free, if the current dashboard presents a price selector |

Do not use Unlisted or Private because organic Chrome Web Store discovery is the launch
channel. Do not exclude regions unless a real legal/compliance requirement emerges.

## 5. Test instructions tab

No login, test account or paid feature is required.

Paste this in the reviewer-instructions field:

> No credentials are required. After installation, Settings opens with capture disabled. Review the prominent disclosure and click “I understand — enable private history.” Visit three ordinary public HTTPS pages containing visible text and keep each page foregrounded for 10–15 seconds; scroll one page. Open chrome://history to see the Better Browser History interface. Search for a distinctive phrase from a visited page, open Analytics to review measured time/site/category views, and open Settings to test pausing capture or adding an excluded hostname. Chrome-protected pages are intentionally not captured. The extension overrides only the History page and does not override New Tab, homepage, startup pages or search.

If a separate credentials field exists, enter:

> Not applicable — no account or credentials are required.

If a separate additional-notes field exists, enter:

> All user data remains in the extension's local IndexedDB database. Capture requires affirmative in-product consent. The source and privacy policy are public at https://github.com/arhxam/better-browser-history and https://better-browsing-history.openappsstudio.com/privacy.html.

## 6. Submit for review

1. Re-open every tab and confirm it shows a saved/complete state.
2. Compare the uploaded version and ZIP filename against **1.3.1**.
3. Select **Submit for review**.
4. In the confirmation dialog, turn **Publish automatically after review** off / select
   deferred publishing. This gives you a final controlled launch after approval.
5. Confirm submission.
6. Save the item ID and dashboard status in the release notes or project issue tracker.

Submission changes external state and cannot be undone instantly. Do not click submit if
the dashboard unexpectedly shows a different publisher, item, ZIP version, permission,
privacy URL or distribution choice.

## 7. After approval

1. Open the approved draft, verify the public preview and click the final publish action.
2. Install the public listing in a clean Chrome profile.
3. Verify first-run disclosure, capture opt-in, `chrome://history`, search, analytics,
   Settings, pause/resume, export, and that New Tab/homepage/search remain unchanged.
4. Replace the website's GitHub-release CTA with the final Chrome Web Store item URL.
5. Add the listing URL to the GitHub repository About section and README.
6. Monitor dashboard crashes, support issues, installs/uninstalls and genuine reviews. Never
   incentivize ratings or manufacture reviews.

## 8. Search Console and organic discovery

1. Open Google Search Console and add the URL-prefix property
   `https://better-browsing-history.openappsstudio.com/`.
2. Use Google's recommended DNS or HTML-tag verification method.
   Copy the exact verification token into the site's `<head>`, commit, publish, then click
   **Verify**. Do not copy a token from another property.
3. Submit sitemap URL
   `https://better-browsing-history.openappsstudio.com/sitemap.xml`.
4. Request indexing for the homepage, privacy page and support page.
5. After verification, return to the Store Listing tab and select the verified site in
   **Official URL**.
6. Track impressions and clicks for real user intents. Refine copy only when the product
   answers the query; avoid doorway pages, artificial backlinks, repeated keywords or
   misleading title changes.

The Store listing itself is primarily ranked by Chrome's discovery systems. Search Console
helps the public product pages appear in Google Search and makes the verified official URL
available; it does not guarantee or directly purchase Chrome Web Store rank.
