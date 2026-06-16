import { fail, handleApiError, ok } from "@/server/http";
import { normalizeLinqStatus } from "@/server/linq-offramp";
import { logger } from "@/server/logger";
import { notifyForOrderStatus } from "@/server/receipts";
import { verifyLinqWebhookSignature } from "@/server/security";
import { addOrderEvent, getOrder, updateOrder } from "@/server/store";

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

    const linqOrderId = payload.orderId ?? payload.id;
    const rawStatus = payload.status ?? payload.event?.replace(/^order\./, "");
    const status = normalizeLinqStatus(rawStatus);

    logger.info("linq.webhook.parsed", { event: payload.event, linqOrderId, rawStatus, status, txHash: payload.txHash });

    const order = linqOrderId ? await getOrder(linqOrderId) : undefined;
    if (!order) {
      logger.warn("linq.webhook.order_not_found", { linqOrderId, event: payload.event });
      await addOrderEvent(undefined, "linq", payload.event ?? `order.${status}`, payload);
      return ok({ received: true });
    }

    await updateOrder(order.id, { status, paycrestPayload: payload });
    await addOrderEvent(order.id, "linq", payload.event ?? `order.${status}`, payload);
    logger.info("linq.webhook.order_updated", { orderId: order.id, linqOrderId, prevStatus: order.status, newStatus: status });
    const receipts = await notifyForOrderStatus({ ...order, status });
    return ok({ received: true, order: { ...order, status }, receipts });
  } catch (error) {
    logger.error("linq.webhook.error", { error: error instanceof Error ? error.message : String(error) });
    return handleApiError(error);
  }
}
