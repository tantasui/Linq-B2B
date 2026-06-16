import { fail, handleApiError, ok } from "@/server/http";
import { createAndSendReceipt, getReceiptContext } from "@/server/receipts";
import { sendReceiptSchema } from "@/server/validation";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const input = sendReceiptSchema.parse(await request.json());
    const context = await getReceiptContext(id, input.kind);
    const audience = input.audience ?? (input.kind === "payer_transaction_success" ? "payer" : "merchant");
    const recipientEmail = input.recipientEmail ?? (audience === "payer" ? context.order.payerEmail : context.merchant.businessEmail);
    const receipt = await createAndSendReceipt({
      kind: input.kind,
      audience,
      order: context.order,
      merchant: context.merchant,
      recipientEmail,
    });
    return ok({ receipt });
  } catch (error) {
    if (error instanceof Error && error.message === "Order not found.") return fail(error.message, 404);
    return handleApiError(error);
  }
}
