import { fail, handleApiError, ok } from "@/server/http";
import { normalizeStellarStatus } from "@/server/linq-stellar";
import { logger } from "@/server/logger";
import { notifyForOrderStatus } from "@/server/receipts";
import { verifyStellarWebhookSignature } from "@/server/security";
import { addOrderEvent, getOrder, updateOrder } from "@/server/store";

/**
 * Status webhooks from the standalone Stellar settlement service.
 *
 * That service owns its own settlement end to end, so until this endpoint
 * existed the only thing that ever noticed a Stellar order had moved was the
 * checkout page polling `GET /api/orders/[id]`. A payer who closed the tab —
 * which is what a payer does once they have paid, and certainly once something
 * has gone wrong — took the only observer with them, and the merchant was
 * never told. Notably this meant a failed payout notified nobody at all.
 *
 * Deliberately separate from /api/webhooks/linq: that route maps its payload
 * through normalizeLinqStatus, whose vocabulary is the native offramp's.
 * linq-stellar has its own states (`payout_queued`, `refund_queued`,
 * `settled_in_treasury`), and running them through the wrong normalizer is how
 * a refund gets filed as a settlement.
 */
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    const signature = request.headers.get("x-linq-signature");

    if (!verifyStellarWebhookSignature(raw, signature)) {
      logger.warn("stellar.webhook.signature_invalid", { hasSignature: Boolean(signature) });
      return fail("Invalid webhook signature.", 401);
    }

    const payload = JSON.parse(raw) as {
      event?: string;
      orderId?: string;
      status?: string;
      amountNGN?: number;
      amountStableCoin?: number;
      quotedNgn?: number;
      txHash?: string;
      underpaid?: boolean;
      shortfallNgn?: number;
      payoutReference?: string;
      refundTxHash?: string;
      refundDestination?: string;
      reason?: string;
      occurredAt?: string;
      timestamp?: string;
    };

    const stellarOrderId = payload.orderId;
    const rawStatus = payload.status ?? payload.event?.replace(/^order\./, "");
    const status = normalizeStellarStatus(rawStatus);

    logger.info("stellar.webhook.received", {
      component: "webhook.stellar",
      event: payload.event,
      stellarOrderId,
      rawStatus,
      status,
      txHash: payload.txHash,
      reason: payload.reason,
      // How long the payer waited between the thing happening and this
      // arriving. The sending side logs the same figure; having it on both
      // ends is what tells a delay in delivery from a delay in settlement.
      lagMs: payload.occurredAt ? Date.now() - Date.parse(payload.occurredAt) : undefined,
    });

    // The Stellar service knows its own order id, which we store as
    // paycrestOrderId; getOrder resolves either that or our own id.
    let order = stellarOrderId ? await getOrder(stellarOrderId) : undefined;
    if (!order) {
      // Recorded rather than dropped: a webhook for an order we have no row for
      // is a reconciliation problem, and silently 200-ing it loses the evidence.
      logger.warn("stellar.webhook.order_not_found", { stellarOrderId, event: payload.event });
      await addOrderEvent(undefined, "linq", payload.event ?? `order.${status}`, payload);
      return ok({ received: true });
    }

    // Terminal orders are not walked backwards by a late or duplicate delivery.
    // The sender retries until it gets a 2xx, so the same event can legitimately
    // arrive twice; the second one must not undo the first.
    const previousStatus = order.status;
    const alreadyFinished = ["settled", "refunded", "expired", "failed", "cancelled"].includes(previousStatus);
    const statusChanged = status !== previousStatus;

    // Carried through whether or not the status moved: a refund hash and a
    // payout reference arrive on their own events, and the notices are written
    // from them. Dropping them meant every "payout failed" email said only that
    // it had failed, and every refund notice had nothing to point at.
    const detail = {
      ...(payload.txHash ? { depositDigest: payload.txHash } : {}),
      ...(payload.reason ? { statusReason: payload.reason } : {}),
      ...(payload.payoutReference ? { payoutReference: payload.payoutReference } : {}),
      ...(payload.refundTxHash ? { refundTxHash: payload.refundTxHash } : {}),
      ...(payload.refundDestination ? { refundDestination: payload.refundDestination } : {}),
      ...(payload.underpaid && payload.shortfallNgn
        ? { statusReason: underpaidReason(payload.amountNGN, payload.quotedNgn, payload.shortfallNgn) }
        : {}),
    };

    if ((statusChanged && !alreadyFinished) || Object.keys(detail).length > 0) {
      order = (await updateOrder(order.id, {
        ...(statusChanged && !alreadyFinished ? { status } : {}),
        ...detail,
      })) ?? order;
    }
    await addOrderEvent(order.id, "linq", payload.event ?? `order.${status}`, payload);

    // Receipts are idempotent per (order, kind, audience, recipient), so a
    // retried delivery does not email anyone twice. The status reported is the
    // event's, not the order's current one: an order that has already moved on
    // still owes the notice for the state it passed through, and "your payout
    // failed" is not made untrue by a refund landing afterwards.
    const receipts = await notifyForOrderStatus({ ...order, status });

    logger.info("stellar.webhook.handled", {
      component: "webhook.stellar",
      orderId: order.id,
      stellarOrderId,
      prevStatus: previousStatus,
      newStatus: status,
      statusChanged,
      alreadyFinished,
      receipts: receipts.length,
    });

    return ok({ received: true, order: { ...order, status }, receipts });
  } catch (error) {
    logger.error("stellar.webhook.error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return handleApiError(error);
  }
}

/**
 * Says how far a deposit fell short, in the terms the merchant invoiced in.
 *
 * An underpayment is not a failure — the payout still goes out for what
 * arrived — but it is the one case where a merchant is paid less than they
 * asked for, and a settlement notice that does not mention it reads as a clean
 * success.
 */
function underpaidReason(paid: number | undefined, quoted: number | undefined, shortfall: number) {
  const naira = (value: number) => `₦${value.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
  if (paid === undefined || quoted === undefined) {
    return `The deposit was ${naira(shortfall)} short of the invoice, so the payout is for what arrived.`;
  }
  return `The deposit covered ${naira(paid)} of the ${naira(quoted)} invoiced — ${naira(shortfall)} short — so the payout is for what arrived.`;
}
