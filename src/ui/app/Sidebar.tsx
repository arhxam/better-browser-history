import type { HistoryFilter, AnalyticsBundle } from '../../db/repository';

export type ViewId = 'history' | 'sessions' | 'journeys' | 'analytics';

const NAV: { id: ViewId; icon: string; label: string }[] = [
  { id: 'history', icon: '🕘', label: 'History' },
  { id: 'sessions', icon: '🧭', label: 'Sessions' },
  { id: 'journeys', icon: '🌿', label: 'Journeys' },
  { id: 'analytics', icon: '📊', label: 'Analytics' },
];

const RANGES: { label: string; days: number }[] = [
  { label: 'All', days: 0 },
  { label: '24h', days: 1 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
];

function openSettings() {
  if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open('options.html', '_blank');
  }
}

export function Sidebar({
  view,
  setView,
  hosts,
  tags,
  filter,
  setFilter,
  analytics,
}: {
  view: ViewId;
  setView: (v: ViewId) => void;
  hosts: string[];
  tags: string[];
  filter: HistoryFilter;
  setFilter: (f: HistoryFilter) => void;
  analytics: AnalyticsBundle | null;
}) {
  const activeRange = filter.from ? Math.round((Date.now() - filter.from) / 86400000) : 0;
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">H</div>
        <div>
          <div className="brand-title">Better History</div>
          <div className="brand-sub">local · deterministic</div>
        </div>
      </div>

      <nav className="nav">
        {NAV.map((n) => (
          <button key={n.id} className={`nav-item ${view === n.id ? 'active' : ''}`} onClick={() => setView(n.id)}>
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>

      <div className="filters">
        <div>
          <div className="filter-label">Time range</div>
          <div className="chip-row">
            {RANGES.map((r) => {
              const active = r.days === 0 ? !filter.from : activeRange === r.days;
              return (
                <button
                  key={r.label}
                  className={`chip toggle ${active ? 'active' : ''}`}
                  onClick={() =>
                    setFilter({ ...filter, from: r.days === 0 ? undefined : Date.now() - r.days * 86400000, to: undefined })
                  }
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="filter-label">Site</div>
          <select className="select" value={filter.host ?? ''} onChange={(e) => setFilter({ ...filter, host: e.target.value || undefined })}>
            <option value="">All sites</option>
            {hosts.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        {tags.length > 0 && (
          <div>
            <div className="filter-label">Tag</div>
            <select className="select" value={filter.tag ?? ''} onChange={(e) => setFilter({ ...filter, tag: e.target.value || undefined })}>
              <option value="">Any tag</option>
              {tags.map((t) => (
                <option key={t} value={t}>#{t}</option>
              ))}
            </select>
          </div>
        )}

        <label className={`chip toggle ${filter.starred ? 'active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: 'fit-content' }}>
          <input
            type="checkbox"
            checked={!!filter.starred}
            onChange={(e) => setFilter({ ...filter, starred: e.target.checked || undefined })}
            style={{ accentColor: 'var(--primary)', width: 13, height: 13 }}
          />
          ★ Starred only
        </label>
      </div>

      {analytics && (
        <div className="mini-stats">
          <div className="mini-stat"><div className="n">{analytics.overview.totalVisits}</div><div className="l">Visits</div></div>
          <div className="mini-stat"><div className="n">{analytics.overview.uniqueHosts}</div><div className="l">Sites</div></div>
        </div>
      )}

      <button className="nav-item settings-link" onClick={openSettings}>
        <span className="nav-icon">⚙︎</span>
        Settings
      </button>
    </aside>
  );
}
