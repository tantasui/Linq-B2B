"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * The round menu button (fixed, top right) and the white full-screen menu it
 * opens. The panel fades over 0.4s on ease 0.44/0/0.56/1 each way; the two
 * stablecoins bob 230px on a 1.9s mirrored loop (desktop frame only).
 */

export type MenuLink = { label: string; href: string; external?: boolean };

const FADE = { duration: 0.4, ease: [0.44, 0, 0.56, 1] } as const;
const BOB = { duration: 1.9, ease: [0.44, 0, 0.56, 1], repeat: Number.POSITIVE_INFINITY, repeatType: "mirror", repeatDelay: 0.2 } as const;
const centerY = (_: unknown, generated: string) => `translateY(-50%) ${generated}`;

export function SiteMenu({ links }: { links: readonly MenuLink[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="ls-menu-btn ls-pill--primary"
        aria-expanded={open}
        aria-controls="ls-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="ls-pill__face">
          <span className="ls-pill__rim" />
          <span className="ls-pill__core" />
          <span className="ls-menu-btn__icon">
            <img src={open ? "/landing/art/menu-close.svg" : "/landing/art/menu-burger.svg"} alt="" draggable={false} />
          </span>
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="ls-menu"
            key="menu"
            className="ls-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: FADE }}
            exit={{ opacity: 0, transition: FADE }}
          >
            <nav>
              <ul className="ls-menu__nav">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      className="ls-menu__link"
                      href={link.href}
                      {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
                      onClick={() => setOpen(false)}
                    >
                      <span className="ls-menu__slide">
                        <span className="ls-menu__word">{link.label}</span>
                        <img className="ls-menu__arrow" src="/landing/art/menu-arrow.svg" alt="" draggable={false} />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <motion.div
              className="ls-menu__coin ls-menu__coin--usdt"
              aria-hidden="true"
              style={{ rotate: -18 }}
              transformTemplate={centerY}
              animate={{ y: [0, -230] }}
              transition={BOB}
            >
              <div className="ls-menu__coin-face">
                <img
                  className="ls-menu__glyph"
                  src="/landing/art/menu-usdt.svg"
                  alt=""
                  style={{ left: 38, top: 29, width: 116, height: 125, transform: "rotate(39deg)" }}
                />
              </div>
            </motion.div>
            <motion.div
              className="ls-menu__coin ls-menu__coin--usdc"
              aria-hidden="true"
              style={{ rotate: 24 }}
              transformTemplate={centerY}
              animate={{ y: [0, -230] }}
              transition={BOB}
            >
              <div className="ls-menu__coin-face">
                <img className="ls-menu__glyph" src="/landing/art/menu-usdc.svg" alt="" style={{ left: 35, top: 39, width: 128, height: 122 }} />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
