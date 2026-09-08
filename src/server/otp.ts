import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { queryDb } from "./db";
import { env, resendEnabled } from "./env";
import { logger } from "./logger";

/**
 * Email one-time codes for merchant sign-in.
 *
 * Replaces the Dynamic-hosted login. The session layer is unchanged — this only
 * changes how a merchant proves they own an email address before one is issued.
 *
 * Codes are stored as SHA-256 hashes, never in plaintext. A login code is a
 * bearer credential for the whole account, and a database dump should not hand
 * someone a working set of them.
 */

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
/** Per-email resend throttle, so the endpoint cannot be used to spam an inbox. */
const RESEND_COOLDOWN_SECONDS = 60;

function hashCode(email: string, code: string) {
  // The email is part of the hash so a code issued for one address can never be
  // replayed against another.
  return createHash("sha256").update(`${email.toLowerCase()}:${code}`).digest("hex");
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Issues a code and emails it.
 *
 * Returns `{ cooldown: true }` when one was sent moments ago, so the caller can
 * respond identically either way — telling an anonymous caller "no code was
 * sent" would reveal whether an address has an account.
 */
export async function requestLoginCode(rawEmail: string) {
  const email = normalizeEmail(rawEmail);

  const recent = await queryDb<{ created_at: Date }>(
    `SELECT created_at FROM login_codes
     WHERE email = $1 AND consumed_at IS NULL
       AND created_at > now() - ($2 || ' seconds')::interval
     ORDER BY created_at DESC LIMIT 1`,
    [email, String(RESEND_COOLDOWN_SECONDS)],
  );
  if (recent?.rowCount) return { cooldown: true as const };

  // Six digits, uniformly distributed. randomInt is cryptographically secure;
  // Math.random is not, and a guessable login code is a takeover.
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  // Any earlier unused code for this address stops working the moment a new one
  // is sent, so a code read over someone's shoulder yesterday is already dead.
  await queryDb(`UPDATE login_codes SET consumed_at = now() WHERE email = $1 AND consumed_at IS NULL`, [email]);

  await queryDb(
    `INSERT INTO login_codes (email, code_hash, expires_at)
     VALUES ($1, $2, now() + ($3 || ' minutes')::interval)`,
    [email, hashCode(email, code), String(CODE_TTL_MINUTES)],
  );

  await sendLoginCodeEmail(email, code);
  return { cooldown: false as const };
}

/**
 * Checks a submitted code.
 *
 * Every failure returns the same `invalid` result. Distinguishing "expired" from
 * "wrong" from "no such code" would let someone probe which addresses have
 * pending logins.
 */
export async function verifyLoginCode(rawEmail: string, rawCode: string) {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.trim();

  const rows = await queryDb<{ id: string; code_hash: string; attempts: number }>(
    `SELECT id, code_hash, attempts FROM login_codes
     WHERE email = $1 AND consumed_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [email],
  );
  const row = rows?.rows?.[0];
  if (!row) return { ok: false as const };

  // Burn the attempt budget before comparing, so a crash mid-verify cannot be
  // used to retry indefinitely.
  if (row.attempts + 1 >= MAX_ATTEMPTS) {
    await queryDb(`UPDATE login_codes SET consumed_at = now(), attempts = attempts + 1 WHERE id = $1`, [row.id]);
  } else {
    await queryDb(`UPDATE login_codes SET attempts = attempts + 1 WHERE id = $1`, [row.id]);
  }

  const expected = Buffer.from(row.code_hash, "utf8");
  const actual = Buffer.from(hashCode(email, code), "utf8");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { ok: false as const };
  }

  // Single use: consumed the moment it works.
  await queryDb(`UPDATE login_codes SET consumed_at = now() WHERE id = $1`, [row.id]);
  return { ok: true as const, email };
}

async function sendLoginCodeEmail(email: string, code: string) {
  if (!resendEnabled) {
    // Local development without a Resend key: log it rather than silently
    // failing, so sign-in still works on a laptop.
    logger.warn("auth.code_not_emailed", { email, code, reason: "RESEND_API_KEY not set" });
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [email],
      subject: `${code} is your Linq sign-in code`,
      html: loginCodeHtml(code),
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    logger.error("auth.code_email_failed", { email, status: response.status, message: body?.message });
    throw new Error("Could not send the sign-in code. Try again shortly.");
  }
}

function loginCodeHtml(code: string) {
  return `
<div style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px">
  <h1 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#09090d">Sign in to Linq</h1>
  <p style="margin:0 0 24px;font-size:14px;line-height:20px;color:#6b7280">
    Enter this code to finish signing in. It expires in ${CODE_TTL_MINUTES} minutes.
  </p>
  <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:700;
              letter-spacing:8px;color:#09090d;background:#f4f4f5;border-radius:10px;
              padding:18px 12px;text-align:center">${code}</div>
  <p style="margin:24px 0 0;font-size:12px;line-height:18px;color:#9ca3af">
    If you didn't try to sign in, you can ignore this email — the code is useless without your inbox.
  </p>
</div>`.trim();
}
