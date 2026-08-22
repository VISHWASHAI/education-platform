const ICON_GRADIENTS = {
  blue: 'from-blue-500 to-blue-700',
  green: 'from-emerald-500 to-emerald-700',
  orange: 'from-orange-500 to-orange-700',
  red: 'from-red-500 to-red-700',
  purple: 'from-purple-500 to-purple-700',
};

export function StatCard({ title, value, change, icon: Icon, changeType = 'positive', color = 'blue' }) {
  const changeColor = changeType === 'positive' ? 'text-success' : 'text-danger';
  return (
    <div className="glass-card p-6 hover:border-blue-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold leading-tight min-h-[2rem] flex items-center">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          {change && <p className={`text-sm mt-1 ${changeColor}`}>{change}</p>}
        </div>
        {Icon && (
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 text-white bg-gradient-to-br shadow-sm ${
              ICON_GRADIENTS[color] ?? ICON_GRADIENTS.blue
            }`}
          >
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
}
