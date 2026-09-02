"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// A ref count, not a captured "previous value": two sheets can be open at
// once (the calculator over the amount sheet, a confirmation over a form),
// and if the inner one closed first under the old capture-and-restore
// scheme, it would stamp overflow back to "hidden" while the outer sheet is
// still open — fine — but if the *outer* one's effect had already run its
// cleanup first for any reason (fast unmount during a route change, StrictMode
// double-invoke, etc.), the two effects' "previous" snapshots go stale and
// scrolling can be left permanently locked with nothing visibly open to
// blame it on. Counting active locks makes the unlock unconditional: it only
// ever clears when nothing wants it locked, regardless of ordering.
let scrollLockCount = 0;
function lockBodyScroll() {
  if (scrollLockCount === 0) document.body.style.overflow = "hidden";
  scrollLockCount += 1;
  return () => {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) document.body.style.overflow = "";
  };
}

/** Drag past this many pixels (or flick with enough speed) and letting go dismisses the sheet. */
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.6; // px/ms

/**
 * The bottom sheet used for every step of a payment flow. One sheet, one
 * entrance, one dismissal — a flow that changes its container between steps
 * feels like several different products stitched together.
 *
 * On mobile, dragging down from anywhere in the sheet — handle, header or
 * content — moves the sheet: the whole panel together as one physical
 * object, not the content scrolling independently underneath a fixed frame.
 * A drag that starts while content is scrolled away from its top is left to
 * that content's own scrolling instead, and either way, letting go springs
 * back or continues the same motion into a close depending on how far (or
 * how fast) it was released.
 */
export function Sheet({
  open,
  onClose,
  title,
  leading,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Back button or other leading control in the header. */
  leading?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [closing, setClosing] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  // "pending": waiting to see which way the first real movement goes.
  // "sheet": dragging the whole sheet — engaged once we see downward motion
  // while the scrollable content is already at its top. "scroll": movement
  // started below scroll-top, or went upward first — left to the browser's
  // native scroll entirely, we never touch transform or preventDefault.
  const drag = useRef<{
    startY: number;
    lastY: number;
    lastT: number;
    mode: "pending" | "sheet" | "scroll";
  } | null>(null);

  const requestClose = (fromOffset = 0) => {
    if (closing) return;
    const section = sectionRef.current;
    // Carry whatever offset a drag already reached into the close keyframe,
    // so a mid-drag release continues the same motion instead of snapping
    // back to the top before sliding away.
    section?.style.setProperty("--sheet-drag-y", `${fromOffset}px`);
    section?.style.removeProperty("transition");
    section?.style.removeProperty("transform");
    setClosing(true);
  };

  const onAnimationEnd = (event: React.AnimationEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || event.animationName !== "linq-sheet-down") return;
    setClosing(false);
    onClose();
  };

  const springBack = () => {
    const section = sectionRef.current;
    const backdrop = backdropRef.current;
    if (section) {
      section.style.transition = "transform var(--dur-slow) var(--ease)";
      section.style.transform = "translateY(0px)";
    }
    if (backdrop) {
      backdrop.style.transition = "opacity var(--dur-slow) var(--ease)";
      backdrop.style.opacity = "1";
    }
  };

  // Below a few pixels of movement we haven't committed to either
  // interpretation yet — this is also what keeps a plain tap on a button
  // inside the sheet (the close X, "Retry", a link) working: with no real
  // movement, we never touch transform or call preventDefault, so the click
  // fires exactly as it would with no gesture handling here at all.
  const ENGAGE_THRESHOLD = 6;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Touch/pen only: on desktop this is a centred dialog, not a bottom
    // sheet, and dragging it isn't an expected interaction there.
    if (event.pointerType === "mouse") return;
    drag.current = { startY: event.clientY, lastY: event.clientY, lastT: event.timeStamp, mode: "pending" };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    const rawOffset = event.clientY - state.startY;
    const section = sectionRef.current;

    if (state.mode === "pending") {
      if (Math.abs(rawOffset) < ENGAGE_THRESHOLD) return;
      // Only take the gesture over from the browser when it can only mean
      // "drag the sheet": moving down, and the content has nowhere left to
      // scroll up to. Anything else — moving up, or down while there's still
      // scrolled content above — is left entirely to native scrolling.
      const atTop = (section?.scrollTop ?? 0) <= 0;
      state.mode = rawOffset > 0 && atTop ? "sheet" : "scroll";
      if (state.mode === "sheet") {
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
        if (section) {
          section.style.transition = "none";
          // The entrance is a CSS *animation* with fill-mode "both", which
          // pins transform at its final keyframe value — that wins over an
          // inline style for the same property no matter what we set below,
          // so the drag would silently have zero visual effect without this.
          section.classList.remove("linq-sheet-up");
        }
      }
    }

    if (state.mode !== "sheet") return;
    event.preventDefault();
    const offset = Math.max(0, rawOffset);
    state.lastY = event.clientY;
    state.lastT = event.timeStamp;
    if (section) section.style.transform = `translateY(${offset}px)`;
    const backdrop = backdropRef.current;
    if (backdrop) backdrop.style.opacity = String(Math.max(0.15, 1 - offset / 400));
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    drag.current = null;
    if (state?.mode !== "sheet") return;
    const offset = Math.max(0, event.clientY - state.startY);
    const elapsed = Math.max(1, event.timeStamp - state.lastT);
    const velocity = Math.max(0, event.clientY - state.lastY) / elapsed;
    if (offset > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) {
      requestClose(offset);
    } else {
      springBack();
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    // Stop the page behind from scrolling under the sheet on touch devices.
    const unlock = lockBodyScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      unlock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Rendered into <body> rather than in place. The dashboard's page-entrance
  // animation uses fill-mode "both", so its final keyframe (transform:
  // translateY(0)) sticks after the animation ends — and any transform, even a
  // zero one, makes that element the containing block for fixed-position
  // descendants. Left in place, this sheet's "fixed inset-0" sized itself to
  // the whole scrolling page instead of the viewport, so on a long list it
  // centred itself far below the fold and appeared cut off.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if ((!open && !closing) || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <button
        ref={backdropRef}
        aria-label="Close"
        onClick={() => requestClose()}
        className={cn("absolute inset-0 bg-black/50 backdrop-blur-[2px]", !closing && "linq-fade-in")}
      />
      <section
        ref={sectionRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onAnimationEnd={onAnimationEnd}
        className={cn(
          "relative z-10 max-h-[88vh] w-full max-w-[460px] overflow-y-auto",
          "rounded-t-xl bg-surface px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 shadow-xl",
          "sm:rounded-xl sm:pb-6",
          closing ? "linq-sheet-down" : "linq-sheet-up",
          className,
        )}
      >
        {/* Covers the handle, header and content: a drag can start from
            anywhere in the sheet, same as it can be tapped anywhere in it —
            onPointerMove decides per-gesture whether that means "drag the
            sheet" or "let this scroll", so it never steals a tap on a
            button in here either. */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="sm:cursor-default"
        >
          <div className="mx-auto mb-5 h-1 w-10 touch-none rounded-full bg-surface-3 sm:hidden" />
          {title ? (
            <header className="mb-6 flex items-center gap-3">
              {leading}
              <h2 className="flex-1 text-lg font-medium tracking-[-0.02em]">{title}</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => requestClose()}
                className="grid h-9 w-9 place-items-center rounded-sm text-text-muted transition duration-fast ease-linq hover:bg-surface-2 hover:text-text active:scale-[0.94]"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </header>
          ) : null}
          {children}
        </div>
      </section>
    </div>,
    document.body,
  );
}
