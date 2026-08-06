import { migrateLegacyNewTab } from './newtab-migration';
import './newtab-migration.css';

const retry = document.getElementById('reload-extension');
const status = document.getElementById('migration-status');

function reloadExtension() {
  try {
    migrateLegacyNewTab(chrome.runtime);
  } catch {
    if (status) status.textContent = 'Open brave://extensions and reload Better Browser History once.';
    retry?.removeAttribute('hidden');
  }
}

retry?.addEventListener('click', reloadExtension);

// Let the recovery message paint before the old extension context is replaced.
requestAnimationFrame(() => window.setTimeout(reloadExtension, 120));
