import { useEffect, useState } from 'react';
import {
  getStorageStats,
  getRetentionDays,
  setRetentionDays,
  exportAll,
  clearAll,
  pruneBefore,
  type StorageStats,
} from '../../db/repository';

const RETENTION_OPTIONS = [
  { label: 'Keep everything', days: 0 },
  { label: '90 days', days: 90 },
  { label: '180 days', days: 180 },
  { label: '1 year', days: 365 },
];

export function Options() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [retention, setRetention] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [status, setStatus] = useState('');

  async function refresh() {
    setStats(await getStorageStats());
    setRetention(await getRetentionDays());
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onRetentionChange(days: number) {
    await setRetentionDays(days);
    setRetention(days);
    if (days > 0) {
      const removed = await pruneBefore(Date.now() - days * 86400000);
      setStatus(removed > 0 ? `Applied — pruned ${removed} old visit(s).` : 'Retention updated.');
    } else {
      setStatus('Retention updated — keeping everything.');
    }
    await refresh();
  }

  async function onExport() {
    const bundle = await exportAll();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `better-browser-history-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(`Exported ${bundle.visits.length} visits.`);
  }

  async function onClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    await clearAll();
    setConfirmClear(false);
    setStatus('All history cleared.');
    await refresh();
  }

  return (
    <div className="options">
      <header className="options-head">
        <div className="brand-logo">H</div>
        <div>
          <h1>Better Browser History</h1>
          <p className="options-sub">Settings &amp; data management · everything stays on this device</p>
        </div>
      </header>

      <section className="panel">
        <h3>Storage</h3>
        {stats ? (
          <div className="cards">
            <div className="card"><div className="big">{stats.totalVisits}</div><div className="cap">Visits</div></div>
            <div className="card"><div className="big">{stats.uniqueUrls}</div><div className="cap">Unique pages</div></div>
            <div className="card"><div className="big">{stats.uniqueHosts}</div><div className="cap">Sites</div></div>
            <div className="card"><div className="big">{stats.pages}</div><div className="cap">Pages indexed</div></div>
          </div>
        ) : (
          <div className="loading">Loading…</div>
        )}
      </section>

      <section className="panel">
        <h3>Retention</h3>
        <p className="options-desc">Automatically remove visits older than the selected window.</p>
        <div className="chip-row">
          {RETENTION_OPTIONS.map((o) => (
            <button
              key={o.days}
              className={`chip toggle ${retention === o.days ? 'active' : ''}`}
              onClick={() => onRetentionChange(o.days)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Your data</h3>
        <p className="options-desc">Export a full copy, or permanently erase everything stored locally.</p>
        <div className="options-actions">
          <button className="btn ghost" onClick={onExport}>Export as JSON</button>
          <button className={`btn ${confirmClear ? 'danger' : 'ghost'}`} onClick={onClear}>
            {confirmClear ? 'Click again to confirm — erase all history' : 'Clear all history'}
          </button>
          {confirmClear && (
            <button className="btn ghost" onClick={() => setConfirmClear(false)}>Cancel</button>
          )}
        </div>
      </section>

      {status && <div className="options-status">{status}</div>}
    </div>
  );
}
