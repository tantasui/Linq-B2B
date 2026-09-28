"use client";

import { motion, useInView } from "framer-motion";
import { createContext, useContext, useRef, type ReactNode } from "react";

/**
 * Framer's appear effects, as the page configures them.
 *
 * Section reveals are keyed to the *section*, not the element: everything
 * inside a <RevealSection> animates once when the section's top crosses the
 * middle of the viewport (Framer's `threshold: 0.5` on a section ref). That is
 * why a card lower in the grid can animate before it is itself on screen.
 *
 * Offsets and springs are the page's own: headings and left-hand cards come
 * in from x −30, right-hand cards from x +30, the steps card from y +30, all
 * `spring` with bounce 0.2.
 */

const SectionInView = createContext(false);

type SectionProps = {
  id?: string;
  className?: string;
  children: ReactNode;
  "aria-labelledby"?: string;
};

export function RevealSection({ children, ...rest }: SectionProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -50% 0px" });
  return (
    <section ref={ref} {...rest}>
      <SectionInView.Provider value={inView}>{children}</SectionInView.Provider>
    </section>
  );
}

const OFFSET = {
  left: { x: -30, y: 0 },
  right: { x: 30, y: 0 },
  up: { x: 0, y: 30 },
} as const;

type RevealProps = {
  from: keyof typeof OFFSET;
  delay?: number;
  duration?: number;
  className?: string;
  children: ReactNode;
};

export function Reveal({ from, delay = 0, duration = 0.6, className, children }: RevealProps) {
  const inView = useContext(SectionInView);
  const hidden = { opacity: 0, ...OFFSET[from] };
  return (
    <motion.div
      data-reveal=""
      className={className}
      initial={hidden}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : hidden}
      transition={{ type: "spring", bounce: 0.2, duration, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * The hero's three entrances (heading, sub-copy, buttons) at 0.4 / 0.8 / 1.2s.
 * The Framer source marks these "replay", but the live page does not replay
 * them: scrolled away and back, they stay put. This matches the live page.
 */
export function HeroReveal({ delay, className, children }: { delay: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const hidden = { opacity: 0, x: 0, y: 30 };
  return (
    <motion.div
      ref={ref}
      data-reveal=""
      className={className}
      initial={hidden}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : hidden}
      transition={{ type: "spring", bounce: 0.2, duration: 0.6, delay }}
    >
      {children}
    </motion.div>
  );
}
