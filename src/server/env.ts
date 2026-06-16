import { z } from "zod";

const emptyToUndefined = (value: unknown) => value === "" ? undefined : value;
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const defaultedUrl = (fallback: string) => z.preprocess(emptyToUndefined, z.string().url().default(fallback));
const defaultedEmailFrom = z.preprocess(emptyToUndefined, z.string().default("Linq <noreply@uselinq.site>"));
const databaseSsl = z.preprocess(emptyToUndefined, z.enum(["true", "false"]).default("true"));
const poolMax = z.preprocess(emptyToUndefined, z.string().regex(/^\d+$/).default("5"));

const rawEnv = z.object({
  DATABASE_URL: optionalString,
  DATABASE_SSL: databaseSsl,
  DATABASE_POOL_MAX: poolMax,
  PAYCREST_API_KEY: optionalString,
  PAYCREST_API_URL: defaultedUrl("https://api.paycrest.io/v2"),
  PAYCREST_WEBHOOK_SECRET: optionalString,
  LINQ_OFFRAMP_API_KEY: optionalString,
  LINQ_OFFRAMP_API_URL: defaultedUrl("https://confidential-brianna-uselinq-52e2b233.koyeb.app"),
  LINQ_OFFRAMP_WEBHOOK_SECRET: optionalString,
  NEXT_PUBLIC_DYNAMIC_ENV_ID: optionalString,
  DYNAMIC_API_TOKEN: optionalString,
  DYNAMIC_WEBHOOK_SECRET: optionalString,
  LINQ_SESSION_SECRET: optionalString,
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: defaultedEmailFrom,
  UPSTASH_REDIS_REST_URL: optionalString,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  REDIS_URL: optionalString,
  NEXT_PUBLIC_APP_URL: optionalString,
  BACKEND_API_URL: optionalString,
});

export const env = rawEnv.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_SSL: process.env.DATABASE_SSL,
  DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX,
  PAYCREST_API_KEY: process.env.PAYCREST_API_KEY,
  PAYCREST_API_URL: process.env.PAYCREST_API_URL,
  PAYCREST_WEBHOOK_SECRET: process.env.PAYCREST_WEBHOOK_SECRET,
  LINQ_OFFRAMP_API_KEY: process.env.LINQ_OFFRAMP_API_KEY,
  LINQ_OFFRAMP_API_URL: process.env.LINQ_OFFRAMP_API_URL,
  LINQ_OFFRAMP_WEBHOOK_SECRET: process.env.LINQ_OFFRAMP_WEBHOOK_SECRET,
  NEXT_PUBLIC_DYNAMIC_ENV_ID: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID,
  DYNAMIC_API_TOKEN: process.env.DYNAMIC_API_TOKEN,
  DYNAMIC_WEBHOOK_SECRET: process.env.DYNAMIC_WEBHOOK_SECRET,
  LINQ_SESSION_SECRET: process.env.LINQ_SESSION_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  REDIS_URL: process.env.REDIS_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  BACKEND_API_URL: process.env.BACKEND_API_URL,
});

export const livePaycrestEnabled = Boolean(env.PAYCREST_API_KEY);
export const liveLinqEnabled = Boolean(env.LINQ_OFFRAMP_API_KEY);
export const liveDynamicEnabled = Boolean(env.NEXT_PUBLIC_DYNAMIC_ENV_ID);
export const databaseEnabled = Boolean(env.DATABASE_URL);
export const redisEnabled = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
export const resendEnabled = Boolean(env.RESEND_API_KEY);
