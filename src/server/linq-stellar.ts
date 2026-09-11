import { isAddressValidForNetwork } from "@/lib/chains";
import { env, stellarServiceEnabled } from "./env";
import { ApiError } from "./http";
import { logger } from "./logger";
import { getLinqRate } from "./linq-offramp";
import type { BankAccountRecord, OrderRecord } from "./types";

/**
 * The standalone Stellar settlement service (github.com/Rinku-Labs/linq-stellar).
 *
 * Unlike every other chain, Stellar orders do not go through Linq's
 * `/b2b/offramp` — this service owns its own deposit accounts, watches Horizon
 * itself, and asks the Linq backend to pay the merchant only once it has
 * confirmed a deposit on-chain. Order creation and lookup are gated on a
 * shared secret (X-API-Key); the request never leaves this server, so the
 * payer's browser never sees its URL or the key.
 */
async function requestStellar<T>(path: string, init?: RequestInit): Promise<T> {
  if (!stellarServiceEnabled) throw new ApiError("Stellar settlement service is not configured.", 503);
  const method = init?.method ?? "GET";
  const startedAt = Date.now();
  const response = await fetch(`${env.STELLAR_SERVICE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.STELLAR_SERVICE_API_KEY!,
      ...init?.headers,
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  const durationMs = Date.now() - startedAt;
  logger.info("stellar.request", { method, path, status: response.status, durationMs });
  if (!response.ok) {
    logger.warn("stellar.request_failed", { method, path, status: response.status, body });
    throw new ApiError(
      String(body.message ?? `Stellar service request failed with ${response.status}.`),
      response.status >= 500 ? 502 : response.status,
      { provider: "linq-stellar", providerStatus: response.status, path, body },
    );
  }
  return body as T;
}

interface StellarOrderResponse {
  id: string;
  status: string;
  depositAddress: string;
  amountUsdc: number;
  amountNgn: number;
  /** What the order was quoted at, never rewritten by a deposit. */
  quotedUsdc?: number;
  quotedNgn?: number;
  /** Set when the deposit did not cover the quote. */
  underpaid?: boolean;
  shortfallNgn?: number;
  rate: number;
  currency: string;
  depositTxHash?: string;
  sweepTxHash?: string;
  paymentUri?: string;
  depositDeadline: string;
}

export async function createStellarOrder(input: {
  amountNgn: number;
  bank: BankAccountRecord;
  payerName: string;
  idempotencyKey: string;
  manualDeposit?: boolean;
  refundAddress?: string;
}) {
  // This service does not quote its own NGN rate; it takes one and computes
  // amountUsdc from it. Reusing Linq's own rate keeps a Stellar quote and a
  // same-instant Sui/Base/etc quote consistent with each other.
  const { rate } = await getLinqRate();
  const manualDeposit = input.manualDeposit ?? true;

  const response = await requestStellar<StellarOrderResponse>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amountNgn: input.amountNgn,
      rate,
      bankCode: input.bank.institutionCode,
      bankAccount: input.bank.accountIdentifier,
      bankName: input.bank.institutionName ?? "",
      accountName: input.bank.resolvedAccountName ?? input.payerName,
      currency: "NGN",
      ...(input.refundAddress ? { refundAddress: input.refundAddress } : {}),
      manualDeposit,
      customerRef: `linq-${input.idempotencyKey}`,
      idempotencyKey: input.idempotencyKey,
    }),
  });

  logger.info("stellar.order_created", {
    id: response.id,
    depositAddress: response.depositAddress,
    amountUsdc: response.amountUsdc,
    amountNgn: response.amountNgn,
    rate,
  });

  // Same fund-safety gate createLinqOrder applies to every other chain: never
  // surface a deposit address that isn't actually valid on the chain the payer
  // is about to send to.
  if (!isAddressValidForNetwork(response.depositAddress, "stellar")) {
    logger.error("stellar.address_shape_mismatch", {
      stellarOrderId: response.id,
      depositAddress: response.depositAddress,
    });
    throw new ApiError(
      "The Stellar service returned a deposit address that does not look like a Stellar account. This order was stopped to protect your funds.",
      502,
      { provider: "linq-stellar", depositAddress: response.depositAddress },
    );
  }

  return {
    linqOrderId: response.id,
    providerReceiveAddress: response.depositAddress,
    // linq-stellar signs this URI with the key it publishes as
    // URI_REQUEST_SIGNING_KEY in its stellar.toml, which is the only way a
    // scanning wallet can tell a genuine request from an intercepted QR. We
    // cannot produce that signature here, so the URI is carried through rather
    // than rebuilt. Taken at creation, while amountUsdc is still the quote.
    paymentUri: response.paymentUri,
    coinType: "",
    quotedRate: response.rate,
    // The quote, not the running amount. They agree at creation; after a
    // deposit lands amountUsdc becomes what actually arrived, and a payer who
    // reopens the checkout must still be shown what they were asked for.
    cryptoAmountDue: response.quotedUsdc ?? response.amountUsdc,
    amountNgn: response.amountNgn,
    status: normalizeStellarStatus(response.status),
    // This service's own deposit window (30m by default), not Linq's native
    // 10m one — the caller should use this instead of assuming the shorter
    // window, or it will mark an order expired while linq-stellar is still
    // watching for the deposit.
    depositDeadline: response.depositDeadline,
    raw: response,
  };
}

export async function getStellarOrderStatus(id: string) {
  if (!id.trim()) throw new ApiError("Stellar order id is required.", 400);
  const response = await requestStellar<StellarOrderResponse>(`/orders/${encodeURIComponent(id)}`);
  return {
    linqOrderId: response.id,
    status: normalizeStellarStatus(response.status),
    amountStableCoin: response.amountUsdc,
    amountNgn: response.amountNgn,
    // Carried through rather than dropped: a payout below the invoice is
    // something the merchant has to be able to see a reason for.
    underpaid: response.underpaid ?? false,
    shortfallNgn: response.shortfallNgn ?? 0,
    depositDigest: response.depositTxHash,
    raw: response,
  };
}

/**
 * Maps linq-stellar's own state machine onto the checkout's OrderStatus
 * vocabulary.
 *
 * `disbursed` is treated as terminal ("settled") the same way Linq's native
 * flow treats it: the merchant has been paid, which is what the payer and
 * merchant both care about. The crypto leg that follows — sweeping USDC to
 * treasury and merging the deposit account back to the sponsor — is Linq's
 * own bookkeeping and not something either side needs to keep watching for.
 */
export function normalizeStellarStatus(status: string | undefined): OrderRecord["status"] {
  switch (status) {
    case "initiated":
      return "initiated";
    case "awaiting_deposit":
      return "initiated";
    case "deposit_detected":
      return "deposited";
    case "payout_queued":
    case "payout_processing":
      return "fulfilling";
    case "disbursed":
    case "sweep_queued":
    case "sweep_processing":
    case "settled_in_treasury":
      return "settled";
    case "refund_queued":
    case "refund_processing":
      return "refunding";
    case "refunded":
      return "refunded";
    case "expired":
      return "expired";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}
