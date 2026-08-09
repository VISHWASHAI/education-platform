const LINE_COLOR = '#1D4ED8';

export function LineChart({ data, valueKey, labelKey, yMax = 100, unit = '%' }) {
  if (!data || data.length === 0) {
    return <p className="text-slate-500">No data available yet.</p>;
  }

  const width = 640;
  const height = 220;
  const padding = { top: 16, bottom: 28, left: 8, right: 8 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - (Math.min(d[valueKey], yMax) / yMax) * chartHeight;
    return { x, y, d };
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const step = Math.max(Math.ceil(data.length / 8), 1);

  return (
    <div className="overflow-x-auto">
      <svg role="img" aria-label="Trend line chart" viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[480px]">
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#E2E8F0" />
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#E2E8F0" />
        <path d={path} fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={LINE_COLOR}>
              <title>{`${p.d[labelKey]}: ${p.d[valueKey]}${unit}`}</title>
            </circle>
            {i % step === 0 && (
              <text x={p.x} y={height - 8} textAnchor="middle" className="fill-slate-500" fontSize="10">
                {String(p.d[labelKey]).slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
