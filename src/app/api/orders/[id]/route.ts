import { fail, handleApiError, ok } from "@/server/http";
import { liveLinqEnabled } from "@/server/env";
import { getLinqOrderStatus } from "@/server/linq-offramp";
import { logger } from "@/server/logger";
import { expireOrderIfDue } from "@/server/order-expiry";
import { addOrderEvent, getOrder, updateOrder } from "@/server/store";

interface Params {
  params: Promise<{ id: string }>;
}

const TERMINAL = new Set(["settled", "expired", "failed", "cancelled", "refunded"]);

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    let order = await getOrder(id);
    if (!order) return fail("Order not found.", 404);

    // Only poll Linq if the order is non-terminal and has a Linq order ID
    if (order.paycrestOrderId && liveLinqEnabled && !TERMINAL.has(order.status)) {
      try {
        const linq = await getLinqOrderStatus(order.paycrestOrderId);
        const statusChanged = linq.status !== order.status;
        // The deposit digest appears once the payment is seen on-chain, which
        // does not always coincide with a status change — so it is saved on
        // its own rather than only riding along with one.
        const digestArrived = Boolean(linq.depositDigest) && linq.depositDigest !== order.depositDigest;

        if (statusChanged || digestArrived) {
          order = await updateOrder(order.id, {
            ...(statusChanged ? { status: linq.status } : {}),
            ...(digestArrived ? { depositDigest: linq.depositDigest } : {}),
            paycrestPayload: linq.raw,
          }) ?? order;
        }
        if (statusChanged) {
          await addOrderEvent(order.id, "linq", `order.refresh.${linq.status}`, linq.raw);
        }
      } catch (error) {
        logger.warn("linq.order_refresh_failed", {
          orderId: order.id,
          linqOrderId: order.paycrestOrderId,
          message: error instanceof Error ? error.message : "Linq order refresh failed.",
        });
      }
    }

    // Close the deposit window if it elapsed without a deposit, notifying both sides.
    order = await expireOrderIfDue(order);

    return ok({ order });
  } catch (error) {
    return handleApiError(error);
  }
}
