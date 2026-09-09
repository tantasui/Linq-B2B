import * as React from "react";
import { cn } from "@/lib/utils";
import { LinqMark } from "@/components/brand/LinqMark";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "default";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

/**
 * Buttons are the marketing site's buttons: square, mono, uppercase, tracked
 * out. `secondary` is the nav button — a hairline box that fills with paper and
 * flips its label to ink on hover — which is the one interaction the whole
 * system repeats, from the landing's CTA to a cancel in a sheet.
 *
 * Nothing lifts and nothing casts a shadow. On ink, elevation reads as fog;
 * separation comes from the rule around the control instead.
 */
const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-contrast hover:bg-accent-hover",
  default: "bg-accent text-accent-contrast hover:bg-accent-hover",
  secondary: "bg-transparent text-text ring-1 ring-inset ring-text-subtle hover:bg-text hover:text-bg",
  outline: "bg-transparent text-text-muted ring-1 ring-inset ring-line hover:text-text hover:ring-text-subtle",
  ghost: "bg-transparent text-text-muted hover:bg-surface-2 hover:text-text",
  danger: "bg-transparent text-danger ring-1 ring-inset ring-danger/40 hover:bg-danger-soft",
};

/**
 * Sizes are set on the box, not the type: the label is mono at a fixed 12px in
 * every size, the way a set of section markers stays one size down a page. Only
 * `sm` steps down, because it is used inside table rows.
 */
const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[11px] gap-1.5",
  md: "h-11 px-5 text-xs gap-2",
  lg: "h-14 px-7 text-xs gap-2.5",
  icon: "h-10 w-10",
};

/**
 * Shared so a link that acts as a button is styled identically rather than
 * approximately — the two must be indistinguishable to the eye and the hand.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    "inline-flex select-none items-center justify-center whitespace-nowrap rounded-none",
    "font-mono uppercase tracking-mono",
    "transition-[background-color,color,box-shadow,opacity,transform] duration-fast ease-linq",
    "active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-40",
    variants[variant],
    sizes[size],
    className,
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {loading ? <LinqMark size={16} spinning className="opacity-90" /> : null}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
