-- SUPERSEDED: this now runs automatically on server startup via
-- src/server/migrations.ts (registry entry
-- "2026_09_02_business_id_order_id_indexes"), invoked from
-- src/instrumentation.ts's register() hook. Applies these exact statements
-- outside a transaction, guarded by a Postgres advisory lock (safe across
-- multiple instances) and a schema_migrations tracking table (safe across
-- restarts — runs at most once, ever). No manual step needed; kept here
-- only as a readable copy of what migrations.ts executes.
--
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction, and orders/
-- receipts/etc. are live tables — a plain CREATE INDEX would take a write
-- lock for the duration of the build. These mirror the indexes declared in
-- db/schema.sql (which stay as plain CREATE INDEX IF NOT EXISTS there, safe
-- for a fresh/empty database on first setup).

CREATE INDEX CONCURRENTLY IF NOT EXISTS payment_links_business_id_idx ON payment_links(business_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS orders_business_id_idx ON orders(business_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS transfer_attempts_order_id_idx ON transfer_attempts(order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS receipts_order_id_idx ON receipts(order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS receipts_business_id_idx ON receipts(business_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS wallet_incoming_business_id_idx ON wallet_incoming(business_id);
