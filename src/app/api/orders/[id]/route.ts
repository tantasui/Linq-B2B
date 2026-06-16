import { fail, handleApiError, ok } from "@/server/http";
import { getPaycrestOrder } from "@/server/paycrest";
import { addOrderEvent, getOrder, updateOrder } from "@/server/store";
import { logger } from "@/server/logger";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    let order = await getOrder(id);
    if (order?.paycrestOrderId) {
      try {
        const paycrest = await getPaycrestOrder(order.paycrestOrderId);
        order = await updateOrder(order.id, {
          status: paycrest.status,
          quotedRate: paycrest.quotedRate ?? order.quotedRate,
          cryptoAmountDue: paycrest.cryptoAmountDue ?? order.cryptoAmountDue,
          senderFee: paycrest.senderFee ?? order.senderFee,
          transactionFee: paycrest.transactionFee ?? order.transactionFee,
          providerReceiveAddress: paycrest.providerReceiveAddress ?? order.providerReceiveAddress,
          validUntil: paycrest.validUntil ?? order.validUntil,
          paycrestPayload: paycrest.raw,
        }) ?? order;
        await addOrderEvent(order.id, "linq", `order.refresh.${paycrest.status}`, paycrest.raw);
      } catch (error) {
        logger.warn("paycrest.order_refresh_failed", {
          orderId: order.id,
          paycrestOrderId: order.paycrestOrderId,
          message: error instanceof Error ? error.message : "Paycrest order refresh failed.",
        });
      }
    }
    if (!order) return fail("Order not found.", 404);
    return ok({ order });
  } catch (error) {
    return handleApiError(error);
  }
}
