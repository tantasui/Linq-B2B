import { getDefaultMerchant, getMerchant, getMerchantByDynamicUserId } from "./store";
import { readSessionToken, verifySessionToken } from "./session";

export async function getRequestMerchant(request: Request) {
  const session = verifySessionToken(readSessionToken(request));
  if (session?.businessId) {
    const merchant = await getMerchant(session.businessId);
    if (merchant && merchant.dynamicUserId === session.dynamicUserId) return merchant;
  }

  const businessId = request.headers.get("x-linq-business-id")?.trim();
  if (businessId) {
    const merchant = await getMerchant(businessId);
    if (merchant) return merchant;
  }

  const dynamicUserId = request.headers.get("x-linq-dynamic-user-id")?.trim();
  if (dynamicUserId) {
    const merchant = await getMerchantByDynamicUserId(dynamicUserId);
    if (merchant) return merchant;
  }

  return undefined;
}
