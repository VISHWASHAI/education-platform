export function StatCard({ title, value, change, icon: Icon, changeType = 'positive' }) {
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
          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
}
