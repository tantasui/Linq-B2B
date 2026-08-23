# Brand source assets

Master art for the Linq brand. **Not served** — this folder is outside `public/`
on purpose, so a 5 MB marketing poster can't be fetched from the production
site and doesn't ship in the deploy. The subset the app actually renders lives
in `public/`, and is derived from what's here.

## What the app uses

| Where | What it renders | Derived from |
|---|---|---|
| `src/components/brand/LinqMark.tsx` | Chain-link mark, inlined as paths | `receipt-template.svg` (the lockup at top-left) |
| `src/components/brand/LinqMark.tsx` | Wordmark, inlined as paths | `wordmark.svg` |
| `src/components/brand/SegmentedBar.tsx` | The 10-stop purple ramp, as hex values | `segmented-bar.svg` |
| `src/components/brand/Receipt.tsx` | Printer, perforation, scalloped edge | `receipt-template.svg` |
| `public/networks/*.svg` | Network badges | `networks/*.svg` (copied as-is) |
| `public/brand/coin-tilted.svg`, `rocket.svg` | Empty states | `coin-tilted.svg`, `rocket.svg` |

The mark and wordmark are inlined as React rather than linked as files so they
inherit `currentColor` and can never be recoloured off-system.

## Files

| File | Original export name | Notes |
|---|---|---|
| `wordmark.svg` | `Untitled/Group 427319677.svg` | LINQ wordmark, 1060×392 |
| `mark.png` | `svgviewer-png-output_9_nool2f.png` | Chain-link mark, raster. Useful as an app-icon source |
| `segmented-bar.svg` | `Rectangle 39927.svg` | 10 segments, `#8A4FFF` → `#F3EDFF` |
| `receipt-template.svg` | `good friday.svg` | **The receipt master.** Blank printer + ticket, light mode. The construction the `Receipt` component follows |
| `receipt-poster-raffle.svg` | `Frame 2147261674.svg` | Raffle poster, dark. Same ticket, filled in. 5 MB — the wavy texture is embedded |
| `coin-3d.svg` | `Frame 2147261637.svg` | 3D `$` coin with grain texture, 1.2 MB |
| `coin-tilted.svg` | `Group 427319424.svg` | Tilted 3D coin, 4 KB. Preferred in-app for weight |
| `rocket.svg` | `Group 427319473.svg` | Rocket + organic wave shapes |
| `rocket.png` | `Group 427319473.png` | Raster of `rocket.svg`, same 2160×2036. Redundant; re-exportable from the SVG |
| `networks/*.svg` | as named | 400×400 circular badges |

## Gotchas

**`bnb.svg` in the original drop is Tron, not BNB.** The red `#FF060A` disc is
the TRON mark; `bnb (1).svg` is the real BNB. They're stored here corrected —
`networks/bnb.svg` is BNB, `networks/tron.svg` is Tron — but if you go back to
the original folder, expect the swap.

**Stellar has no asset here.** It's the one supported chain without a local
brand SVG, so `NetworkLogo` falls back to a hosted mark for it, then to a
lettered disc if that fails. Dropping a 400×400 `networks/stellar.svg` in and
copying it to `public/networks/` removes that remote dependency.

**Not carried over:** `Untitled.zip` (contained only byte-identical copies of
`wordmark.svg` and `segmented-bar.svg`) and two duplicate `Rectangle 39927`
exports. Nothing unique was dropped.
