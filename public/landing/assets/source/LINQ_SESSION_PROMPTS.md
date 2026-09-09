# LINQ BUILD — SESSION PROMPTS

One prompt per Claude Code session, mapped to §11 of `LINQ_SITE_BUILD_PROMPT.md`.

## Before you start

1. Put both files at the repo root: `LINQ_SITE_BUILD_PROMPT.md` and this file.
2. Put all supplied SVGs (plane, coin, rates card, bot screen, wordmark, socials, 19 flags) into `/assets/source/`.
3. Create an empty `STATUS.md` at the repo root. Every session below ends by updating it. This is what lets a fresh session — which has no memory of the last one — pick up correctly. Don't skip this even though it feels like busywork; it's the only continuity you have across sessions.

Suggested `STATUS.md` starting content:

```md
# BUILD STATUS

## Done
(nothing yet)

## In progress
(nothing yet)

## Known issues / TODO
(nothing yet)

## Decisions made this session
(nothing yet)
```

Run sessions in order. Don't start session N+1 until session N's agent has confirmed its stage works in a browser — checking that yourself, not just trusting the agent's say-so, is the one manual step you can't skip.

---

## SESSION 0 — Project scaffold

```
Read STATUS.md, then read LINQ_SITE_BUILD_PROMPT.md in full — all of it, this is
the spec for the entire site, not just this session's task.

Set up the project scaffold only. No animation, no GSAP yet.

1. Plain HTML/CSS/JS project (no framework) — index.html, styles.css, main.js.
2. Pull in GSAP, ScrollTrigger, and MotionPathPlugin from a CDN or npm — your call.
3. Set up the CSS custom properties from §2.1 (all the color tokens) and the type
   scale from §2.2. Load the display and mono fonts and confirm
   document.fonts.ready fires before you report done — console.log it.
4. Set up the 12-col grid system from §2.3 as CSS (grid or a column utility,
   your call) with the --gutter and --edge tokens.
5. Create /assets/ folder structure: /assets/source/ (already has the supplied
   files — don't touch them) and /assets/built/ (empty, for anything you
   generate later).
6. Inline the wordmark SVG and the plane SVG (Group_427319588.svg) into the DOM
   somewhere just to confirm they render and their internal groups are
   inspectable — you'll need #plane-body and #plane-trail as separate groups
   later per §4.1, so split them now and confirm both exist in the inlined
   markup, but don't animate anything.
7. No scenes, no content, no scroll behavior yet. Just confirm: fonts load,
   grid renders, colors are right, both SVGs are inlined and splittable.

When done, update STATUS.md: what's in place, the exact CDN/npm versions you
used for GSAP, and confirm document.fonts.ready fired cleanly. Flag anything
in the spec that seemed ambiguous.
```

---

## SESSION 1 — Static composition (§11 step 1)

```
Read STATUS.md first, then LINQ_SITE_BUILD_PROMPT.md §1–§3, §6 (all 8 scenes),
and §7 (responsive).

Build every scene's static HTML/CSS. No GSAP, no scroll behavior, no motion
path, no ScrollTrigger. This session is typesetting and layout only — the
plane sits wherever composition puts it, unanimated.

Do all 8 scenes from §6: hero, receive/flags, the bot, chains, rates (the
purple scene — flip its background/type colors as static CSS, no wipe), how
it works, socials, footer.

Use the real copy given in §6 verbatim. Inline all supplied SVGs from
/assets/source/. For the flags in Scene 02, build the irregular stamp grid
layout (rotation, empty cells) as static CSS — no stamp-in animation yet, just
correct final positions. Note: US.svg and UK.svg don't exist in
/assets/source/ yet — use two placeholder colored rects in their place and
flag this in STATUS.md, don't block on it.

Build responsively for all 7 breakpoints in §7, including the mobile
redesign (not a squeeze — actually follow the "vertical portal" direction
for ≤430).

Test: does every scene look intentional and correctly typeset with JS
disabled? That's the bar. If a scene looks like a wireframe, it's not done.

Update STATUS.md with: which scenes are complete, any copy or asset gaps
(especially the missing US/UK flags), and any layout decisions you made that
the spec left open.
```

---

## SESSION 2 — Nav, smooth scroll, accessibility skeleton (§11 step 2)

