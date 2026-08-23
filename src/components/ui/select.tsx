"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional leading visual — a network badge, a bank logo, a token icon. */
  adornment?: React.ReactNode;
  hint?: string;
}

/**
 * The select-box pattern: a pill showing the current selection with a chevron
 * that flips on open, and a panel that scales and fades in beneath it.
 *
 * This is the product's one dropdown — currency, network and payout-method
 * selectors all use it, so choosing a chain feels the same as choosing a bank.
 */
export function Select({
  value,
  options,
  onChange,
  placeholder = "Select",
  label,
  className,
  disabled,
}: {
  value?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapper} className={cn("relative", className)}>
      {label ? <span className="mb-2 block text-xs text-text-muted">{label}</span> : null}

      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-12 w-full items-center gap-2.5 rounded-full bg-surface px-4 text-sm",
          "ring-1 ring-line shadow-sm transition duration-fast ease-linq",
          "hover:shadow-md active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none",
          open && "ring-accent",
        )}
      >
        {selected?.adornment}
        <span className={cn("min-w-0 flex-1 truncate text-left", !selected && "text-text-muted")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-muted transition-transform duration-fast ease-linq",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className={cn(
            "linq-pop-in absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden",
            "rounded-lg bg-surface p-1.5 shadow-lg ring-1 ring-line",
            label && "top-[calc(100%+8px)]",
          )}
        >
          <div className="max-h-64 overflow-y-auto">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 text-left text-sm",
                    "transition-colors duration-fast ease-linq hover:bg-surface-2",
                    active && "bg-surface-2",
                  )}
                >
                  {option.adornment}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.hint ? (
                      <span className="block truncate text-xs text-text-muted">{option.hint}</span>
                    ) : null}
                  </span>
                  {active ? <Check className="h-4 w-4 shrink-0 text-accent" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
