import { logger } from "./logger";
import { notifyForOrderStatus } from "./receipts";
import { addOrderEvent, updateOrder } from "./store";
import type { OrderRecord } from "./types";

/**
 * How long a payer has to send the deposit. Linq stops watching the deposit
 * wallet after 10 minutes, so our window must not outlast theirs.
 */
export const DEPOSIT_WINDOW_MS = 10 * 60 * 1000;

/** Statuses that mean the order is finished — expiry no longer applies. */
const TERMINAL: OrderRecord["status"][] = [
  "settled",
  "refunded",
  "refunding",
  "expired",
  "failed",
  "cancelled",
];

/**
 * Statuses that mean funds already arrived. These must never be auto-expired:
 * the deposit is in flight or settling, and Linq still owns the outcome.
 */
const DEPOSIT_RECEIVED: OrderRecord["status"][] = [
  "deposited",
  "fulfilling",
  "fulfilled",
  "validated",
  "settling",
];

export function isExpirable(order: OrderRecord) {
  if (!order.validUntil) return false;
  if (TERMINAL.includes(order.status)) return false;
  if (DEPOSIT_RECEIVED.includes(order.status)) return false;
  return new Date(order.validUntil).getTime() <= Date.now();
}

/**
 * Lazily expire an order whose deposit window has closed, and notify both sides.
 *
 * Called on read (order fetch) rather than from a scheduler so it works without
 * background infrastructure. Safe to call repeatedly — once the order is marked
 * `expired` it becomes terminal and is skipped.
 */
export async function expireOrderIfDue(order: OrderRecord): Promise<OrderRecord> {
  if (!isExpirable(order)) return order;

  logger.info("order.expired", {
    orderId: order.id,
    linqOrderId: order.paycrestOrderId,
    network: order.network,
    validUntil: order.validUntil,
  });

  const expired = (await updateOrder(order.id, { status: "expired" })) ?? { ...order, status: "expired" as const };
  await addOrderEvent(order.id, "app", "order.expired", {
    reason: "deposit_window_elapsed",
    validUntil: order.validUntil,
    windowMs: DEPOSIT_WINDOW_MS,
  });

  // Tell the merchant and the payer the window closed. Never let a notification
  // failure block returning the expired order.
  await notifyForOrderStatus(expired).catch((error) => {
    logger.warn("order.expired.notify_failed", {
      orderId: order.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return expired;
}
