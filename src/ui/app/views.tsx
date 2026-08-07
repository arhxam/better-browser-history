import type { EnrichedEntry, SessionView, AnalyticsBundle } from '../../db/repository';
import type { Journey, JourneyNode, Visit } from '../../core/types';
import { EntryRow } from './EntryRow';
import {
  ActivityTrendChart,
  BarList,
  Heatmap,
  ShareDonut,
  TimeShareBars,
  WeekActivityHeatmap,
} from './charts';
import { dayKey, dayLabel, clockTime, hostColor, hostInitial, prettyUrl } from './format';
import { formatDuration } from '../../core/engagement';
import { Icon } from './Icon';

function EmptyState({ label }: { label: string }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name="empty" size={36} /></div>
      <div>{label}</div>
    </div>
  );
}

export function HistoryView({
  entries,
  query,
  onToggleStar,
}: {
  entries: EnrichedEntry[];
  query: string;
  onToggleStar: (url: string, s: boolean) => void;
}) {
  if (entries.length === 0) {
    return <EmptyState label={query ? `No pages match “${query}”.` : 'No history captured yet.'} />;
  }

  if (query.trim()) {
    // Search results: ranked, flat.
    return (
      <div>
        <div className="section-title">{entries.length} result{entries.length === 1 ? '' : 's'} for “{query}”</div>
        {entries.map((e) => (
          <EntryRow key={e.url} entry={e} onToggleStar={onToggleStar} />
        ))}
      </div>
    );
  }

  // Browse: group by day.
  const groups: { key: string; label: string; items: EnrichedEntry[] }[] = [];
  for (const e of entries) {
    const k = dayKey(e.lastSeen);
    let g = groups.find((x) => x.key === k);
    if (!g) {
      g = { key: k, label: dayLabel(e.lastSeen), items: [] };
      groups.push(g);
    }
    g.items.push(e);
  }

  return (
    <div>
      {groups.map((g) => (
        <div className="day-group" key={g.key}>
          <div className="day-head">{g.label}</div>
          {g.items.map((e) => (
            <EntryRow key={e.url} entry={e} onToggleStar={onToggleStar} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SessionsView({ sessions }: { sessions: SessionView[] }) {
  if (sessions.length === 0) return <EmptyState label="No sessions yet." />;
  return (
    <div>
      {sessions.map((s) => (
        <div className="session" key={s.session.id}>
          <div className="session-head">
            <span>{new Date(s.session.start).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            <span style={{ color: 'var(--text-faint)' }}>
              {s.visits.length} pages · {formatDuration(s.session.end - s.session.start)} span
            </span>
          </div>
          <div className="session-body">
            {s.visits.map((v) => (
              <div className="tree-node" key={v.id}>
                <div className="avatar" style={{ width: 22, height: 22, fontSize: 11, background: hostColor(v.host) }}>
                  {hostInitial(v.host)}
                </div>
                <span style={{ color: 'var(--text-faint)', fontSize: 12, width: 46 }}>{clockTime(v.timestamp)}</span>
                <a href={v.url} target="_blank" rel="noreferrer" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {v.title || prettyUrl(v.url)}
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TreeNode({ node, visitMap }: { node: JourneyNode; visitMap: Map<string, Visit> }) {
  const v = visitMap.get(node.visitId);
  return (
    <li>
      <div className="tree-node">
        <div className="avatar" style={{ width: 20, height: 20, fontSize: 10, background: hostColor(v?.host ?? '') }}>
          {hostInitial(v?.host ?? '?')}
        </div>
        <a href={v?.url} target="_blank" rel="noreferrer" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {v?.title || (v ? prettyUrl(v.url) : node.visitId)}
        </a>
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((c) => (
            <TreeNode key={c.visitId} node={c} visitMap={visitMap} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function JourneysView({ journeys, visitMap }: { journeys: Journey[]; visitMap: Map<string, Visit> }) {
  const nonEmpty = journeys.filter((j) => j.roots.length > 0);
  if (nonEmpty.length === 0) return <EmptyState label="No journeys yet." />;
  return (
    <div>
      <div className="section-title">Navigation paths, grouped by session</div>
      {nonEmpty.map((j) => (
        <div className="panel" key={j.sessionId}>
          <ul className="tree">
            {j.roots.map((r) => (
              <TreeNode key={r.visitId} node={r} visitMap={visitMap} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsView({ analytics }: { analytics: AnalyticsBundle | null }) {
  if (!analytics) return <div className="loading">Loading…</div>;
  const {
    overview,
    activity,
    siteTime,
    categoryTime,
    dailyActivity,
    weeklyActivity,
    topPages,
    sessionBehavior,
    topSites,
    hourly,
    daily,
    categories,
  } = analytics;
  const coverage = `${activity.measurementCoverage.toFixed(activity.measurementCoverage >= 10 ? 0 : 1)}%`;
  return (
    <div className="analytics-dashboard">
      <p className="analytics-intro">
        Active time counts foreground, non-idle engagement on supported web pages. Coverage shows how many
        filtered visits include a measurement; missing measurements are never estimated.
      </p>
      <div className="cards">
        <div className="card"><div className="big">{formatDuration(activity.totalActiveMs)}</div><div className="cap">Measured active time</div></div>
        <div className="card"><div className="big">{coverage}</div><div className="cap">Measurement coverage</div><div className="metric-note">{activity.measuredVisits} of {overview.totalVisits} visits</div></div>
        <div className="card"><div className="big">{formatDuration(activity.averageActiveMs)}</div><div className="cap">Average measured visit</div></div>
        <div className="card"><div className="big">{sessionBehavior.sessionCount}</div><div className="cap">Browsing sessions</div></div>
      </div>

      <div className="analytics-section">
        <h2>Where active time goes</h2>
        <p>Percentages use measured foreground time within the selected filters.</p>
      </div>
      <div className="grid-2">
        <section className="panel"><h3>Time by category</h3><ShareDonut data={categoryTime} /></section>
        <section className="panel"><h3>Time by site</h3><TimeShareBars data={siteTime} /></section>
      </div>

      <div className="analytics-section">
        <h2>Activity patterns</h2>
        <p>Daily and weekly rhythms use your local timezone.</p>
      </div>
      <div className="grid-2">
        <section className="panel"><h3>Active time by day</h3><ActivityTrendChart data={dailyActivity} /></section>
        <section className="panel"><h3>Weekday and hour</h3><WeekActivityHeatmap bins={weeklyActivity} /></section>
      </div>

      <div className="analytics-section">
        <h2>Most engaged pages</h2>
        <p>Pages ranked by accumulated foreground, non-idle time.</p>
      </div>
      <section className="panel">
        {topPages.length === 0 ? (
          <div className="chart-empty">No measured page time in this range.</div>
        ) : (
          <table className="top-pages">
            <colgroup><col /><col style={{ width: 72 }} /><col style={{ width: 74 }} /><col style={{ width: 62 }} /></colgroup>
            <thead><tr><th>Page</th><th>Active</th><th>Share</th><th>Visits</th></tr></thead>
            <tbody>
              {topPages.map((page) => (
                <tr key={page.url}>
                  <td>
                    <a className="top-page-link" href={page.url} target="_blank" rel="noreferrer" title={page.url}>
                      <span className="top-page-title">{page.title || prettyUrl(page.url)}</span>
                      <span className="top-page-host">{page.host}</span>
                    </a>
                  </td>
                  <td>{formatDuration(page.activeMs)}</td>
                  <td>{page.percentage.toFixed(page.percentage >= 10 ? 0 : 1)}%</td>
                  <td>{page.visits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="analytics-section">
        <h2>Session behavior</h2>
        <p>Sessions split after 30 minutes without a recorded navigation.</p>
      </div>
      <section className="panel">
        <div className="session-metrics">
          <div className="session-metric"><strong>{formatDuration(sessionBehavior.averageSessionMs)}</strong><span>Average session span</span></div>
          <div className="session-metric"><strong>{formatDuration(sessionBehavior.longestSessionMs)}</strong><span>Longest session span</span></div>
          <div className="session-metric"><strong>{sessionBehavior.averagePagesPerSession.toFixed(1)}</strong><span>Pages per session</span></div>
          <div className="session-metric"><strong>{sessionBehavior.domainSwitches}</strong><span>Domain switches</span></div>
        </div>
      </section>

      <div className="analytics-section">
        <h2>Visit context</h2>
        <p>Visit frequency complements active-time analytics without changing its percentages.</p>
      </div>
      <div className="cards">
        <div className="card"><div className="big">{overview.totalVisits}</div><div className="cap">Total visits</div></div>
        <div className="card"><div className="big">{overview.uniqueUrls}</div><div className="cap">Unique pages</div></div>
        <div className="card"><div className="big">{overview.uniqueHosts}</div><div className="cap">Sites</div></div>
        <div className="card"><div className="big">{daily.length}</div><div className="cap">Active days</div></div>
      </div>
      <section className="panel"><h3>Visits by hour of day</h3><Heatmap bins={hourly} /></section>
      <div className="grid-2">
        <section className="panel"><h3>Top sites by visits</h3><BarList data={topSites} max={8} /></section>
        <section className="panel"><h3>Categories by visits</h3><BarList data={categories} /></section>
      </div>
      <section className="panel"><h3>Visits per day</h3><BarList data={daily} /></section>
    </div>
  );
}
