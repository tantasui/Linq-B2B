import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A panel, not a floating card.
 *
 * On the ink surface a drop shadow reads as fog, so structure comes from a
 * hairline rule and a one-step lift in surface value — the same device the
 * landing uses for the chain roster and the steps rail. Corners are square
 * everywhere; the only circles in the product are avatars and coins.
 */
export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }
>(({ className, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-surface p-5 ring-1 ring-line",
      interactive &&
        "transition duration-fast ease-linq hover:bg-surface-2 hover:ring-line-strong active:scale-[0.995]",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("text-sm font-medium tracking-[-0.01em]", className)} {...props} />
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
 * This is the product's version of the landing's "01 — GET PAID" marker: mono,
 * uppercase, tracked out, sitting on its own hairline. Passing `index` prints
 * the number too, which is what makes a dashboard scan as chapters rather than
 * as a pile of cards.
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
      <h2 className="font-mono text-label uppercase tracking-mono text-text-subtle">
        {index ? <span className="mr-2 text-text-muted">{index} —</span> : null}
        {title}
      </h2>
      {action}
    </div>
  );
}
