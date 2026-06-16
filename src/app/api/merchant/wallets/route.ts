import { handleApiError, ok, fail } from "@/server/http";
import { makeSlug } from "@/server/security";
import { getMerchant, syncWallets } from "@/server/store";
import { merchantWalletSyncSchema } from "@/server/validation";

export async function POST(request: Request) {
  try {
    const input = merchantWalletSyncSchema.parse(await request.json());
    const merchant = await getMerchant(input.businessId);
    if (!merchant) return fail("Merchant not found.", 404);
    const wallets = await syncWallets(
      merchant.id,
      input.wallets.map((wallet) => ({
        id: makeSlug("wallet"),
        businessId: merchant.id,
        chain: wallet.chain,
        network: wallet.network,
        address: wallet.address,
        walletId: wallet.walletId,
        walletType: wallet.walletType,
        tokenSupport: wallet.tokenSupport,
      })),
    );
    return ok({ wallets });
  } catch (error) {
    return handleApiError(error);
  }
}
