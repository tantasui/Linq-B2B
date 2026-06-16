import { cached } from "./cache";
import { env, liveLinqEnabled } from "./env";
import { ApiError } from "./http";
import { logger } from "./logger";
import type { BankAccountRecord, OrderRecord, StablecoinSymbol } from "./types";

export const USDSUI_COIN_TYPE =
  "0x44f838219cf67b058f3b37907b655f226153c18e33dfcd0da559a844fea9b1c1::usdsui::USDSUI";

export const USDC_SUI_COIN_TYPE =
  "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";

export function coinTypeForToken(token: StablecoinSymbol): string {
  return token === "USDC" ? USDC_SUI_COIN_TYPE : USDSUI_COIN_TYPE;
}

function linqCoinId(token: StablecoinSymbol): string {
  return token === "USDC" ? "usdc" : "usdsui";
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
  bank: BankAccountRecord;
  payerName: string;
  idempotencyKey: string;
}) {
  const { rate } = await getLinqRate();
  const amountStableCoin = Number((input.amountNgn / rate).toFixed(6));
  const coin = linqCoinId(input.token);
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
      amountStableCoin,
      coin,
      bankAccount: input.bank.accountIdentifier,
      bankCode: input.bank.institutionCode,
      bankName: input.bank.institutionName ?? "",
      accountName: input.bank.resolvedAccountName ?? input.payerName,
      currency: "NGN",
      customerRef: `linq-${input.idempotencyKey}`,
      idempotencyKey: input.idempotencyKey,
    }),
  });
  logger.info("linq.order_created", {
    id: response.id,
    walletAddress: response.walletAddress,
    coin,
    amountStableCoin: response.amountStableCoin,
  });
  return {
    linqOrderId: response.id,
    providerReceiveAddress: response.walletAddress,
    coinType: response.coinType ?? coinTypeForToken(input.token),
    quotedRate: response.rate,
    cryptoAmountDue: response.amountStableCoin,
    amountNgn: response.amountNGN,
    status: normalizeLinqStatus(response.status),
    raw: response,
  };
}

export async function getLinqOrderStatus(id: string) {
  if (!id.trim()) throw new ApiError("Linq order id is required.", 400);
  const response = await requestLinq<{
    id: string;
    status: string;
    amountStableCoin: number;
    amountNGN: number;
    currency: string;
    created: string;
    updated: string;
  }>(`/b2b/status?id=${encodeURIComponent(id)}`);
  return {
    linqOrderId: response.id,
    status: normalizeLinqStatus(response.status),
    amountStableCoin: response.amountStableCoin,
    amountNgn: response.amountNGN,
    raw: response,
  };
}

export function normalizeLinqStatus(status: string | undefined): OrderRecord["status"] {
  const s = String(status ?? "initiated").toLowerCase();
  if (s === "initiated") return "initiated";
  if (s.startsWith("processing")) return "fulfilling";
  if (s === "settled" || s === "disbursed" || s === "settled in treasury" || s === "completed") return "settled";
  if (s.startsWith("timeout") || s === "expired") return "expired";
  if (s === "failed" || s === "cancelled") return "failed";
  return "pending";
}
