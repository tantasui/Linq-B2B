import { env, resendEnabled } from "./env";
import { createSimplePdf } from "./pdf";
import { makeSlug } from "./security";
import { addReceipt, addWalletIncoming, formatNaira, getMerchant, getOrder, listReceipts } from "./store";
import { chainDisplayName } from "@/lib/chains";
import { formatRate, ORDER_STATUS_LABELS } from "@/lib/payment-data";
import type { MerchantRecord, OrderRecord, ReceiptKind, ReceiptRecord, StablecoinSymbol, WalletIncomingRecord } from "./types";

function formatToken(value: number, token: string) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${token}`;
}

function statusCopy(kind: ReceiptKind) {
  switch (kind) {
    case "payer_transaction_success":
      return {
        title: "Payment receipt",
        headline: "Your transaction went through",
        summary: "The merchant has been notified and the payment is being reconciled through LinqSwitch.",
      };
    case "merchant_fiat_received":
      return {
        title: "Settlement receipt",
        headline: "Fiat settlement received",
        summary: "LinqSwitch has confirmed that fiat value reached your verified payout account.",
      };
    case "merchant_payout_failed":
      return {
        title: "Payout attention required",
        headline: "Payout failed, funds remain safe",
        summary: "The payout did not complete. Your funds are still tracked and you can retry the transfer from your dashboard.",
      };
    case "payer_order_expired":
      return {
        title: "Payment window closed",
        headline: "This payment expired",
        summary: "The 10-minute window to send funds closed before a deposit arrived. Nothing was charged. If you already sent funds, contact the merchant — deposits that land late are held safely and reconciled manually.",
      };
    case "merchant_linq_refund":
      return {
        title: "LinqSwitch refund notice",
        headline: "Refund from LinqSwitch detected",
        summary: "This incoming value is marked as a LinqSwitch refund, not a fresh customer direct receive.",
      };
    case "merchant_wallet_incoming":
      return {
        title: "Wallet receive notice",
        headline: "Funds entered your merchant wallet",
        summary: "Merchant wallet activity indicates a direct receive.",
      };
  }
}

function receiptNumber(kind: ReceiptKind, id: string) {
  const prefix = kind.includes("payout") ? "INV" : kind.includes("refund") ? "RFND" : "RCPT";
  return `${prefix}-${id.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`;
}

/**
 * The UI ticket uses the real ₦ glyph because it always has the app's own
 * webfont loaded, which renders it correctly. Email and PDF have no such
 * guarantee -- an unknown mail client's fallback font can substitute a
 * different font just for that one glyph, and some of those draw it wide
 * enough to overlap the digit after it no matter how much space follows.
 * Spell the currency out instead, and flatten the typographic space this
 * shares a source with formatCurrency/formatRate down to a plain one too.
 */
function emailSafeCurrency(text: string) {
  return text.replace(/₦/g, "N").replace(/ /g, " ");
}

/**
 * The one place that turns an order/wallet-event into "what the receipt says" -
 * shared by the emailed HTML and the downloadable PDF, so both stay in lockstep
 * with each other and with the in-app ticket (`components/brand/Receipt.tsx`),
 * which reads the same `ORDER_STATUS_LABELS` and field order.
 */
function buildReceiptView(params: {
  kind: ReceiptKind;
  order?: OrderRecord;
  merchant: MerchantRecord;
  walletIncoming?: WalletIncomingRecord;
}) {
  const { kind, order, merchant, walletIncoming } = params;
  const copy = statusCopy(kind);
  const statusLabel = order ? ORDER_STATUS_LABELS[order.status] ?? copy.headline : copy.headline;
  const settled = order?.status === "settled" || order?.status === "fulfilled";
  const number = receiptNumber(kind, order?.id ?? walletIncoming?.id ?? makeSlug("notice"));
  const fee = order ? (order.transactionFee ?? 0) + (order.senderFee ?? 0) : 0;

  const heroAmount = order
    ? emailSafeCurrency(formatNaira(order.amountNgn))
    : walletIncoming
      ? formatToken(walletIncoming.amountToken, walletIncoming.token)
      : "Not available";
  const heroSecondary = order
    ? `${formatToken(order.cryptoAmountDue, order.token)} on ${chainDisplayName(order.network)}`
    : walletIncoming
      ? `${formatToken(walletIncoming.amountToken, walletIncoming.token)} on ${chainDisplayName(walletIncoming.network)}`
      : undefined;

  // Same fields, same order, same labels as the ticket's detail rows.
  const rows: [string, string][] = order
    ? [
        ["Date & time", new Date(order.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })],
        ["From", order.payerName || "—"],
        ["To", merchant.businessName],
        ["Network", chainDisplayName(order.network)],
        ["Rate", emailSafeCurrency(formatRate(order.quotedRate, order.token))],
        ["Fee", fee > 0 ? `${fee.toFixed(2)} ${order.token}` : "No fee"],
        ["Transaction ID", order.paycrestOrderId ?? order.id],
      ]
    : [
        ["Date & time", new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })],
        ["From", "Direct wallet activity"],
        ["To", merchant.businessName],
        ["Network", walletIncoming ? chainDisplayName(walletIncoming.network) : "—"],
        ["Transaction ID", walletIncoming?.transactionHash ?? "Not available"],
      ];

  return { copy, number, statusLabel, settled, heroAmount, heroSecondary, rows };
}

export function renderReceiptHtml(params: {
  kind: ReceiptKind;
  order?: OrderRecord;
  merchant: MerchantRecord;
  walletIncoming?: WalletIncomingRecord;
}) {
  const view = buildReceiptView(params);
  const rowsHtml = view.rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:11px 0;border-top:1px solid #E4DBF2;color:#706F75;font-size:12px;">${label}</td><td style="padding:11px 0;border-top:1px solid #E4DBF2;text-align:right;color:#141216;font-size:12px;font-weight:500;">${value}</td></tr>`,
    )
    .join("");
  return `<!doctype html>
<html>
  <body style="margin:0;background:#F4F1F9;color:#141216;font-family:Inter,Segoe UI,Arial,sans-serif;padding:32px 16px;">
    <div style="max-width:420px;margin:0 auto;">
      <p style="margin:0 0 18px;text-align:center;color:#7837E6;font-size:13px;font-weight:700;letter-spacing:.14em;">LINQ</p>
      <div style="background:#F7F3FC;border:1px solid #D9CEEA;border-radius:16px;overflow:hidden;">
        <div style="padding:24px 24px 0;">
          <p style="margin:0 0 24px;text-align:center;color:#7837E6;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;">
            ${view.settled ? "&#10003; " : ""}${view.statusLabel}
          </p>
          <p style="margin:0;text-align:center;font-size:34px;font-weight:600;letter-spacing:-.02em;">${view.heroAmount}</p>
          ${view.heroSecondary ? `<p style="margin:12px 0 0;text-align:center;color:#706F75;font-size:14px;">${view.heroSecondary}</p>` : ""}
          <div style="margin:28px 0 0;border-top:2px dashed #D9CEEA;"></div>
        </div>
        <div style="padding:8px 24px 28px;">
          <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
          <p style="margin:22px 0 0;text-align:center;color:#9C99A3;font-size:11px;">
            linq.xyz &middot; <a href="mailto:support@linq.xyz" style="color:#7837E6;">support</a>
          </p>
        </div>
      </div>
      <p style="margin:20px 0 0;text-align:center;color:#9C99A3;font-size:12px;">${view.copy.summary}</p>
    </div>
  </body>
</html>`;
}

