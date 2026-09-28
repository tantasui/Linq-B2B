"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * A "Built for businesses" card. On hover it tips 10° away from the pointer
 * side the designer chose for it (rotateX or rotateY, ±10), in perspective
 * 1440, with the page's damping-47 / stiffness-116 spring and a hairline
 * shadow.
 */

export type Tilt = { rotateX?: number; rotateY?: number };

const SPRING = { type: "spring", damping: 47, stiffness: 116, mass: 1 } as const;
const HOVER_SHADOW =
  "0px 0.24145061431045178px 0.24145061431045178px -1.25px rgba(0, 0, 0, 0.14), 0px 2px 2px -2.5px rgba(0, 0, 0, 0.14)";

export function BizCard({ tilt, children }: { tilt: Tilt; children: ReactNode }) {
  return (
    <motion.article
      className="ls-biz__card"
      style={{ transformPerspective: 1440 }}
      initial={false}
      whileHover={{ rotateX: tilt.rotateX ?? 0, rotateY: tilt.rotateY ?? 0, boxShadow: HOVER_SHADOW, transition: SPRING }}
      transition={SPRING}
    >
      {children}
    </motion.article>
  );
}
