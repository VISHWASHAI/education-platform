const BAR_COLOR = '#1D4ED8';

export function RevenueChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-slate-500">No payment history yet.</p>;
  }

  const max = Math.max(...data.map((d) => d.revenue), 1);
  const width = 640;
  const height = 220;
  const padding = { top: 12, bottom: 28, left: 8, right: 8 };
  const chartHeight = height - padding.top - padding.bottom;
  const barGap = 8;
  const barWidth = (width - padding.left - padding.right) / data.length - barGap;

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Monthly revenue bar chart"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[480px]"
      >
        {data.map((d, i) => {
          const barHeight = Math.max((d.revenue / max) * chartHeight, 2);
          const x = padding.left + i * (barWidth + barGap);
          const y = padding.top + (chartHeight - barHeight);
          return (
            <g key={d.month}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx={4} fill={BAR_COLOR}>
                <title>{`${d.month}: ₹${d.revenue.toLocaleString('en-IN')}`}</title>
              </rect>
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-500"
                fontSize="10"
              >
                {d.month.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
