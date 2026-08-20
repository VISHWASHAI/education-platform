const LINE_COLOR = '#1D4ED8';
const GRID_COLOR = '#EDF1F7';
const AXIS_COLOR = '#E2E8F0';

export function LineChart({ data, valueKey, labelKey, yMax = 100, unit = '%' }) {
  if (!data || data.length === 0) {
    return <p className="text-slate-500">No data available yet.</p>;
  }

  const width = 640;
  const height = 240;
  const padding = { top: 16, bottom: 28, left: 8, right: 8 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - (Math.min(d[valueKey], yMax) / yMax) * chartHeight;
    return { x, y, d };
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${path} L ${points[points.length - 1].x.toFixed(1)} ${height - padding.bottom} L ${points[0].x.toFixed(1)} ${height - padding.bottom} Z`;
  const step = Math.max(Math.ceil(data.length / 8), 1);
  const gridSteps = [0, 25, 50, 75, 100];
  const last = points[points.length - 1];

  return (
    <div className="overflow-x-auto">
      <svg role="img" aria-label="Trend line chart" viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[480px]">
        <defs>
          <linearGradient id="lineChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE_COLOR} stopOpacity="0.16" />
            <stop offset="100%" stopColor={LINE_COLOR} stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridSteps.map((g) => {
          const y = padding.top + chartHeight - (g / yMax) * chartHeight;
          return (
            <g key={g}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
              <text x={padding.left} y={y - 4} className="fill-slate-400" fontSize="9">
                {g}{unit}
              </text>
            </g>
          );
        })}

        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke={AXIS_COLOR} />

        <path d={areaPath} fill="url(#lineChartFill)" stroke="none" />
        <path d={path} fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={isLast ? 4.5 : 3} fill={isLast ? LINE_COLOR : 'white'} stroke={LINE_COLOR} strokeWidth={isLast ? 0 : 2}>
                <title>{`${p.d[labelKey]}: ${p.d[valueKey]}${unit}`}</title>
              </circle>
              {i % step === 0 && (
                <text x={p.x} y={height - 8} textAnchor="middle" className="fill-slate-500" fontSize="10">
                  {String(p.d[labelKey]).slice(5)}
                </text>
              )}
            </g>
          );
        })}

        {last && (
          <text x={last.x} y={last.y - 12} textAnchor="middle" className="fill-slate-900" fontSize="11" fontWeight="700">
            {last.d[valueKey]}{unit}
          </text>
        )}
      </svg>
    </div>
  );
}
