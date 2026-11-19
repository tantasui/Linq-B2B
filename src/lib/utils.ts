import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's own scale. Left alone it reads the
 * project's font sizes (tailwind.config.ts → fontSize) as colours, so
 * `cn("text-micro", "text-text-subtle")` kept the colour and silently dropped
 * the size — the dashboard's tab bar rendered its 11px labels at 16px.
 * Naming them here makes them sizes, which only ever conflict with sizes.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["micro", "label", "hero", "display", "display-lg", "display-xl"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * YYYY-MM-DD in the viewer's local calendar day, not UTC. `toISOString()`
 * converts to UTC first, so for anyone east of it (Lagos included — this is
 * a Naira app) a local-midnight Date lands on the *previous* UTC date,
 * silently bucketing "today" one day early. Use this anywhere a date is
 * being reduced to "which day", so the bucket always matches what a person
 * looking at a calendar would call today.
 */
export function localIsoDay(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
