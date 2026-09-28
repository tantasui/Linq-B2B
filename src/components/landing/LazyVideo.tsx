"use client";

import { useEffect, useRef } from "react";

/**
 * A muted background loop that downloads nothing until it is near the
 * viewport. `preload="none"` is only a hint, so the src itself is withheld;
 * `muted` is set as a property before play() because Chrome defers autoplay
 * for off-screen video otherwise.
 */
export function LazyVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!video.getAttribute("src")) video.src = src;
          video.play().catch(() => undefined);
        } else if (!video.paused) {
          video.pause();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [src]);

  return <video ref={ref} className={className} muted loop playsInline preload="none" aria-hidden="true" />;
}
