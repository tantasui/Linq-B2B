"use client";

import { cn } from "@/lib/utils";

/**
 * The segmented gradient bar — this product's progress and loading device,
 * used instead of a generic spinner for conversion progress, KYC steps and
 * payout processing.
 *
 * The fill steps through the brand's purple ramp across the segments, matching
 * the source asset, so a full bar reads as the gradient it was drawn as.
 * Unfilled segments sit at ~15% of the accent hue rather than gray, so an
 * incomplete bar still reads as on-brand; in dark mode they fall back to 15%
 * white, where a 15% purple would sink into the surface.
 *
 * Omit `value` for the indeterminate case: segments pulse in sequence, a soft
 * opacity wave travelling left to right, which keeps the segmented identity
 * even when there is no percentage to report.
 */

/** Sampled from the source asset, light → dark reversed to fill left-to-right. */
const RAMP = ["#8A4FFF", "#9661FF", "#A172FF", "#AD84FF", "#B995FF", "#C5A7FF", "#D0B9FF", "#DCCAFF"];

export function SegmentedBar({
  value,
  segments = 6,
  className,
  label,
}: {
  /** Completed segment count. Omit for indeterminate loading. */
  value?: number;
  segments?: number;
  className?: string;
  label?: string;
}) {
  const indeterminate = value === undefined;

  return (
    <div className={cn("w-full", className)}>
      <div
        className="flex w-full gap-1.5"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={segments}
        aria-valuenow={indeterminate ? undefined : value}
        aria-label={label ?? (indeterminate ? "Processing" : "Progress")}
      >
        {Array.from({ length: segments }, (_, index) => {
          const filled = !indeterminate && index < (value ?? 0);
          const tint = RAMP[Math.min(index, RAMP.length - 1)];
          return (
            <span
              key={index}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                // Each segment fills on its own beat rather than one long sweep
                // across the whole bar, so a completed step reads as a step.
                "transition-opacity duration-slow ease-linq",
                filled || indeterminate ? "opacity-100" : "opacity-[0.15] dark:bg-white",
              )}
              style={{
                backgroundColor: filled || indeterminate ? tint : undefined,
                ...(indeterminate
                  ? {
                      animation: "linq-segment-wave 1.4s ease-in-out infinite",
                      animationDelay: `${index * 110}ms`,
                    }
                  : null),
              }}
            />
          );
        })}
      </div>
      {label ? <p className="mt-2.5 text-xs text-text-muted">{label}</p> : null}
    </div>
  );
}
