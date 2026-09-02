import type { PoolClient } from "pg";
import { getDbPool } from "./db";

// Runs one-off schema changes (CREATE INDEX CONCURRENTLY, which can't run
// inside a transaction, so it can't just live in db/schema.sql) automatically
// on server startup, exactly once, safely across however many instances are
// running.
//
// Safety comes from two things enforced by Postgres itself rather than
// in-process state, so they hold even across restarts and multiple
// instances:
//   - schema_migrations tracks which migration IDs have already been applied.
//   - pg_advisory_lock serializes access: if two instances boot at the same
//     moment, one runs the pending migrations while the other blocks, then
//     wakes up to find them already applied and does nothing.
//
// Mirrors the same approach used in Linq-v2/database/migrations/runner.go.

// Arbitrary constant, just needs to be the same every time so concurrent
// instances contend on the same lock. Distinct from Linq-v2's key (not that
// it matters — advisory locks are per-database — but to avoid any confusion
// reading logs from both services side by side).
const ADVISORY_LOCK_KEY = 8271936115;

type Migration = {
  // id must never change once deployed — it's the tracking-table key that
  // makes a migration "already applied". statements should too, since
  // changing them after the fact won't re-run against databases that
  // already recorded the id.
  id: string;
  statements: string[];
};

// Append-only: add new entries at the bottom for future migrations, never
// edit or remove a past one (see id note above).
const REGISTRY: Migration[] = [
  {
    id: "2026_09_02_business_id_order_id_indexes",
    statements: [
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS payment_links_business_id_idx ON payment_links(business_id)",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS orders_business_id_idx ON orders(business_id)",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS transfer_attempts_order_id_idx ON transfer_attempts(order_id)",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS receipts_order_id_idx ON receipts(order_id)",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS receipts_business_id_idx ON receipts(business_id)",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS wallet_incoming_business_id_idx ON wallet_incoming(business_id)",
    ],
  },
];

// Safe to call on every boot: already-applied migrations are skipped, and
// concurrent callers (other instances) serialize on the advisory lock
// instead of racing. Never throws — a migration failure is logged loudly but
// must not crash the server, since this runs from instrumentation.ts at
// startup, outside any request.
export async function runMigrations(): Promise<void> {
  const pool = getDbPool();
  if (!pool) {
    console.log("[MIGRATIONS] no database configured, skipping");
    return;
  }

  // A single dedicated client: pg_advisory_lock is session-scoped, so the
  // lock/unlock and every statement in between must share one connection,
  // not float across the pool.
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);

    console.log("[MIGRATIONS] waiting for advisory lock...");
    await client.query("SELECT pg_advisory_lock($1)", [ADVISORY_LOCK_KEY]);
    console.log("[MIGRATIONS] advisory lock acquired");

    try {
      for (const migration of REGISTRY) {
        await applyOne(client, migration);
      }
      console.log("[MIGRATIONS] up to date");
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [ADVISORY_LOCK_KEY]);
    }
  } catch (err) {
    console.error("[MIGRATIONS] background migration run failed:", err);
  } finally {
    client.release();
  }
}

async function applyOne(client: PoolClient, migration: Migration) {
  const { rows } = await client.query("SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE id = $1)", [migration.id]);
  if (rows[0]?.exists) {
    console.log(`[MIGRATIONS] ${migration.id} already applied, skipping`);
    return;
  }

  console.log(`[MIGRATIONS] applying ${migration.id}...`);
  for (const [i, statement] of migration.statements.entries()) {
    try {
      // Each statement runs on its own — CREATE INDEX CONCURRENTLY is
      // forbidden inside a transaction block, so these must never be
      // wrapped in BEGIN/COMMIT.
      await client.query(statement);
    } catch (err) {
      throw new Error(`${migration.id} statement ${i + 1}/${migration.statements.length} failed: ${err}`);
    }
  }

  await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [migration.id]);
  console.log(`[MIGRATIONS] ${migration.id} applied`);
}
