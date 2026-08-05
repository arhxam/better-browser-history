import type { EnrichedEntry } from '../../db/repository';
import { formatDuration } from '../../core/engagement';
import { hostColor, hostInitial, prettyUrl, clockTime } from './format';
import { Icon } from './Icon';

export function EntryRow({
  entry,
  onToggleStar,
}: {
  entry: EnrichedEntry;
  onToggleStar?: (url: string, starred: boolean) => void;
}) {
  const starred = entry.annotation?.starred ?? false;
  const tags = entry.annotation?.tags ?? [];
  const dwell = entry.engagement?.activeMs ?? 0;
  return (
    <a className="entry" href={entry.url} target="_blank" rel="noreferrer">
      <div className="avatar" style={{ background: hostColor(entry.host) }}>
        {hostInitial(entry.host)}
      </div>
      <div className="entry-main">
        <div className="entry-title">{entry.title || prettyUrl(entry.url)}</div>
        <div className="entry-url">{prettyUrl(entry.url)}</div>
      </div>
      <div className="entry-meta">
        {tags.map((t) => (
          <span className="badge tag" key={t}>#{t}</span>
        ))}
        {dwell > 0 && <span className="badge" title="Active time on page">{formatDuration(dwell)}</span>}
        {entry.visitCount > 1 && <span className="badge" title="Visits">{entry.visitCount}×</span>}
        <span title={new Date(entry.lastSeen).toLocaleString()}>{clockTime(entry.lastSeen)}</span>
        <button
          className={`star-btn ${starred ? 'on' : ''}`}
          title={starred ? 'Unstar' : 'Star'}
          onClick={(e) => {
            e.preventDefault();
            onToggleStar?.(entry.url, !starred);
          }}
        >
          <Icon name={starred ? 'star-filled' : 'star'} size={16} />
        </button>
      </div>
    </a>
  );
}
