# CryptoPay Database on Koyeb

CryptoPay is positioned for a Koyeb-hosted backend with a Koyeb/Postgres database connection string.

## Production Setup

1. Create or attach a Postgres database for the Koyeb service.
2. Set `DATABASE_URL` in Koyeb service environment variables.
3. Keep `DATABASE_SSL=true` unless your Koyeb database explicitly does not require SSL.
4. Set `DATABASE_POOL_MAX` to a small value such as `5` for serverless/container deployments.
5. Run `db/schema.sql` against the database before first production traffic.

## Applying The Schema

Use any Postgres client:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

The app does not use Prisma. The schema is plain SQL and the server uses the `pg` client for direct Postgres access when `DATABASE_URL` is configured.
