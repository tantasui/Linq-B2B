import { cn } from "@/lib/utils";

/**
 * Placeholders shaped like the content they stand in for — a balance-sized
 * block where the balance goes, rows where rows go. A spinner over a blank
 * screen reads as slower than it is and guarantees a layout jump when the real
 * data lands.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("linq-skeleton rounded-sm", className)} />;
}

export function BalanceSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function RowSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-lg bg-surface p-4 ring-1 ring-line">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
