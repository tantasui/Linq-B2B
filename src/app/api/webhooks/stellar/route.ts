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
      txHash?: string;
      underpaid?: boolean;
      shortfallNgn?: number;
      timestamp?: string;
    };

    const stellarOrderId = payload.orderId;
    const rawStatus = payload.status ?? payload.event?.replace(/^order\./, "");
    const status = normalizeStellarStatus(rawStatus);

    logger.info("stellar.webhook.received", {
      event: payload.event,
      stellarOrderId,
      rawStatus,
      status,
      txHash: payload.txHash,
    });

    // The Stellar service knows its own order id, which we store as
    // paycrestOrderId; getOrder resolves either that or our own id.
    const order = stellarOrderId ? await getOrder(stellarOrderId) : undefined;
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
    const alreadyFinished = ["settled", "refunded", "expired", "failed", "cancelled"].includes(order.status);
    const statusChanged = status !== order.status;

    if (statusChanged && !alreadyFinished) {
      await updateOrder(order.id, {
        status,
        ...(payload.txHash ? { depositDigest: payload.txHash } : {}),
      });
    }
    await addOrderEvent(order.id, "linq", payload.event ?? `order.${status}`, payload);

    // Receipts are idempotent per (order, kind, audience, recipient), so a
    // retried delivery does not email anyone twice.
    const receipts = await notifyForOrderStatus({ ...order, status });

    logger.info("stellar.webhook.handled", {
      orderId: order.id,
      stellarOrderId,
      prevStatus: order.status,
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
