"use client";

import { cn } from "@/lib/utils";

/**
 * One success pattern for the whole app: a checkmark that draws itself inside
 * an accent circle. Successful payments, KYC approval and settings changes all
 * use this — a single confirmation gesture is easier to trust than three.
 */
export function SuccessCheck({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full bg-accent/10 text-accent",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" role="presentation">
        <path
          d="M4.5 12.5 L9.8 18 L19.5 6.8"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1}
          style={{ animation: "linq-draw 400ms var(--ease) 80ms forwards" }}
        />
      </svg>
    </span>
  );
}
