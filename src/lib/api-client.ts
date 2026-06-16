import type { MerchantRecord, MerchantWalletRecord, OrderRecord, PaymentLinkRecord, StablecoinSymbol, TokenNetworkRecord } from "@/server/types";

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: { message: string; details?: unknown } };

const rawBackendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
const activeBusinessStorageKey = "linq:active-business-id";
const activeDynamicUserStorageKey = "linq:active-dynamic-user-id";
const activeSessionStorageKey = "linq:session-token";

function normalizeBackendBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);

  if (url.pathname === "/api") url.pathname = "";

  return url.toString().replace(/\/+$/, "");
}

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const backendBaseUrl = normalizeBackendBaseUrl(rawBackendBaseUrl);

  return backendBaseUrl ? `${backendBaseUrl}${normalizedPath}` : normalizedPath;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const activeBusinessId = typeof window === "undefined" ? "" : window.localStorage.getItem(activeBusinessStorageKey) ?? "";
  const activeDynamicUserId = typeof window === "undefined" ? "" : window.localStorage.getItem(activeDynamicUserStorageKey) ?? "";
  const activeSessionToken = typeof window === "undefined" ? "" : window.localStorage.getItem(activeSessionStorageKey) ?? "";
  const url = apiUrl(path);
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(activeSessionToken ? { Authorization: `Bearer ${activeSessionToken}` } : {}),
        ...(activeBusinessId ? { "X-Linq-Business-Id": activeBusinessId } : {}),
        ...(activeDynamicUserId ? { "X-Linq-Dynamic-User-Id": activeDynamicUserId } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    throw new Error(`API request could not start for ${url}: ${error instanceof Error ? error.message : "network error"}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? ((await response.json()) as ApiEnvelope<T>)
    : ({ ok: false, error: { message: `API request failed (${response.status}) for ${url}.` } } as ApiEnvelope<T>);
  if (!body.ok) throw new Error(body.error.message);
  return body.data;
}

export function setActiveBusinessId(id: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(activeBusinessStorageKey, id);
}

export function setActiveDynamicUserId(id: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(activeDynamicUserStorageKey, id);
}

export function setActiveSessionToken(token?: string) {
  if (typeof window === "undefined" || !token) return;
  window.localStorage.setItem(activeSessionStorageKey, token);
}

export function clearActiveSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(activeSessionStorageKey);
  window.localStorage.removeItem(activeBusinessStorageKey);
  window.localStorage.removeItem(activeDynamicUserStorageKey);
}

export function getActiveBusinessId() {
  return typeof window === "undefined" ? "" : window.localStorage.getItem(activeBusinessStorageKey) ?? "";
}

export function getActiveDynamicUserId() {
  return typeof window === "undefined" ? "" : window.localStorage.getItem(activeDynamicUserStorageKey) ?? "";
}

export function getActiveSessionToken() {
  return typeof window === "undefined" ? "" : window.localStorage.getItem(activeSessionStorageKey) ?? "";
}

export function hasActiveSessionHint() {
  return Boolean(getActiveSessionToken() || getActiveBusinessId() || getActiveDynamicUserId());
}

export function getMerchantMe() {
  return api<{ merchant: MerchantRecord | null; links: PaymentLinkRecord[]; sessionToken?: string }>("/api/merchant/me").then((response) => {
    setActiveSessionToken(response.sessionToken);
    if (response.merchant?.id) setActiveBusinessId(response.merchant.id);
    if (response.merchant?.dynamicUserId) setActiveDynamicUserId(response.merchant.dynamicUserId);
    return response;
  });
}

export function getPaymentLink(id: string) {
  return api<{ link: PaymentLinkRecord; merchant: MerchantRecord }>(`/api/payment-links/${encodeURIComponent(id)}`);
}

export function createPaymentLink(input: { mode: "open" | "fixed" | "static"; amountNgn?: number; description?: string }) {
  return api<{ link: PaymentLinkRecord }>("/api/payment-links", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listOrders() {
  return api<{ orders: OrderRecord[] }>("/api/orders");
}

export function getOrder(id: string) {
  return api<{ order: OrderRecord }>(`/api/orders/${encodeURIComponent(id)}`);
}

export function createOrder(input: {
  paymentLinkId: string;
  payerName: string;
  payerEmail: string;
  amountNgn?: number;
  token: StablecoinSymbol;
  network: string;
}) {
  return api<{ order: OrderRecord }>("/api/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function retryTransfer(id: string) {
  return api<{ message: string }>(`/api/orders/${encodeURIComponent(id)}/retry-transfer`, {
    method: "POST",
    body: JSON.stringify({ reason: "merchant requested retry" }),
  });
}

export function sendOrderReceipt(id: string, input: { kind: string; audience?: "payer" | "merchant"; recipientEmail?: string }) {
  return api<{ receipt: unknown }>(`/api/orders/${encodeURIComponent(id)}/send-receipt`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getPaycrestTokens(network?: string) {
  const query = network ? `?network=${encodeURIComponent(network)}` : "";
  return api<{ tokens: TokenNetworkRecord[]; cacheTtlSeconds: number }>(`/api/paycrest/tokens${query}`);
}

export function getPaycrestRate(params: { network: string; token: StablecoinSymbol; amountNgn?: number }) {
  const query = new URLSearchParams({
    network: params.network,
    token: params.token,
  });
  if (params.amountNgn) query.set("amountNgn", String(params.amountNgn));
  return api<{ marketRate: number; minimumRate?: number; maximumRate?: number; cacheTtlSeconds: number }>(`/api/paycrest/rate?${query}`);
}

export function onboardMerchant(input: unknown) {
  return api<{ merchant: MerchantRecord; bankVerification: unknown; sessionToken?: string }>("/api/onboarding/merchant", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((response) => {
    setActiveBusinessId(response.merchant.id);
    setActiveDynamicUserId(response.merchant.dynamicUserId);
    setActiveSessionToken(response.sessionToken);
    return response;
  });
}

export function syncMerchantWallets(input: {
  businessId: string;
  wallets: Array<{
    walletId?: string;
    chain: string;
    network: string;
    address: string;
    walletType: "EMBEDDED" | "EXTERNAL";
    tokenSupport: StablecoinSymbol[];
  }>;
}) {
  return api<{ wallets: MerchantWalletRecord[] }>("/api/merchant/wallets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
