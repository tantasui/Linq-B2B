import { fail, handleApiError, ok } from "@/server/http";
import { liveLinqEnabled, stellarServiceEnabled } from "@/server/env";
import { getLinqOrderStatus } from "@/server/linq-offramp";
import { getStellarOrderStatus } from "@/server/linq-stellar";
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

    // Stellar orders are refreshed against the standalone Stellar service;
    // every other chain is refreshed against Linq's native /b2b/status.
    const isStellar = order.network === "stellar";
    const providerEnabled = isStellar ? stellarServiceEnabled : liveLinqEnabled;

    if (order.paycrestOrderId && providerEnabled && !TERMINAL.has(order.status)) {
      try {
        const remote = isStellar
          ? await getStellarOrderStatus(order.paycrestOrderId)
          : await getLinqOrderStatus(order.paycrestOrderId);
        const statusChanged = remote.status !== order.status;
        // The deposit digest appears once the payment is seen on-chain, which
        // does not always coincide with a status change — so it is saved on
        // its own rather than only riding along with one.
        const digestArrived = Boolean(remote.depositDigest) && remote.depositDigest !== order.depositDigest;

        if (statusChanged || digestArrived) {
          order = await updateOrder(order.id, {
            ...(statusChanged ? { status: remote.status } : {}),
            ...(digestArrived ? { depositDigest: remote.depositDigest } : {}),
            paycrestPayload: remote.raw,
          }) ?? order;
        }
        if (statusChanged) {
          await addOrderEvent(order.id, "linq", `order.refresh.${remote.status}`, remote.raw);
        }
      } catch (error) {
        logger.warn("order_refresh_failed", {
          orderId: order.id,
          provider: isStellar ? "linq-stellar" : "linq",
          providerOrderId: order.paycrestOrderId,
          message: error instanceof Error ? error.message : "Order refresh failed.",
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
