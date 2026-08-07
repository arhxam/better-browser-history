// Single source of truth for the extension manifest.
// Imported by the build script (to emit dist/manifest.json) and by
// validate-manifest.mjs indirectly via the emitted file.
export function buildManifest() {
  return {
    manifest_version: 3,
    name: 'A Better Browser History',
    version: '1.1.3',
    description:
      'A local-first, deterministic history layer for Chromium browsers — full-text content search, dwell time, sessions, journeys and analytics.',
    // Broad permissions: loaded unpacked, not for the Web Store.
    permissions: [
      'history',
      'tabs',
      'webNavigation',
      'storage',
      'unlimitedStorage',
      'scripting',
      'idle',
      'alarms',
      'contextMenus',
      'favicon',
    ],
    host_permissions: ['<all_urls>'],
    background: {
      service_worker: 'service-worker.js',
      type: 'module',
    },
    action: {
      default_popup: 'popup.html',
      default_title: 'A Better Browser History',
      default_icon: {
        16: 'icons/icon16.png',
        48: 'icons/icon48.png',
        128: 'icons/icon128.png',
      },
    },
    icons: {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
    chrome_url_overrides: {
      history: 'history.html',
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['content-script.js'],
        run_at: 'document_idle',
        all_frames: false,
      },
    ],
    web_accessible_resources: [
      {
        resources: ['dashboard.html', 'assets/*'],
        matches: ['<all_urls>'],
      },
    ],
    minimum_chrome_version: '110',
  };
}
