import { useEffect, useMemo, useState } from 'react';
import { useHistory } from './useHistory';
import { Sidebar, type ViewId } from './Sidebar';
import { HistoryView, SessionsView, JourneysView, AnalyticsView } from './views';
import { Icon } from './Icon';
import type { Visit } from '../../core/types';
import { getSettings } from '../../db/repository';
import { DEFAULT_SETTINGS, type ExtensionSettings } from '../../settings/settings';

export function App() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);

  useEffect(() => {
    void getSettings().then(setSettings).catch(() => setSettings(DEFAULT_SETTINGS));
  }, []);

  if (!settings) return <div className="loading">Loading history…</div>;
  return <Dashboard settings={settings} />;
}

function Dashboard({ settings }: { settings: ExtensionSettings }) {
  const initialFilter = settings.defaultRangeDays > 0
    ? { from: Date.now() - settings.defaultRangeDays * 86400000 }
    : {};
  const h = useHistory(initialFilter);
  const [view, setView] = useState<ViewId>(settings.defaultView);

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
            <span className="hint"><Icon name="search" size={16} /></span>
            <input
              placeholder="Search titles, URLs and page content…"
              value={h.query}
              onChange={(e) => h.setQuery(e.target.value)}
              autoFocus
            />
            {h.query && (
              <button className="icon-btn" title="Clear" onClick={() => h.setQuery('')}>
                <Icon name="close" size={16} />
              </button>
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
