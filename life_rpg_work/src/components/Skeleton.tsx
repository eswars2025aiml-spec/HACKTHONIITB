export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="h-5 w-40 rounded bg-slate-700/60" />
          <div className="h-3 w-24 rounded bg-slate-700/40" />
        </div>
        <div className="h-8 w-8 rounded-lg bg-slate-700/60" />
      </div>
      <div className="h-3 w-full rounded bg-slate-700/40 mb-2" />
      <div className="h-3 w-2/3 rounded bg-slate-700/40 mb-4" />
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-full bg-slate-700/50" />
        <div className="h-6 w-16 rounded-full bg-slate-700/50" />
        <div className="h-6 w-20 rounded-full bg-slate-700/50" />
      </div>
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-slate-700/60" />
        <div className="space-y-1.5">
          <div className="h-3 w-20 rounded bg-slate-700/50" />
          <div className="h-4 w-12 rounded bg-slate-700/60" />
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-700/40" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-700/50 bg-slate-800/40 p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-20 w-20 rounded-2xl bg-slate-700/60" />
        <div className="space-y-2">
          <div className="h-6 w-32 rounded bg-slate-700/60" />
          <div className="h-4 w-20 rounded bg-slate-700/50" />
        </div>
      </div>
      <div className="h-4 w-full rounded bg-slate-700/40 mb-2" />
      <div className="h-2 w-full rounded-full bg-slate-700/40" />
    </div>
  );
}
