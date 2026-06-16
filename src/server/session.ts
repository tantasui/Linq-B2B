import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";
import type { MerchantRecord } from "./types";

type SessionPayload = {
  businessId: string;
  dynamicUserId: string;
  email: string;
  exp: number;
};

const encoder = new TextEncoder();

function sessionSecret() {
  return env.LINQ_SESSION_SECRET ?? env.DYNAMIC_WEBHOOK_SECRET ?? env.PAYCREST_WEBHOOK_SECRET ?? env.PAYCREST_API_KEY;
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSessionToken(merchant: MerchantRecord) {
  const secret = sessionSecret();
  if (!secret) return undefined;
  const payload: SessionPayload = {
    businessId: merchant.id,
    dynamicUserId: merchant.dynamicUserId,
    email: merchant.userEmail,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90,
  };
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const unsigned = `${header}.${body}`;
  return `${unsigned}.${sign(unsigned, secret)}`;
}

export function readSessionToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}

export function verifySessionToken(token: string | undefined) {
  const secret = sessionSecret();
  if (!secret || !token) return undefined;
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return undefined;
  const unsigned = `${header}.${body}`;
  const expected = sign(unsigned, secret);
  const actualBytes = encoder.encode(signature);
  const expectedBytes = encoder.encode(expected);
  if (actualBytes.byteLength !== expectedBytes.byteLength || !timingSafeEqual(actualBytes, expectedBytes)) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.businessId || !payload.dynamicUserId || payload.exp < Math.floor(Date.now() / 1000)) return undefined;
    return payload;
  } catch {
    return undefined;
  }
}
