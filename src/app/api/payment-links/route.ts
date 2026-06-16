import { fail, handleApiError, ok } from "@/server/http";
import { getRequestMerchant } from "@/server/request-merchant";
import { listPaymentLinks, createPaymentLink } from "@/server/store";
import { paymentLinkSchema } from "@/server/validation";

export async function GET(request: Request) {
  try {
    const merchant = await getRequestMerchant(request);
    if (!merchant) return ok({ links: [] });
    const links = await listPaymentLinks(merchant.id);
    return ok({ links });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = paymentLinkSchema.parse(await request.json());
    const merchant = await getRequestMerchant(request);
    if (!merchant && !input.businessId) return fail("Finish merchant onboarding before creating payment links.", 409);
    const link = await createPaymentLink({
      businessId: input.businessId ?? merchant!.id,
      mode: input.mode,
      amountNgn: input.amountNgn,
      description: input.description,
    });
    return ok({ link }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
