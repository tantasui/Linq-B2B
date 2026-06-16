import { fail, handleApiError, ok } from "@/server/http";
import { getMerchant, getPaymentLink } from "@/server/store";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const link = await getPaymentLink(id);
    if (!link) return fail("Payment link not found.", 404);
    const merchant = await getMerchant(link.businessId);
    if (!merchant) return fail("Merchant for this payment link was not found.", 404);
    return ok({ link, merchant });
  } catch (error) {
    return handleApiError(error);
  }
}
