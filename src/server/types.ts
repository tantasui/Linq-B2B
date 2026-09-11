export type StablecoinSymbol = "USDSUI" | "USDC" | "USDT";
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
  /**
   * The provider's own SEP-7 payment URI, signed by it and captured at
   * creation. Preferred over a locally built one for the checkout QR, because
   * only the provider holds the key a scanning wallet verifies against.
   *
   * Set once and never rewritten — the value is only trustworthy while it
   * still describes the quote.
   */
  paymentUri?: string;
  /** Digest of the on-chain payment that funded the deposit address. */
  depositDigest?: string;
  /**
   * Why the order is in the state it is, in the provider's own words — the
   * bank's rejection, the reason a refund was started. Shown to whoever the
   * status concerns rather than kept in a log: "Payout failed" on its own is
   * a support ticket waiting to happen.
   */
  statusReason?: string;
  /** The payout provider's reference for the naira transfer, once it is sent. */
  payoutReference?: string;
  /** The on-chain refund, when a payout failed and the deposit went back. */
  refundTxHash?: string;
  /** Where that refund was sent — the payer's own address unless they named another. */
  refundDestination?: string;
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

/**
 * One kind of notice, for one audience, about one thing that happened.
 *
 * Kinds are per event rather than per outcome, and that is the point. Receipts
 * are deduplicated on (order, kind, audience, recipient), so two events sharing
 * a kind means the second one sends nothing: while "deposit detected" and
 * "payout settled" were both `merchant_fiat_received`, the merchant was told
 * their money had arrived the moment the payer's crypto landed — before any
 * payout had been attempted — and then never heard that it actually settled.
 *
 * A kind names what happened, so the copy can say it plainly and each stage of
 * an order reaches both sides exactly once.
 */
export type ReceiptKind =
  // Payer, in lifecycle order.
  | "payer_payment_received"
  | "payer_transaction_success"
  | "payer_payment_failed"
  | "payer_refund_started"
  | "payer_refund_completed"
  | "payer_order_expired"
  // Merchant, in lifecycle order.
  | "merchant_payment_incoming"
  | "merchant_fiat_received"
  | "merchant_payout_failed"
  | "merchant_refund_completed"
  | "merchant_order_expired"
  // Merchant wallet activity, which is not part of an order's lifecycle.
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
