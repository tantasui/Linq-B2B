import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Elevation comes from a soft shadow and a hairline ring rather than a hard
 * border, and inner elements step down one radius so nested corners stay
 * concentric with the card that holds them.
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
        "transition duration-fast ease-linq hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.995]",
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

/** Section heading used above a group of cards. */
export function SectionHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-4", className)}>
      <h2 className="text-sm font-medium text-text">{title}</h2>
      {action}
    </div>
  );
}
