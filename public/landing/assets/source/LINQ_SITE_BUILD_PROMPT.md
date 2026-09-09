# BUILD BRIEF — LINQ MARKETING SITE
### Scroll-choreographed single page. Paper-plane narrative. Telegram bot as flagship.

---

## 0. WHAT YOU ARE BUILDING

A single-page marketing site for **Linq** — a crypto-to-fiat off-ramp built on a Telegram bot. The product: you receive stablecoins from anywhere in the world and get credited in Naira, instantly, inside Telegram. No app download. No exchange. No P2P haggling.

The site is **not** a SaaS homepage. It is a **title sequence you scroll through**. The narrative spine is a single **paper plane** that flies the length of the page, docks at each section while you read it, picks up a USDC coin partway, and exits the frame carrying it.

Reference feeling: digital fashion editorial × motorsport identity × experimental type specimen × interactive title sequence.

**Primary CTA target:** `https://t.me/uselinq_bot`

**Deliverable:** one working `index.html` + `styles.css` + `main.js` (or a Vite project — builder's choice), with an `/assets` folder for the supplied SVGs. No framework required. GSAP + ScrollTrigger + MotionPathPlugin only.

---

## 1. THE ONE RULE THAT GOVERNS EVERYTHING

**The plane is the page's spine. Nothing animates unless the plane's journey justifies it.**

If an element fades, moves, or scales, the answer to "why now?" must be: *because the plane just arrived / is hovering / just left / dropped something.* Decorative motion with no narrative reason is a defect, not a flourish.

---

## 2. ART DIRECTION

### 2.1 Color

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#0A0A0B` | Page background. The default state. ~80% of the page. |
| `--ink-2` | `#141416` | Section-break background shifts only. Barely perceptible. |
| `--paper` | `#F4F1EC` | Primary type on dark. Warm off-white, NOT pure white. |
| `--paper-dim` | `#8C8A86` | Secondary/meta type, nav inactive, technical lines. |
| `--signal` | `#8A4FFF` | **THE brand purple.** Rationed. See below. |
| `--signal-deep` | `#532F99` | Plane body shadow side (already in the plane SVG). |
| `--signal-tint` | `#EDE5FF` | Glyph fill inside purple circles (already in social SVGs). |
| `--signal-dark` | `#281450` | Coin SVG dark tone (already in coin SVG). |

**Purple discipline — this is the single most important art-direction constraint:**

- The page is **near-black**. Purple is not a wash, not a theme, not a background gradient. It is an **event**.
- Purple appears in exactly **four** places:
  1. **The plane itself** — always purple. It is the only continuously-colored object on the page. That's why it reads as alive.
  2. **The USDC coin** — from the moment it's picked up.
  3. **Scene 05 (RATES) — the full-bleed purple climax.** Background flips to `--signal`, type flips to `--ink`. This is the only large color moment. It should feel like a hit.
  4. **The footer CTA rule + the giant cropped plane.**
- Everywhere else: `--paper` type on `--ink`. Restraint is the aesthetic.
- **Nothing** anywhere on the page may use a CSS gradient, glow, blur halo, or purple tint overlay. The gradients that exist inside the supplied plane/coin SVGs stay — those are the artwork's own facets, not CSS effects.

### 2.2 Typography

- **Display:** a tight-tracked grotesk with real weight range. Use a variable font. Suggested: **Neue Haas Grotesk Display**, **Söhne**, or free fallback **Inter Tight** / **Archivo** (variable). Display sizes run 96px → 220px on desktop. Tracking `-0.03em` to `-0.045em`. Weight 600–700.
- **Body/meta:** same family, 15–18px, weight 400, tracking `0.01em`.
- **Technical/mono line:** `ui-monospace, "SF Mono", "JetBrains Mono", monospace` — used only for the bot handle, chain names, and the footer technical line. 12–13px, uppercase, tracking `0.12em`, color `--paper-dim`.
- Text is **real HTML**. Never SVG text, never images of text, never canvas type. Non-negotiable for a11y and sharpness.
- **Wait for `document.fonts.ready` before building any timeline.** Layout computed against fallback metrics = broken pins. This is the #1 cause of jitter in this kind of build.

### 2.3 Grid

- 12-column, `--gutter: 24px` desktop / `16px` mobile. Max content width `1440px`, centered, with a `--edge: 40px` desktop / `20px` mobile page margin.
- **Baseline discipline:** display type locks to a strict grid on arrival — it does not drift into place. Motion resolves to alignment.
- Section markers (`01 — RECEIVE`, etc.) sit in the left margin, vertically set, mono, `--paper-dim`.

---

## 3. THE ASSETS (supplied — see §9 for the manifest)

Do not redraw these. Inline them as `<svg>` in the DOM (not `<img>`) so their internal groups are animatable and their fills can be themed.

- **`plane.svg`** (`Group_427319588.svg`, 1310×881) — the hero paper plane. It has a body plus a long faceted **motion ribbon/trail** streaming behind it. This trail is the single most valuable thing in the asset set: it is the visual proof of flight. Split it into `#plane-body` and `#plane-trail` groups on inline so you can animate them independently (trail lengthens with velocity, shortens on dock).
- **`plane-alt.svg`** (`Group_427319588__1_.svg`, 755×716) — tighter-crop plane variant. Use for mobile and for the footer crop.
- **`coin.svg`** (`Group_427319602.svg`, 480×486) + variants in `LINQ_V2__4_.zip` — the coin. Dark purple, faceted.
- **`rates-card.svg`** (`Frame_2147261762.svg`, 2206×893) — the "you get more for your crypto" rates card, dark purple, with coin rows.
- **`bot-screen.svg`** (`TRANSFER_COMPLETED__1_.svg`, 2160×2160) — the Telegram "transfer completed" confirmation screen.
- **`wordmark.svg`** (`Group_427319379.svg`, 404×82) — the Linq wordmark.
- **`socials.svg`** (`Frame_6.svg` 220×76 = 3 icons; `Frame_2147261615.svg` 487×80 = wider set) — purple circles, `--signal-tint` glyphs. **Split these into individual icon SVGs** — do not ship a single strip; you need per-icon hover states and separate `<a>` wrappers.
- **Flags** (`LINQ_V2__5_.zip` + `GHA_1.svg`) — 17 flags, 129×86 each.
  - ⚠️ **These flags are embedded PNG rasters inside an SVG wrapper, not vector paths.** They will soften if scaled above ~1.5×. Design the stamp at or below native size. Do not scale them large. Do not try to recolor them.

---

## 4. THE PLANE SYSTEM (build this first, before any content)

### 4.1 Architecture

- One `position: fixed` layer, `z-index: 40`, `pointer-events: none`, holding the inline plane SVG. It lives above content, below nav.
- One **invisible master flight path**: a single `<path>` in a fixed full-viewport SVG, `stroke: none`, used only as motion-path data. Its `d` is generated per-breakpoint.
- Drive the plane along it with **GSAP MotionPathPlugin**, `align: "self"`, `autoRotate: true`, `alignOrigin: [0.5, 0.5]`.
- **Reuse this one geometry across every scene.** Do not create a second plane instance. Scene timelines control *progress along the path* and *dock behavior* — never spawn or destroy the plane.

### 4.2 Docking behavior (this is the interaction, get it right)

Per the client's direction: the plane **docks**, it does not merely pass through.

Each scene has three phases on the master ScrollTrigger:

1. **APPROACH** (~25% of scene scroll) — plane travels along the path toward the dock point. Trail at full length. `autoRotate` on, so it banks naturally into the turn.
2. **DOCK / HOVER** (~50%) — plane's path progress **holds**. It does not freeze — it idles: a `yoyo` sine drift of `±6px` on Y and `±1.5deg` rotation, duration ~2.8s, `ease: "sine.inOut"`, running independently of scroll. Trail contracts to ~30% length (it's hovering, not cruising). This is when the section's content animates in. The plane is *waiting for you to read*.
3. **DEPART** (~25%) — trail extends, plane accelerates to the next dock point.

