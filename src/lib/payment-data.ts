export type FiatCurrency = "NGN" | "USD";
export type StablecoinSymbol = "USDSUI" | "USDC";
export type PaymentMode = "open" | "fixed";

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
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "NGN" ? 0 : 2,
  }).format(value);
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
