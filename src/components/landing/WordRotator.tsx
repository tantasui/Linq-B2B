"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * The hero card's "→ COUNTRY" ticker. Same component logic as the designer's
 * Framer code component: hold each word, then push it up and out while the
 * next rises in (y ±55%, 0.38s, ease 0.76/0/0.24/1).
 */
export function WordRotator({ words, holdSeconds }: { words: readonly string[]; holdSeconds: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % words.length), holdSeconds * 1000);
    return () => clearInterval(timer);
  }, [words.length, holdSeconds]);

  return (
    <span className="ls-words" aria-live="off">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={words[index]}
          className="ls-words__word"
          initial={{ y: "55%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-55%", opacity: 0 }}
          transition={{ duration: 0.38, ease: [0.76, 0, 0.24, 1] }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
