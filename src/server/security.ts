import crypto from "node:crypto";
import { env } from "./env";

const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 45, windowMs = 60_000) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  current.count += 1;
  return { allowed: current.count <= limit, resetAt: current.resetAt };
}

export function getClientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export function verifyPaycrestSignature(rawBody: string, signature: string | null) {
  if (!env.PAYCREST_WEBHOOK_SECRET) return process.env.NODE_ENV !== "production";
  return verifyHmac(rawBody, signature, env.PAYCREST_WEBHOOK_SECRET);
}

export function verifyDynamicSignature(rawBody: string, signature: string | null) {
  if (!env.DYNAMIC_WEBHOOK_SECRET) return process.env.NODE_ENV !== "production";
  return verifyHmac(rawBody, signature, env.DYNAMIC_WEBHOOK_SECRET);
}

export function verifyLinqWebhookSignature(rawBody: string, signature: string | null) {
  if (!env.LINQ_OFFRAMP_WEBHOOK_SECRET) return process.env.NODE_ENV !== "production";
  return verifyHmac(rawBody, signature, env.LINQ_OFFRAMP_WEBHOOK_SECRET);
}

function verifyHmac(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const expected = Buffer.from(digest);
  const received = Buffer.from(signature.replace(/^sha256=/, ""));
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

export function makeSlug(prefix: string) {
  return `${prefix}-${crypto.randomBytes(5).toString("hex")}`;
}
