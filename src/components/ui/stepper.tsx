"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The add/remove affordance used wherever a merchant grows their setup: a new
 * receiving wallet, a team member, another payout destination.
 *
 * The "+" rotates into an "×" when the control is armed to remove, so a single
 * square handles both directions without a second button appearing. The
 * stacked card peeking out behind is the "add another" hint — it slides fully
 * behind the button on press, as if the new one has been dealt onto the pile.
 */
export function AddButton({
  onClick,
  label,
  stacked = false,
  active = false,
  className,
}: {
  onClick?: () => void;
  label: string;
  /** Show the duplicated card behind the button. */
  stacked?: boolean;
  /** Armed to remove: the "+" becomes an "×". */
  active?: boolean;
  className?: string;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <div className={cn("relative inline-grid", className)}>
      {stacked ? (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-md bg-surface-2 ring-1 ring-line",
            "transition-transform duration-slow ease-linq",
            pressed ? "translate-x-0 translate-y-0" : "translate-x-1.5 translate-y-1.5",
          )}
        />
      ) : null}

      <button
        type="button"
        aria-label={label}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onClick={onClick}
        className={cn(
          "relative grid h-12 w-12 place-items-center rounded-md bg-surface ring-1 ring-line",
          "shadow-sm transition duration-fast ease-linq hover:shadow-md active:scale-[0.94]",
          active && "bg-accent-soft ring-accent/40",
        )}
      >
        <Plus
          className={cn(
            "h-5 w-5 transition-transform duration-slow ease-linq",
            active ? "rotate-45 text-accent" : "rotate-0 text-text-muted",
          )}
        />
      </button>
    </div>
  );
}
