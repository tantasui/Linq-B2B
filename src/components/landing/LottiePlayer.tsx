"use client";

import { useEffect, useRef } from "react";

/**
 * A looping Lottie, loaded only when it nears the viewport and paused while it
 * is off screen. The designer's files are plain Lottie JSON, so the light
 * (SVG-only) build of lottie-web is enough to play them.
 *
 * Each JSON is fetched once per page and shared, so switching the steps panel
 * between files does not refetch.
 */

type AnimationItem = {
  play(): void;
  pause(): void;
  destroy(): void;
};

type LottieLight = {
  loadAnimation(params: {
    container: Element;
    renderer: "svg";
    loop: boolean;
    autoplay: boolean;
    animationData: unknown;
    rendererSettings?: { preserveAspectRatio?: string };
  }): AnimationItem;
};

const jsonCache = new Map<string, Promise<unknown>>();

export function preloadLottie(src: string) {
  let pending = jsonCache.get(src);
  if (!pending) {
    pending = fetch(src).then((res) => {
      if (!res.ok) throw new Error(`${res.status} ${src}`);
      return res.json();
    });
    pending.catch(() => jsonCache.delete(src));
    jsonCache.set(src, pending);
  }
  return pending;
}

let playerModule: Promise<LottieLight> | null = null;
function loadPlayer() {
  playerModule ??= import("lottie-web/build/player/lottie_light").then(
    (mod) => ((mod as { default?: unknown }).default ?? mod) as LottieLight,
  );
  return playerModule;
}

export function LottiePlayer({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let anim: AnimationItem | null = null;
    let cancelled = false;
    let onScreen = false;

    const start = async () => {
      const [lottie, data] = await Promise.all([loadPlayer(), preloadLottie(src)]);
      if (cancelled) return;
      anim = lottie.loadAnimation({
        container: el,
        renderer: "svg",
        loop: true,
        autoplay: onScreen,
        animationData: data,
        rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
      });
    };

    let started = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen && !started) {
          started = true;
          start().catch(() => undefined);
        }
        if (anim) {
          if (onScreen) anim.play();
          else anim.pause();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);

    return () => {
      cancelled = true;
      io.disconnect();
      anim?.destroy();
    };
  }, [src]);

  return <div ref={ref} className={className} aria-hidden="true" />;
}
