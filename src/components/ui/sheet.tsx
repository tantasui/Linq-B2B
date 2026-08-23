"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The bottom sheet used for every step of a payment flow. One sheet, one
 * entrance, one dismissal — a flow that changes its container between steps
 * feels like several different products stitched together.
 */
export function Sheet({
  open,
  onClose,
  title,
  leading,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Back button or other leading control in the header. */
  leading?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Stop the page behind from scrolling under the sheet on touch devices.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="linq-fade-in absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "linq-sheet-up relative z-10 max-h-[88vh] w-full max-w-[460px] overflow-y-auto",
          "rounded-t-xl bg-surface px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 shadow-xl",
          "sm:rounded-xl sm:pb-6",
          className,
        )}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-surface-3 sm:hidden" />
        {title ? (
          <header className="mb-6 flex items-center gap-3">
            {leading}
            <h2 className="flex-1 text-lg font-medium tracking-[-0.02em]">{title}</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-sm text-text-muted transition duration-fast ease-linq hover:bg-surface-2 hover:text-text active:scale-[0.94]"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </header>
        ) : null}
        {children}
      </section>
    </div>
  );
}
