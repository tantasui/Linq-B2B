import { env, resendEnabled } from "./env";
import { createSimplePdf } from "./pdf";
import { makeSlug } from "./security";
import { addReceipt, addWalletIncoming, getMerchant, getOrder, listReceipts } from "./store";
import type { MerchantRecord, OrderRecord, ReceiptKind, ReceiptRecord, StablecoinSymbol, WalletIncomingRecord } from "./types";

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

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

export function renderReceiptHtml(params: {
  kind: ReceiptKind;
  order?: OrderRecord;
  merchant: MerchantRecord;
  walletIncoming?: WalletIncomingRecord;
}) {
  const { kind, order, merchant, walletIncoming } = params;
  const copy = statusCopy(kind);
  const number = receiptNumber(kind, order?.id ?? walletIncoming?.id ?? makeSlug("notice"));
  const amount = order ? formatNaira(order.amountNgn) : walletIncoming ? formatToken(walletIncoming.amountToken, walletIncoming.token) : "Not available";
  const tokenLine = order
    ? `${formatToken(order.cryptoAmountDue, order.token)} on ${order.network.replaceAll("-", " ")}`
    : walletIncoming
      ? `${formatToken(walletIncoming.amountToken, walletIncoming.token)} on ${walletIncoming.network}`
      : "Not available";
  const payer = order ? `${order.payerName} (${order.payerEmail})` : "Direct wallet activity";
  const externalRef = order?.paycrestOrderId ?? walletIncoming?.transactionHash ?? "Not available";
  return `<!doctype html>
<html>
  <body style="margin:0;background:#000;color:#fff;font-family:Inter,Segoe UI,Arial,sans-serif;">
    <section style="padding:42px;background:radial-gradient(circle at 15% 0%,rgba(160,224,171,.28),transparent 30%),radial-gradient(circle at 80% 20%,rgba(255,172,46,.2),transparent 28%),#000;">
      <p style="margin:0 0 22px;color:#aaa;font-size:11px;letter-spacing:.18em;text-transform:uppercase;">Linq ${copy.title}</p>
      <h1 style="margin:0 0 12px;font-size:42px;line-height:.98;font-weight:400;">${copy.headline}</h1>
      <p style="margin:0 0 28px;color:#d8d8d8;font-size:15px;max-width:680px;">${copy.summary}</p>
      <div style="border-top:1px solid rgba(255,255,255,.28);padding-top:20px;">
        <p style="margin:0;color:#aaa;font-size:12px;">Receipt number</p>
        <p style="margin:6px 0 20px;font-size:20px;">${number}</p>
        <table style="width:100%;border-collapse:collapse;color:#fff;">
          ${[
            ["Merchant", merchant.businessName],
            ["Amount", amount],
            ["Asset/network", tokenLine],
            ["Payer/source", payer],
            ["Status", order?.status ?? walletIncoming?.reason ?? kind],
            ["Reference", externalRef],
            ["Issued", new Date().toLocaleString()],
          ]
            .map(([label, value]) => `<tr><td style="border-top:1px solid rgba(255,255,255,.14);padding:12px 0;color:#aaa;">${label}</td><td style="border-top:1px solid rgba(255,255,255,.14);padding:12px 0;text-align:right;">${value}</td></tr>`)
            .join("")}
        </table>
      </div>
    </section>
  </body>
</html>`;
}

export function renderReceiptPdf(params: {
  kind: ReceiptKind;
  order?: OrderRecord;
  merchant: MerchantRecord;
  walletIncoming?: WalletIncomingRecord;
}) {
  const copy = statusCopy(params.kind);
  const order = params.order;
  const incoming = params.walletIncoming;
  return createSimplePdf(copy.title, [
    { text: copy.headline, size: 20, gapAfter: 10 },
    { text: copy.summary, muted: true, gapAfter: 18 },
    { text: `Merchant: ${params.merchant.businessName}` },
    { text: `Amount: ${order ? formatNaira(order.amountNgn) : incoming ? formatToken(incoming.amountToken, incoming.token) : "Not available"}` },
    { text: `Asset/network: ${order ? `${formatToken(order.cryptoAmountDue, order.token)} on ${order.network}` : incoming ? `${formatToken(incoming.amountToken, incoming.token)} on ${incoming.network}` : "Not available"}` },
    { text: `Payer/source: ${order ? `${order.payerName} <${order.payerEmail}>` : incoming?.reason ?? "Direct wallet activity"}` },
    { text: `Status: ${order?.status ?? incoming?.reason ?? params.kind}` },
    { text: `Reference: ${order?.paycrestOrderId ?? incoming?.transactionHash ?? "Not available"}` },
    { text: `Issued: ${new Date().toLocaleString()}`, muted: true, gapAfter: 16 },
    { text: "This document was generated by Linq for payment reconciliation and merchant records.", muted: true },
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
