import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A panel that actually sits on the page.
 *
 * On paper the ink build's device — a hairline rule and a step in surface value
 * — collapses: white on off-white is barely a step, and a rule dark enough to
 * register reads as a cut. So a panel separates with a soft rule *and* a small
 * warm shadow, and rounds at --r-lg. Interactive panels lift on hover rather
 * than changing colour, which is the cheaper signal to read at a glance.
 */
export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }
>(({ className, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg bg-surface p-5 shadow-sm ring-1 ring-line",
      interactive &&
        "transition duration-fast ease-linq hover:-translate-y-0.5 hover:shadow-md hover:ring-line-strong active:translate-y-0 active:scale-[0.995]",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("text-[0.9375rem] font-medium tracking-[-0.01em]", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-xs leading-5 text-text-muted", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

/**
 * Section heading used above a group of panels.
 *
 * This is the product's version of the landing's "01 — Get paid" marker: sans,
 * sentence case, sitting on its own hairline. Passing `index` prints the number
 * too, which is what makes a dashboard scan as chapters rather than as a pile
 * of cards.
 */
export function SectionHeader({
  title,
  index,
  action,
  className,
}: {
  title: string;
  index?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4 border-b border-line pb-2.5", className)}>
      <h2 className="font-sans font-medium text-label tracking-mono text-text-subtle">
        {index ? <span className="mr-2 text-text-muted">{index} —</span> : null}
        {title}
      </h2>
      {action}
    </div>
  );
}
