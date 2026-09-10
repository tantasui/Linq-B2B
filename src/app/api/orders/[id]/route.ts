import { fail, handleApiError, ok } from "@/server/http";
import { liveLinqEnabled, stellarServiceEnabled } from "@/server/env";
import { getLinqOrderStatus } from "@/server/linq-offramp";
import { getStellarOrderStatus } from "@/server/linq-stellar";
import { logger } from "@/server/logger";
import { expireOrderIfDue } from "@/server/order-expiry";
import { notifyForOrderStatus } from "@/server/receipts";
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

          // Receipts are sent from here, not only from the provider webhooks.
          //
          // A Stellar order has no webhook — linq-stellar owns its own
          // settlement and this poll is the only thing that ever moves the
          // order to `settled`. Notifying only from the webhook meant no payer
          // and no merchant was ever emailed for a Stellar transaction, while
          // the checkout told the payer "a copy has been sent to <email>".
          //
          // Awaited rather than fired and forgotten: this runs on serverless,
          // where the function is frozen once the response is returned and
          // detached work is simply lost. Only the one poll that observes the
          // transition pays the render cost — the store is updated first, so a
          // concurrent poll sees the new status and does no work.
          //
          // createAndSendReceipt is idempotent per (order, kind, audience,
          // recipient), so an order that also gets a webhook is not emailed
          // twice.
          const settled = order;
          await notifyForOrderStatus(settled).catch((error) => {
            logger.error("order_refresh_notify_failed", {
              orderId: settled.id,
              status: remote.status,
              message: error instanceof Error ? error.message : "Receipt notification failed.",
            });
          });
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
