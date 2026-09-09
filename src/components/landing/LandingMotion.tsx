"use client";

import { useEffect } from "react";

/**
 * Boots the landing page's motion.
 *
 * The scroll choreography — the plane that becomes the cursor, the braille
 * globe, the rate rail, the picker wheel, the words that colour in as the plane
 * crosses them — is the marketing site's own `main.js`, running against the
 * same markup and the same class names. It is kept as a plain script rather
 * than rewritten into React on purpose: it is 1,300 lines of measured,
 * scroll-driven timing that works, and a port would be a rewrite with no
 * visible upside and a lot of room to drift.
 *
 * What React owns is the lifecycle. On a marketing site the script ran once, on
 * a document that was only ever loaded once. Here the landing is a route a
 * merchant can leave and come back to, so:
 *
 *   - the scripts are injected on mount, in dependency order, and the page is
 *     only revealed once GSAP is actually present;
 *   - on unmount `main.js`'s own `destroy()` runs, taking down its global
 *     listeners, its ScrollTriggers and the `plane-is-*` classes it sets on
 *     <html>. Without that, a second visit would stack a second set of
 *     pointer handlers on the first.
 *
 * With JavaScript off, none of this runs and the page still reads: every scene
 * is typeset and laid out in the markup.
 */
const SCRIPTS = [
  "/landing/vendor/gsap/gsap.min.js",
  "/landing/vendor/gsap/ScrollTrigger.min.js",
  "/landing/main.js",
];

export function LandingMotion() {
  useEffect(() => {
    let cancelled = false;
    const injected: HTMLScriptElement[] = [];

    /** Loads one script and resolves when it is ready, so order is guaranteed. */
    const load = (src: string) =>
      new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = false;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.body.appendChild(script);
        injected.push(script);
      });

    (async () => {
      for (const src of SCRIPTS) {
        if (cancelled) return;
        await load(src);
      }
    })().catch(() => {
      // The page is designed to read correctly without any of this, so a
      // failed asset degrades to the static composition rather than an error.
    });

    return () => {
      cancelled = true;
      const teardown = (window as unknown as { __linqLanding?: { destroy(): void } }).__linqLanding;
      try {
        teardown?.destroy();
      } catch {
        // Nothing useful to do if teardown throws — the scripts go either way.
      }
      for (const script of injected) script.remove();
    };
  }, []);

  return null;
}
