import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline";
}

/** A square mono tag, in the same voice as the landing's section markers. */
export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center border border-transparent px-2 py-0.5",
        "font-mono text-[10px] uppercase tracking-mono",
        variant === "default" && "bg-accent text-accent-contrast",
        variant === "secondary" && "bg-surface-2 text-text-muted",
        variant === "outline" && "border-line text-text-muted",
        className,
      )}
      {...props}
    />
  );
}
