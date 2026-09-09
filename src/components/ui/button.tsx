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
 * Buttons are the marketing site's buttons: fully rounded, sans, sentence case.
 * `secondary` is the nav button — a hairline capsule that fills with ink and
 * flips its label to paper on hover — which is the one interaction the whole
 * system repeats, from the landing's CTA to a cancel in a sheet.
 *
 * A filled button carries a small shadow so it sits above the page rather than
 * being stamped into it; the outlined variants stay flat and separate with a
 * rule, because two competing elevations in one row read as clutter.
 */
const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-contrast shadow-sm hover:bg-accent-hover hover:shadow-md",
  default: "bg-accent text-accent-contrast shadow-sm hover:bg-accent-hover hover:shadow-md",
  secondary: "bg-transparent text-text ring-1 ring-inset ring-text-subtle hover:bg-text hover:text-bg",
  outline: "bg-transparent text-text-muted ring-1 ring-inset ring-line hover:text-text hover:ring-text-subtle",
  ghost: "bg-transparent text-text-muted hover:bg-surface-2 hover:text-text",
  danger: "bg-transparent text-danger ring-1 ring-inset ring-danger/40 hover:bg-danger-soft",
};

/**
 * The type steps with the box now. It did not have to before: an uppercase mono
 * label at a flat 12px reads as a marker at any size. A sentence-case sans label
 * at 12px inside a 56px button just looks lost, so each size gets the size of
 * type its box can carry. Padding grows too — a capsule needs more room at the
 * ends than a rectangle did, or the label sits on the curve.
 */
const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-xs gap-1.5",
  md: "h-11 px-6 text-sm gap-2",
  lg: "h-14 px-8 text-[0.9375rem] gap-2.5",
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
    "inline-flex select-none items-center justify-center whitespace-nowrap rounded-full",
    "font-sans font-medium tracking-mono",
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
