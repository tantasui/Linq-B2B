import { env, resendEnabled } from "./env";
import { logger } from "./logger";
import { createImagePdf } from "./pdf";
import { renderReceiptJpeg } from "./receipt-image";
import { makeSlug } from "./security";
import { addReceipt, addWalletIncoming, formatNaira, getMerchant, getOrder, listReceipts } from "./store";
import { chainDisplayName } from "@/lib/chains";
import { formatRate } from "@/lib/payment-data";
import { formatTokenAmount } from "@/lib/money";
import type {
  MerchantRecord,
  OrderRecord,
  OrderStatus,
  ReceiptAudience,
  ReceiptKind,
  ReceiptRecord,
  StablecoinSymbol,
  WalletIncomingRecord,
} from "./types";

function formatToken(value: number, token: string) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${token}`;
}

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * What a notice is about, and everything the copy needs to say it.
 *
 * Passed around rather than read from the order at each use, because half of
 * these lines are about a moment the order has already moved on from: a refund
 * notice is written while the order says `refunded`, and it still has to say
 * that the payout failed.
 */
interface NoticeContext {
  order?: OrderRecord;
  merchant: MerchantRecord;
  walletIncoming?: WalletIncomingRecord;
}

interface NoticeCopy {
  /** The subject line. Specific: it is all most people read. */
  subject: string;
  /** The document title, for the PDF. */
  title: string;
  /** The hero line in the body. */
  headline: string;
  summary: string;
  /** The pill printed on the ticket. Names the event, not the order's state. */
  statusLabel: string;
  /** Whether the ticket gets its checkmark. Only for money that has landed. */
  settled: boolean;
}

/** The merchant's payout account for this order, described without exposing it. */
function payoutAccount(ctx: NoticeContext) {
  const accounts = ctx.merchant.bankAccounts ?? [];
  const account = accounts.find((entry) => entry.id === ctx.order?.bankAccountId) ?? accounts[0];
  if (!account) return "your payout account";
  const tail = account.accountIdentifier.slice(-4);
  return `${account.institutionName ?? "your bank"} ····${tail}`;
}

/** A refund destination, shortened the way an address is usually shown. */
function shortAddress(address: string) {
  return address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-6)}` : address;
}

/** The provider's own explanation, as a sentence, when there is one. */
function because(ctx: NoticeContext) {
  const reason = ctx.order?.statusReason?.trim();
  return reason ? ` Reason given: ${reason}.` : "";
}

/**
 * What each notice says.
 *
 * One entry per event, not per outcome. The two halves of a settlement read
 * differently on purpose: "we have your transfer" is true the moment a deposit
 * lands, and "your payout has been sent" is only true after the bank has taken
 * it. Saying the second at the moment of the first — which is what a shared
 * `merchant_fiat_received` did — told merchants their money had arrived while
 * the payout had not yet been attempted, and sometimes went on to fail.
 */
