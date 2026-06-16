import { Pool, type QueryResultRow } from "pg";
import { databaseEnabled, env } from "./env";

const globalForDb = globalThis as typeof globalThis & {
  koyebPgPool?: Pool;
};

export function getDbPool() {
  if (!databaseEnabled) return null;
  if (!globalForDb.koyebPgPool) {
    globalForDb.koyebPgPool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
      max: Number(env.DATABASE_POOL_MAX ?? 5),
    });
  }
  return globalForDb.koyebPgPool;
}

export async function queryDb<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  const pool = getDbPool();
  if (!pool) return null;
  return pool.query<T>(sql, params);
}