export function renderReceiptPdf(params: {
  kind: ReceiptKind;
  order?: OrderRecord;
  merchant: MerchantRecord;
  walletIncoming?: WalletIncomingRecord;
}) {
  const view = buildReceiptView(params);
  return createSimplePdf(view.copy.title, [
    { text: view.statusLabel, size: 18, gapAfter: 10 },
    { text: view.heroAmount, size: 26, gapAfter: view.heroSecondary ? 2 : 14 },
    ...(view.heroSecondary ? [{ text: view.heroSecondary, muted: true, gapAfter: 16 } as const] : []),
    ...view.rows.map(([label, value]) => ({ text: `${label}: ${value}` })),
    { text: `Receipt no.: ${view.number}`, muted: true, gapAfter: 4 },
    { text: view.copy.summary, muted: true },
  ]);
}

async function sendResendEmail(input: {
  to: string;
  subject: string;
  html: string;
  pdf: Buffer;
  filename: string;
}) {
  if (!resendEnabled) {
    return { skipped: true, id: `local-${Date.now()}` };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      attachments: [
        {
          filename: input.filename,
          content: input.pdf.toString("base64"),
        },
      ],
    }),
  });
  const body = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok) throw new Error(body?.message || "Resend email failed.");
  return { skipped: false, id: body.id };
}

