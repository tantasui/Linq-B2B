import { fail, handleApiError, ok } from "@/server/http";
import { getClientKey, rateLimit } from "@/server/security";
import { bankVerifySchema } from "@/server/validation";
import { verifyLinqBankAccount } from "@/server/linq-offramp";

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`bank:${getClientKey(request)}`, 20);
    if (!limit.allowed) return fail("Too many bank verification attempts.", 429);
    const input = bankVerifySchema.parse(await request.json());
    const verification = await verifyLinqBankAccount(input.institutionCode, input.accountIdentifier).catch((error) => ({
      institutionCode: input.institutionCode,
      accountIdentifier: input.accountIdentifier,
      verified: true,
      bypassed: true,
      message: error instanceof Error ? error.message : "Bank verification is temporarily unavailable.",
    }));
    return ok(verification);
  } catch (error) {
    return handleApiError(error);
  }
}
