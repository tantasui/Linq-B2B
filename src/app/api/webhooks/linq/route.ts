import { fail, handleApiError, ok } from "@/server/http";
import { dedicatedDetail, isDedicatedSnapshot, normalizeDedicatedStatus, normalizeLinqStatus } from "@/server/linq-offramp";
import { logger } from "@/server/logger";
import { notifyForOrderStatus, notifyReminder } from "@/server/receipts";
import { verifyLinqWebhookSignature } from "@/server/security";
import { addOrderEvent, getOrder, updateOrder } from "@/server/store";
import type { OrderRecord } from "@/server/types";

const FINISHED = ["settled", "refunded", "expired", "failed", "cancelled"];

/**
 * Status webhooks from Linq: the shared /b2b/offramp's payload, and the
 * dedicated offramp's order snapshot (recognised by `lifecycleStatus`). A
 * dedicated order receives both — its own events, and the shared payout
 * pipeline's order.processing / order.completed as the naira goes out.
 */
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    const signature = request.headers.get("x-linq-signature");

    logger.info("linq.webhook.received", { bodyLength: raw.length, hasSignature: Boolean(signature), raw });

    if (!verifyLinqWebhookSignature(raw, signature)) {
      logger.warn("linq.webhook.signature_invalid", { signature, raw });
      return fail("Invalid webhook signature.", 401);
    }

    const payload = JSON.parse(raw) as {
      event?: string;
      orderId?: string;
      id?: string;
      amountStableCoin?: number;
      amountNGN?: number;
      status?: string;
      txHash?: string;
      timestamp?: string;
    };

    const dedicated = isDedicatedSnapshot(payload);
    const linqOrderId = payload.orderId ?? payload.id;
    const rawStatus = payload.status ?? payload.event?.replace(/^order\./, "");
    const status = dedicated ? normalizeDedicatedStatus(payload) : normalizeLinqStatus(rawStatus);

    logger.info("linq.webhook.parsed", {
      event: payload.event,
      linqOrderId,
      rawStatus,
      status,
      dedicated,
      txHash: payload.txHash,
      ...(dedicated
        ? {
            lifecycleStatus: payload.lifecycleStatus,
            received: payload.amountReceived,
            remaining: payload.amountRemaining,
            total: payload.totalUsdc,
            reminder: payload.reminder,
          }
        : {}),
    });

    let order = linqOrderId ? await getOrder(linqOrderId) : undefined;
    if (!order) {
      logger.warn("linq.webhook.order_not_found", { linqOrderId, event: payload.event });
      await addOrderEvent(undefined, "linq", payload.event ?? `order.${status}`, payload);
      return ok({ received: true });
    }

    // A late or repeated delivery must not walk a finished order backwards.
    // Expired is not final for a dedicated order: a late deposit reopens it.
    const previousStatus = order.status;
    const alreadyFinished = FINISHED.includes(previousStatus) && !(dedicated && previousStatus === "expired");
    const statusChanged = status !== previousStatus && !alreadyFinished;

    // The shared payload's txHash is the treasury sweep on order.completed, not
    // the payer's deposit, so only the dedicated snapshot's fields are kept.
    const detail: Partial<OrderRecord> = dedicated ? dedicatedDetail(payload) : {};

    order = (await updateOrder(order.id, {
      ...(statusChanged ? { status } : {}),
      ...detail,
      paycrestPayload: payload,
    })) ?? order;
    await addOrderEvent(order.id, "linq", payload.event ?? `order.${status}`, payload);
    logger.info("linq.webhook.order_updated", { orderId: order.id, linqOrderId, prevStatus: previousStatus, newStatus: order.status });

    // Reminders are not status changes: Linq times them and names which one.
    if (dedicated && payload.event === "order.reminder" && payload.reminder) {
      const reminder = await notifyReminder(order, payload.reminder);
      logger.info("linq.webhook.reminder", { orderId: order.id, reminder: payload.reminder, receipt: reminder?.status ?? "none" });
      return ok({ received: true, order, receipts: reminder ? [reminder] : [] });
    }

    // The event's status, not the order's current one: an order that has moved
    // on still owes the notice for the state it passed through.
    const receipts = await notifyForOrderStatus(alreadyFinished ? order : { ...order, status });
    return ok({ received: true, order, receipts });
  } catch (error) {
    logger.error("linq.webhook.error", { error: error instanceof Error ? error.message : String(error) });
    return handleApiError(error);
  }
}
