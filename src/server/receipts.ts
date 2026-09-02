import { env, resendEnabled } from "./env";
import { barcodeBars, createReceiptPdf } from "./pdf";
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
  const date = order ? new Date(order.createdAt) : new Date();
  const dateLine = date
    .toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    .toUpperCase();

  const totalValue = order
    ? emailSafeCurrency(formatNaira(order.amountNgn))
    : walletIncoming
      ? formatToken(walletIncoming.amountToken, walletIncoming.token)
      : "Not available";

  // Line items, dotted-leader style — the same facts as the ticket's detail
  // rows, plus an explicit Status row since (unlike a retail receipt) a Linq
  // receipt can represent a failed or refunded event, not only a paid one.
  const rows: [string, string][] = order
    ? [
        ["Status", statusLabel],
        ["From", order.payerName || "—"],
        ["To", merchant.businessName],
        ["Network", chainDisplayName(order.network)],
        ["Paid", formatToken(order.cryptoAmountDue, order.token)],
        ["Rate", emailSafeCurrency(formatRate(order.quotedRate, order.token))],
        ["Fee", fee > 0 ? `${fee.toFixed(2)} ${order.token}` : "No fee"],
        ["Ref", order.paycrestOrderId ?? order.id],
      ]
    : [
        ["Status", statusLabel],
        ["From", "Direct wallet activity"],
        ["To", merchant.businessName],
        ["Network", walletIncoming ? chainDisplayName(walletIncoming.network) : "—"],
        ["Ref", walletIncoming?.transactionHash ?? "Not available"],
      ];

  return { copy, number, statusLabel, settled, dateLine, totalValue, rows };
}

const RECEIPT_TAGLINE = "/ Stablecoins In, Naira Out /";

/** The same deterministic bars as the PDF, rendered as table cells (works in Outlook too). */
function barcodeHtml(seed: string) {
  const cells = barcodeBars(seed)
    .map(
      (bar) =>
        `<td style="width:${bar.width}px;height:36px;padding:0;line-height:0;font-size:0;background:${bar.black ? "#1A1A1A" : "transparent"};">&nbsp;</td>`,
    )
    .join("");
  return `<table role="presentation" style="margin:0 auto;border-collapse:collapse;"><tr>${cells}</tr></table>`;
}

export function renderReceiptHtml(params: {
  kind: ReceiptKind;
  order?: OrderRecord;
  merchant: MerchantRecord;
  walletIncoming?: WalletIncomingRecord;
}) {
  const view = buildReceiptView(params);
  const mono = "ui-monospace, SFMono-Regular, 'Courier New', monospace";
  const rowsHtml = view.rows
    .map(
      ([label, value]) => `<tr>
        <td style="padding:7px 0;font-size:11px;color:#3A3A3A;white-space:nowrap;">${label}</td>
        <td style="width:100%;padding:7px 6px;border-bottom:1px dotted #B8AF9C;"></td>
        <td style="padding:7px 0;font-size:11px;font-weight:700;color:#1A1A1A;white-space:nowrap;text-align:right;">${value}</td>
      </tr>`,
    )
    .join("");
  return `<!doctype html>
<html>
  <body style="margin:0;background:#6D28D9;padding:40px 14px;font-family:${mono};">
    <div style="max-width:380px;margin:0 auto;background:#F5F0E6;color:#1A1A1A;padding:26px 24px 30px;">
      <table role="presentation" style="width:100%;"><tr>
        <td style="font-size:12px;font-weight:700;letter-spacing:.05em;color:#7C3AED;">${view.copy.title.toUpperCase()}</td>
        <td style="font-size:12px;font-weight:700;text-align:right;">No. ${view.number}</td>
      </tr></table>

      <p style="margin:22px 0 2px;text-align:center;font-size:26px;font-weight:800;font-style:italic;color:#7C3AED;">LINQ</p>
      <p style="margin:0 0 16px;text-align:center;font-size:10px;letter-spacing:.04em;color:#4A4A4A;">${RECEIPT_TAGLINE}</p>

      <div style="border-top:2px dashed #C9C2B4;"></div>
      <p style="margin:14px 0;text-align:center;font-size:11px;letter-spacing:.03em;">DATE: ${view.dateLine}</p>
      <div style="border-top:2px dashed #C9C2B4;margin-bottom:6px;"></div>

      <table role="presentation" style="width:100%;border-collapse:collapse;">${rowsHtml}</table>

      <div style="border-top:2px dashed #C9C2B4;margin:16px 0 18px;"></div>
      <table role="presentation" style="width:100%;"><tr>
        <td style="font-size:14px;font-weight:700;">TOTAL:</td>
        <td style="font-size:14px;font-weight:700;text-align:right;">${view.totalValue}</td>
      </tr></table>

      <div style="margin:24px 0 10px;">${barcodeHtml(view.number)}</div>
      <p style="margin:6px 0 20px;text-align:center;font-size:22px;font-weight:800;font-style:italic;color:#7C3AED;">Thank You!</p>

      <div style="border-top:2px dashed #C9C2B4;"></div>
      <table role="presentation" style="width:100%;margin-top:14px;"><tr>
        <td style="font-size:9px;color:#4A4A4A;">
          <a href="mailto:support@linq.xyz" style="color:#4A4A4A;">support@linq.xyz</a>
        </td>
        <td style="font-size:9px;color:#4A4A4A;text-align:right;letter-spacing:.04em;">LINQ.XYZ</td>
      </tr></table>
    </div>
    <p style="max-width:380px;margin:18px auto 0;text-align:center;color:#E9DFFB;font-size:11px;font-family:Inter,Segoe UI,Arial,sans-serif;">${view.copy.summary}</p>
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
  return createReceiptPdf({
    title: view.copy.title,
    receiptNumber: view.number,
    brand: "LINQ",
    tagline: RECEIPT_TAGLINE,
    dateLine: view.dateLine,
    rows: view.rows.map(([label, value]) => ({ label, value })),
    totalLabel: "TOTAL:",
    totalValue: view.totalValue,
    footerLeft: "support@linq.xyz",
    footerRight: "LINQ.XYZ",
  });
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
