import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/server/types";

/**
 * Order status, shown as one tag everywhere it appears.
 *
 * Money states get colour; everything in flight stays neutral. A dashboard
 * where half the rows glow amber trains people to ignore colour, so "pending"
 * is deliberately quiet and only settled, failed and expired carry a tone.
 *
 * Set in the sans face, sentence case, like every other label in the system.
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
 * A soft tinted capsule. The ink build used a hard left rule instead, because on
 * a dark ground six filled pills down a table read as a stack of buttons — but
 * on paper a 10% tint is quiet enough to repeat down a column and still gives
 * the status a shape of its own, which a bare rule never did.
 */
const STYLES: Record<Tone, string> = {
  neutral: "bg-surface-3 text-text-muted",
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "font-sans font-medium capitalize text-[11px] leading-none tracking-mono",
        STYLES[tone],
        className,
      )}
    >
      {live ? <span className="h-1 w-1 animate-pulse rounded-full bg-current" /> : null}
      {status}
    </span>
  );
}