function noticeCopy(kind: ReceiptKind, ctx: NoticeContext): NoticeCopy {
  const order = ctx.order;
  const amount = order ? formatNaira(order.amountNgn) : "";
  const crypto = order ? `${formatTokenAmount(order.cryptoAmountDue)} ${order.token}` : "";
  const merchantName = ctx.merchant.businessName || "the merchant";

  switch (kind) {
    case "payer_payment_received":
      return {
        subject: `We have your ${crypto} transfer`,
        title: "Payment received",
        headline: "Your transfer arrived",
        statusLabel: "Transfer received",
        settled: false,
        summary: `We can see your ${crypto} on-chain and the ${amount} payout to ${merchantName} is on its way. You will get a second email the moment it settles — you do not need to keep this page open.`,
      };
    case "payer_transaction_success":
      return {
        subject: `Payment complete — ${amount} to ${merchantName}`,
        title: "Payment receipt",
        headline: "Your payment went through",
        statusLabel: "Payment complete",
        settled: true,
        summary: `Your ${crypto} has been converted and ${amount} has settled to ${merchantName}. This receipt is your proof of payment.`,
      };
    case "payer_payment_failed":
      return {
        subject: "Your payment could not be completed",
        title: "Payment problem",
        headline: "This payment did not complete",
        statusLabel: "Payment failed",
        settled: false,
        summary: `The ${amount} payout to ${merchantName} could not be completed.${because(ctx)} If your funds left your wallet they are held safely and are being returned — reply to this email with the reference below and we will trace it.`,
      };
    case "payer_refund_started":
      return {
        subject: `Your ${crypto} is being refunded`,
        title: "Refund started",
        headline: "Your refund is on its way",
        statusLabel: "Refund in progress",
        settled: false,
        summary: `The payout to ${merchantName} could not be completed, so your ${crypto} is being sent back${order?.refundDestination ? ` to ${shortAddress(order.refundDestination)}` : ""}.${because(ctx)} Nothing further is needed from you, and you have not been charged.`,
      };
    case "payer_refund_completed":
      return {
        subject: `Refunded — ${crypto} is back in your wallet`,
        title: "Refund receipt",
        headline: "Your refund has been sent",
        statusLabel: "Refunded",
        settled: true,
        summary: `${crypto} has been returned${order?.refundDestination ? ` to ${shortAddress(order.refundDestination)}` : ""}. The transaction hash below is your on-chain proof.`,
      };
    case "payer_order_expired":
      return {
        subject: "The payment window closed",
        title: "Payment window closed",
        headline: "This payment expired",
        statusLabel: "Window closed",
        settled: false,
        summary: `The window to send ${crypto} closed before a deposit arrived, and nothing was charged. If you have already sent funds, do not send again — late deposits are held safely and reconciled by hand. Reply to this email with the reference below.`,
      };

    case "merchant_payment_incoming":
      return {
        subject: `Payment received — ${amount} payout in progress`,
        title: "Payment received",
        headline: "A payment arrived, payout in progress",
        statusLabel: "Payout in progress",
        settled: false,
        summary: `${order?.payerName || "A customer"} sent ${crypto} for a ${amount} order. The naira payout to ${payoutAccount(ctx)} has been queued and you will be emailed again when it settles — this notice is not confirmation that the money has reached your bank.`,
      };
    case "merchant_fiat_received":
      return {
        subject: `${amount} paid out to ${payoutAccount(ctx)}`,
        title: "Settlement receipt",
        headline: "Your payout has settled",
        statusLabel: "Payout settled",
        settled: true,
        summary: `${amount} has been disbursed to ${payoutAccount(ctx)}${order?.payoutReference ? `, reference ${order.payoutReference}` : ""}. The customer's ${crypto} has been received and converted.`,
      };
    case "merchant_payout_failed":
      return {
        subject: `Payout failed — ${amount} was not sent`,
        title: "Payout failed",
        headline: "This payout could not be completed",
        statusLabel: "Payout failed",
        settled: false,
        summary: `The ${amount} payout to ${payoutAccount(ctx)} was attempted and did not go through.${because(ctx)} The customer's funds are safe and are being returned to them, so this order will not settle. Check that the payout account is correct before taking another payment.`,
      };
    case "merchant_refund_completed":
      return {
        subject: `Order refunded — ${amount} will not settle`,
        title: "Refund completed",
        headline: "The customer has been refunded",
        statusLabel: "Refunded to customer",
        settled: false,
        summary: `Because the ${amount} payout could not be completed, the customer's ${crypto} has been returned to them. Nothing is owed and nothing further will arrive for this order.`,
      };
    case "merchant_order_expired":
      return {
        subject: "A payment link expired unpaid",
        title: "Payment window closed",
        headline: "A customer did not pay in time",
        statusLabel: "Window closed",
        settled: false,
        summary: `The window for a ${amount} order closed before any deposit arrived, so no money moved in either direction. Nothing is owed to you and nothing was charged to the customer.`,
      };

    case "merchant_linq_refund":
      return {
        subject: "A LinqSwitch refund reached your wallet",
        title: "LinqSwitch refund notice",
        headline: "Refund from LinqSwitch detected",
        statusLabel: "Refund received",
        settled: false,
        summary: "This incoming value is marked as a LinqSwitch refund, not a fresh customer direct receive.",
      };
    case "merchant_wallet_incoming":
      return {
        subject: "Funds arrived in your merchant wallet",
        title: "Wallet receive notice",
        headline: "Funds entered your merchant wallet",
        statusLabel: "Wallet receive",
        settled: false,
        summary: "Merchant wallet activity indicates a direct receive.",
      };
  }
}

