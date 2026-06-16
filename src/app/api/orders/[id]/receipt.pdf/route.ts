import { fail, handleApiError } from "@/server/http";
import { getReceiptContext, renderReceiptPdf } from "@/server/receipts";
import { receiptKindSchema } from "@/server/validation";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const kind = receiptKindSchema.parse(searchParams.get("kind") ?? "payer_transaction_success");
    const context = await getReceiptContext(id, kind);
    const pdf = renderReceiptPdf(context);
    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="linq-${id}-${kind}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Order not found.") return fail(error.message, 404);
    return handleApiError(error);
  }
}
