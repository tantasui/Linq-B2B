import { fail, handleApiError, ok } from "@/server/http";
import { getLinqOrderStatus, liveLinqEnabled } from "@/server/linq-offramp";
import { logger } from "@/server/logger";
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
        if (linq.status !== order.status) {
          order = await updateOrder(order.id, {
            status: linq.status,
            paycrestPayload: linq.raw,
          }) ?? order;
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

    return ok({ order });
  } catch (error) {
    return handleApiError(error);
  }
}
