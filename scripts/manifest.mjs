// Single source of truth for the extension manifest.
// Imported by the build script (to emit dist/manifest.json) and by
// validate-manifest.mjs indirectly via the emitted file.
export function buildManifest() {
  return {
    manifest_version: 3,
    name: 'Better Browser History',
    version: '1.3.0',
    description:
      'Search and analyze browser history with full-text search, sessions and time insights—all stored locally on your device.',
    // Least-privilege APIs used by capture, retention, and the toolbar action.
    permissions: [
      'webNavigation',
      'unlimitedStorage',
      'idle',
      'alarms',
      'contextMenus',
    ],
    host_permissions: ['<all_urls>'],
    background: {
      service_worker: 'service-worker.js',
      type: 'module',
    },
    action: {
      default_popup: 'popup.html',
      default_title: 'Better Browser History',
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
    minimum_chrome_version: '110',
  };
}
