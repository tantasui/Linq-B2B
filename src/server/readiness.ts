import { databaseEnabled, env, liveDynamicEnabled, livePaycrestEnabled, redisEnabled, resendEnabled } from "./env";
import { queryDb } from "./db";

type CheckStatus = "ok" | "missing" | "error";

type ReadinessCheck = {
  status: CheckStatus;
  detail?: string;
};

async function checkDatabase(): Promise<ReadinessCheck> {
  if (!databaseEnabled) return { status: "missing", detail: "DATABASE_URL is not set." };
  try {
    const expectedTables = [
      "users",
      "merchant_businesses",
      "merchant_wallets",
      "bank_accounts",
      "payment_links",
      "orders",
      "order_events",
      "transfer_attempts",
      "receipts",
      "wallet_incoming",
    ];
    const result = await queryDb<{ table_name: string }>(
      `select table_name
       from information_schema.tables
       where table_schema = 'public'
       and table_name = any($1::text[])`,
      [expectedTables],
    );
    const present = new Set(result?.rows.map((row) => row.table_name) ?? []);
    const missing = expectedTables.filter((table) => !present.has(table));
    if (missing.length) return { status: "error", detail: `Missing database tables: ${missing.join(", ")}.` };
    return { status: "ok" };
  } catch (error) {
    return { status: "error", detail: error instanceof Error ? error.message : "Database check failed." };
  }
}

export async function getReadiness() {
  const checks = {
    database: await checkDatabase(),
    paycrest: livePaycrestEnabled ? { status: "ok" as const } : { status: "missing" as const, detail: "PAYCREST_API_KEY is not set." },
    paycrestWebhook: env.PAYCREST_WEBHOOK_SECRET ? { status: "ok" as const } : { status: "missing" as const, detail: "PAYCREST_WEBHOOK_SECRET is not set." },
    dynamic: liveDynamicEnabled ? { status: "ok" as const } : { status: "missing" as const, detail: "NEXT_PUBLIC_DYNAMIC_ENV_ID is not set." },
    dynamicWebhook: env.DYNAMIC_WEBHOOK_SECRET ? { status: "ok" as const } : { status: "missing" as const, detail: "DYNAMIC_WEBHOOK_SECRET is not set." },
    redis: redisEnabled ? { status: "ok" as const } : { status: "missing" as const, detail: "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set." },
    resend: resendEnabled ? { status: "ok" as const } : { status: "missing" as const, detail: "RESEND_API_KEY is not set." },
  };
  const ready = Object.values(checks).every((check) => check.status === "ok");
  return {
    ready,
    service: "linq",
    checkedAt: new Date().toISOString(),
    checks,
  };
}
