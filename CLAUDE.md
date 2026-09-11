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

## One notice per event, and the kind is what dedupes

`ORDER_NOTICES` in `src/server/receipts.ts` maps an order status to the notices
it owes, to both sides. `noticeCopy` writes each one.

Receipts are idempotent per **(order, kind, audience, recipient)**, so two
events sharing a `ReceiptKind` means the second sends nothing. `deposited` and
`settled` both used to send `merchant_fiat_received`: the merchant was told
their money had arrived the moment the payer's crypto landed — before a payout
had been attempted — and then never heard that it actually settled. A kind names
the **event**, never the outcome. Adding a status means adding its own kinds, to
`ReceiptKind` in `types.ts` and to `receiptKindSchema` in `validation.ts`.

- `deposited` says "payout in progress" to both sides. It must never read as
  money having arrived anywhere.
- A failed payout reaches the merchant as a **failure**, and the payer as a
  **refund** — not, as it once did, both of them as a refund notice that never
  mentioned the payout.
- `expired` is not a failure. Nothing moved; say so.
- `statusReason` carries the provider's own words into the copy. A notice that
  says only "Payout failed" is a support ticket waiting to happen.

`renderReceipt` builds the image once and makes both the email and the PDF from
it. Satori through sharp is the most expensive thing between a payment landing
and someone being told about it; asking for the HTML and the PDF separately did
all of it twice per receipt, four times per pair.

## Receipts must be sent from the poll, not just the webhook

Emails are sent by `notifyForOrderStatus`. It is called from three places, and
**all three are load-bearing**:

- `POST /api/webhooks/linq` and `/api/webhooks/paycrest` — chains that settle
  through Linq or Paycrest.
- `GET /api/orders/[id]` — the status poll. **Stellar has no webhook.**
  `linq-stellar` owns its own settlement, so this poll is the only thing that
  ever moves a Stellar order to `settled`. Wiring receipts to the webhooks
  alone meant no payer and no merchant was ever emailed for a Stellar
  transaction, while the checkout told the payer "a copy has been sent to
  <email>".
- `expireOrderIfDue` — the deposit window closing.

Adding a new settlement path means wiring receipts into it too.

`createAndSendReceipt` is idempotent per (order, kind, audience, recipient), so
an order that gets both a webhook and a poll is not emailed twice. Await the
notify rather than firing it off — this runs on serverless, where the function
is frozen once the response returns and detached work is lost.

A deployment without `RESEND_API_KEY` records receipts as `skipped` and sends
nothing. That is a valid local setup, so it does not throw — it logs
`email.skipped_no_provider`, and `/api/health/ready` reports it. Check both
before assuming the send path is broken.

## The checkout follows the order, not the payer

`PaymentCheckout` polls `GET /api/orders/[id]` every two seconds, once
immediately on entry, and again whenever the tab is looked at — paying means
leaving for a wallet app and coming back, and coming back is when someone wants
an answer.

`pending` means **still waiting**, not "arrived". It is what both status
normalisers return for a state they do not recognise, and taking a payer off the
address they are mid-way through paying is wrong in the one direction that costs
money.

A refund is its own outcome, with its own screen — destination, hash, explorer
link — not a variety of failure. Telling a payer their payment failed and
offering them support is asking them to chase money already on its way back.

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
