import type { EnrichedEntry, SessionView, AnalyticsBundle } from '../../db/repository';
import type { Journey, JourneyNode, Visit } from '../../core/types';
import { EntryRow } from './EntryRow';
import { BarList, Heatmap } from './charts';
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
  const { overview, topSites, hourly, daily, categories } = analytics;
  return (
    <div>
      <div className="cards">
        <div className="card"><div className="big">{overview.totalVisits}</div><div className="cap">Total visits</div></div>
        <div className="card"><div className="big">{overview.uniqueUrls}</div><div className="cap">Unique pages</div></div>
        <div className="card"><div className="big">{overview.uniqueHosts}</div><div className="cap">Sites</div></div>
        <div className="card"><div className="big">{daily.length}</div><div className="cap">Active days</div></div>
      </div>
      <div className="panel">
        <h3>Activity by hour of day</h3>
        <Heatmap bins={hourly} />
      </div>
      <div className="grid-2">
        <div className="panel"><h3>Top sites</h3><BarList data={topSites} max={8} /></div>
        <div className="panel"><h3>Categories</h3><BarList data={categories} /></div>
      </div>
      <div className="panel"><h3>Visits per day</h3><BarList data={daily} /></div>
    </div>
  );
}
