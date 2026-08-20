// Fixed-order categorical palette (validated for CVD-safe adjacent contrast).
// Colors are assigned by position, never re-cycled or reassigned when the list changes.
const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7'];

export function CategoryBarList({ data, labelKey, valueKey }) {
  if (!data || data.length === 0) {
    return <p className="text-slate-500">No data available yet.</p>;
  }
  const max = Math.max(...data.map((d) => d[valueKey]), 1);

  return (
    <div className="space-y-4">
      {data.map((d, i) => {
        const pct = (d[valueKey] / max) * 100;
        const color = CATEGORICAL[i % CATEGORICAL.length];
        return (
          <div key={d[labelKey]}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                {d[labelKey]}
              </span>
              <span className="text-slate-900 font-semibold tabular-nums">{d[valueKey]}</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
