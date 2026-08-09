const BAR_COLOR = '#1D4ED8';

export function PercentBarChart({ data, labelKey, valueKey }) {
  const items = (data || []).filter((d) => d[valueKey] !== null && d[valueKey] !== undefined);
  if (items.length === 0) {
    return <p className="text-slate-500">No graded data available yet.</p>;
  }

  const width = 640;
  const rowHeight = 36;
  const height = items.length * rowHeight + 16;
  const labelWidth = 160;
  const barAreaWidth = width - labelWidth - 56;

  return (
    <div className="overflow-x-auto">
      <svg role="img" aria-label="Percentage bar chart" viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[480px]">
        {items.map((item, i) => {
          const y = i * rowHeight + 8;
          const barWidth = Math.max((item[valueKey] / 100) * barAreaWidth, 2);
          return (
            <g key={i}>
              <text x={0} y={y + 16} className="fill-slate-600" fontSize="11">
                {String(item[labelKey]).length > 22 ? `${String(item[labelKey]).slice(0, 22)}…` : item[labelKey]}
              </text>
              <rect x={labelWidth} y={y + 4} width={barAreaWidth} height={16} rx={4} fill="#F1F5F9" />
              <rect x={labelWidth} y={y + 4} width={barWidth} height={16} rx={4} fill={BAR_COLOR}>
                <title>{`${item[labelKey]}: ${item[valueKey]}%`}</title>
              </rect>
              <text x={labelWidth + barAreaWidth + 8} y={y + 16} className="fill-slate-900" fontSize="11" fontWeight="600">
                {item[valueKey]}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
