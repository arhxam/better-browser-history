import type { ActivityTrend, Count, TimeShare } from '../../core/analytics';
import { formatDuration } from '../../core/engagement';

const DONUT_COLORS = ['#18181b', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7', '#f4f4f5'];

function percentage(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  return value >= 10 ? `${value.toFixed(0)}%` : `${value.toFixed(1)}%`;
}

export function BarList({ data, max }: { data: Count[]; max?: number }) {
  const top = max ? data.slice(0, max) : data;
  const peak = Math.max(1, ...top.map((d) => d.count));
  if (top.length === 0) return <div className="empty">No data</div>;
  return (
    <div role="list">
      {top.map((d) => (
        <div className="bar-row" key={d.key} role="listitem" aria-label={`${d.key}: ${d.count} visits`}>
          <div className="bar-label" title={d.key}>{d.key}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(d.count / peak) * 100}%` }} />
          </div>
          <div className="bar-val">{d.count}</div>
        </div>
      ))}
    </div>
  );
}

export function Heatmap({ bins }: { bins: number[] }) {
  const peak = Math.max(1, ...bins);
  return (
    <figure className="chart-figure" aria-label="Visits by hour of day">
      <div className="heatmap">
        {bins.map((v, h) => {
          const intensity = v / peak;
          const bg = intensity === 0 ? undefined : `rgba(24,24,27,${0.1 + intensity * 0.8})`;
          return <div key={h} className="heat-cell" style={{ background: bg }} title={`${h}:00 — ${v} visits`} />;
        })}
      </div>
      <div className="heat-axis">
        {bins.map((_, h) => (
          <span key={h} style={{ textAlign: 'center' }}>{h % 6 === 0 ? h : ''}</span>
        ))}
      </div>
    </figure>
  );
}

export function TimeShareBars({ data, max = 10 }: { data: TimeShare[]; max?: number }) {
  const top = data.slice(0, max);
  if (top.length === 0) return <div className="chart-empty">No measured active time in this range.</div>;
  return (
    <figure className="chart-figure" aria-label="Share of active time by site">
      <div className="share-list" role="list">
        {top.map((item) => (
          <div
            className="share-row"
            key={item.key}
            role="listitem"
            aria-label={`${item.key}: ${percentage(item.percentage)}, ${formatDuration(item.activeMs)}, ${item.visits} visits`}
          >
            <div className="share-head">
              <span className="share-label" title={item.key}>{item.key}</span>
              <span className="share-duration">{formatDuration(item.activeMs)}</span>
              <strong className="share-percent">{percentage(item.percentage)}</strong>
            </div>
            <div className="share-track" aria-hidden="true">
              <div className="share-fill" style={{ width: `${Math.max(1, item.percentage)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function ShareDonut({ data }: { data: TimeShare[] }) {
  if (data.length === 0) return <div className="chart-empty">No measured category time in this range.</div>;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <figure className="chart-figure donut-layout" aria-label="Share of active time by category">
      <div className="donut-wrap">
        <svg className="donut" viewBox="0 0 100 100" role="img" aria-label="Active time category distribution">
          <circle className="donut-base" cx="50" cy="50" r={radius} />
          {data.map((item, index) => {
            const length = (item.percentage / 100) * circumference;
            const segment = (
              <circle
                key={item.key}
                className="donut-segment"
                cx="50"
                cy="50"
                r={radius}
                stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              >
                <title>{`${item.key}: ${percentage(item.percentage)} (${formatDuration(item.activeMs)})`}</title>
              </circle>
            );
            offset += length;
            return segment;
          })}
        </svg>
        <div className="donut-center" aria-hidden="true">
          <strong>{data.length}</strong>
          <span>categories</span>
        </div>
      </div>
      <figcaption className="donut-legend">
        {data.map((item, index) => (
          <div className="legend-row" key={item.key}>
            <span className="legend-dot" style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }} />
            <span className="legend-label" title={item.key}>{item.key}</span>
            <span>{percentage(item.percentage)}</span>
            <span>{formatDuration(item.activeMs)}</span>
          </div>
        ))}
      </figcaption>
    </figure>
  );
}

export function ActivityTrendChart({ data }: { data: ActivityTrend[] }) {
  const visible = data.slice(-30);
  const peak = Math.max(0, ...visible.map((item) => item.activeMs));
  if (visible.length === 0 || peak === 0) return <div className="chart-empty">No measured daily activity in this range.</div>;
  return (
    <figure className="chart-figure" aria-label="Daily active browsing time">
      <div className="trend-chart" role="list">
        {visible.map((item, index) => (
          <div
            className="trend-column"
            key={item.key}
            role="listitem"
            aria-label={`${item.key}: ${formatDuration(item.activeMs)} across ${item.visits} visits`}
            title={`${item.key} — ${formatDuration(item.activeMs)} · ${item.visits} visits`}
          >
            <div className="trend-value">{formatDuration(item.activeMs)}</div>
            <div className="trend-track" aria-hidden="true">
              <div className="trend-fill" style={{ height: `${Math.max(3, (item.activeMs / peak) * 100)}%` }} />
            </div>
            <div className="trend-label">{index === 0 || index === visible.length - 1 ? item.key.slice(5) : ''}</div>
          </div>
        ))}
      </div>
      <figcaption className="chart-caption">Last {visible.length} active day{visible.length === 1 ? '' : 's'} in the selected range</figcaption>
    </figure>
  );
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WeekActivityHeatmap({ bins }: { bins: number[][] }) {
  const values = bins.flat();
  const peak = Math.max(0, ...values);
  if (bins.length !== 7 || bins.some((day) => day.length !== 24) || peak === 0) {
    return <div className="chart-empty">No measured weekly activity in this range.</div>;
  }
  return (
    <figure className="chart-figure" aria-label="Active browsing time by weekday and hour">
      <div className="week-heatmap">
        <div className="week-header" aria-hidden="true">
          <span />
          <div className="week-hours">
            {Array.from({ length: 24 }, (_, hour) => <span key={hour}>{hour % 6 === 0 ? hour : ''}</span>)}
          </div>
        </div>
        {bins.map((day, dayIndex) => (
          <div className="week-row-wrap" key={DAY_LABELS[dayIndex]}>
            <div className="week-day">{DAY_LABELS[dayIndex]}</div>
            <div className="week-row">
              {day.map((activeMs, hour) => {
                const intensity = activeMs / peak;
                const background = activeMs === 0 ? undefined : `rgba(24,24,27,${0.12 + intensity * 0.82})`;
                return (
                  <div
                    key={hour}
                    className="week-cell"
                    style={{ background }}
                    title={`${DAY_LABELS[dayIndex]} ${hour}:00 — ${formatDuration(activeMs)}`}
                    aria-label={`${DAY_LABELS[dayIndex]} ${hour}:00, ${formatDuration(activeMs)}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <figcaption className="chart-caption">Darker cells represent more foreground, non-idle time</figcaption>
    </figure>
  );
}
