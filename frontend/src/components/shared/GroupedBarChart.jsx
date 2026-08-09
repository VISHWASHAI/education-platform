const SERIES_COLORS = ['#1D4ED8', '#38BDF8'];

export function GroupedBarChart({ data, labelKey, series }) {
  const items = (data || []).filter((d) => series.some((s) => d[s.key] !== null && d[s.key] !== undefined));
  if (items.length === 0) {
    return <p className="text-slate-500">No data available yet.</p>;
  }

  const width = 640;
  const height = 240;
  const padding = { top: 12, bottom: 40, left: 8, right: 8 };
  const chartHeight = height - padding.top - padding.bottom;
  const groupGap = 16;
  const barGap = 3;
  const groupWidth = (width - padding.left - padding.right) / items.length - groupGap;
  const barWidth = (groupWidth - barGap * (series.length - 1)) / series.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {series.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: SERIES_COLORS[i] }} />
            {s.label}
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg role="img" aria-label="Grouped bar chart comparing classes" viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[480px]">
          {items.map((item, gi) => {
            const groupX = padding.left + gi * (groupWidth + groupGap);
            return (
              <g key={gi}>
                {series.map((s, si) => {
                  const value = item[s.key] ?? 0;
                  const barHeight = Math.max((value / 100) * chartHeight, 2);
                  const x = groupX + si * (barWidth + barGap);
                  const y = padding.top + (chartHeight - barHeight);
                  return (
                    <rect key={s.key} x={x} y={y} width={barWidth} height={barHeight} rx={3} fill={SERIES_COLORS[si]}>
                      <title>{`${item[labelKey]} — ${s.label}: ${item[s.key] ?? 'N/A'}%`}</title>
                    </rect>
                  );
                })}
                <text
                  x={groupX + groupWidth / 2}
                  y={height - padding.bottom + 16}
                  textAnchor="middle"
                  className="fill-slate-500"
                  fontSize="10"
                >
                  {item[labelKey]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
