// Proves two things about src/server/migrations.ts against a REAL Postgres
// (a toy-sized table would make the planner pick a Seq Scan either way,
// proving nothing) — but never against production. Gated behind an env var,
// does nothing unless you opt in:
//
//   winget install PostgreSQL.PostgreSQL.17   (or any local/throwaway Postgres)
//   MIGRATIONS_TEST_DSN='postgres://postgres:<pw>@localhost:5432/postgres?sslmode=disable' \
//     node scripts/migrations-smoketest.ts
//
// Runs in its own throwaway schema (dropped at the end), so it can't collide
// with real data even if pointed at a shared test database.
//
// Checks:
//   1. Not a single row is added/removed/changed by runMigrations() (checksum
//      before/after on 50k seeded rows).
//   2. The query planner actually switches from Seq Scan to Index Scan once
//      the migration's indexes exist — the concrete mechanism behind "less
//      database compute per query", not just a claim.
//   3. Running it twice is a clean no-op (safe to run on every boot).

import { Client } from "pg";

const DSN = process.env.MIGRATIONS_TEST_DSN;
if (!DSN) {
  console.log("MIGRATIONS_TEST_DSN not set — skipping migrations smoke test (this is not a failure)");
  process.exit(0);
}

const SEED_ROW_COUNT = 50_000;
const SEED_BUSINESS_ID_COUNT = 5_000; // ~10 rows/business_id: selective enough that the planner prefers an index once one exists.
const SCHEMA = "migrations_smoketest";

let failures = 0;
function assertTrue(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

async function seed(client: Client) {
  // The real migration's 6 statements run in order across 5 tables, and
  // applyOne() aborts the whole migration on the first failing statement —
  // so every table it touches needs to exist here, or the ones after a
  // missing table would never even be attempted. orders gets the real
  // 50k-row treatment (that's what the plan-comparison below uses); the
  // other four just need to exist so their CREATE INDEX succeeds.
  await client.query(`
    CREATE TABLE orders (
      id text PRIMARY KEY,
      business_id uuid NOT NULL,
      order_id uuid
    )`);
  await client.query(`CREATE TABLE payment_links (id text PRIMARY KEY, business_id uuid NOT NULL)`);
  await client.query(`CREATE TABLE transfer_attempts (id text PRIMARY KEY, order_id uuid NOT NULL)`);
  await client.query(`CREATE TABLE receipts (id text PRIMARY KEY, order_id uuid, business_id uuid NOT NULL)`);
  await client.query(`CREATE TABLE wallet_incoming (id text PRIMARY KEY, business_id uuid NOT NULL)`);

  await client.query(
    `INSERT INTO orders (id, business_id, order_id)
     SELECT 'order-' || gs,
            (ARRAY(SELECT gen_random_uuid() FROM generate_series(1, $1)))[(gs % $1) + 1],
            gen_random_uuid()
     FROM generate_series(1, $2) gs`,
    [SEED_BUSINESS_ID_COUNT, SEED_ROW_COUNT],
  );
}

async function checksum(client: Client): Promise<string> {
  const { rows } = await client.query(
    `SELECT md5(COALESCE(string_agg(id || ':' || business_id || ':' || order_id, ',' ORDER BY id), '')) AS sum FROM orders`,
  );
  return rows[0].sum;
}

async function explainByBusinessId(client: Client, businessId: string): Promise<string> {
  const { rows } = await client.query(`EXPLAIN SELECT * FROM orders WHERE business_id = $1`, [businessId]);
  return rows.map((r) => r["QUERY PLAN"]).join("\n");
}

async function main() {
  const admin = new Client({ connectionString: DSN });
  await admin.connect();
  await admin.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
  await admin.query(`CREATE SCHEMA ${SCHEMA}`);
  await admin.end();

  const sep = DSN!.includes("?") ? "&" : "?";
  const scopedDsn = `${DSN}${sep}options=-c search_path=${SCHEMA}`;

  const client = new Client({ connectionString: scopedDsn });
  await client.connect();
  await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto"); // gen_random_uuid()

  try {
    await seed(client);

    // --- 1. does it touch data? ---
    const before = await checksum(client);
    const countBeforeRes = await client.query("SELECT count(*)::int AS c FROM orders");
    const countBefore = countBeforeRes.rows[0].c;

    // --- 2. does the plan actually change? (baseline, before indexes exist) ---
    const anyBusinessIdRes = await client.query("SELECT business_id FROM orders LIMIT 1");
    const sampleBusinessId = anyBusinessIdRes.rows[0].business_id;
    const planBefore = await explainByBusinessId(client, sampleBusinessId);
    assertTrue(planBefore.includes("Seq Scan"), "baseline plan (no index yet) uses a Seq Scan");
    assertTrue(!planBefore.includes("Index Scan"), "baseline plan does not use an Index Scan");

    // Run the real migration module against this throwaway database/schema.
    process.env.DATABASE_URL = scopedDsn;
    process.env.DATABASE_SSL = "false";
    process.env.DATABASE_POOL_MAX = "2";
    const { runMigrations } = await import("../src/server/migrations");
    await runMigrations();
    // migrations.ts uses its own pool via getDbPool() — separate connection
    // from `client`, so no interference with the assertions below.

    const after = await checksum(client);
    const countAfterRes = await client.query("SELECT count(*)::int AS c FROM orders");
    const countAfter = countAfterRes.rows[0].c;
    assertTrue(countBefore === SEED_ROW_COUNT, `seeded exactly ${SEED_ROW_COUNT} rows`);
    assertTrue(countBefore === countAfter, `row count unchanged (before=${countBefore} after=${countAfter})`);
    assertTrue(before === after, "data checksum unchanged (byte-for-byte, no row added/removed/modified)");

    const idxRes = await client.query(
      `SELECT count(*)::int AS c FROM pg_indexes WHERE schemaname = $1 AND tablename = 'orders' AND indexname = 'orders_business_id_idx'`,
      [SCHEMA],
    );
    assertTrue(idxRes.rows[0].c === 1, "orders_business_id_idx exists after runMigrations()");

    await client.query("ANALYZE orders");
    const planAfter = await explainByBusinessId(client, sampleBusinessId);
    assertTrue(planAfter.includes("Index Scan"), "plan after migration uses an Index Scan");
    assertTrue(!planAfter.includes("Seq Scan"), "plan after migration no longer uses a Seq Scan");
    console.log(`\nquery plan for WHERE business_id = ... on ${SEED_ROW_COUNT} rows:\nBEFORE:\n${planBefore}\nAFTER:\n${planAfter}\n`);

    // --- 3. idempotency: safe to run again (e.g. a second instance booting) ---
    await runMigrations();
    const afterSecondRun = await checksum(client);
    assertTrue(after === afterSecondRun, "running the migration twice is a clean no-op");

    const appliedRes = await client.query(
      "SELECT count(*)::int AS c FROM schema_migrations WHERE id = $1",
      ["2026_09_02_business_id_order_id_indexes"],
    );
    assertTrue(appliedRes.rows[0].c === 1, "exactly one schema_migrations row after two runs");
  } finally {
    await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await client.end();
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nall checks passed");
}

main().catch((err) => {
  console.error("smoke test crashed:", err);
  process.exit(1);
});
