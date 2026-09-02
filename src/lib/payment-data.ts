import type { OrderStatus } from "@/server/types";

export type FiatCurrency = "NGN" | "USD";
export type StablecoinSymbol = "USDSUI" | "USDC" | "USDT";
export type PaymentMode = "open" | "fixed";

/** The one copy of order-status wording — the receipt UI and the emailed/PDF invoice both read from here. */
export const ORDER_STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  settled: "Payment Received",
  fulfilled: "Conversion Complete",
  validated: "Conversion Complete",
  settling: "Settling",
  pending: "Awaiting Deposit",
  deposited: "Deposit Detected",
  initiated: "Awaiting Deposit",
  expired: "Payment Window Closed",
  failed: "Payout Failed",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

export interface MerchantProfile {
  id: string;
  businessName: string;
  location: string;
  email: string;
  initials: string;
}

export interface PayoutBankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export interface StablecoinAsset {
  symbol: StablecoinSymbol;
  name: string;
  balance: number;
  usdValue: number;
  color: string;
}

export interface PaymentNetwork {
  id: string;
  name: string;
  shortName: string;
  fee: Record<StablecoinSymbol, number>;
  confirmationTime: string;
  supportedTokens: StablecoinSymbol[];
  address: Record<StablecoinSymbol, string>;
}

export interface PaymentRequest {
  id: string;
  mode: PaymentMode;
  currency: FiatCurrency;
  amount?: number;
  description?: string;
  merchantId: string;
}

export function formatCurrency(value: number, currency: FiatCurrency) {
  const formatted = new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "NGN" ? 0 : 2,
  }).format(value);
  // en-NG sets no space between ₦ and the digits, which reads as a strikethrough
  // through the first digit in most fonts — insert a narrow one.
  return currency === "NGN" ? formatted.replace(/^(-?)(\D+)/, "$1$2 ") : formatted;
}

export function formatRate(rate: number, token: string) {
  return `₦ ${rate.toLocaleString()} / ${token}`;
}

export function makePaymentPath(request: PaymentRequest) {
  const params = new URLSearchParams({
    mode: request.mode,
    currency: request.currency,
    merchant: request.merchantId,
  });
  if (request.amount !== undefined) params.set("amount", String(request.amount));
  if (request.description) params.set("description", request.description);
  return `/pay/${request.id}?${params.toString()}`;
}