```
Read STATUS.md, then LINQ_SITE_BUILD_PROMPT.md §6 (NAV section specifically)
and §8 (accessibility) in full.

Build:
1. The fixed nav bar exactly as specced — wordmark, 5 links, TRY THE BOT
   button, progress rule underneath.
2. Smooth-scroll on nav click to each section's #id.
3. Active-state tracking (which section is in view) with the underline wipe
   — you can stub this with a basic ScrollTrigger or IntersectionObserver
   for now; the full plane-driven version comes later.
4. The scroll progress rule across the full page.
5. Every §8 accessibility requirement: semantic HTML structure, one h1/h2
   hierarchy, skip link, full keyboard nav, visible focus states (2px signal
   outline, 2px offset — and confirm it's still visible against the purple
   scene 05 background specifically), aria-hidden on decorative SVGs, alt
   text on the 19 flags.
6. Wire up prefers-reduced-motion media query detection in main.js (just the
   detection/branch structure — actual reduced-motion behavior comes in a
   later session, but the branch point needs to exist now so later sessions
   build into it, not around it).

Do NOT touch the plane's motion system yet. Do NOT build ScrollTrigger pins.
This session is nav + a11y only.

Test: tab through the entire page start to finish. Every interactive element
reachable, every focus state visible, skip link works, nav scrolls correctly.

Update STATUS.md with what's done and anything in §8 you couldn't fully
verify without the later animation work in place.
```

---

## SESSION 3 — The plane system (§11 step 3)

```
Read STATUS.md, then LINQ_SITE_BUILD_PROMPT.md §4 in full — this is the most
important session in the build, take your time with it.

This is the core mechanic of the whole site. Build:

1. The single master flight path — one invisible <path> per breakpoint
   (§4.1), generated to pass near each scene's dock point per the
   compositions already laid out in session 1's static build.
2. GSAP MotionPathPlugin driving the plane along it, autoRotate on,
   alignOrigin centered, tied to the page's scroll via ScrollTrigger.
3. The three-phase dock behavior from §4.2: APPROACH / DOCK-HOVER / DEPART,
   for every one of the 8 scenes. The hover idle drift MUST be a separate
   un-scrubbed looping tween (sine drift, ±6px Y, ±1.5deg rotation, ~2.8s) —
   re-read §4.2's warning about this, it's the detail that makes the plane
   feel alive vs. dead.
4. Trail length changes: full during approach/depart, contracted ~30%
   during hover.
5. scrub values per §4.3 — nothing above 1.2, no bounce/elastic/back eases
   anywhere.
6. gsap.matchMedia() so each breakpoint gets its own path geometry, with
   proper context cleanup on breakpoint change (§8, engineering section —
   read that part too, this is where leaked contexts happen).

Do NOT build the coin pickup yet (next session). Do NOT build content
reveals tied to the dock (later session) — for now the dock phase can just
sit there idling with no content animation triggered.

Test rigorously: scroll the full page slowly, then fling-scroll it fast in
both directions. Resize mid-scroll. Does the plane ever jump, snap, or lose
its position? This is the thing that will break if rushed — don't move on
until it's smooth at every breakpoint in both scroll directions.

Update STATUS.md with confirmation of the above test, the exact ease/scrub
values you landed on, and flag if any dock point composition from session 1
had to be adjusted to make the path geometry work.
```

---

## SESSION 4 — The coin pickup (§11 step 4)

```
Read STATUS.md, then LINQ_SITE_BUILD_PROMPT.md §4.4 and Scene 04 in §6.

Build the pickup sequence exactly as specced: coin sits static and dark
(--signal-dark) at Scene 04 until the plane docks, lifts, meets the plane,
flips to lit --signal on contact (hard cut, not a crossfade), parents to the
plane's transform, and rides with a slight counter-rotation from that point
forward through every remaining scene including the footer.

Critical constraint from the spec: do NOT run a second motion path for the
coin. It parents to the plane's existing transform — it does not have its
own ScrollTrigger or MotionPath instance. Re-read §4.4's note on why (desync
risk on fast scroll).

Test: fast-scroll past the pickup point in both directions repeatedly. Does
the coin ever detach, lag behind, or double up? Scroll all the way to the
footer and confirm the coin is still visibly riding the plane in the final
cropped shot from Scene 08.

Update STATUS.md confirming the desync test passed, and note the exact
mechanism you used to parent the coin (shared group transform vs. a
gsap.set on a wrapper — whatever you chose, document it so later sessions
don't fight it).
```

