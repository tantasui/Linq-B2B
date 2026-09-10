/**
 * Formatting for crypto amounts.
 *
 * This file exists because of one line of code. A ₦100 invoice at ₦1,364.21
 * per USDC is 0.0733018… USDC, and the checkout rendered it with
 * `.toFixed(2)` — so the payer was told to send 0.07. They sent 0.07, and
 * the merchant, who had invoiced ₦100, was paid ₦95.49.
 *
 * Two decimals is a fiat habit. Stablecoins carry six or seven, and at
 * ₦1,364/$ the third decimal place is worth ₦1.36 — dropping it is not a
 * display detail, it is 4.5% of a small order. So amounts here are rendered
 * at the precision the asset actually has, and rounded UP, so the figure a
 * payer reads is never less than the figure they owe.
 */

/**
 * Decimals to quote and display each stablecoin at.
 *
 * Six across the board, which every supported rail can express exactly:
 * USDC and USDT carry six decimals on EVM chains, USDSUI six on Sui, and
 * Stellar allows seven — a superset. Quoting at the tightest common
 * precision means the amount on screen, the amount in the QR and the amount
 * the payer's wallet accepts are all the same number, with nothing lost
 * between them.
 */
export const TOKEN_DECIMALS = 6;

/**
 * Rounds up to `decimals` places.
 *
 * Up, not nearest — see the file comment. The snap-to-integer step guards
 * float64 scaling: 0.07 * 1e6 is 70000.00000000001 in IEEE 754, and a bare
 * Math.ceil would render an already-exact 0.07 as 0.070001.
 */
export function ceilTo(value: number, decimals = TOKEN_DECIMALS): number {
  if (!Number.isFinite(value)) return 0;
  const scale = 10 ** decimals;
  const scaled = value * scale;
  const nearest = Math.round(scaled);
  const exact = Math.abs(scaled - nearest) < 1e-6;
  return (exact ? nearest : Math.ceil(scaled)) / scale;
}

/**
 * Renders a crypto amount a payer is being asked to send.
 *
 * Rounded up to the asset's precision, trailing zeros trimmed, and never
 * fewer than two decimals so small amounts still read as money. The result
 * is exact: a payer who types what they see has paid the invoice in full.
 */
export function formatTokenAmount(
  amount: number,
  decimals = TOKEN_DECIMALS,
): string {
  if (!Number.isFinite(amount) || amount <= 0) return "0.00";

  const rounded = ceilTo(amount, decimals);
  const [whole, fraction = ""] = rounded.toFixed(decimals).split(".");
  const trimmed = fraction.replace(/0+$/, "").padEnd(2, "0");
  return `${Number(whole).toLocaleString("en-US")}.${trimmed}`;
}
