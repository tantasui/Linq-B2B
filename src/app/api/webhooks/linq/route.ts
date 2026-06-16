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
    if (!verifyLinqWebhookSignature(raw, signature)) return fail("Invalid webhook signature.", 401);

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

    logger.info("linq.webhook", { event: payload.event, linqOrderId, status });

    const order = linqOrderId ? await getOrder(linqOrderId) : undefined;
    if (order) {
      await updateOrder(order.id, { status, paycrestPayload: payload });
      await addOrderEvent(order.id, "linq", payload.event ?? `order.${status}`, payload);
      const receipts = await notifyForOrderStatus({ ...order, status });
      return ok({ received: true, order: { ...order, status }, receipts });
    }

    await addOrderEvent(undefined, "linq", payload.event ?? `order.${status}`, payload);
    return ok({ received: true });
  } catch (error) {
    return handleApiError(error);
  }
}
