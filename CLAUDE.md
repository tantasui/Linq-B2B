# Linq-B2B

Next.js merchant dashboard and payer checkout for the crypto → NGN off-ramp.
Stellar orders go through the standalone `linq-stellar` service; every other
chain goes through Linq's `/b2b/offramp`.

## Never format a crypto amount with toFixed(2)

This shipped once and cost a merchant 4.5% of a ₦100 order. A ₦100 invoice at
₦1,364.21/USDC is 0.0733018… USDC; rendered with `.toFixed(2)` the payer was
told to send **0.07**, sent it, and the merchant was paid ₦95.49.

Two decimals is a habit borrowed from naira. Stablecoins carry six or seven,
and at these rates the third decimal is worth ₦1.36.

**Use `formatTokenAmount` from `@/lib/money`** for any amount a payer reads,
and `ceilTo` for any amount computed from a rate. Both round **up**, so the
figure on screen is never less than the figure owed. That covers the review
sheet, the transfer sheet, the SEP-7 QR, receipts and the transactions list —
they must all show one figure.

`ceilTo` snaps values already exact at the target precision before rounding;
without it `0.07 * 1e6` is `70000.00000000001` and an exact 0.07 renders as
0.070001.

## Quotes vs. running amounts

`linq-stellar` returns `quotedUsdc`/`quotedNgn` (what was asked for, never
rewritten) alongside `amountUsdc`/`amountNgn` (what arrived, what was paid).
`cryptoAmountDue` must come from the **quote**, or a payer reopening a
part-paid checkout is shown what they already sent instead of what they owe.

An order may come back with `underpaid: true` and a `shortfallNgn`.

## Verify

```bash
npx tsc --noEmit          # what `bun lint` runs first; must be clean
npx biome check <files>   # repo is NOT biome-clean; compare against HEAD
                          # rather than fixing unrelated formatting
```

Biome's configured line width (80) is narrower than the codebase actually
uses (~110), so a whole-file format produces large unrelated diffs. Match the
surrounding code and only ensure you add no *new* errors.

Adding a comment inside a Go-style aligned block or a wide struct can make a
formatter re-align many untouched lines — prefer a trailing comment when the
alternative is diff churn.