The idle drift must be a **separate looping tween**, not scrubbed. Scrubbed idle = dead plane when the user stops scrolling. The whole illusion depends on the plane being alive at rest.

### 4.3 Scrub values

`scrub: 0.8` on the master path timeline. `scrub: 0.6` on content-reveal timelines. Nothing above `1.2`. **No** bounce, elastic, back, or overshoot eases anywhere — `power2.out`, `power3.inOut`, `sine.inOut`, `none` only. A paper plane has no springs.

### 4.4 The coin pickup

- The coin is **absent** for scenes 01–03.
- **Scene 04 (CHAINS) is the pickup.** The coin sits static at a fixed point in the scene composition. As the plane docks, the coin lifts, meets the plane's back, and **parents to the plane** — from this moment it inherits the plane's transform and rides on top of it.
- Implement as: on pickup complete, `gsap.set` the coin into the plane's SVG group (or attach via a shared wrapper transform). Do **not** run a second motion path for the coin — it will desync on fast scroll.
- The coin then **counter-rotates** slightly against the plane's bank (`-0.4 × plane rotation`) so it reads as sitting *on* the plane rather than glued to it. Small detail, huge payoff.
- The plane carries the coin through 05, 06, 07, and into the footer. **The footer plane still has the coin.** That's the payoff shot.

