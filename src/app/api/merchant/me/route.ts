import { handleApiError, ok } from "@/server/http";
import { getRequestMerchant } from "@/server/request-merchant";
import { createSessionToken } from "@/server/session";
import { listPaymentLinks } from "@/server/store";

export async function GET(request: Request) {
  try {
    const merchant = await getRequestMerchant(request);
    if (!merchant) return ok({ merchant: null, links: [] });
    const links = await listPaymentLinks(merchant.id);
    return ok({ merchant, links, sessionToken: createSessionToken(merchant) });
  } catch (error) {
    return handleApiError(error);
  }
}
