import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
