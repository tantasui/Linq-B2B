import { NextResponse } from "next/server";
import { verifyLoginCode } from "@/server/otp";
import { getMerchantByEmail } from "@/server/store";
import { createSessionToken } from "@/server/session";
import { logger } from "@/server/logger";

/**
 * Exchanges a valid sign-in code for a session.
 *
 * The code is checked before the account is looked up, so a wrong code tells
 * the caller nothing about whether the address is registered.
 */
export async function POST(request: Request) {
  let email = "";
  let code = "";
  try {
    const body = (await request.json()) as { email?: string; code?: string };
    email = String(body.email ?? "");
    code = String(body.code ?? "");
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const result = await verifyLoginCode(email, code);
  if (!result.ok) {
    return NextResponse.json({ message: "That code is incorrect or has expired." }, { status: 401 });
  }

  const merchant = await getMerchantByEmail(result.email);
  if (!merchant) {
    // The code was valid, so this address does own the inbox — it just has no
    // merchant account yet. Say so plainly; there is nothing to leak now.
    return NextResponse.json(
      { message: "No merchant account found for this email. Complete setup first.", needsOnboarding: true },
      { status: 404 },
    );
  }

  const token = createSessionToken(merchant);
  if (!token) {
    logger.error("auth.session_secret_missing", {});
    return NextResponse.json({ message: "Sign-in is unavailable right now." }, { status: 503 });
  }

  logger.info("auth.signed_in", { businessId: merchant.id });
  return NextResponse.json({ token, merchant: { id: merchant.id, email: merchant.userEmail } });
}
