// Next.js calls register() once per server instance at startup. Guarded to
// the Node.js runtime since the migration runner uses the `pg` client,
// which the edge runtime can't run. See src/server/migrations.ts for what
// this actually does and why it's safe to run on every boot.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runMigrations } = await import("./server/migrations");
    // Not awaited: a slow index build must not delay the server from
    // accepting traffic or passing its health check.
    void runMigrations();
  }
}
