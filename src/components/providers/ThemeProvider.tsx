"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

interface ThemeApi {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeApi>({
  theme: "light",
  setTheme: () => undefined,
  toggle: () => undefined,
});

export const themeStorageKey = "linq:theme";

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Inlined in <head> before paint. Without it the document renders light, then
 * snaps to dark once React hydrates — the one flash that makes an app feel
 * cheap regardless of how the rest is built.
 */
export const themeBootScript = `(function(){try{var s=localStorage.getItem("${themeStorageKey}");var d=s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

/**
 * For the payer-facing checkout page only. That page is opened by a
 * customer, not the merchant, so it must always mirror the device's own
 * light/dark setting — never a preference the merchant happened to leave in
 * this browser's storage while previewing their own link from the dashboard.
 * Unlike `themeBootScript`, this ignores `localStorage` entirely.
 */
export const deviceThemeBootScript = `(function(){try{var d=matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  // The boot script already applied the class; read it back rather than
  // recomputing, so provider state and the DOM never disagree.
  useEffect(() => {
    setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const setTheme = useCallback((next: Theme) => {
    const root = document.documentElement;

    // Cross-fade the whole interface rather than cutting between modes. The
    // class is removed once the fade is done so it never slows normal hovers.
    root.classList.add("theme-fade");
    window.setTimeout(() => root.classList.remove("theme-fade"), 280);

    root.classList.toggle("dark", next === "dark");
    root.style.colorScheme = next;
    try {
      window.localStorage.setItem(themeStorageKey, next);
    } catch {
      // Private browsing: the choice just won't survive a reload.
    }
    setThemeState(next);
  }, []);

  const api = useMemo<ThemeApi>(
    () => ({ theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>;
}
