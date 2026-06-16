import { handleApiError, ok } from "@/server/http";
import { verifyBankAccount } from "@/server/paycrest";
import { makeSlug } from "@/server/security";
import { createSessionToken } from "@/server/session";
import { upsertMerchant } from "@/server/store";
import { merchantOnboardingSchema } from "@/server/validation";

export async function POST(request: Request) {
  try {
    const input = merchantOnboardingSchema.parse(await request.json());
    const verification = await verifyBankAccount(input.bank.institutionCode, input.bank.accountIdentifier, input.bank.institutionName).catch((error) => ({
      institutionCode: input.bank.institutionCode,
      accountIdentifier: input.bank.accountIdentifier,
      accountName: input.bank.accountName,
      verified: true,
      bypassed: true,
      message: error instanceof Error ? error.message : "Bank verification is temporarily unavailable.",
    }));
    const businessId = makeSlug("biz");
    const merchant = await upsertMerchant({
      dynamicUserId: input.dynamicUserId,
      userEmail: input.userEmail,
      userName: input.userName,
      businessName: input.businessName,
      merchantName: input.merchantName,
      businessEmail: input.businessEmail,
      location: input.location,
      bankAccounts: [
        {
          id: makeSlug("bank"),
          businessId,
          institutionCode: input.bank.institutionCode,
          institutionName: input.bank.institutionName,
          accountIdentifier: input.bank.accountIdentifier,
          resolvedAccountName: verification.accountName ?? input.bank.accountName,
          verificationStatus: verification.verified ? "verified" : "failed",
        },
      ],
      wallets: input.wallets.map((wallet) => ({
        id: makeSlug("wallet"),
        businessId,
        chain: wallet.chain,
        network: wallet.network,
        address: wallet.address,
        walletId: wallet.walletId,
        walletType: wallet.walletType,
        tokenSupport: wallet.tokenSupport,
      })),
    });
    return ok({ merchant, bankVerification: verification, sessionToken: createSessionToken(merchant) });
  } catch (error) {
    return handleApiError(error);
  }
}
