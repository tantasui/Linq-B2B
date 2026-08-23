import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/server/types";

/**
 * Order status, shown as one pill everywhere it appears.
 *
 * Money states get colour; everything in flight stays neutral. A dashboard
 * where half the rows glow amber trains people to ignore colour, so "pending"
 * is deliberately quiet and only settled, failed and expired carry a tone.
 */

type Tone = "neutral" | "positive" | "negative" | "progress";

const TONES: Record<OrderStatus, Tone> = {
  initiated: "neutral",
  deposited: "progress",
  pending: "progress",
  fulfilling: "progress",
  fulfilled: "positive",
  validated: "progress",
  settling: "progress",
  settled: "positive",
  cancelled: "neutral",
  refunding: "progress",
  refunded: "neutral",
  expired: "negative",
  failed: "negative",
};

const STYLES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-text-muted",
  positive: "bg-success-soft text-success",
  negative: "bg-danger-soft text-danger",
  progress: "bg-accent-soft text-accent-text",
};

export function StatusPill({ status, className }: { status: OrderStatus; className?: string }) {
  const tone = TONES[status] ?? "neutral";
  const live = tone === "progress";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize",
        STYLES[tone],
        className,
      )}
    >
      {live ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> : null}
      {status}
    </span>
  );
}
