"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A dashboard page's title, what it is for, and its actions — and the browser
 * tab's title, so a history full of dashboard pages reads as more than "Linq".
 *
 * Replaces the numbered "03 — Orders" marker over a second, different title
 * ("Payments"): one page, one name.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    document.title = `${title} · LinqSwitch`;
  }, [title]);

  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="u-display text-[2rem] sm:text-hero">{title}</h1>
        {description ? <p className="mt-2 max-w-prose text-sm text-text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A figure that counts up once when it first arrives, then holds still: a
 * refetch lands the new value directly, so a balance never visibly re-counts
 * while someone is reading it. Screen readers get the final value only.
 */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const [counted, setCounted] = useState(false);

  useEffect(() => {
    if (counted || prefersReducedMotion() || value === 0) {
      setShown(value);
      return;
    }
    setCounted(true);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 800);
      setShown(value * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    setShown(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // Counting is a first-arrival effect only; `counted` gates the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