### 4.5 Floating coins (ambient)

Scenes 05 and 08 only. **Maximum 4 on screen.** These are not particles — they are placed, composed objects on the grid, each with a distinct slow parallax rate (`0.15`–`0.45` of scroll delta) and a long `sine.inOut` rotation loop (12–20s). If it reads as "random particle field," it's wrong: delete half of them and place the rest deliberately.

---

## 5. THE WAVE

The client asked for a wave background extracted from an SVG. **No wave SVG was supplied** — so build it, and build it to serve the story:

- The wave is the **flight-path contrail**, not a decorative background. It is a single `<path>` with `stroke: var(--signal)`, `stroke-width: 1.5`, `fill: none`, `opacity: 0.35`, drawn with `stroke-dasharray` / `stroke-dashoffset` so it **draws itself in exactly as the plane passes over it** and never appears ahead of the plane.
- It sits at `z-index: 5`, behind content, and traces the same shape as the master flight path — so the trail the plane leaves *is* the wave.
- Where it crosses a section it can multiply into 2–3 offset parallel strokes (a wake) at `opacity: 0.12`, then collapse back to one.
- **If the client supplies a real wave SVG:** extract its `d` attribute, resample it to match the flight-path geometry, and use it as the contrail's shape. Same behavior, his curve.

---

## 6. SCENE-BY-SCENE

Nav is fixed throughout. Section markers in the left margin throughout.

---

### NAV (fixed, always)

```
LINQ    01 RECEIVE    02 THE BOT    03 CHAINS    04 RATES    TRY THE BOT ↗
```

- `LINQ` = the supplied wordmark SVG, `height: 20px`, `fill: var(--paper)`.
- Items are real `<a href="#scene-id">` — keyboard focusable, smooth-scroll on click via ScrollTrigger's `scrollTo`.
- Active item: `--paper` + a 1px `--signal` underline that **wipes in horizontally** (`transform: scaleX()` from `transform-origin: left`), 240ms `power2.out`. Inactive: `--paper-dim`.
- A **1px progress rule** spans the full nav width at its bottom edge, `background: var(--signal)`, `transform: scaleX(progress)`, `transform-origin: left`, driven by a page-wide ScrollTrigger.
- **Inversion:** during Scene 05 (purple climax) the nav inverts — `--paper` items become `--ink`, the progress rule becomes `--ink`. Do this with a class toggle on `<nav>` + a CSS transition, triggered by the scene's ScrollTrigger `onEnter`/`onLeaveBack`. Do not animate each child.
- `TRY THE BOT ↗` is a sharp rectangular button, 1px `--paper` border, **zero border-radius**. No pills.
- Skip link (`Skip to content`) is the first focusable element, visually hidden until `:focus`.

---

### SCENE 01 — HERO / LAUNCH

**Composition (static first — this must look right with all JS disabled):**

- Full viewport, `--ink`.
- Display type, left-aligned, locked to columns 1–8:

```
RECEIVE
FROM ANYWHERE.
CASH OUT IN
SECONDS.
```

- Sub-line, mono, `--paper-dim`, columns 1–4:
  `CRYPTO → NAIRA. INSIDE TELEGRAM. NO APP.`
- Plane sits in the upper-right quadrant (columns 9–12), **large — ~520px wide**, angled ~15° down-left, trail streaming off the top-right edge and cropped by the viewport. It should feel like it just entered frame.

**Motion:**

- On load (after `fonts.ready`): the four display lines rise from a `clip-path: inset(100% 0 0 0)` mask, **not** opacity fade. Stagger `0.08`, `power3.out`, `0.7s`. Each line resolves to hard grid alignment.
- Plane enters from off-canvas top-right along the first path segment, decelerating into its hero position. Trail draws behind it. `1.4s`, `power2.out`. Starts at the same moment as line 1.
- **No** "scroll down" indicator. No mouse icon. The plane's angle already points down the page.

