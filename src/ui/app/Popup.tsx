import { useHistory } from './useHistory';
import { EntryRow } from './EntryRow';

/** Compact toolbar popup: quick search over recent history. */
export function Popup() {
  const h = useHistory();
  const shown = h.entries.slice(0, 40);

  function openDashboard() {
    const url =
      typeof chrome !== 'undefined' && chrome.runtime?.getURL
        ? chrome.runtime.getURL('dashboard.html')
        : 'dashboard.html';
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) chrome.tabs.create({ url });
    else window.open(url, '_blank');
  }

  return (
    <div className="popup">
      <div className="popup-head">
        <div className="brand-logo" style={{ width: 26, height: 26, fontSize: 14 }}>H</div>
        <div className="search" style={{ flex: 1, padding: '8px 10px' }}>
          <span className="hint">🔍</span>
          <input
            placeholder="Search your history…"
            value={h.query}
            onChange={(e) => h.setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>
      <div className="popup-list">
        {h.loading ? (
          <div className="loading">Loading…</div>
        ) : shown.length === 0 ? (
          <div className="empty"><div className="big">🔎</div><div>{h.query ? 'No matches' : 'No history yet'}</div></div>
        ) : (
          shown.map((e) => <EntryRow key={e.url} entry={e} onToggleStar={h.toggleStar} />)
        )}
      </div>
      <div className="popup-foot">
        <button className="btn" onClick={openDashboard}>Open full dashboard →</button>
      </div>
    </div>
  );
}
