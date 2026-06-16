import { cached } from "./cache";
import { env, livePaycrestEnabled } from "./env";
import { ApiError } from "./http";
import { logger } from "./logger";
import type { BankAccountRecord, OrderRecord, StablecoinSymbol, TokenNetworkRecord } from "./types";

type SupportedInstitution = {
  name: string;
  code: string;
  type: string;
};

export type PaycrestRate = {
  marketRate: number;
  minimumRate?: number;
  maximumRate?: number;
  side: "buy" | "sell";
};

type PaycrestOrderInput = {
  reference: string;
  amountNgn: number;
  token: StablecoinSymbol;
  network: string;
  refundAddress: string;
  bank: BankAccountRecord;
  payerName: string;
};

type PaycrestOrderResponseData = {
  id?: string;
  status?: string;
  amount?: string;
  rate?: string;
  senderFee?: string;
  transactionFee?: string;
  providerAccount?: {
    receiveAddress?: string;
    validUntil?: string;
  };
};

type PaycrestErrorBody = {
  message?: string;
  error?: string;
  errors?: unknown;
  status?: string;
};

type PaycrestRateBand = {
  rate?: string;
  marketRate?: string;
  minimumRate?: string;
  maximumRate?: string;
};

function parseRateSide(data: { buy?: PaycrestRateBand; sell?: PaycrestRateBand; rate?: string; marketRate?: string }): PaycrestRate {
  const side = data.sell ? "sell" : data.buy ? "buy" : "sell";
  const band = data.sell ?? data.buy;
  const marketRate = Number(band?.marketRate ?? band?.rate ?? data.marketRate ?? data.rate);
  if (!Number.isFinite(marketRate) || marketRate <= 0) {
    throw new ApiError("Paycrest did not return a usable NGN market rate.", 502, { data });
  }
  return {
    marketRate,
    minimumRate: band?.minimumRate ? Number(band.minimumRate) : undefined,
    maximumRate: band?.maximumRate ? Number(band.maximumRate) : undefined,
    side,
  };
}

