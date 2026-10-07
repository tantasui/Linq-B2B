import { chainDisplayName, isAddressValidForNetwork, linqCoinFlags, linqNetworkFor } from "@/lib/chains";
import { cached } from "./cache";
import { dedicatedOfframpFor, env, liveLinqEnabled } from "./env";
import { ApiError } from "./http";
import { logger } from "./logger";
import type { BankAccountRecord, OrderRecord, StablecoinSymbol } from "./types";

export const USDSUI_COIN_TYPE =
  "0x44f838219cf67b058f3b37907b655f226153c18e33dfcd0da559a844fea9b1c1::usdsui::USDSUI";

export const USDC_SUI_COIN_TYPE =
  "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";

/**
 * The Sui move-type for a token. Sui only — the caller must already know the
 * order is on Sui.
 *
 * USDT returns empty rather than falling through to USDSUI. It is not a Sui
 * coin here, and a wrong move-type would label an order as holding a coin it
 * does not; empty is what the one call site already sends for every non-Sui
 * chain.
 */
export function coinTypeForToken(token: StablecoinSymbol): string {
  if (token === "USDC") return USDC_SUI_COIN_TYPE;
  if (token === "USDSUI") return USDSUI_COIN_TYPE;
  return "";
}

function linqCoinId(token: StablecoinSymbol): string {
  if (token === "USDC") return "usdc";
  if (token === "USDT") return "usdt";
  return "usdsui";
}

