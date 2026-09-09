"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline, field-level validation. Errors sit directly under the input that
 * caused them, in a desaturated red that stays in the professional register —
 * this is money, and an alarming interface makes people hesitate at exactly
 * the moment they need to act calmly.
 *
 * The field itself is a ruled box rather than a rounded one, and focus is the
 * signal purple arriving on the rule — the same gesture as the nav's active
 * underline on the landing.
 */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(
      "h-12 w-full rounded-none bg-surface px-4 text-sm text-text ring-1 ring-inset ring-line",
      "placeholder:text-text-subtle",
      "transition duration-fast ease-linq outline-none",
      "focus:ring-2 focus:ring-accent",
      invalid && "ring-danger/60 focus:ring-danger",
      "disabled:opacity-40",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label ? (
        <span className="mb-2 block font-mono text-label uppercase tracking-mono text-text-subtle">
          {label}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="linq-fade-in mt-2 flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </span>
      ) : hint ? (
        <span className="mt-2 block text-xs text-text-subtle">{hint}</span>
      ) : null}
    </label>
  );
}

/**
 * Toggle switch. Square like everything else, so it reads as a switch throwing
 * between two positions rather than a pill sliding — and the travel is the same
 * duration as the button press, so the whole system moves at one speed.
 */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-6 w-11 shrink-0 items-center p-0.5 ring-1 ring-inset",
        "transition-colors duration-slow ease-linq active:scale-[0.97]",
        checked ? "bg-accent ring-accent" : "bg-transparent ring-line-strong",
      )}
    >
      <span
        className={cn(
          "h-5 w-5",
          "transition-transform duration-slow ease-linq",
          checked ? "translate-x-5 bg-accent-contrast" : "translate-x-0 bg-text-subtle",
        )}
      />
    </button>
  );
}