export async function createAndSendReceipt(params: {
  kind: ReceiptKind;
  audience: "payer" | "merchant";
  order?: OrderRecord;
  merchant: MerchantRecord;
  walletIncoming?: WalletIncomingRecord;
  recipientEmail: string;
}) {
  if (params.order) {
    const existing = (await listReceipts(params.order.id)).find(
      (receipt) => receipt.kind === params.kind && receipt.audience === params.audience && receipt.recipientEmail === params.recipientEmail,
    );
    if (existing) return existing;
  }
  const copy = statusCopy(params.kind);
  const html = renderReceiptHtml(params);
  const pdf = renderReceiptPdf(params);
  const subject = `Linq: ${copy.headline}`;
  try {
    const delivery = await sendResendEmail({
      to: params.recipientEmail,
      subject,
      html,
      pdf,
      filename: `${receiptNumber(params.kind, params.order?.id ?? params.walletIncoming?.id ?? "notice")}.pdf`,
    });
    return addReceipt({
      orderId: params.order?.id,
      businessId: params.merchant.id,
      kind: params.kind,
      audience: params.audience,
      recipientEmail: params.recipientEmail,
      subject,
      status: delivery.skipped ? "skipped" : "sent",
      html,
      pdfBase64: pdf.toString("base64"),
      providerMessageId: delivery.id,
      metadata: { resendEnabled },
    });
  } catch (error) {
    return addReceipt({
      orderId: params.order?.id,
      businessId: params.merchant.id,
      kind: params.kind,
      audience: params.audience,
      recipientEmail: params.recipientEmail,
      subject,
      status: "failed",
      html,
      pdfBase64: pdf.toString("base64"),
      errorMessage: error instanceof Error ? error.message : "Email failed",
    });
  }
}

export async function notifyForOrderStatus(order: OrderRecord) {
  const merchant = await getMerchant(order.businessId);
  if (!merchant) throw new Error("Merchant not found for receipt notification.");
  const notices: ReceiptRecord[] = [];
  if (["deposited", "validated"].includes(order.status)) {
    notices.push(await createAndSendReceipt({ kind: "payer_transaction_success", audience: "payer", order, merchant, recipientEmail: order.payerEmail }));
    notices.push(await createAndSendReceipt({ kind: "merchant_fiat_received", audience: "merchant", order, merchant, recipientEmail: merchant.businessEmail }));
  }
  if (order.status === "settled" || order.status === "fulfilled") {
    notices.push(await createAndSendReceipt({ kind: "payer_transaction_success", audience: "payer", order, merchant, recipientEmail: order.payerEmail }));
    notices.push(await createAndSendReceipt({ kind: "merchant_fiat_received", audience: "merchant", order, merchant, recipientEmail: merchant.businessEmail }));
  }
  if (order.status === "failed" || order.status === "expired" || order.status === "cancelled") {
    notices.push(await createAndSendReceipt({ kind: "merchant_payout_failed", audience: "merchant", order, merchant, recipientEmail: merchant.businessEmail }));
  }
  // The payer is told too when the deposit window closed, so they don't send late.
  if (order.status === "expired") {
    notices.push(await createAndSendReceipt({ kind: "payer_order_expired", audience: "payer", order, merchant, recipientEmail: order.payerEmail }));
  }
  if (order.status === "refunded" || order.status === "refunding") {
    notices.push(await createAndSendReceipt({ kind: "merchant_linq_refund", audience: "merchant", order, merchant, recipientEmail: merchant.businessEmail }));
  }
  return notices;
}

export async function notifyWalletIncoming(params: {
  businessId: string;
  walletAddress: string;
  network: string;
  token: StablecoinSymbol;
  amountToken: number;
  reason: WalletIncomingRecord["reason"];
  transactionHash?: string;
  rawPayload?: unknown;
}) {
  const incoming = await addWalletIncoming({ ...params, source: "dynamic" });
  const merchant = await getMerchant(params.businessId);
  if (!merchant) throw new Error("Merchant not found for wallet notification.");
  await createAndSendReceipt({
    kind: params.reason === "linq_refund" ? "merchant_linq_refund" : "merchant_wallet_incoming",
    audience: "merchant",
    merchant,
    walletIncoming: incoming,
    recipientEmail: merchant.businessEmail,
  });
  return incoming;
}

export async function getReceiptContext(orderId: string, kind: ReceiptKind) {
  const order = await getOrder(orderId);
  if (!order) throw new Error("Order not found.");
  const merchant = await getMerchant(order.businessId);
  if (!merchant) throw new Error("Merchant not found for receipt.");
  return { order, merchant, kind };
}
