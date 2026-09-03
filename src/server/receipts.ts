import { env, resendEnabled } from "./env";
import { createImagePdf } from "./pdf";
import { renderReceiptJpeg } from "./receipt-image";
import { makeSlug } from "./security";
import { addReceipt, addWalletIncoming, formatNaira, getMerchant, getOrder, listReceipts } from "./store";
import { chainDisplayName } from "@/lib/chains";
import { formatRate, ORDER_STATUS_LABELS } from "@/lib/payment-data";
import type { MerchantRecord, OrderRecord, ReceiptKind, ReceiptRecord, StablecoinSymbol, WalletIncomingRecord } from "./types";

function formatToken(value: number, token: string) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${token}`;
}

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
 * The one place that turns an order/wallet-event into "what the receipt
 * says" — shared by the emailed image and the downloadable PDF, so both stay
 * in lockstep with each other and with the in-app ticket
 * (`components/brand/Receipt.tsx`): status and the paid amount live in the
 * hero header exactly as they do there, and the row order matches its detail
 * rows one for one.
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
  const fee = order ? (order.transactionFee ?? 0) + (order.senderFee ?? 0) : 0;
  const date = order ? new Date(order.createdAt) : new Date();
  const dateLine = date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  const totalValue = order
    ? formatNaira(order.amountNgn)
    : walletIncoming
      ? formatToken(walletIncoming.amountToken, walletIncoming.token)
      : "Not available";
  const subValue = order ? formatToken(order.cryptoAmountDue, order.token) : undefined;

  const rows: { label: string; value: string }[] = order
    ? [
        { label: "Date & time", value: dateLine },
        { label: "From", value: order.payerName || "—" },
        { label: "To", value: merchant.businessName },
        { label: "Network", value: chainDisplayName(order.network) },
        { label: "Rate", value: formatRate(order.quotedRate, order.token) },
        { label: "Fee", value: fee > 0 ? `${fee.toFixed(2)} ${order.token}` : "No fee" },
        { label: "Transaction ID", value: order.paycrestOrderId ?? order.id },
      ]
    : [
        { label: "Date & time", value: dateLine },
        { label: "From", value: "Direct wallet activity" },
        { label: "To", value: merchant.businessName },
        { label: "Network", value: walletIncoming ? chainDisplayName(walletIncoming.network) : "—" },
        { label: "Transaction ID", value: walletIncoming?.transactionHash ?? "Not available" },
      ];

  return { copy, statusLabel, settled, totalValue, subValue, rows };
}

/**
 * The rendered ticket image is decorative, not the only copy of the data:
 * `data:` URI images are known to get stripped by some mail clients (Gmail
 * and Outlook both have a history of this), and an image-only receipt would
 * then read as empty. Every figure it shows — status, total, rows — is
 * repeated below as real HTML text, so the recipient gets the details
 * whether or not the image itself renders.
 */
export async function renderReceiptHtml(params: {
  kind: ReceiptKind;
  order?: OrderRecord;
  merchant: MerchantRecord;
  walletIncoming?: WalletIncomingRecord;
}) {
  const view = buildReceiptView(params);
  const { jpeg, pointWidth } = await renderReceiptJpeg(view);
  const imageDataUri = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  const imageAlt = [view.statusLabel, view.totalValue, view.subValue].filter(Boolean).join(" — ");

  const rowsHtml = view.rows
    .map(
      (row) => `<tr>
        <td style="padding:9px 0;font-size:12px;color:#5B5568;border-bottom:1px solid #EDE7F8;">${esc(row.label)}</td>
        <td style="padding:9px 0;font-size:12px;font-weight:700;color:#1A1A1A;text-align:right;border-bottom:1px solid #EDE7F8;">${esc(row.value)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#6d28d9;padding:32px 14px;font-family:Inter,Segoe UI,Arial,sans-serif;">
    <img src="${imageDataUri}" width="${pointWidth}" alt="${esc(imageAlt)}" style="display:block;width:100%;max-width:${pointWidth}px;margin:0 auto;" />

    <div style="max-width:380px;margin:20px auto 0;background:#ffffff;border-radius:12px;padding:20px 22px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#7737E6;">${esc(view.statusLabel)}</p>
      <p style="margin:0 0 4px;font-size:26px;font-weight:800;color:#0B0B0E;">${esc(view.totalValue)}</p>
      ${view.subValue ? `<p style="margin:0 0 16px;font-size:13px;color:#71717A;">${esc(view.subValue)}</p>` : ""}
      <table role="presentation" width="100%" style="width:100%;border-collapse:collapse;margin-top:${view.subValue ? "0" : "16px"};">${rowsHtml}</table>
    </div>

    <p style="max-width:380px;margin:20px auto 0;text-align:center;color:#E9DFFB;font-size:12px;line-height:1.6;">${esc(view.copy.summary)}</p>
  </body>
</html>`;
}

export async function renderReceiptPdf(params: {
  kind: ReceiptKind;
  order?: OrderRecord;
  merchant: MerchantRecord;
  walletIncoming?: WalletIncomingRecord;
}) {
  const view = buildReceiptView(params);
  const { jpeg, pointWidth, pointHeight } = await renderReceiptJpeg(view);
  return createImagePdf({ jpeg, pointWidth, pointHeight });
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
  const subject = `Linq: ${copy.headline}`;
  const filename = `${receiptNumber(params.kind, params.order?.id ?? params.walletIncoming?.id ?? makeSlug("notice"))}.pdf`;
  // Rendered outside the retry-relevant part of the try so a render that
  // succeeds but a send that fails still leaves something to inspect below.
  let html = "";
  let pdf = Buffer.alloc(0);
  try {
    [html, pdf] = await Promise.all([renderReceiptHtml(params), renderReceiptPdf(params)]);
    const delivery = await sendResendEmail({
      to: params.recipientEmail,
      subject,
      html,
      pdf,
      filename,
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
