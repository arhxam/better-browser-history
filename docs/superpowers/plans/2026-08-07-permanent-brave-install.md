# Permanent Brave Extension Installation Plan

**Goal:** Ensure Brave runs the latest Better Browser History build from the permanent
Desktop repository, never takes over New Tab/homepage, and preserves existing local history.

**Root cause:** Brave's extension details show that the installed unpacked extension is
still registered from a temporary Conductor workspace. Chromium caches manifest state for
an installed extension; refreshing a browser tab does not reload manifest changes.

### 1. Lock the manifest boundary

- Add regression tests for New Tab, homepage/startup, and non-History browser-page overrides.
- Make build validation fail if any takeover field exists.
- Provide a doctor command that reports the exact unpacked path and safety state.

### 2. Prepare the permanent build

- Build and test the release in the working branch.
- Commit and publish the release to GitHub.
- Update the permanent Desktop `master` checkout and build its `dist/` folder.
- Verify the Desktop manifest and package match the published commit byte-for-byte.

### 3. Preserve local extension data

- Open the currently installed extension's Settings page.
- Export its JSON data before removing it. A different unpacked path can create a different
  extension ID, so the current IndexedDB must not be assumed to transfer automatically.

### 4. Replace the temporary Brave installation

- Remove the copy loaded from the Conductor workspace.
- Load unpacked from `/Users/ab/Desktop/better-browser-history/dist`.
- Import the JSON backup if the extension ID changed.

### 5. Verify end to end

- Extension details show the release version and permanent Desktop path.
- Permissions do not include replacing New Tab.
- A new tab opens Brave's normal page.
- `brave://history` opens Better Browser History.
- Exported history/settings remain available.
