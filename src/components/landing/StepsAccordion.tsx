"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { LottiePlayer, preloadLottie } from "./LottiePlayer";

/**
 * "Accept payments from anywhere…" — the four-step accordion.
 *
 * Timing is the Framer component's own state machine: a tab opens (0.4s
 * spring, bounce 0.2), waits 500ms, then its progress rule fills over a 10s
 * spring with no bounce, the slow-start curve the live page shows. The next
 * tab takes over 10s after this one opened; clicking a tab jumps to it. As on
 * the live page, the cycle runs from page load, not from when it is seen.
 *
 * On desktop the art sits in the panel to the right; on the phone frame it
 * drops in under the open tab's description. Both are rendered and CSS shows
 * the one for the current frame.
 */

export type Step = { title: string; body: string; art: string };

const OPEN = { type: "spring", bounce: 0.2, duration: 0.4 } as const;
const FILL = { type: "spring", bounce: 0, duration: 10 } as const;
const FILL_DELAY_MS = 500;
const STEP_MS = 10_000;

export function StepsAccordion({ steps }: { steps: readonly Step[] }) {
  const [active, setActive] = useState(0);
  const [running, setRunning] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Fetch every step's art once the card nears the viewport, so switching
  // steps never waits on the network.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          for (const step of steps) preloadLottie(step.art).catch(() => undefined);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [steps]);

  useEffect(() => {
    setRunning(false);
    const fill = setTimeout(() => setRunning(true), FILL_DELAY_MS);
    const next = setTimeout(() => setActive((i) => (i + 1) % steps.length), STEP_MS);
    return () => {
      clearTimeout(fill);
      clearTimeout(next);
    };
  }, [active, steps.length]);

  return (
    <div ref={rootRef} className="ls-steps__card">
      <div className="ls-steps__tabs" role="tablist" aria-label="How a payment works">
        {steps.map((step, i) => {
          const open = i === active;
          return (
            <div
              key={step.title}
              role="tab"
              tabIndex={0}
              aria-selected={open}
              className={`ls-tab${open ? " ls-tab--active" : ""}`}
              onClick={() => setActive(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActive(i);
                }
              }}
            >
              <div className="ls-tab__inner">
                <p className="ls-tab__title">{step.title}</p>
                <motion.div
                  initial={false}
                  animate={{ height: open ? "auto" : 0 }}
                  transition={OPEN}
                  style={{ overflow: "hidden" }}
                >
                  <p className="ls-tab__desc ls-tab__desc-pad">{step.body}</p>
                </motion.div>
                <span className="ls-tab__track" />
                <motion.span
                  className="ls-tab__fill"
                  data-fill={i}
                  initial={false}
                  animate={{ scaleX: open && running ? 1 : 0 }}
                  transition={open && running ? FILL : { duration: 0 }}
                  style={{ originX: 0 }}
                />
              </div>
              <motion.div
                className="ls-tab__art-wrap"
                initial={false}
                animate={{ height: open ? "auto" : 0 }}
                transition={OPEN}
                style={{ overflow: "hidden" }}
              >
                <div className="ls-tab__art">{open ? <LottiePlayer src={step.art} className="ls-lottie" /> : null}</div>
              </motion.div>
            </div>
          );
        })}
      </div>
      <div className="ls-steps__panel" aria-hidden="true">
        <div className="ls-steps__panel-bg" />
        <LottiePlayer key={steps[active].art} src={steps[active].art} className="ls-steps__panel-art ls-lottie" />
      </div>
    </div>
  );
}
