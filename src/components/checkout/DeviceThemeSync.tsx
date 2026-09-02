"use client";

import { useEffect } from "react";

/**
 * Keeps the checkout page's light/dark class following `prefers-color-scheme`
 * for the lifetime of the page, including a live OS-level toggle while it's
 * open. Pairs with `deviceThemeBootScript`, which sets the initial class
 * before paint; this only needs to handle changes after that.
 */
export function DeviceThemeSync() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (dark: boolean) => {
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    };
    const onChange = (event: MediaQueryListEvent) => apply(event.matches);
    apply(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return null;
}
