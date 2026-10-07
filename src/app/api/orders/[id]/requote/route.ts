import { fail, handleApiError, ok } from "@/server/http";
import { isDedicatedOrder, requoteLinqOrder } from "@/server/linq-offramp";
import { logger } from "@/server/logger";
import { addOrderEvent, getOrder, updateOrder } from "@/server/store";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * "Complete your payment": re-prices the rest of a part-paid order whose window
 * closed, at today's rate, and opens a new window on the same address.
 *
 * Public like the order poll — the checkout and the emailed link both call it
 * with nothing but the order id. It can only move an order that is waiting to
 * be completed, and Linq caps how often.
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const order = await getOrder(id);
    if (!order) return fail("Order not found.", 404);
    if (!isDedicatedOrder(order) || !order.paycrestOrderId) {
      return fail("This order cannot be completed this way.", 409);
    }
    if (order.status !== "awaiting_completion") {
      return fail("This order is not waiting to be completed.", 409);
    }

    const result = await requoteLinqOrder(order.paycrestOrderId);
    const updated = (await updateOrder(order.id, {
      ...result.detail,
      status: result.status,
      paycrestPayload: result.raw,
    })) ?? order;
    await addOrderEvent(order.id, "linq", "order.requoted", result.raw);

    logger.info("order.requoted", {
      orderId: order.id,
      linqOrderId: order.paycrestOrderId,
      status: updated.status,
      cryptoAmountDue: updated.cryptoAmountDue,
      amountRemaining: updated.amountRemaining,
      requoteCount: updated.requoteCount,
    });
    return ok({ order: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
