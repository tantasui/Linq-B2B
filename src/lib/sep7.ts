/**
 * SEP-7 payment URIs.
 *
 * https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md
 *
 * Stellar wallets understand a `web+stellar:` URI describing a payment. Putting
 * one in the checkout QR means the payer scans and gets destination, asset and
 * amount already filled in, instead of scanning a bare address and typing the
 * rest — which is where wrong-asset and wrong-amount mistakes come from.
 *
 * These URIs are unsigned. A signed URI additionally proves the request came
 * from a known domain, but that requires publishing URI_REQUEST_SIGNING_KEY in
 * a stellar.toml at the origin domain; some wallets show an "unverified request"
 * notice without it. Everything below still parses and prefills correctly.
 */

/** Circle's USDC issuer on Stellar pubnet. */
export const STELLAR_USDC_ISSUER =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

export interface Sep7PayParams {
  /** Account the payment is sent to. */
  destination: string;
  /** Amount of the asset to send. Omit to let the payer choose. */
  amount?: number;
  /** Asset code; omit for native XLM. */
  assetCode?: string;
  /** Issuer account of the asset; omit for native XLM. */
  assetIssuer?: string;
  /** Shown by the wallet to explain what the payment is for. */
  msg?: string;
  /** Domain the request originates from, e.g. "pay.example.com". */
  originDomain?: string;
  /** Attached to the transaction, e.g. an order reference. */
  memo?: string;
  memoType?: "MEMO_TEXT" | "MEMO_ID" | "MEMO_HASH" | "MEMO_RETURN";
}

/**
 * Builds a `web+stellar:pay` URI.
 *
 * Amounts are emitted with up to 7 decimal places, Stellar's maximum precision;
 * more than that is rejected as malformed by wallets. `msg` is capped at the
 * 300 characters SEP-7 allows.
 */
export function buildSep7PayUri(params: Sep7PayParams): string {
  const query = new URLSearchParams();
  query.set("destination", params.destination);

  if (
    params.amount !== undefined &&
    Number.isFinite(params.amount) &&
    params.amount > 0
  ) {
    query.set("amount", trimAmount(params.amount));
  }
  if (params.assetCode) query.set("asset_code", params.assetCode);
  if (params.assetIssuer) query.set("asset_issuer", params.assetIssuer);
  if (params.memo) {
    query.set("memo", params.memo);
    query.set("memo_type", params.memoType ?? "MEMO_TEXT");
  }
  if (params.msg) query.set("msg", params.msg.slice(0, 300));
  if (params.originDomain) query.set("origin_domain", params.originDomain);

  return `web+stellar:pay?${query.toString()}`;
}

/** Up to 7 decimal places, without trailing zeros. */
function trimAmount(amount: number): string {
  return String(Number(amount.toFixed(7)));
}

/** Convenience wrapper for the USDC-on-Stellar case, which is all we accept. */
export function buildStellarUsdcPayUri(args: {
  destination: string;
  amount?: number;
  msg?: string;
  originDomain?: string;
}): string {
  return buildSep7PayUri({
    destination: args.destination,
    amount: args.amount,
    assetCode: "USDC",
    assetIssuer: STELLAR_USDC_ISSUER,
    msg: args.msg,
    originDomain: args.originDomain,
  });
}
