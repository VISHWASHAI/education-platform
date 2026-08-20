const ICON_COLORS = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  orange: 'bg-orange-50 text-orange-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
};

export function StatCard({ title, value, change, icon: Icon, changeType = 'positive', color = 'blue' }) {
  const changeColor = changeType === 'positive' ? 'text-success' : 'text-danger';
  return (
    <div className="glass-card p-6 hover:border-blue-200">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold leading-tight min-h-[2rem] flex items-center">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          {change && <p className={`text-sm mt-1 ${changeColor}`}>{change}</p>}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${ICON_COLORS[color] ?? ICON_COLORS.blue}`}>
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
}
