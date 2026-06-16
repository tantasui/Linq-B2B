import { z } from "zod";

const text = (max = 120) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .transform((value) => value.replace(/\s+/g, " "));

export const idSchema = z.string().trim().min(2).max(80).regex(/^[a-zA-Z0-9_-]+$/);
export const uuidOrSlugSchema = z.string().trim().min(2).max(120).regex(/^[a-zA-Z0-9_-]+$/);
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const tokenSchema = z.enum(["USDSUI", "USDC"]);
export const networkSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]+$/)
  .max(40);
export const walletAddressSchema = z.string().trim().min(26).max(128);
export const institutionCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,24}$/);
export const accountIdentifierSchema = z.string().trim().regex(/^[0-9A-Za-z-]{5,34}$/);
export const amountNgnSchema = z.coerce
  .number()
  .positive()
  .max(100_000_000)
  .transform((value) => Number(value.toFixed(2)));

export const walletSyncSchema = z.object({
  walletId: z.string().trim().max(120).optional(),
  chain: z.string().trim().toLowerCase().max(40).default("sui"),
  network: networkSchema,
  address: walletAddressSchema,
  walletType: z.enum(["EMBEDDED", "EXTERNAL"]).default("EMBEDDED"),
  tokenSupport: z.array(tokenSchema).default(["USDSUI", "USDC"]),
});

export const merchantOnboardingSchema = z.object({
  dynamicUserId: text(120),
  userEmail: emailSchema,
  userName: text(120).optional(),
  businessName: text(140),
  merchantName: text(120),
  businessEmail: emailSchema,
  location: z.string().trim().max(180).optional(),
  bank: z.object({
    institutionCode: institutionCodeSchema,
    institutionName: z.string().trim().max(120).optional(),
    accountIdentifier: accountIdentifierSchema,
    accountName: text(120).optional(),
  }),
  wallets: z.array(walletSyncSchema).max(20).default([]),
});

export const bankVerifySchema = z.object({
  institutionCode: institutionCodeSchema,
  accountIdentifier: accountIdentifierSchema,
});

export const merchantWalletSyncSchema = z.object({
  businessId: uuidOrSlugSchema,
  wallets: z.array(walletSyncSchema).min(1).max(20),
});

export const paymentLinkSchema = z.object({
  businessId: uuidOrSlugSchema.optional(),
  mode: z.enum(["open", "fixed", "static"]),
  amountNgn: amountNgnSchema.optional(),
  description: z.string().trim().max(220).optional(),
}).refine((value) => value.mode !== "fixed" || value.amountNgn, {
  message: "Fixed payment links require amountNgn.",
  path: ["amountNgn"],
});

export const orderCreateSchema = z.object({
  paymentLinkId: uuidOrSlugSchema,
  payerName: text(120),
  payerEmail: emailSchema,
  amountNgn: amountNgnSchema.optional(),
  token: tokenSchema,
  network: networkSchema,
});

export const retryTransferSchema = z.object({
  reason: z.string().trim().max(180).optional(),
});

export const receiptKindSchema = z.enum([
  "payer_transaction_success",
  "merchant_fiat_received",
  "merchant_payout_failed",
  "merchant_linq_refund",
  "merchant_wallet_incoming",
]);

export const sendReceiptSchema = z.object({
  kind: receiptKindSchema,
  audience: z.enum(["payer", "merchant"]).optional(),
  recipientEmail: emailSchema.optional(),
});

export const dynamicWalletIncomingSchema = z.object({
  businessId: uuidOrSlugSchema,
  walletAddress: walletAddressSchema,
  network: networkSchema,
  token: tokenSchema,
  amountToken: z.coerce.number().positive().max(1_000_000),
  reason: z.enum(["merchant_direct_receive", "linq_refund", "unknown"]).default("merchant_direct_receive"),
  transactionHash: z.string().trim().max(140).optional(),
  rawPayload: z.unknown().optional(),
});

export const sanitizeQueryAmount = z.object({
  amountNgn: amountNgnSchema.optional(),
  token: tokenSchema.default("USDSUI"),
  network: networkSchema.default("sui"),
});

export function parseJson<T>(schema: z.Schema<T>, value: unknown): T {
  return schema.parse(value);
}
