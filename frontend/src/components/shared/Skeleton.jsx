export function Skeleton({ className = '', style }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} style={style} />;
}

export function SkeletonStatCard() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
      </div>
    </div>
  );
}

export function SkeletonStatRow({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTableRows({ columns = 4, rows = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-slate-100">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="py-3">
              <Skeleton className="h-4" style={{ width: `${55 + ((r + c) % 4) * 10}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonCardList({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-6">
          <Skeleton className="h-4 w-1/3 mb-3" />
          <Skeleton className="h-3 w-full mb-2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 220 }) {
  return <Skeleton className="w-full" style={{ height }} />;
}
