"use client";

import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * The date scrubber: a horizontal run of dates where the current one is a
 * large filled circle and its neighbours are smaller, quieter and set back.
 *
 * Selecting a neighbour scrolls it into the centre, where it grows into the
 * active circle while the previous one shrinks away — the position of the
 * selection carries the meaning, so the list never needs a highlight colour.
 *
 * Used for the transaction-history period scrubber and statement pickers.
 */

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function DateCarousel({
  value,
  onChange,
  days = 21,
  counts,
  className,
}: {
  value: Date;
  onChange: (date: Date) => void;
  /** How many days back from today to offer. */
  days?: number;
  /** Optional activity count per ISO date, shown as a dot under the day. */
  counts?: Record<string, number>;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const activeKey = startOfDay(value).toDateString();

  const dates = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (days - 1 - index));
      return date;
    });
  }, [days]);

  // Keep the selection centred, including on first paint — the pattern only
  // reads as a "current position" if the active date is actually in the middle.
  const mounted = useRef(false);
  useEffect(() => {
    const active = track.current?.querySelector<HTMLElement>("[data-active='true']");
    active?.scrollIntoView({
      behavior: mounted.current ? "smooth" : "auto",
      block: "nearest",
      inline: "center",
    });
    mounted.current = true;
  }, [activeKey]);

  return (
    <div
      ref={track}
      className={cn(
        "flex items-center gap-1 overflow-x-auto scroll-smooth py-1",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <span className="shrink-0" style={{ width: "45%" }} aria-hidden />
      {dates.map((date) => {
        const active = date.toDateString() === activeKey;
        const count = counts?.[date.toISOString().slice(0, 10)] ?? 0;
        return (
          <button
            key={date.toISOString()}
            type="button"
            data-active={active}
            aria-current={active ? "date" : undefined}
            onClick={() => onChange(date)}
            className={cn(
              "flex shrink-0 flex-col items-center justify-center rounded-full",
              "transition-all duration-slow ease-linq",
              active
                ? "h-14 w-14 bg-text text-bg"
                : "h-11 w-11 text-text-muted opacity-55 hover:opacity-100",
            )}
          >
            <span className="text-[10px] uppercase tracking-wide">
              {date.toLocaleDateString(undefined, { weekday: "narrow" })}
            </span>
            <span className={cn("tnum leading-none", active ? "text-lg font-semibold" : "text-sm")}>
              {date.getDate()}
            </span>
            {count > 0 ? (
              <span
                className={cn(
                  "mt-0.5 h-1 w-1 rounded-full",
                  active ? "bg-bg/70" : "bg-accent",
                )}
                aria-hidden
              />
            ) : (
              <span className="mt-0.5 h-1 w-1" aria-hidden />
            )}
          </button>
        );
      })}
      <span className="shrink-0" style={{ width: "45%" }} aria-hidden />
    </div>
  );
}