async function requestPaycrest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!livePaycrestEnabled) throw new ApiError("Paycrest API key is not configured.", 503);
  const method = init?.method ?? "GET";
  const startedAt = Date.now();
  const requestBody = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
  if (requestBody) logger.info("paycrest.request_json", { method, path, body: requestBody });
  const response = await fetch(`${env.PAYCREST_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "API-Key": env.PAYCREST_API_KEY!,
      ...init?.headers,
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({})) as PaycrestErrorBody;
  const durationMs = Date.now() - startedAt;
  logger.info("paycrest.request", { method, path, status: response.status, durationMs });
  logger.info("paycrest.response_json", { method, path, status: response.status, body });
  if (!response.ok) {
    logger.warn("paycrest.request_failed", { method, path, status: response.status, body });
    throw new ApiError(body?.message || body?.error || `Paycrest request failed with ${response.status}.`, response.status >= 500 ? 502 : response.status, {
      provider: "paycrest",
      providerStatus: response.status,
      path,
      body,
    });
  }
  return body as T;
}

export async function getSupportedTokens(network?: string) {
  const key = `paycrest:tokens:${network ?? "all"}`;
  return cached(key, 900, async () => {
    if (!livePaycrestEnabled) throw new Error("Paycrest API key is required for beta token discovery.");
    const query = network ? `?network=${encodeURIComponent(network)}` : "";
    const response = await requestPaycrest<{ data: TokenNetworkRecord[] }>(`/tokens${query}`);
    return response.data;
  });
}

export async function getRate(network: string, token: StablecoinSymbol, amountNgn?: number): Promise<PaycrestRate> {
  const normalizedAmount = amountNgn ? String(amountNgn) : "1";
  const key = `paycrest:rate:${network}:${token}:${normalizedAmount}:NGN`;
  return cached(key, 900, async () => {
    if (!livePaycrestEnabled) throw new ApiError("Paycrest API key is required for beta rates.", 503);
    const providerPath = `/provider/rates/${encodeURIComponent(token)}/NGN`;
    try {
      const response = await requestPaycrest<{ data: { buy?: PaycrestRateBand; sell?: PaycrestRateBand } }>(providerPath);
      return parseRateSide(response.data);
    } catch (providerError) {
      logger.warn("paycrest.provider_rate_fallback", {
        token,
        network,
        amountNgn: normalizedAmount,
        message: providerError instanceof Error ? providerError.message : "Provider rate lookup failed.",
      });
      const publicPath = `/rates/${encodeURIComponent(network)}/${encodeURIComponent(token)}/${encodeURIComponent(normalizedAmount)}/NGN`;
      const response = await requestPaycrest<{ data: { rate?: string; marketRate?: string; buy?: PaycrestRateBand; sell?: PaycrestRateBand } }>(publicPath);
      return parseRateSide(response.data);
    }
  });
}

export async function getSupportedInstitutions(currency = "NGN"): Promise<SupportedInstitution[]> {
  const key = `paycrest:institutions:${currency}`;
  return cached(key, 3600, async () => {
    if (!livePaycrestEnabled) throw new Error("Paycrest API key is required for institution lookup.");
    const response = await requestPaycrest<{ data: SupportedInstitution[] }>(`/institutions/${encodeURIComponent(currency)}`);
    return response.data;
  });
}

const nipToPaycrestCode: Record<string, string> = {
  "100004": "OPAYNGPC",
  "100027": "MONINGPC",
  "100033": "KUDANGPC",
};

function normalizeInstitutionName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

export async function resolvePaycrestCode(institutionCode: string, institutionName?: string): Promise<string> {
  if (nipToPaycrestCode[institutionCode]) return nipToPaycrestCode[institutionCode];
  if (!institutionName) return institutionCode;
  try {
    const institutions = await getSupportedInstitutions();
    const normalizedName = normalizeInstitutionName(institutionName);
    const match = institutions.find((inst) => normalizeInstitutionName(inst.name).includes(normalizedName) || normalizedName.includes(normalizeInstitutionName(inst.name)));
    if (match) return match.code;
  } catch {
    logger.warn("paycrest.institution_lookup_failed", { institutionCode, institutionName });
  }
  return institutionCode;
}

export async function verifyBankAccount(institutionCode: string, accountIdentifier: string, institutionName?: string) {
  if (!livePaycrestEnabled) throw new ApiError("Paycrest API key is required for beta bank verification.", 503);
  const resolvedCode = await resolvePaycrestCode(institutionCode, institutionName);
  const response = await requestPaycrest<{ data: { accountName?: string; name?: string } }>("/verify-account", {
    method: "POST",
    body: JSON.stringify({
      institution: resolvedCode,
      accountIdentifier,
    }),
  });
  return {
    institutionCode,
    accountIdentifier,
    accountName: response.data.accountName ?? response.data.name,
    verified: Boolean(response.data.accountName ?? response.data.name),
    raw: response.data,
  };
}

export async function createPaycrestOrder(input: PaycrestOrderInput) {
  const rate = await getRate(input.network, input.token, input.amountNgn);
  const cryptoAmount = Number((input.amountNgn / rate.marketRate).toFixed(6));
  if (!livePaycrestEnabled) throw new ApiError("Paycrest API key is required for beta order creation.", 503);

  const paycrestInstitutionCode = await resolvePaycrestCode(input.bank.institutionCode, input.bank.institutionName);
  const payload = {
    amount: String(input.amountNgn),
    amountIn: "fiat",
    reference: input.reference,
    source: {
      type: "crypto",
      currency: input.token,
      network: input.network,
      refundAddress: input.refundAddress,
    },
    destination: {
      type: "fiat",
      currency: "NGN",
      recipient: {
        institution: paycrestInstitutionCode,
        accountIdentifier: input.bank.accountIdentifier,
        accountName: input.bank.resolvedAccountName || input.payerName,
        memo: `Linq ${input.reference}`,
      },
    },
  };
  const response = await requestPaycrest<{ data: PaycrestOrderResponseData }>("/sender/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = response.data;
  return {
    paycrestOrderId: data.id,
    providerReceiveAddress: data.providerAccount?.receiveAddress,
    status: normalizePaycrestStatus(data.status),
    quotedRate: Number(data.rate ?? rate.marketRate),
    cryptoAmountDue: Number(data.amount ?? cryptoAmount),
    senderFee: data.senderFee ? Number(data.senderFee) : undefined,
    transactionFee: data.transactionFee ? Number(data.transactionFee) : undefined,
    validUntil: data.providerAccount?.validUntil,
    raw: data,
  };
}

export async function getPaycrestOrder(id: string) {
  if (!id.trim()) throw new ApiError("Paycrest order id is required.", 400);
  const response = await requestPaycrest<{ data: PaycrestOrderResponseData }>(`/sender/orders/${encodeURIComponent(id)}`);
  const data = response.data;
  return {
    paycrestOrderId: data.id ?? id,
    providerReceiveAddress: data.providerAccount?.receiveAddress,
    status: normalizePaycrestStatus(data.status),
    quotedRate: data.rate ? Number(data.rate) : undefined,
    cryptoAmountDue: data.amount ? Number(data.amount) : undefined,
    senderFee: data.senderFee ? Number(data.senderFee) : undefined,
    transactionFee: data.transactionFee ? Number(data.transactionFee) : undefined,
    validUntil: data.providerAccount?.validUntil,
    raw: data,
  };
}

export function normalizePaycrestStatus(status: string | undefined): OrderRecord["status"] {
  const normalized = String(status || "pending").toLowerCase();
  if (["deposited", "pending", "fulfilling", "fulfilled", "validated", "settling", "settled", "cancelled", "refunding", "refunded", "expired", "failed"].includes(normalized)) {
    return normalized as OrderRecord["status"];
  }
  return "pending";
}