---

### SCENE 02 — RECEIVE / THE FLAG STAMPS

**Content:**

Header (display, ~120px):
```
17 COUNTRIES
SEND. YOU GET NAIRA.
```

Body (columns 1–5, 17px `--paper`):
> Someone in Lisbon pays you in USDC. Someone in Toronto pays you in USDT. It lands in your Nigerian bank account in Naira, in under a minute, at a rate you'd actually accept.

**The stamps (this is the section's centerpiece):**

- The 17 flags in an irregular grid across columns 5–12 — **not** a neat matrix. Passport-page logic: each flag sits at a slight random rotation (`-7°` to `+7°`, seeded/deterministic — same on every reload), with 2–3 deliberate empty cells so it reads as a used passport page, not a data table.
- Flags render at or below native `129×86`. Suggest `104×69` desktop, `78×52` mobile. **Do not upscale — they are rasters.**
- Each flag is wrapped in a `.stamp` div with: 1px `--paper-dim` border at `opacity: 0.25`, `border-radius: 0`, and the flag image at `opacity: 0.9`, `filter: saturate(0.85)` — slightly muted so they don't fight the near-black page.

**The stamp motion:**

As the plane docks, flags **stamp in** — sequentially, in a path that follows the plane's dock position outward (nearest flag first):

1. `scale: 1.35 → 1`, `opacity: 0 → 1`, duration `0.18s`, `ease: "power4.out"`. **Fast and hard.** A stamp is an impact, not a fade.
2. On land, a **1px `--signal` border flashes** on that stamp for `120ms`, then fades to the `--paper-dim` border. This is the only purple in the scene — 17 tiny flashes.
3. Stagger `0.045`. All 17 land inside ~1s.
4. The whole grid gets a `2px` settle-shudder (`y: 2 → 0`, `0.1s`) when the last one lands.

`prefers-reduced-motion`: all 17 render immediately, no stamp animation, no flash. Grid still irregular.

⚠️ **FLAG SET DISCREPANCY — RESOLVE BEFORE BUILD.** The supplied flags are `ARG AUT BEL CIV COD COL CPV CRO ESP FRA GHA MAR NED NOR POR SEN SWE`. That is a **World Cup squad list, not a remittance-corridor list.** Real receive corridors are almost certainly US, UK, CA, plus EU — and the US/UK flags are missing entirely. **Do not ship a countries claim built from a football giveaway asset set.** Get the real supported-country list, source those flags, and update the `17 COUNTRIES` headline to the true number.

---

### SCENE 03 — THE BOT

**Content:**

Header:
```
IT'S A TELEGRAM
CHAT.
THAT'S THE
WHOLE PRODUCT.
```

Body (columns 1–5):
> Linq lets you swap stablecoins to cash without leaving the app you're already in. Open the chat. Send your stables. Pick your bank. Done. No exchange account, no P2P merchant, no waiting on a "vendor" to come online.

Mono line: `@uselinq_bot`

**Composition:**

- `bot-screen.svg` (the TRANSFER COMPLETED confirmation) sits columns 7–12, **cropped by the viewport edge on the right** — you see maybe 80% of it. Cropping is the editorial move; a centered floating phone mock is the SaaS move. Crop it.
- No device frame. No fake phone bezel. No fake terminal. The SVG is the artifact — present it flat, hard-edged, no rounded container, no shadow.

**Motion:**

- Plane docks at the screen's top-left corner.
- The bot screen reveals via `clip-path: inset(0 0 100% 0) → inset(0)`, `0.8s`, `power3.inOut` — it wipes down as if being printed.
- Display lines: same clip-mask rise as hero, stagger `0.08`.
- **The plane's nose points at the confirmation checkmark during dock.** Compose for this. The plane is showing you the thing.

---

### SCENE 04 — CHAINS / THE PICKUP

**Content:**

Header:
```
FOUR CHAINS.
ONE CHAT.
```

Chain list — display type, ~72px, one per line, left column, each with a mono `--paper-dim` ticker beside it:

```
SOLANA        SOL / USDC / USDT
SUI           SUI / USDC
BASE          USDC
ETHEREUM      USDC / USDT
```

⚠️ **VERIFY THIS LIST WITH THE CLIENT BEFORE BUILD.** Linq is built on Sui and Solana; Base/Ethereum are assumptions. The coin/chain roster in `rates-card.svg` is authoritative — read the actual coins off that asset and match this list to it exactly. **Never ship a chain the bot doesn't support.**

**Motion — THE PICKUP:**

- The coin sits static, large (~180px), at the right of the chain list, columns 9–11, before the plane arrives. It is dark (`--signal-dark` facets). It reads as inert.
- Chain rows reveal on plane approach: each row's text wipes in left-to-right via `clip-path`, stagger `0.1`, `power2.out`. As each row lands, a `1px --paper-dim` rule draws under it left-to-right (`scaleX`, `0.3s`).
- Plane docks **beside the coin**, hovering.
- **Pickup sequence** (scrubbed, ~30% of the scene's scroll):
  1. Coin lifts `y: -40px`, `0.5s`, `power2.inOut`.
  2. Coin rotates `-18°` and translates to meet the plane's back.
  3. On contact: coin's facets shift from `--signal-dark` to `--signal` — **a single frame flip, no crossfade.** The coin turns on.
  4. Coin parents to the plane. From here it rides.
  5. Plane's trail extends `+40%` — it's carrying weight now, moving with purpose.
- The coin does not return to the page. Ever.

---

### SCENE 05 — RATES / THE PURPLE CLIMAX

**This is the one large color moment. Everything before it was near-black to make this land.**

**The flip:**

- Background goes `--ink → --signal` (`#8A4FFF`) as a **hard horizontal wipe** — a `clip-path: inset(0 100% 0 0) → inset(0)` on a fixed full-viewport panel, driven by scroll, `0.6` scrub. Not a fade. Not a gradient. A wipe.
- All type in this scene is `--ink` (near-black) **on** `--signal`. Nav inverts.
- The plane stays purple against purple — so it now reads as a **silhouette defined only by its own internal facet shading and the coin on its back.** This is intentional and it's the best frame on the page. Compose for it: the coin (now bright purple against purple) and the dark `--signal-deep` facets are the only things separating the plane from the field.

**Content:**

Display, oversized — this is the biggest type on the page (~200px desktop, tight leading `0.86`):

```
YOU GET MORE
FOR YOUR
CRYPTO.
```

Body (`--ink`, columns 1–4):
> Not "competitive rates." Better rates than the P2P desk you're using right now, with none of the chargeback risk.

- `rates-card.svg` sits below/right, columns 6–12, **cropped at the right viewport edge** like the bot screen. The card is already dark purple — it will sit on the `--signal` field as a dark block. That contrast is the composition. Do not add a container, border, or shadow to it.
- Up to **4 floating coins** in this scene (§4.5). On the purple field, render them in `--signal-dark` so they read as shadows rather than glows.

**Motion:**

- Type locks to grid on arrival — lines wipe up from clip masks, stagger `0.09`, then **hold dead still**. No parallax on the display type here. Stillness is what makes it feel like a statement rather than a slide.
- Rate rows inside the card reveal top-to-bottom, stagger `0.06`, `clip-path` wipe. If the card SVG has per-row groups, animate them; if not, mask the card in horizontal bands.
- On exit, the purple wipes back out to `--ink` — **in the opposite direction** to the entry wipe. The color leaves the way it came. Nav un-inverts.

---

### SCENE 06 — HOW IT WORKS

Back to `--ink`. This scene is deliberately plain — the page needs to breathe after the purple.

Header:
```
FOUR STEPS.
UNDER A MINUTE.
```

Four steps as a **horizontal rule sequence** — a single `1px --paper-dim` line running across the viewport with four nodes on it. The plane travels **along this exact line** as its dock path for this scene, stopping at each node.

```
01  START THE BOT        /start in Telegram. No signup form.
02  VERIFY ONCE          NIN + BVN. Takes about a minute. Once, forever.
03  SEND YOUR STABLES    Any supported chain. The bot gives you an address.
04  GET NAIRA            Straight to your bank. Usually before the tab closes.
```

**Motion:**

- Each node: as the plane's nose reaches it, the node dot scales `0 → 1` (`0.15s`, `power4.out`), flashes `--signal` for `100ms`, settles to `--paper`. The step's text wipes in beside it.
- The `1px` rule draws left-to-right **ahead of** the plane by ~120px — the line is being laid down for the plane to follow.
- This is the only scene where the plane moves **horizontally on a straight line**. After five scenes of curves, the straight line reads as resolution.

---

### SCENE 07 — SOCIALS

Short. `--ink`. Centered, columns 5–8.

```
LINQ IS BUILDING IN PUBLIC.
```

Below: the social icons, **split from the supplied strip into individual `<a>` elements**. Each is a purple circle (`--signal`) with a `--signal-tint` glyph — already correct in the source SVG.

- Layout: a single row, `32px` gap, icons at `56px`.
- **Hover/focus:** the circle's fill flips `--signal → --paper`, glyph flips `--signal-tint → --ink`. `140ms`, `power2.out`. No scale, no lift, no glow. A flip.
- Each needs a real `href` and an `aria-label`. **Get the actual handles from the client** — do not ship `#`.
- Plane does a slow, wide **single orbit** around the icon row during this scene, then exits bottom. It's the only loop on the page. It reads as a lap before landing.

---

### SCENE 08 — FOOTER / CTA

**Composition:**

- Background `--ink`.
- Wordmark SVG, small, top-left of the footer block, `--paper` fill.

Centered, display ~110px:
```
CASH OUT
ON TELEGRAM.
```

**The CTA:**

- Sharp rectangle. `1px solid var(--signal)`. **`border-radius: 0`.** Height `64px`, horizontal padding `40px`. Label: `TRY THE BOT ↗`, mono, uppercase, tracking `0.12em`, `--paper`.
- **Hover/focus:** the background wipes in **horizontally left-to-right** — a pseudo-element at `transform: scaleX(0)`, `transform-origin: left`, `background: var(--signal)`, going to `scaleX(1)` over `280ms` `power3.inOut`. Label flips to `--ink`. The `↗` translates `+7px` on X and `-7px` on Y over the same duration.
- On mouse-out the wipe **exits right**, it does not reverse. (Swap `transform-origin` to `right` on the out state.)
- `href="https://t.me/uselinq_bot"`, `target="_blank"`, `rel="noopener"`.

Technical line below, mono, `--paper-dim`:
```
t.me/uselinq_bot
```

**The final shot:**

- A **huge cropped paper plane** (`plane-alt.svg`) below the CTA — scaled so it's ~1.6× the viewport width, positioned so **only the nose section and the coin on its back are visible**, bleeding off the bottom and both side edges. Purple. The coin is still there.
- It is not a background image. It is the last frame of the sequence: the plane you've been following, leaving with your money, cropped mid-departure.
- **No** links, legal text, or nav below it. The plane is the last thing on the page.
- Copyright line, if required, sits *above* the plane, mono, `10px`, `--paper-dim`, `opacity: 0.5`: `RINKU TECHNOLOGY LIMITED — 2026`.

---

## 7. RESPONSIVE — ART-DIRECT, DON'T REFLOW

Support: **1440, 1280, 1024, 768, 430, 390, 360**. Regenerate the flight path `d` at each breakpoint on `ScrollTrigger.matchMedia()` / `gsap.matchMedia()`. Kill and rebuild contexts on breakpoint change — never let two path geometries coexist.

| BP | Treatment |
|---|---|
| **1440 / 1280** | Full spec above. Plane path uses the full horizontal width — wide S-curves crossing the page left↔right. |
| **1024** | Display type steps down ~25%. Plane path narrows: dock points move toward center, less horizontal travel. Rates card crops harder. |
| **768** | Two-column content becomes single-column. Flag grid → 4 across. Chain list keeps its ticker column but drops to `48px` type. Plane docks at the **right edge** consistently rather than alternating. |
| **430 / 390 / 360** | **See below — this is a redesign, not a squeeze.** |

### Mobile (≤430) — the vertical portal

The horizontal flight path does not survive on a 390px viewport. **Replace it, don't compress it.**

- The plane flies a **narrow vertical corridor** down the right third of the screen — small amplitude (`±36px` X), continuous descent. It never crosses the full width.
- Plane scales to `~150px`. Trail shortens permanently to ~40% (a long trail on a narrow viewport reads as clutter).
- Docking still happens — the plane holds and idles beside each section header. **The dock is the story; keep it at every breakpoint.**
- Display type: max `52px`, leading `0.94`.
- Flags: `78×52`, 4 across, stamps still fire, stagger tightens to `0.03`.
- **Scene 05's purple flip becomes a vertical wipe** (top→bottom) instead of horizontal. It still fills the screen. It's still the only color moment. Do not downgrade the climax on mobile — it's the thing people will screenshot.
- Rates card: rotate the crop — show the card's **left portion full-height** rather than a squeezed full card.
- Footer plane crop: use `plane-alt.svg`, ~2.2× viewport width, nose + coin only.
- Floating coins: **maximum 2**.
- **No horizontal scroll anywhere.** `overflow-x: hidden` on `body` is a patch, not a fix — find the element that's overflowing.

---

## 8. ACCESSIBILITY & ENGINEERING

### A11y (all mandatory)

- Semantic HTML: `<header><nav><main><section><footer>`. Each scene is a `<section>` with an `id` and `aria-labelledby` pointing at its `<h2>`.
- One `<h1>` (hero). Scenes use `<h2>`. No heading-level skips.
- Skip link, first in DOM, visible on focus.
- Full keyboard nav. **Visible focus states — a `2px --signal` outline with `2px` offset. Never `outline: none`.** Focus ring must be visible on the purple scene too (use `--ink` outline there).
- Contrast: `--paper` on `--ink` ≈ 15:1 ✓. `--ink` on `--signal` ≈ 5.9:1 ✓. **`--paper-dim` on `--ink` ≈ 4.6:1** — passes for body text but **not** for anything under 14px. Bump `--paper-dim` to `#A3A19D` for the mono/technical lines.
- All decorative SVG: `aria-hidden="true"` + `focusable="false"`. Flags get real `alt`/`<title>` (country names) — they carry the claim.
- Reduced motion:
  ```js
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: reduce)", () => { /* static build */ });
  ```
  In reduced-motion: **no pinning, no scrub, no zoom, no plane flight, no idle drift.** The plane renders once per scene as a static composed element in its dock position. All content is present and readable on load. The purple scene is still purple — it just doesn't wipe. **Every word must be reachable.**

### Engineering

- **`gsap.context()` per scene. Clean up on breakpoint change and unmount.** Leaked contexts are why these builds die on resize.
- **Wait for `document.fonts.ready` before any `ScrollTrigger.create()`.** Then `ScrollTrigger.refresh()`.
- `ScrollTrigger.refresh()` on resize, debounced 150ms. On orientation change too.
- **Transforms, masks, and `clip-path` only.** Never animate `top/left/width/height`. Never animate `filter` or `box-shadow`.
- `will-change: transform` on the plane layer **only**. It is not a performance sprinkle — putting it on 20 elements makes things worse.
- **No WebGL.** Nothing here needs it. If you're reaching for it, the composition is wrong.
- **No scroll-jacking, no scroll traps.** Scroll velocity is the user's. Pinning is allowed (scenes 05 and 06); hijacking the scroll rate is not.
- Target **60fps**. Profile scene 05 (the wipe) and scene 02 (17 simultaneous stamps) — those are the two that will drop frames.
- **Zero console errors. Zero 404s on assets.** Check the network tab before calling it done.
- Lazy-load the two heavy SVGs (`rates-card` 566KB, `bot-screen` 65KB) via `IntersectionObserver` one scene ahead of their reveal.

### Test checklist (run every one)

- [ ] Every scene transition, scrolling **down** and **up**
- [ ] Fast scroll / scroll-flinging — does the coin desync from the plane?
- [ ] Every breakpoint: 1440, 1280, 1024, 768, 430, 390, 360
- [ ] Resize *during* a scene — does the path rebuild cleanly?
- [ ] Every nav link scrolls to the right scene; nav inverts correctly on 05 and un-inverts on exit
- [ ] Tab through the entire page — every interactive element reachable, focus always visible
- [ ] `prefers-reduced-motion` on — all content readable, nothing pinned, nothing hidden
- [ ] CTA hover wipe + arrow; CTA opens `t.me/uselinq_bot` in a new tab
- [ ] No horizontal scroll at any width
- [ ] Console clean

---

## 9. HARD PROHIBITIONS

Non-negotiable. Each of these turns the page into the thing it's trying not to be.

- ❌ CSS gradients or gradient text (the gradients *inside* the supplied SVG artwork are fine — those are facets)
- ❌ Glassmorphism / backdrop-blur
- ❌ Neon blobs, glowing orbs, glow effects, drop-shadow glows
- ❌ Bento grids, feature cards
- ❌ Rounded floating containers
- ❌ Fake terminals
- ❌ Random particle fields
- ❌ Stock illustrations
- ❌ Generic icon packs
- ❌ Constant fade-up-on-scroll (the default AI-site tic — every reveal here is a **clip-path wipe**, and it happens because the plane arrived)
- ❌ Excessive blur
- ❌ Pill-shaped buttons — `border-radius: 0` on every CTA
- ❌ SaaS-template layout
- ❌ Decorative animation with no narrative purpose
- ❌ **Fake benchmarks, fake testimonials, fake partner logos, fake user counts, fake "trusted by" rows, invented rate figures.** Linq is a financial product. Read every number off the supplied assets or get it from the client. **If a figure can't be verified, cut the claim — do not estimate it.**

---

## 10. ASSET MANIFEST

### Supplied ✓

| File | Size | Role | Note |
|---|---|---|---|
| `Group_427319588.svg` | 1310×881 | **Hero plane** | Split into `#plane-body` / `#plane-trail` on inline |
| `Group_427319588__1_.svg` | 755×716 | Plane, tight crop | Mobile + footer |
| `Group_427319602.svg` | 480×486 | **Coin** | The pickup object |
| `LINQ_V2__4_.zip` | 3 files | Coin variants | Use for the 4 floating coins — variety without redraw |
| `Frame_2147261762.svg` | 2206×893 | **Rates card** | 566KB — lazy-load. Authoritative source for the coin/chain roster |
| `TRANSFER_COMPLETED__1_.svg` | 2160×2160 | Bot confirmation screen | Scene 03 |
| `Group_427319379.svg` | 404×82 | Linq wordmark | Nav + footer |
| `Frame_6.svg` | 220×76 | Socials (3: TikTok, IG, X) | **Split into individual icons** |
| `Frame_2147261615.svg` | 487×80 | Socials, wider set | Same — split |
| `LINQ_V2__5_.zip` + `GHA_1.svg` | 17 × 129×86 | Flags | **Embedded PNG rasters — do not upscale** |

### Still needed from the client ⚠️

1. **The real supported-country list + flags.** The 17 supplied are a World Cup set (`ARG AUT BEL CIV COD COL CPV CRO ESP FRA GHA MAR NED NOR POR SEN SWE`) with **no US and no UK** — the two corridors that almost certainly matter most. Scene 02's entire claim depends on this.
2. **Confirmed chain + coin list** for Scene 04. Sui and Solana are known; Base/Ethereum are assumed. The rates card should settle it — confirm against it.
3. **Real social handles + URLs** for Scene 07 (TikTok, Instagram, X, and any others in the wide icon set).
4. **Brand typeface**, if one exists. Otherwise the build uses Inter Tight / Archivo Variable.
5. **The wave SVG**, if he still wants his specific curve — otherwise §5 builds the contrail.
6. **Verified rate/claim copy** — anything in the rates card that will be stated as fact on a live financial site.

### Built, not supplied 🔨

- The master flight path geometry (7 variants, one per breakpoint)
- The wave/contrail path (§5)
- The stamp frames + irregular passport grid
- Scene 06's rule-and-node sequence
- The purple wipe panel
- Individual social icon files (split from the strips)
- All layout, type, and interaction states

---

## 11. BUILD ORDER

Do not attempt this in one pass. Build in this order and check each stage in a browser before continuing.

1. **Static composition, no JS.** Every scene, every breakpoint, fully readable, correctly typeset, assets placed. *This must look good frozen.* If it doesn't hold as a static page, no amount of animation saves it. Ship-quality here before anything moves.
2. **Nav + smooth scroll + a11y skeleton.** Skip link, focus states, semantics, keyboard nav.
3. **The plane system.** One path, one plane, MotionPath, docking with idle drift. No content animation yet — just fly the page end to end and get the dock rhythm right. **This is the whole site; spend the time here.**
4. **The coin pickup.** Scene 04 parent-and-carry, counter-rotation, desync-test on fast scroll.
5. **Content reveals.** Clip-wipes, stamps, chain rows, step nodes — each tied to its dock.
6. **The purple climax.** Scene 05 wipe + nav inversion.
7. **The contrail/wave.**
8. **Reduced-motion build.**
9. **Breakpoint art direction**, mobile last and most carefully.
10. **Profile, fix frame drops, clear console, run §8's checklist.**

---

## 12. THE TEST

When it's done, scroll it with the sound off and ask: *does this feel like a title sequence, or does it feel like a landing page?*

If a single element on screen can't answer "the plane brought me here," delete it.