async function requestLinq<T>(path: string, init?: RequestInit): Promise<T> {
  if (!liveLinqEnabled) throw new ApiError("Linq Offramp API key is not configured.", 503);
  const method = init?.method ?? "GET";
  const startedAt = Date.now();
  const response = await fetch(`${env.LINQ_OFFRAMP_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.LINQ_OFFRAMP_API_KEY!,
      ...init?.headers,
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  const durationMs = Date.now() - startedAt;
  logger.info("linq.request", { method, path, status: response.status, durationMs });
  if (!response.ok) {
    logger.warn("linq.request_failed", { method, path, status: response.status, body });
    throw new ApiError(
      String(body.message ?? `Linq request failed with ${response.status}.`),
      response.status >= 500 ? 502 : response.status,
      { provider: "linq", providerStatus: response.status, path, body },
    );
  }
  return body as T;
}

export async function getLinqRate() {
  return cached("linq:rate:sui:ngn", 60, async () => {
    const response = await fetch(`${env.LINQ_OFFRAMP_API_URL}/b2b/rate`, { cache: "no-store" });
    const body = await response.json() as { rate?: number; currency?: string; coin?: string };
    if (!body.rate || !Number.isFinite(body.rate) || body.rate <= 0) {
      throw new ApiError("Linq did not return a usable rate.", 502, { body });
    }
    return { rate: body.rate, currency: body.currency ?? "NGN", coin: body.coin ?? "USDSUI" };
  });
}

export async function verifyLinqBankAccount(bankCode: string, accountNumber: string) {
  if (!liveLinqEnabled) throw new ApiError("Linq Offramp API key is required for bank verification.", 503);
  const response = await requestLinq<{
    accountName: string;
    bankName: string;
    accountNumber: string;
    bankCode: string;
  }>("/b2b/verifybank", {
    method: "POST",
    body: JSON.stringify({ bankCode, accountNumber }),
  });
  return {
    institutionCode: bankCode,
    accountIdentifier: accountNumber,
    accountName: response.accountName,
    bankName: response.bankName,
    verified: Boolean(response.accountName),
    raw: response,
  };
}

export async function createLinqOrder(input: {
  amountNgn: number;
  token: StablecoinSymbol;
  network: string;
  bank: BankAccountRecord;
  payerName: string;
  idempotencyKey: string;
  /**
   * Manual-deposit mode: the payer copies the address and sends from their own
   * wallet, so the sent amount is whatever they choose. Linq then reconciles the
   * NGN payout to the amount that actually arrives (`actual deposit × locked rate`)
   * — overpayment scales the payout up, underpayment scales it down. Defaults to
   * true because this checkout is always a copy-address flow. See docs-main/offramp-api.md.
   */
  manualDeposit?: boolean;
  /** Sui wallet to refund to if the bank payout fails. Strongly recommended by Linq. */
  refundAddress?: string;
  /** Our merchant's id, so Linq can report volume and revenue per merchant. */
  merchantRef?: string;
}) {
  const dedicated = dedicatedOfframpFor(input.merchantRef);
  logger.info("linq.offramp_route", {
    merchantRef: input.merchantRef,
    network: input.network,
    token: input.token,
    amountNgn: input.amountNgn,
    api: dedicated ? "/linq-b2b/offramp" : "/b2b/offramp",
  });
  if (dedicated) return createDedicatedOrder(input);
  const coin = linqCoinId(input.token);
  const network = linqNetworkFor(input.network);
  const manualDeposit = input.manualDeposit ?? true;
  const response = await requestLinq<{
    id: string;
    walletAddress: string;
    coinType: string;
    coin?: string;
    amountStableCoin: number;
    amountNGN: number;
    rate: number;
    currency: string;
    status: string;
  }>("/b2b/offramp", {
    method: "POST",
    body: JSON.stringify({
      amountNGN: input.amountNgn,
      // `coin` names the stablecoin; `chain`/`network` and the CoinType flag set
      // name the chain. Linq generates a fresh deposit wallet per chain from these,
      // which is why all three are sent — the flags are what its order model reads.
      coin,
      chain: network,
      network,
      coinFlags: linqCoinFlags(input.network),
      manualDeposit,
      bankAccount: input.bank.accountIdentifier,
      bankCode: input.bank.institutionCode,
      bankName: input.bank.institutionName ?? "",
      accountName: input.bank.resolvedAccountName ?? input.payerName,
      currency: "NGN",
      ...(input.refundAddress ? { refundAddress: input.refundAddress } : {}),
      customerRef: `linq-${input.idempotencyKey}`,
      idempotencyKey: input.idempotencyKey,
    }),
  });
  logger.info("linq.order_created", {
    id: response.id,
    walletAddress: response.walletAddress,
    coin,
    network,
    manualDeposit,
    amountStableCoin: response.amountStableCoin,
  });

  // Fund-safety gate: never surface a deposit address that isn't valid for the
  // chain the payer chose. If the provider echoes an address from another chain
  // (e.g. a Sui address for a Solana order), the payer's funds would be lost, so
  // fail the order loudly instead.
  if (!isAddressValidForNetwork(response.walletAddress, input.network)) {
    logger.error("linq.address_chain_mismatch", {
      linqOrderId: response.id,
      requestedNetwork: input.network,
      linqNetwork: network,
      walletAddress: response.walletAddress,
    });
    throw new ApiError(
      `The offramp provider returned a deposit address that is not valid on ${chainDisplayName(input.network)}. This order was stopped to protect your funds.`,
      502,
      { provider: "linq", requestedNetwork: input.network, walletAddress: response.walletAddress },
    );
  }
  return {
    linqOrderId: response.id,
    providerReceiveAddress: response.walletAddress,
    // coinType is a Sui move-type; only meaningful on Sui. Trust Linq's value elsewhere.
    coinType: response.coinType ?? (network === "sui" ? coinTypeForToken(input.token) : ""),
    quotedRate: response.rate,
    cryptoAmountDue: response.amountStableCoin,
    amountNgn: response.amountNGN,
    status: normalizeLinqStatus(response.status),
    raw: response,
  };
}

export async function getLinqOrderStatus(id: string, opts: { dedicated?: boolean } = {}) {
  if (!id.trim()) throw new ApiError("Linq order id is required.", 400);
  if (opts.dedicated) {
    const snap = await requestLinq<DedicatedSnapshot>(`/linq-b2b/offramp/${encodeURIComponent(id)}`);
    logger.info("linq.dedicated_status", {
      linqOrderId: snap.id,
      lifecycleStatus: snap.lifecycleStatus,
      pipelineStatus: snap.status,
      mapped: normalizeDedicatedStatus(snap),
      received: snap.amountReceived,
      remaining: snap.amountRemaining,
      total: snap.totalUsdc,
      depositDeadline: snap.depositDeadline,
      graceDeadline: snap.graceDeadline,
    });
    return {
      linqOrderId: snap.id,
      status: normalizeDedicatedStatus(snap),
      amountStableCoin: snap.totalUsdc,
      amountNgn: snap.amountNGN,
      depositDigest: snap.depositDigest || undefined,
      detail: dedicatedDetail(snap),
      raw: snap,
    };
  }
  const response = await requestLinq<{
    id: string;
    status: string;
    amountStableCoin: number;
    amountNGN: number;
    currency: string;
    created: string;
    updated: string;
    depositDigest?: string;
  }>(`/b2b/status?id=${encodeURIComponent(id)}`);
  return {
    linqOrderId: response.id,
    status: normalizeLinqStatus(response.status),
    amountStableCoin: response.amountStableCoin,
    amountNgn: response.amountNGN,
    depositDigest: response.depositDigest,
    raw: response,
  };
}

/**
 * Linq statuses that mean the order exists but no money has arrived yet.
 *
 * Linq moves an order off "initiated" as soon as it is queued, and again when
 * a worker starts watching the deposit wallet — both before the payer has sent
 * anything. Treating those as "fulfilling" told the checkout the transfer had
 * been received and replaced the deposit address with a confirmation screen,
 * so the payer never saw where to send the money.
 *
 * Anything further along genuinely does mean the deposit landed: Linq only
 * enters "processing in WalletWatcher" once it has seen a non-zero balance.
 */
const AWAITING_DEPOSIT_STATUSES = new Set([
  "processing: in order queue",
  "processing: wallet worker on it..",
]);

export function normalizeLinqStatus(status: string | undefined): OrderRecord["status"] {
  const s = String(status ?? "initiated").toLowerCase();
  if (s === "initiated") return "initiated";
  // Checked before the "processing" prefix below, which would otherwise
  // swallow these.
  if (AWAITING_DEPOSIT_STATUSES.has(s)) return "initiated";
  if (s.startsWith("processing")) return "fulfilling";
  if (s === "settled" || s === "disbursed" || s === "settled in treasury" || s === "completed") return "settled";
  if (s.startsWith("timeout") || s === "expired") return "expired";
  if (s === "failed" || s === "cancelled") return "failed";
  return "pending";
}

/**
 * An order as Linq's dedicated offramp (/linq-b2b/offramp) reports it, from
 * every endpoint and in every webhook. `lifecycleStatus` is that API's own
 * view; `status` is the shared payout pipeline's, which only matters once the
 * order is paid.
 */
export interface DedicatedSnapshot {
  event?: string;
  id: string;
  walletAddress: string;
  chain: string;
  coin: string;
  coinType: string;
  amountNGN: number;
  rate: number;
  amountStableCoin: number;
  baseUsdc: number;
  feeUsdc: number;
  totalUsdc: number;
  amountReceived: number;
  amountRemaining: number;
  amountRefunded: number;
  underpaid: boolean;
  overpaidUsdc: number;
  status: string;
  lifecycleStatus: string;
  statusReason?: string;
  depositDeadline: string;
  graceDeadline?: string;
  requoteCount: number;
  reminder?: number;
  depositDigest?: string;
  refundTxHash?: string;
  refundDestination?: string;
}

/**
 * Whether an order was created on the dedicated offramp. Only those carry a
 * fee, so the field doubles as the marker — which keeps orders created before
 * the switch on the API they were made on.
 */
export function isDedicatedOrder(order: Pick<OrderRecord, "feeUsdc" | "network">) {
  return order.feeUsdc !== undefined && order.feeUsdc !== null && order.network !== "stellar";
}

export function isDedicatedSnapshot(payload: unknown): payload is DedicatedSnapshot {
  return typeof (payload as { lifecycleStatus?: unknown })?.lifecycleStatus === "string";
}

/**
 * Maps a dedicated-offramp order onto the checkout's statuses.
 *
 * Before payment the lifecycle is authoritative. Once paid, the shared payout
 * pipeline's status says how far the naira has got — except that its early
 * "processing" states read as awaiting-deposit to normalizeLinqStatus, which
 * is right for /b2b/offramp and wrong here: a paid order has its money.
 */
export function normalizeDedicatedStatus(snap: Pick<DedicatedSnapshot, "lifecycleStatus" | "status">): OrderRecord["status"] {
  switch (snap.lifecycleStatus) {
    case "awaiting_deposit":
      return "initiated";
    case "partially_paid":
      return "partially_paid";
    case "awaiting_completion":
      return "awaiting_completion";
    case "expired":
      return "expired";
    case "refund_pending":
      return "refunding";
    case "refunded":
      return "refunded";
    case "refunding_excess":
      // Paid in full; the extra is on its way back before the payout starts.
      return "deposited";
    case "needs_ops":
      // Money is held while someone checks it. Not "pending": that would put
      // the payer back on the deposit address.
      return "fulfilling";
    case "paid": {
      const pipeline = String(snap.status ?? "").toLowerCase();
      if (pipeline === "refunded") return "refunded";
      if (pipeline.includes("refund")) return "refunding";
      const s = normalizeLinqStatus(snap.status);
      return s === "initiated" || s === "pending" ? "deposited" : s;
    }
  }
  return "pending";
}

/** The fields of a dedicated-offramp order we keep on our own row. */
export function dedicatedDetail(snap: DedicatedSnapshot): Partial<OrderRecord> {
  return {
    // The quote: what the payer is asked for in total. A re-quote changes it.
    cryptoAmountDue: snap.totalUsdc,
    quotedRate: snap.rate,
    feeUsdc: snap.feeUsdc,
    amountReceived: snap.amountReceived,
    amountRemaining: snap.amountRemaining,
    amountRefunded: snap.amountRefunded,
    requoteCount: snap.requoteCount,
    ...(snap.depositDeadline ? { validUntil: snap.depositDeadline } : {}),
    ...(snap.graceDeadline ? { graceUntil: snap.graceDeadline } : {}),
    ...(snap.depositDigest ? { depositDigest: snap.depositDigest } : {}),
    ...(snap.statusReason ? { statusReason: snap.statusReason } : {}),
    ...(snap.refundTxHash ? { refundTxHash: snap.refundTxHash } : {}),
    ...(snap.refundDestination ? { refundDestination: snap.refundDestination } : {}),
  };
}

async function createDedicatedOrder(input: Parameters<typeof createLinqOrder>[0]) {
  const coin = linqCoinId(input.token);
  const network = linqNetworkFor(input.network);
  const snap = await requestLinq<DedicatedSnapshot>("/linq-b2b/offramp", {
    method: "POST",
    body: JSON.stringify({
      amountNGN: input.amountNgn,
      coin,
      chain: network,
      network,
      coinFlags: linqCoinFlags(input.network),
      bankAccount: input.bank.accountIdentifier,
      bankCode: input.bank.institutionCode,
      bankName: input.bank.institutionName ?? "",
      accountName: input.bank.resolvedAccountName ?? input.payerName,
      currency: "NGN",
      ...(input.refundAddress ? { refundAddress: input.refundAddress } : {}),
      customerRef: `linq-${input.idempotencyKey}`,
      ...(input.merchantRef ? { merchantRef: input.merchantRef } : {}),
      idempotencyKey: input.idempotencyKey,
    }),
  });
  logger.info("linq.dedicated_order_created", {
    id: snap.id,
    walletAddress: snap.walletAddress,
    coin,
    network,
    totalUsdc: snap.totalUsdc,
    feeUsdc: snap.feeUsdc,
    depositDeadline: snap.depositDeadline,
  });

  // The same fund-safety gate as the shared offramp.
  if (!isAddressValidForNetwork(snap.walletAddress, input.network)) {
    logger.error("linq.address_chain_mismatch", {
      linqOrderId: snap.id,
      requestedNetwork: input.network,
      linqNetwork: network,
      walletAddress: snap.walletAddress,
    });
    throw new ApiError(
      `The offramp provider returned a deposit address that is not valid on ${chainDisplayName(input.network)}. This order was stopped to protect your funds.`,
      502,
      { provider: "linq", requestedNetwork: input.network, walletAddress: snap.walletAddress },
    );
  }
  return {
    linqOrderId: snap.id,
    providerReceiveAddress: snap.walletAddress,
    coinType: snap.coinType,
    quotedRate: snap.rate,
    cryptoAmountDue: snap.totalUsdc,
    amountNgn: snap.amountNGN,
    status: normalizeDedicatedStatus(snap),
    depositDeadline: snap.depositDeadline,
    detail: dedicatedDetail(snap),
    raw: snap,
  };
}

/**
 * Re-prices a part-paid order whose window closed — the "complete your
 * payment" link. The payer keeps credit for what they sent; the remainder is
 * priced at today's rate and a new window opens on the same address.
 */
export async function requoteLinqOrder(id: string) {
  const snap = await requestLinq<DedicatedSnapshot>(`/linq-b2b/offramp/${encodeURIComponent(id)}/requote`, {
    method: "POST",
  });
  return { status: normalizeDedicatedStatus(snap), detail: dedicatedDetail(snap), raw: snap };
}