---

## SESSION 5 — Content reveals tied to the dock (§11 step 5)

```
Read STATUS.md, then LINQ_SITE_BUILD_PROMPT.md §6 in full again, this time
focused on each scene's "Motion" subsection.

Now wire every scene's content animation to its dock phase from session 3.
Per scene:

- Scene 01: clip-path line reveals + plane entrance, per spec.
- Scene 02: the flag stamp sequence — scale/opacity impact, signal-border
  flash, staggered by dock-proximity order, US/UK landing first. (If
  US.svg/UK.svg still don't exist in /assets/source/, keep using the
  placeholders from session 1 and flag it again in STATUS.md — don't block.)
- Scene 03: bot screen clip-wipe reveal, display line reveals.
- Scene 04: chain row wipes + rule draws (pickup itself is already done from
  session 4 — just wire the surrounding content reveals to the same dock
  timing).
- Scene 05: type lock-in reveals (handled fully in session 6, the purple
  wipe — for now just get the type reveal choreography right assuming the
  color flip already exists as static CSS from session 1).
- Scene 06: the node-by-node rule sequence as the plane travels the straight
  line.
- Scene 07: social icon layout is done; add the plane's single orbit here.
- Scene 08: footer reveal + CTA hover states (§6 Scene 08's CTA hover spec
  — hard rectangular wipe, arrow shift).

Every reveal is a clip-path wipe or scale-impact per §2's rule and the hard
prohibition in §9 against fade-up-on-scroll. If you catch yourself writing
opacity-only fades anywhere except explicitly specced fades (nav underline,
CTA color flip), stop and re-read the relevant scene spec.

Update STATUS.md listing each scene's reveal as done/not-done, and flag any
scene where the timing felt like it fought the dock rhythm from session 3.
```

---

## SESSION 6 — The purple climax (§11 step 6)

```
Read STATUS.md, then LINQ_SITE_BUILD_PROMPT.md Scene 05 in §6 in full, plus
the nav inversion note in the NAV section.

Build the actual wipe: background --ink to --signal as a hard clip-path
horizontal wipe (not a fade, not a gradient — re-read the spec's insistence
on this), scrubbed to scroll. Type flips to --ink on --signal. Nav inverts
(class toggle + CSS transition, triggered on this scene's ScrollTrigger
enter/leave, not animated per-child). On exit, the wipe reverses direction
per spec, and nav un-inverts.

Confirm the plane reads correctly here — purple-on-purple, defined mostly by
its own internal facet shading and the now-bright coin riding it. If it's
invisible against the field, that's a real problem, not something to paper
over — the spec calls this out as the best frame on the page, so it needs to
actually read.

Test the focus-visibility note from §8: tab to the CTA/links while scrolled
into this scene and confirm the focus ring is still visible against purple
(spec says use an --ink outline here specifically).

Update STATUS.md confirming the wipe direction is correct on both entry and
exit, and note whether the plane's visibility against the purple field
needed any adjustment from the base plane SVG's existing shading.
```

---

## SESSION 7 — Ambient wave background (§11 step 7)

```
Read STATUS.md, then LINQ_SITE_BUILD_PROMPT.md §5 in full.

Build the ambient wave background layer: 3–4 low-opacity bezier-curve
strokes, fixed full-viewport SVG layer, z-index 2, parallaxing vertically at
different rates per layer, present behind every --ink scene, fading out
during the Scene 05 purple wipe and back in on exit.

Re-read §5.4 carefully — this is NOT the same layer as the plane's trail
(#plane-trail) or the Scene 06 contrail-on-a-line. Those already exist from
earlier sessions and are part of the plane system. This is a separate,
independent, much fainter layer. If what you build is visible enough to
notice as "a wave graphic," turn the opacities down — spec explicitly says
it should read as texture, not a motif.

Update STATUS.md confirming this layer is visually distinct from the plane
trail (screenshot-compare them if you're unsure) and that it correctly
fades out/in around Scene 05.
```

---

## SESSION 8 — Reduced motion (§11 step 8)

