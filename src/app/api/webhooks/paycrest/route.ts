import { fail, handleApiError, ok } from "@/server/http";
import { normalizePaycrestStatus } from "@/server/paycrest";
import { notifyForOrderStatus } from "@/server/receipts";
import { verifyPaycrestSignature } from "@/server/security";
import { addOrderEvent, getOrder, updateOrder } from "@/server/store";
import { env } from "@/server/env";
import { logger } from "@/server/logger";

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    const signature =
      request.headers.get("x-paycrest-signature") ??
      request.headers.get("paycrest-signature") ??
      request.headers.get("x-signature");
    if (!verifyPaycrestSignature(raw, signature)) return fail("Invalid webhook signature.", 401);
    const payload = JSON.parse(raw);
    const data = payload.data ?? payload;
    const paycrestOrderId = data.id ?? data.orderId ?? data.order_id;
    const status = normalizePaycrestStatus(data.status ?? payload.event);
    let order = paycrestOrderId
      ? await updateOrder(paycrestOrderId, {
          status,
          paycrestPayload: data,
          providerReceiveAddress: data.providerAccount?.receiveAddress,
        })
      : undefined;
    if (!order && paycrestOrderId && env.BACKEND_API_URL) {
      logger.info("webhook.forwarding", { paycrestOrderId, status, to: env.BACKEND_API_URL });
      await fetch(`${env.BACKEND_API_URL}/api/webhooks/paycrest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-paycrest-signature": signature ?? "" },
        body: raw,
      });
      order = await getOrder(paycrestOrderId);
    }
    await addOrderEvent(order?.id, "linq", payload.event ?? `order.${status}`, payload);
    const receipts = order ? await notifyForOrderStatus(order) : [];
    return ok({ received: true, order, receipts });
  } catch (error) {
    return handleApiError(error);
  }
}
