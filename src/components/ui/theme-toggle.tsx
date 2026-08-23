"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";

/**
 * The appearance switch: a rounded square icon button joined by a thin line to
 * a dot below it — a switch rendered vertically rather than horizontally.
 *
 * The icons cross-fade and rotate through each other instead of swapping, and
 * the button's own surface inverts, so the control demonstrates the change it
 * makes before the interface finishes fading.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        onClick={toggle}
        className={cn(
          "relative grid h-10 w-10 place-items-center rounded-md ring-1 ring-line",
          "transition duration-slow ease-linq active:scale-[0.97]",
          dark ? "bg-text text-bg" : "bg-surface text-text shadow-sm hover:shadow-md",
        )}
      >
        <Sun
          className={cn(
            "absolute h-[18px] w-[18px] transition-all duration-slow ease-linq",
            dark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100",
          )}
        />
        <Moon
          className={cn(
            "absolute h-[18px] w-[18px] transition-all duration-slow ease-linq",
            dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0",
          )}
        />
      </button>

      {/* The switch track: the dot travels to the button as the mode flips. */}
      <span className="h-3 w-px bg-line" aria-hidden />
      <span
        className={cn(
          "h-2 w-2 rounded-full transition-colors duration-slow ease-linq",
          dark ? "bg-accent" : "bg-line-strong",
        )}
        aria-hidden
      />
    </div>
  );
}