```
Read STATUS.md, then LINQ_SITE_BUILD_PROMPT.md §8's accessibility
subsection, specifically the prefers-reduced-motion paragraph, plus every
scene's "prefers-reduced-motion" callouts scattered through §6 (Scene 02 has
one explicitly; check the others for implied requirements from §7's mobile
section and §5.2's wave note too).

Using the gsap.matchMedia() branch point from session 2, build the full
reduced-motion variant:

- No pinning, no scrub, no zoom, no MotionPath flight, no idle drift.
- Plane renders once per scene, statically, in its dock position.
- All 8 scenes' content is fully present and readable on load, no
  animation gating visibility.
- Scene 05 is still purple — just no wipe, it's static.
- Flag stamps in Scene 02 all render immediately, no stamp-in, no flash.
- Wave background layer: static, no parallax.

Test by actually enabling prefers-reduced-motion in your browser/OS
settings (not just faking the media query) and reading through the entire
page. Every word must be reachable per spec — confirm nothing is hidden
behind a state that never triggers in this mode.

Update STATUS.md confirming full-page reduced-motion pass, and list any
content that was previously only revealed by an animation trigger and had
to be given a static fallback.
```

---

## SESSION 9 — Breakpoint art direction (§11 step 9)

```
Read STATUS.md, then LINQ_SITE_BUILD_PROMPT.md §7 in full again — this
session is about going back through every breakpoint (1440, 1280, 1024,
768, 430, 390, 360) with the now-complete animation system from sessions
3–8 and confirming each one matches the art direction, not just the layout
session 1 already handled statically.

Priority: the mobile vertical portal redesign (≤430) — narrow flight
corridor, shortened trail, vertical purple wipe instead of horizontal,
rotated rates-card crop, max 2 floating coins, footer plane crop at ~2.2x
viewport width. This is a redesign per the spec, not a scaled-down desktop
version — check you didn't just let the desktop timeline compress.

Confirm gsap.matchMedia() context teardown/rebuild is clean when resizing
across breakpoints live (not just on load) — resize the browser window
slowly through several breakpoints while scrolled mid-scene and watch for
jumps or duplicate plane instances.

No horizontal scroll at any width — verify this explicitly at 360px, the
tightest one.

Update STATUS.md confirming each of the 7 breakpoints has been checked
against its specific art-direction notes in §7, not just resized and
eyeballed.
```

---

## SESSION 10 — Performance, console, final checklist (§11 step 10)

```
Read STATUS.md, then LINQ_SITE_BUILD_PROMPT.md §8's engineering subsection
and §8's full test checklist at the end, plus §9's hard prohibitions list.

1. Profile Scene 05 (the purple wipe) and Scene 02 (19 simultaneous flag
   stamps) specifically — spec calls these out as the two most likely to
   drop frames. Fix anything under 60fps.
2. Confirm will-change: transform is ONLY on the plane layer, nowhere else.
3. Confirm nothing anywhere animates top/left/width/height/filter/box-shadow
   — transforms, masks, clip-path only, per spec.
4. Lazy-load rates-card.svg and bot-screen.svg (the two heavy assets) via
   IntersectionObserver one scene ahead of their reveal, if not already
   done.
5. Open the console. Zero errors, zero warnings, zero 404s on any asset —
   check the network tab specifically for the SVGs and fonts.
6. Run every item in §8's test checklist literally, one by one, and report
   pass/fail on each — don't summarize, list them out.
7. Go through §9's hard-prohibitions list and confirm none of them crept in
   anywhere (gradients, glassmorphism, glow, bento grids, rounded pills,
   fake terminals, particle fields, fake benchmarks/logos/numbers).
8. Do the final test from §12: scroll it sound-off and answer honestly —
   does this feel like a title sequence or a landing page? If any single
   element can't answer "the plane brought me here," flag it for removal
   even if it means cutting something you built.

Update STATUS.md with the full checklist results and a final go/no-go
call.
```

---

## Notes on running this in practice

- If a session stalls or produces something that doesn't match the spec, don't try to argue it into shape mid-session — kill it, fix `STATUS.md` with what actually happened, and restart that session's prompt fresh. Compounding fixes on a confused session usually goes worse than restarting.
- Sessions 3 and 6 are the highest-risk ones (the plane system and the purple wipe). Budget the most manual review time there.
- It's fine to re-run a session's prompt verbatim in a new chat if the first attempt didn't land — that's the point of keeping these as fixed, reusable prompts rather than one long conversation.
- Once session 10 passes, this is a good point to ask the model to write a short `README.md` for the repo — the build spec is long and won't be the first thing someone reaches for six months from now.
