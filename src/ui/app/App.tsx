import { useMemo, useState } from 'react';
import { useHistory } from './useHistory';
import { Sidebar, type ViewId } from './Sidebar';
import { HistoryView, SessionsView, JourneysView, AnalyticsView } from './views';
import type { Visit } from '../../core/types';

export function App() {
  const h = useHistory();
  const [view, setView] = useState<ViewId>('history');

  // Lookup for journey nodes: every filtered visit lives in some session.
  const visitMap = useMemo(() => {
    const m = new Map<string, Visit>();
    for (const s of h.sessions) for (const v of s.visits) m.set(v.id, v);
    return m;
  }, [h.sessions]);

  return (
    <div className="app">
      <Sidebar
        view={view}
        setView={setView}
        hosts={h.hosts}
        tags={h.tags}
        filter={h.filter}
        setFilter={h.setFilter}
        analytics={h.analytics}
      />
      <main className="main">
        <div className="topbar">
          <div className="search">
            <span className="hint">🔍</span>
            <input
              placeholder="Search titles, URLs and page content…"
              value={h.query}
              onChange={(e) => h.setQuery(e.target.value)}
              autoFocus
            />
            {h.query && (
              <button className="star-btn" title="Clear" onClick={() => h.setQuery('')}>✕</button>
            )}
          </div>
        </div>
        <div className="content">
          {h.loading ? (
            <div className="loading">Loading history…</div>
          ) : view === 'history' ? (
            <HistoryView entries={h.entries} query={h.query} onToggleStar={h.toggleStar} />
          ) : view === 'sessions' ? (
            <SessionsView sessions={h.sessions} />
          ) : view === 'journeys' ? (
            <JourneysView journeys={h.journeys} visitMap={visitMap} />
          ) : (
            <AnalyticsView analytics={h.analytics} />
          )}
        </div>
      </main>
    </div>
  );
}
