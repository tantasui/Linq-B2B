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

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-contrast hover:bg-accent-hover shadow-sm hover:shadow-md",
  default: "bg-accent text-accent-contrast hover:bg-accent-hover shadow-sm hover:shadow-md",
  secondary: "bg-surface text-text ring-1 ring-line hover:ring-line-strong shadow-sm hover:shadow-md",
  outline: "bg-transparent text-text ring-1 ring-line hover:bg-surface-2",
  ghost: "bg-transparent text-text-muted hover:bg-surface-2 hover:text-text",
  danger: "bg-transparent text-danger ring-1 ring-danger/25 hover:bg-danger-soft",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 rounded-sm px-3.5 text-xs gap-1.5",
  md: "h-11 rounded-md px-5 text-sm gap-2",
  lg: "h-13 rounded-md px-6 text-sm gap-2",
  icon: "h-10 w-10 rounded-md",
};

/**
 * Every tappable element in the product presses the same way: a fast scale to
 * ~0.97 on touch-down that springs back on release, and a hover lift on
 * pointer devices. Disabled reduces opacity rather than changing colour, so it
 * reads as "the same button, not ready" instead of a different element.
 */
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
    "inline-flex select-none items-center justify-center whitespace-nowrap font-medium",
    "transition-[transform,box-shadow,background-color,color,opacity] duration-fast ease-linq",
    "active:scale-[0.97] hover:-translate-y-px active:translate-y-0",
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
      {loading ? <LinqMark size={18} spinning className="opacity-90" /> : null}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
