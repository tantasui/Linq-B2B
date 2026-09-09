import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/server/types";

/**
 * Order status, shown as one tag everywhere it appears.
 *
 * Money states get colour; everything in flight stays neutral. A dashboard
 * where half the rows glow amber trains people to ignore colour, so "pending"
 * is deliberately quiet and only settled, failed and expired carry a tone.
 *
 * Set in mono and uppercase, like every other label in the system — the status
 * of an order is metadata about it, and metadata is mono here.
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

/**
 * A left rule in the tone's colour rather than a filled pill: on ink, six
 * filled pills down a table read as a stack of buttons. The rule marks the row
 * without competing with the amount at the end of it.
 */
const STYLES: Record<Tone, string> = {
  neutral: "border-text-subtle/50 text-text-muted",
  positive: "border-success text-success",
  negative: "border-danger text-danger",
  progress: "border-accent text-accent-text",
};

export function StatusPill({ status, className }: { status: OrderStatus; className?: string }) {
  const tone = TONES[status] ?? "neutral";
  const live = tone === "progress";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border-l-2 py-0.5 pl-2",
        "font-mono text-[10px] uppercase tracking-mono",
        STYLES[tone],
        className,
      )}
    >
      {live ? <span className="h-1 w-1 animate-pulse rounded-full bg-current" /> : null}
      {status}
    </span>
  );
}
