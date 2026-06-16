export type StablecoinSymbol = "USDSUI" | "USDC";
export type LinkMode = "open" | "fixed" | "static";
export type LinkStatus = "active" | "paused" | "archived";
export type OrderStatus =
  | "initiated"
  | "deposited"
  | "pending"
  | "fulfilling"
  | "fulfilled"
  | "validated"
  | "settling"
  | "settled"
  | "cancelled"
  | "refunding"
  | "refunded"
  | "expired"
  | "failed";

export interface MerchantWalletRecord {
  id: string;
  businessId: string;
  chain: string;
  network: string;
  address: string;
  walletId?: string;
  walletType: "EMBEDDED" | "EXTERNAL";
  tokenSupport: StablecoinSymbol[];
}

export interface BankAccountRecord {
  id: string;
  businessId: string;
  institutionCode: string;
  institutionName?: string;
  accountIdentifier: string;
  resolvedAccountName?: string;
  verificationStatus: "pending" | "verified" | "failed";
}

export interface MerchantRecord {
  id: string;
  dynamicUserId: string;
  userEmail: string;
  userName?: string;
  businessName: string;
  merchantName: string;
  businessEmail: string;
  location?: string;
  onboardingStatus: "started" | "bank_verified" | "wallet_synced" | "complete";
  bankAccounts: BankAccountRecord[];
  wallets: MerchantWalletRecord[];
}

export interface PaymentLinkRecord {
  id: string;
  businessId: string;
  slug: string;
  mode: LinkMode;
  amountNgn?: number;
  description?: string;
  status: LinkStatus;
  createdAt: string;
}

export interface TokenNetworkRecord {
  symbol: StablecoinSymbol;
  network: string;
  name: string;
  decimals: number;
  contractAddress?: string;
  baseCurrency?: string;
}

export interface OrderRecord {
  id: string;
  businessId: string;
  paymentLinkId?: string;
  bankAccountId?: string;
  payerName: string;
  payerEmail: string;
  amountNgn: number;
  token: StablecoinSymbol;
  network: string;
  quotedRate: number;
  cryptoAmountDue: number;
  senderFee?: number;
  transactionFee?: number;
  paycrestOrderId?: string;
  providerReceiveAddress?: string;
  validUntil?: string;
  status: OrderStatus;
  paycrestPayload?: unknown;
  createdAt: string;
  updatedAt: string;
  transferAttempts?: TransferAttemptRecord[];
}

export interface OrderEventRecord {
  id: string;
  orderId?: string;
  source: "app" | "linq";
  eventName: string;
  rawPayload: unknown;
  createdAt: string;
}

export interface TransferAttemptRecord {
  id: string;
  orderId: string;
  status: "requested" | "created" | "failed" | "skipped";
  attemptNumber: number;
  linqReference?: string;
  resultPayload?: unknown;
  errorMessage?: string;
  createdAt: string;
}

export type ReceiptKind =
  | "payer_transaction_success"
  | "merchant_fiat_received"
  | "merchant_payout_failed"
  | "merchant_linq_refund"
  | "merchant_wallet_incoming";

export type ReceiptAudience = "payer" | "merchant";

export interface ReceiptRecord {
  id: string;
  orderId?: string;
  businessId: string;
  kind: ReceiptKind;
  audience: ReceiptAudience;
  recipientEmail: string;
  subject: string;
  status: "created" | "sent" | "failed" | "skipped";
  html: string;
  pdfBase64?: string;
  providerMessageId?: string;
  errorMessage?: string;
  metadata?: unknown;
  createdAt: string;
}

export interface WalletIncomingRecord {
  id: string;
  businessId: string;
  walletAddress: string;
  network: string;
  token: StablecoinSymbol;
  amountToken: number;
  source: "dynamic" | "manual";
  reason: "merchant_direct_receive" | "linq_refund" | "unknown";
  transactionHash?: string;
  rawPayload?: unknown;
  createdAt: string;
}
