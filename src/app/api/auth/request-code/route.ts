import { NextResponse } from "next/server";
import { isValidEmail, requestLoginCode } from "@/server/otp";
import { logger } from "@/server/logger";

/**
 * Sends a sign-in code to an email address.
 *
 * Always answers the same way whether or not an account exists. Anyone can call
 * this without credentials, so a response that distinguished the two would turn
 * it into a way to enumerate which businesses bank with Linq.
 */
export async function POST(request: Request) {
  let email = "";
  try {
    const body = (await request.json()) as { email?: string };
    email = String(body.email ?? "");
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  if (!isValidEmail(email.trim())) {
    return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
  }

  try {
    await requestLoginCode(email);
  } catch (error) {
    logger.error("auth.request_code_failed", { error: String(error) });
    return NextResponse.json(
      { message: "Could not send a code right now. Try again shortly." },
      { status: 503 },
    );
  }

  return NextResponse.json({ sent: true });
}