/**
 * Which notices an order's status owes, and to whom.
 *
 * The table is the feature. Every status that means something to a human sends
 * to both sides, each with its own kind — and because receipts are deduplicated
 * per kind, an order that passes through four states sends four pairs rather
 * than the first pair and then silence.
 *
 * Statuses absent here are internal machinery: `initiated` and `pending` mean
 * nothing has happened yet, `fulfilling` and `settling` mean the payout is
 * mid-flight, and a mail for either would be noise arriving between two mails
 * that matter.
 */
const ORDER_NOTICES: Partial<Record<OrderStatus, { kind: ReceiptKind; audience: ReceiptAudience }[]>> = {
  // The payer's money has landed. Nobody has been paid yet, and neither notice
  // may imply otherwise.
  deposited: [
    { kind: "payer_payment_received", audience: "payer" },
    { kind: "merchant_payment_incoming", audience: "merchant" },
  ],
  // Terminal success: the naira reached the merchant's bank.
  settled: [
    { kind: "payer_transaction_success", audience: "payer" },
    { kind: "merchant_fiat_received", audience: "merchant" },
  ],
  fulfilled: [
    { kind: "payer_transaction_success", audience: "payer" },
    { kind: "merchant_fiat_received", audience: "merchant" },
  ],
  validated: [
    { kind: "payer_transaction_success", audience: "payer" },
    { kind: "merchant_fiat_received", audience: "merchant" },
  ],
  // The payout failed for good. The merchant hears that it failed — not, as
  // they used to, a refund notice that never mentioned the payout at all.
  refunding: [
    { kind: "merchant_payout_failed", audience: "merchant" },
    { kind: "payer_refund_started", audience: "payer" },
  ],
  refunded: [
    { kind: "payer_refund_completed", audience: "payer" },
    { kind: "merchant_refund_completed", audience: "merchant" },
  ],
  failed: [
    { kind: "merchant_payout_failed", audience: "merchant" },
    { kind: "payer_payment_failed", audience: "payer" },
  ],
  cancelled: [
    { kind: "merchant_payout_failed", audience: "merchant" },
    { kind: "payer_payment_failed", audience: "payer" },
  ],
  // Nothing moved. That is worth saying to both sides, and it is not a failure
  // — which is what the merchant used to be told it was.
  expired: [
    { kind: "payer_order_expired", audience: "payer" },
    { kind: "merchant_order_expired", audience: "merchant" },
  ],
};

