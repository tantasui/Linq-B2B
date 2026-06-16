import { fail, handleApiError, ok } from "@/server/http";
import { createTransferAttempt, getOrder, updateOrder } from "@/server/store";
import { retryTransferSchema } from "@/server/validation";

interface Params {
  params: Promise<{ id: string }>;
}

const retryable = new Set(["failed", "refunded", "expired", "cancelled"]);

export async function POST(request: Request, { params }: Params) {
  try {
    retryTransferSchema.parse(await request.json().catch(() => ({})));
    const { id } = await params;
    const order = await getOrder(id);
    if (!order) return fail("Order not found.", 404);
    if (!retryable.has(order.status)) {
      const attempt = await createTransferAttempt(order.id, "skipped", { currentStatus: order.status }, "Order is not eligible for retry.");
      return fail("This order is not eligible for transfer retry.", 409, { attempt });
    }
    const attempt = await createTransferAttempt(order.id, "created", {
      bankAccountId: order.bankAccountId,
      message: "Retry queued against the merchant's verified payout account.",
    });
    await updateOrder(order.id, { status: "pending" });
    return ok({ attempt, message: "Transfer retry queued against the verified payout account." });
  } catch (error) {
    return handleApiError(error);
  }
}
