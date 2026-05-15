export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div className={`h-3 bg-neutral-200 rounded animate-pulse ${className}`} />
  );
}

export function NuggetCardSkeleton() {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-3 h-3 rounded-full bg-neutral-200 flex-shrink-0 mt-1" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-16 bg-neutral-200 rounded" />
            <div className="h-3 w-24 bg-neutral-100 rounded" />
            <div className="ml-auto h-5 w-14 bg-neutral-100 rounded-full" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 bg-neutral-200 rounded w-full" />
            <div className="h-3 bg-neutral-200 rounded w-5/6" />
            <div className="h-3 bg-neutral-100 rounded w-3/4" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <div className="h-5 w-12 bg-neutral-100 rounded-full" />
            <div className="h-5 w-16 bg-neutral-100 rounded-full" />
            <div className="ml-auto h-3 w-20 bg-neutral-100 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 animate-pulse space-y-2">
      <div className="h-3 w-24 bg-neutral-200 rounded" />
      <div className="h-8 w-16 bg-neutral-200 rounded" />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <NuggetCardSkeleton key={i} />
      ))}
    </div>
  );
}