function receiptNumber(kind: ReceiptKind, id: string) {
  // The prefix is what someone reads out over the phone, so it names the kind
  // of document rather than the order's state at the time.
  const prefix = kind.includes("refund")
    ? "RFND"
    : kind.includes("failed")
      ? "FAIL"
      : kind.includes("expired")
        ? "EXPD"
        : kind === "merchant_fiat_received"
          ? "INV"
          : "RCPT";
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
  // The copy is chosen by the event, and so are the label and the checkmark.
  // Reading them off the order's *current* status instead is how a refund
  // notice ended up stamped with whatever state the order had reached by the
  // time the mail was rendered.
  const copy = noticeCopy(kind, { order, merchant, walletIncoming });
  const statusLabel = copy.statusLabel;
  const settled = copy.settled;
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
        { label: "Fee", value: fee > 0 ? `${formatTokenAmount(fee)} ${order.token}` : "No fee" },
        // The evidence for whatever this notice says, when there is any. A
        // payout that settled has a bank reference; a refund has a hash. Both
        // are the first thing asked for when someone follows up, so they are
        // printed rather than left to a support conversation.
        ...(order.payoutReference && kind === "merchant_fiat_received"
          ? [{ label: "Payout reference", value: order.payoutReference }]
          : []),
        ...(order.refundTxHash && kind.includes("refund")
          ? [{ label: "Refund transaction", value: order.refundTxHash }]
          : []),
        ...(order.refundDestination && kind.includes("refund")
          ? [{ label: "Refunded to", value: shortAddress(order.refundDestination) }]
          : []),
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
export async function renderReceiptHtml(params: ReceiptParams) {
  return (await renderReceipt(params)).html;
}

export async function renderReceiptPdf(params: ReceiptParams) {
  return (await renderReceipt(params)).pdf;
}

interface ReceiptParams {
  kind: ReceiptKind;
  order?: OrderRecord;
  merchant: MerchantRecord;
  walletIncoming?: WalletIncomingRecord;
}

/**
 * Renders the ticket once, and builds both the email and the PDF from it.
 *
 * The image is satori laying out text against a rasterised SVG, through sharp,
 * twice — it is the most expensive thing on the path between a payment landing
 * and somebody being told about it. Asking for the HTML and the PDF separately
 * used to do all of that twice per receipt, and four times for a pair, on a
 * request the webhook sender is holding open.
 */
async function renderReceipt(params: ReceiptParams) {
  const view = buildReceiptView(params);
  const image = await renderReceiptJpeg(view);
  return {
    view,
    html: receiptHtml(view, image),
    pdf: await createImagePdf(image),
  };
}

function receiptHtml(view: ReturnType<typeof buildReceiptView>, image: Awaited<ReturnType<typeof renderReceiptJpeg>>) {
  const { jpeg, pointWidth } = image;
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



async function sendResendEmail(input: {
  to: string;
  subject: string;
  html: string;
  pdf: Buffer;
  filename: string;
}) {
  if (!resendEnabled) {
    // Recorded and logged rather than thrown: a deployment without a key is a
    // valid local setup. But it is silent from the recipient's side — the
    // receipt is stored, the UI says a copy was sent, and no mail leaves — so
    // it has to say so somewhere, or "emails never arrive" has no trail to
    // follow. /api/health/ready reports the same thing before it matters.
    logger.warn("email.skipped_no_provider", {
      to: input.to,
      subject: input.subject,
      reason: "RESEND_API_KEY is not set",
    });
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
  const copy = noticeCopy(params.kind, {
    order: params.order,
    merchant: params.merchant,
    walletIncoming: params.walletIncoming,
  });
  // The subject names the event. "Linq: Fiat settlement received" on both the
  // deposit and the settlement is how two different things came to look like
  // one duplicate email.
  const subject = `Linq · ${copy.subject}`;
  const filename = `${receiptNumber(params.kind, params.order?.id ?? params.walletIncoming?.id ?? makeSlug("notice"))}.pdf`;
  // Rendered outside the retry-relevant part of the try so a render that
  // succeeds but a send that fails still leaves something to inspect below.
  let html = "";
  let pdf = Buffer.alloc(0);
  try {
    ({ html, pdf } = await renderReceipt(params));
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

/**
 * Sends everything an order's current status owes, to both sides.
 *
 * Called from every path that can move an order — the two provider webhooks,
 * the status poll, and the expiry sweep — because no one of them sees every
 * transition. Stellar in particular has no webhook at all: `GET
 * /api/orders/[id]` is the only thing that ever moves one of its orders to
 * `settled`.
 *
 * Every notice is sent before this returns. They are rendered and mailed one
 * after another rather than in parallel: this runs on serverless, where the
 * function is frozen the moment the response is returned, and a send that is
 * still in flight is simply lost. A pair of receipts costs a couple of seconds
 * on one request, which is the price of the email arriving at all.
 *
 * Idempotent per (order, kind, audience, recipient), so an order that gets both
 * a webhook and a poll is not mailed twice — and, because kinds now name the
 * event, a later stage is not mistaken for a duplicate of an earlier one.
 */
export async function notifyForOrderStatus(order: OrderRecord) {
  const merchant = await getMerchant(order.businessId);
  if (!merchant) throw new Error("Merchant not found for receipt notification.");

  const owed = ORDER_NOTICES[order.status] ?? [];
  if (owed.length === 0) return [];

  const notices: ReceiptRecord[] = [];
  for (const notice of owed) {
    const recipientEmail = notice.audience === "payer" ? order.payerEmail : merchant.businessEmail;
    if (!recipientEmail) {
      // An order can reach a terminal state with no payer email — a manual or
      // API-created one. Skipping the missing side is not a reason to skip the
      // other, which is what throwing here would do.
      logger.warn("receipt.no_recipient", { orderId: order.id, kind: notice.kind, audience: notice.audience });
      continue;
    }
    notices.push(await createAndSendReceipt({
      kind: notice.kind,
      audience: notice.audience,
      order,
      merchant,
      recipientEmail,
    }));
  }

  logger.info("receipt.notified", {
    orderId: order.id,
    status: order.status,
    sent: notices.filter((notice) => notice.status === "sent").length,
    skipped: notices.filter((notice) => notice.status === "skipped").length,
    failed: notices.filter((notice) => notice.status === "failed").length,
    kinds: notices.map((notice) => notice.kind),
  });

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
