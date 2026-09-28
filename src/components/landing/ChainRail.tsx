"use client";

import { useEffect, useRef } from "react";

/**
 * The purple rail that rolls in over the chain coins as the section scrolls.
 *
 * Framer drives it with a scroll transform on the section: progress runs 0→1
 * while the section's top travels from the viewport's middle to one section
 * height above it. Over that range the row slides 2500px right and every coin
 * turns ten full times (0→3600°), both linear in progress.
 */

const SLIDE = 2500;
const TURN = 3600;

export function ChainRail({ coins }: { coins: readonly { src: string; label: string }[] }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const row = rowRef.current;
    if (!section || !row) return;
    const spinners = Array.from(row.querySelectorAll<HTMLElement>("[data-spin]"));
    let raf = 0;
    let last = -1;

    const update = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.5 - rect.top) / rect.height));
      if (p === last) return;
      last = p;
      row.style.transform = `translateY(-50%) translateX(${SLIDE * p}px)`;
      for (const coin of spinners) coin.style.transform = `rotate(${TURN * p}deg)`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div ref={sectionRef} className="ls-rail" role="img" aria-label={`Settles across ${coins.map((c) => c.label).join(", ")}`}>
      <div ref={rowRef} className="ls-rail__row" style={{ transform: "translateY(-50%)" }}>
        {/* biome-ignore lint/a11y/useAltText: decorative, the section is labelled */}
        <img className="ls-rail__pill" src="/landing/art/rail-pill.svg" alt="" draggable={false} />
        {coins.map((coin) => (
          <div key={coin.src} className="ls-rail__coin">
            <img data-spin="" src={coin.src} alt="" draggable={false} />
          </div>
        ))}
      </div>
    </div>
  );
}
