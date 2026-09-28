"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The "Linq advantage" cards: an endless leftward rail.
 *
 * Numbers are the Framer ticker's own: 80 px/s, slowed to 40% of that while
 * hovered, and draggable. The track holds three copies of the six cards so
 * the rail stays full on screens far wider than the 1440 design.
 */

const SPEED = 80;
const HOVER_FACTOR = 0.4;
/**
 * How quickly the speed eases toward its hover/idle target, per second. Not
 * measured: Framer eases the change but the rate is not exposed.
 */
const EASE_RATE = 6;
const COPIES = 3;

export function WhyTicker({ items }: { items: readonly { key: string; node: ReactNode; down: boolean }[] }) {
  const count = items.length;
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let offset = 0;
    let speed = reduce ? 0 : SPEED;
    let target = speed;
    let loop = 0;
    let raf = 0;
    let prev = performance.now();
    let drag: { x: number; offset: number; id: number } | null = null;
    let running = false;

    // One loop is the distance from a card to its twin in the next copy,
    // read in layout px so the page zoom does not skew it.
    const measure = () => {
      const items = track.children as HTMLCollectionOf<HTMLElement>;
      if (items.length > count) loop = items[count].offsetLeft - items[0].offsetLeft;
    };

    const apply = () => {
      if (loop > 0) offset = ((offset % loop) + loop) % loop;
      track.style.transform = `translate3d(${-loop - offset}px, 0, 0)`;
    };

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - prev) / 1000, 0.1);
      prev = now;
      speed += (target - speed) * Math.min(1, dt * EASE_RATE);
      if (!drag) offset += speed * dt;
      apply();
      if (running) raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      prev = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    measure();
    apply();

    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()), { rootMargin: "200px 0px" });
    io.observe(viewport);
    const ro = new ResizeObserver(() => {
      measure();
      apply();
    });
    ro.observe(track);

    const scale = () => viewport.getBoundingClientRect().width / viewport.offsetWidth || 1;
    const enter = () => {
      if (!reduce) target = SPEED * HOVER_FACTOR;
    };
    const leave = () => {
      if (!reduce) target = SPEED;
    };
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, offset, id: e.pointerId };
      viewport.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      offset = drag.offset - (e.clientX - drag.x) / scale();
      apply();
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch {}
    };

    viewport.addEventListener("pointerenter", enter);
    viewport.addEventListener("pointerleave", leave);
    viewport.addEventListener("pointerdown", down);
    viewport.addEventListener("pointermove", move);
    viewport.addEventListener("pointerup", up);
    viewport.addEventListener("pointercancel", up);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      viewport.removeEventListener("pointerenter", enter);
      viewport.removeEventListener("pointerleave", leave);
      viewport.removeEventListener("pointerdown", down);
      viewport.removeEventListener("pointermove", move);
      viewport.removeEventListener("pointerup", up);
      viewport.removeEventListener("pointercancel", up);
    };
  }, [count]);

  return (
    <div ref={viewportRef} className="ls-why__viewport">
      <ul ref={trackRef} className="ls-why__track">
        {Array.from({ length: COPIES }, (_, copy) =>
          items.map((item) => (
            <li key={`${copy}-${item.key}`} className="ls-why__item" aria-hidden={copy === 1 ? undefined : true}>
              <div className={`ls-why__card ${item.down ? "ls-why__card--down" : "ls-why__card--up"}`}>{item.node}</div>
            </li>
          )),
        )}
      </ul>
    </div>
  );
}

