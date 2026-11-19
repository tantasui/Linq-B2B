# LinqSwitch dashboard — design direction

Applies to `/dashboard/*` only. The landing page and the payer checkout keep
the paper-and-purple brand. The tokens live in `src/app/globals.css` under
`.theme-console`; the layout puts that class on `<html>` while the dashboard is
open.

Adapted from the Mercury style reference ("alpine banking at blue hour"):
structure, surfaces, type and restraint are Mercury's; the colour is Linq's.

## Surfaces

| Role | Value |
|---|---|
| Canvas (page) | `#171721` |
| Card / sidebar / table | `#1E1E2A` — one step lighter; separation by value, not shadow |
| Raised control fill, hover | `#272735` |
| Pressed / active step | `#2F2F3F` |
| Hairline | `#2C2C3A`; stronger `#3F3F4F` |

No drop shadows on cards. The only shadow is under things that float over the
page: sheets, menus, the bulk-action bar, toasts.

## Text

| Role | Value |
|---|---|
| Primary | `#EDEDF3` ivory — never pure white for body |
| Secondary | `#C3C3CC` ash |
| Tertiary / metadata | `#9494A3` |

## Colour — Linq's, not Mercury's

- **Linq purple `#8A4FFF`** replaces Mercury's cobalt as the one chromatic
  action: primary buttons, the current page in the nav, focus rings, the
  selected day, chart strokes. Never decoration, never a secondary button.
  Purple *type* on the dark canvas uses the lighter `#B395FF` for contrast.
- **Green and red mean money moved or did not.** Settled is green, failed and
  expired are red, in-flight is purple-tinted. Mercury is monochrome; a payments
  dashboard cannot be, because a merchant must tell a failed payout from a
  settled one at a glance. These colours appear only on status, never on chrome.
- The LINQ mark stays brand purple.

To swap the action colour (for example to money green), change `--accent*`
in `.theme-console`; nothing else references the hue.

## Type

Inter Tight throughout. Body 14–16px at 400. Headings at 500 (Mercury's 480
rounded to the nearest loaded weight), slightly open tracking (+0.01em), never
600/700. Figures are tabular wherever they line up.

## Shape

- Buttons and segmented controls: pill (`32px`).
- Cards, tables, sheets: `12px`.
- Inputs, rows, chips inside cards: `8–10px`.

## Rules carried over

- One filled purple action per view.
- Status dots and colours only where they mark a real state.
- No gradients on chrome, no glow, no glass beyond the sticky top bar.

Dials: ENERGY 2 / RHYTHM 2 / MOTION 1 (hover and state changes only; the
balance counts once on load).
