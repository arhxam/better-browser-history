import type { Count } from '../../core/analytics';

export function BarList({ data, max }: { data: Count[]; max?: number }) {
  const top = max ? data.slice(0, max) : data;
  const peak = Math.max(1, ...top.map((d) => d.count));
  if (top.length === 0) return <div className="empty">No data</div>;
  return (
    <div>
      {top.map((d) => (
        <div className="bar-row" key={d.key}>
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
    <div>
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
    </div>
  );
}
