import { useEffect, useState, type ChangeEvent } from 'react';
import {
  getStorageStats,
  getSettings,
  setSettings,
  exportAll,
  importAll,
  clearAll,
  pruneBefore,
  type StorageStats,
} from '../../db/repository';
import type {
  DefaultRangeDays,
  DefaultView,
  ExtensionSettings,
  RetentionDays,
} from '../../settings/settings';

const RETENTION_OPTIONS: { label: string; days: RetentionDays }[] = [
  { label: 'Keep everything', days: 0 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '180 days', days: 180 },
  { label: '1 year', days: 365 },
];

function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="setting-row">
      <span>
        <span className="setting-name">{label}</span>
        <span className="setting-description">{description}</span>
      </span>
      <input
        className="switch"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export function Options() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [settings, setLocalSettings] = useState<ExtensionSettings | null>(null);
  const [excludedHosts, setExcludedHosts] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [status, setStatus] = useState('');
  const [statusError, setStatusError] = useState(false);

  async function refresh() {
    const [nextStats, nextSettings] = await Promise.all([getStorageStats(), getSettings()]);
    setStats(nextStats);
    setLocalSettings(nextSettings);
    setExcludedHosts(nextSettings.excludedHosts.join('\n'));
  }

  useEffect(() => {
    void refresh().catch((error: unknown) => showError(error));
  }, []);

  function showMessage(message: string) {
    setStatusError(false);
    setStatus(message);
  }

  function showError(error: unknown) {
    setStatusError(true);
    setStatus(error instanceof Error ? error.message : 'Something went wrong.');
  }

  async function save(patch: Partial<ExtensionSettings>, message = 'Settings saved.') {
    if (!settings) return;
    try {
      const next = await setSettings({ ...settings, ...patch });
      setLocalSettings(next);
      showMessage(message);
    } catch (error) {
      showError(error);
    }
  }

  async function onRetentionChange(days: RetentionDays) {
    await save({ retentionDays: days });
    if (days > 0) {
      const removed = await pruneBefore(Date.now() - days * 86400000);
      showMessage(removed > 0 ? `Retention saved — removed ${removed} old visit(s).` : 'Retention saved.');
      setStats(await getStorageStats());
    } else {
      showMessage('Retention saved — keeping everything.');
    }
  }

  async function onSaveExclusions() {
    const hosts = excludedHosts.split(/[\s,]+/).filter(Boolean);
    await save({ excludedHosts: hosts }, 'Excluded sites saved.');
    const normalized = await getSettings();
    setExcludedHosts(normalized.excludedHosts.join('\n'));
  }

  async function onExport() {
    try {
      const bundle = await exportAll();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `better-browser-history-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage(`Exported ${bundle.visits.length} visits.`);
    } catch (error) {
      showError(error);
    }
  }

  async function onImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const result = await importAll(JSON.parse(await file.text()));
      await refresh();
      showMessage(`Imported ${result.visits} visits and ${result.pages} indexed pages.`);
    } catch (error) {
      showError(error instanceof SyntaxError ? new Error('Invalid import file.') : error);
    }
  }

  async function onClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    try {
      await clearAll();
      setConfirmClear(false);
      showMessage('All stored history was cleared. Your settings were kept.');
      await refresh();
    } catch (error) {
      showError(error);
    }
  }

  if (!settings) return <div className="loading">Loading settings…</div>;

  return (
    <div className="options">
      <header className="options-head">
        <div className="brand-logo">H</div>
        <div>
          <h1>Better Browser History</h1>
          <p className="options-sub">Private, local controls for how your history is captured and shown</p>
        </div>
      </header>

      <section className="panel">
        <h3>Storage</h3>
        {stats ? (
          <div className="cards storage-cards">
            <div className="card"><div className="big">{stats.totalVisits}</div><div className="cap">Visits</div></div>
            <div className="card"><div className="big">{stats.uniqueUrls}</div><div className="cap">Unique pages</div></div>
            <div className="card"><div className="big">{stats.uniqueHosts}</div><div className="cap">Sites</div></div>
            <div className="card"><div className="big">{stats.pages}</div><div className="cap">Pages indexed</div></div>
          </div>
        ) : <div className="loading">Loading…</div>}
      </section>

      <section className="panel">
        <h3>Capture</h3>
        <p className="options-desc">Choose what is stored from future browsing.</p>
        <div className="setting-list">
          <SettingToggle
            label="Record browsing history"
            description="Master switch for all new history capture."
            checked={settings.captureEnabled}
            onChange={(captureEnabled) => void save({ captureEnabled })}
          />
          <SettingToggle
            label="Index page content"
            description="Store visible page text so search can find more than titles and URLs."
            checked={settings.indexPageContent}
            onChange={(indexPageContent) => void save({ indexPageContent })}
          />
          <SettingToggle
            label="Track engagement"
            description="Measure active time and scroll depth; idle time is excluded."
            checked={settings.trackEngagement}
            onChange={(trackEngagement) => void save({ trackEngagement })}
          />
        </div>
      </section>

      <section className="panel">
        <h3>Privacy</h3>
        <p className="options-desc">Never save visits, content, or engagement from these sites or their subdomains.</p>
        <textarea
          className="textarea"
          value={excludedHosts}
          onChange={(event) => setExcludedHosts(event.target.value)}
          placeholder={'example.com\nprivate.company.test'}
          rows={5}
          spellCheck={false}
        />
        <div className="field-help">One hostname per line. Do not include paths.</div>
        <button className="btn ghost compact" onClick={() => void onSaveExclusions()}>Save excluded sites</button>
      </section>

      <section className="panel">
        <h3>Default view</h3>
        <p className="options-desc">Choose what appears first when you open the browser History page.</p>
        <div className="field-grid">
          <label className="field">
            <span>Section</span>
            <select
              className="select"
              value={settings.defaultView}
              onChange={(event) => void save({ defaultView: event.target.value as DefaultView })}
            >
              <option value="history">History</option>
              <option value="sessions">Sessions</option>
              <option value="journeys">Journeys</option>
              <option value="analytics">Analytics</option>
            </select>
          </label>
          <label className="field">
            <span>Time range</span>
            <select
              className="select"
              value={settings.defaultRangeDays}
              onChange={(event) => void save({ defaultRangeDays: Number(event.target.value) as DefaultRangeDays })}
            >
              <option value={0}>All time</option>
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel">
        <h3>Retention</h3>
        <p className="options-desc">Automatically remove visits older than the selected window.</p>
        <div className="chip-row">
          {RETENTION_OPTIONS.map((option) => (
            <button
              key={option.days}
              className={`chip toggle ${settings.retentionDays === option.days ? 'active' : ''}`}
              onClick={() => void onRetentionChange(option.days)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Your data</h3>
        <p className="options-desc">Export a backup, merge a previous backup, or permanently erase stored history.</p>
        <div className="options-actions">
          <button className="btn ghost compact" onClick={() => void onExport()}>Export JSON</button>
          <label className="btn ghost compact file-button">
            Import JSON
            <input type="file" accept="application/json,.json" onChange={(event) => void onImport(event)} />
          </label>
          <button className={`btn compact ${confirmClear ? 'danger' : 'ghost'}`} onClick={() => void onClear()}>
            {confirmClear ? 'Confirm erase all history' : 'Clear all history'}
          </button>
          {confirmClear && (
            <button className="btn ghost compact" onClick={() => setConfirmClear(false)}>Cancel</button>
          )}
        </div>
      </section>

      {status && <div className={`options-status ${statusError ? 'error' : ''}`} role="status">{status}</div>}
    </div>
  );
}
