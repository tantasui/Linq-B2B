-- CryptoPay Koyeb/Postgres schema.
-- Run this against the Koyeb Postgres database referenced by DATABASE_URL.

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  dynamic_user_id text not null unique,
  email text not null,
  name text,
  role text not null default 'merchant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists merchant_businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  business_name text not null,
  merchant_name text not null,
  email text not null,
  location text,
  onboarding_status text not null default 'started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists merchant_wallets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references merchant_businesses(id) on delete cascade,
  chain text not null,
  network text not null,
  address text not null,
  wallet_id text,
  wallet_type text not null default 'embedded',
  token_support jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, network, address)
);

create table if not exists bank_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references merchant_businesses(id) on delete cascade,
  institution_code text not null,
  institution_name text,
  account_identifier text not null,
  resolved_account_name text,
  verification_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, institution_code, account_identifier)
);

create table if not exists payment_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references merchant_businesses(id) on delete cascade,
  slug text not null unique,
  mode text not null,
  amount_ngn numeric(18, 2),
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references merchant_businesses(id) on delete cascade,
  payment_link_id uuid references payment_links(id) on delete set null,
  bank_account_id uuid references bank_accounts(id) on delete set null,
  payer_name text not null,
  payer_email text not null,
  amount_ngn numeric(18, 2) not null,
  token text not null,
  network text not null,
  quoted_rate numeric(18, 8) not null,
  crypto_amount_due numeric(18, 8) not null,
  sender_fee numeric(18, 8),
  transaction_fee numeric(18, 8),
  paycrest_order_id text unique,
  provider_receive_address text,
  valid_until timestamptz,
  status text not null default 'initiated',
  paycrest_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete set null,
  source text not null,
  event_name text not null,
  raw_payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists order_events_event_name_idx on order_events(event_name);

create table if not exists transfer_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null default 'requested',
  attempt_number integer not null,
  paycrest_reference text,
  result_payload jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete set null,
  business_id uuid not null references merchant_businesses(id) on delete cascade,
  kind text not null,
  audience text not null,
  recipient_email text not null,
  subject text not null,
  status text not null default 'created',
  html text not null,
  pdf_base64 text,
  provider_message_id text,
  error_message text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists wallet_incoming (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references merchant_businesses(id) on delete cascade,
  wallet_address text not null,
  network text not null,
  token text not null,
  amount_token numeric(18, 8) not null,
  source text not null,
  reason text not null default 'unknown',
  transaction_hash text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);
