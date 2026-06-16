import { databaseEnabled } from "./env";
import { queryDb } from "./db";
import { makeSlug } from "./security";
import type {
  BankAccountRecord,
  MerchantRecord,
  MerchantWalletRecord,
  OrderEventRecord,
  OrderRecord,
  OrderStatus,
  PaymentLinkRecord,
  ReceiptRecord,
  TransferAttemptRecord,
  WalletIncomingRecord,
} from "./types";

type StoreState = {
  merchants: MerchantRecord[];
  paymentLinks: PaymentLinkRecord[];
  orders: OrderRecord[];
  events: OrderEventRecord[];
  transfers: TransferAttemptRecord[];
  receipts: ReceiptRecord[];
  walletIncoming: WalletIncomingRecord[];
};

// Database rows are mapped immediately into typed domain records below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const now = () => new Date().toISOString();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const globalStore = globalThis as typeof globalThis & { linqStore?: StoreState };

function state() {
  if (!globalStore.linqStore) {
    globalStore.linqStore = {
      merchants: [],
      paymentLinks: [],
      orders: [],
      events: [],
      transfers: [],
      receipts: [],
      walletIncoming: [],
    };
  }
  return globalStore.linqStore;
}

function toIso(value: unknown) {
  if (!value) return now();
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return undefined;
  return Number(value);
}

function tokenSupport(value: unknown): MerchantWalletRecord["tokenSupport"] {
  if (Array.isArray(value)) return value as MerchantWalletRecord["tokenSupport"];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as MerchantWalletRecord["tokenSupport"];
    } catch {
      return ["USDSUI"];
    }
  }
  return ["USDSUI"];
}

function mapBank(row: Row): BankAccountRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    institutionCode: row.institution_code,
    institutionName: row.institution_name ?? undefined,
    accountIdentifier: row.account_identifier,
    resolvedAccountName: row.resolved_account_name ?? undefined,
    verificationStatus: row.verification_status,
  };
}

function mapWallet(row: Row): MerchantWalletRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    chain: row.chain,
    network: row.network,
    address: row.address,
    walletId: row.wallet_id ?? undefined,
    walletType: String(row.wallet_type ?? "EMBEDDED").toUpperCase() as MerchantWalletRecord["walletType"],
    tokenSupport: tokenSupport(row.token_support),
  };
}

function mapMerchant(row: Row, banks: BankAccountRecord[], wallets: MerchantWalletRecord[]): MerchantRecord {
  return {
    id: row.id,
    dynamicUserId: row.dynamic_user_id,
    userEmail: row.user_email,
    userName: row.user_name ?? undefined,
    businessName: row.business_name,
    merchantName: row.merchant_name,
    businessEmail: row.email,
    location: row.location ?? undefined,
    onboardingStatus: row.onboarding_status,
    bankAccounts: banks,
    wallets,
  };
}

function mapPaymentLink(row: Row): PaymentLinkRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    slug: row.slug,
    mode: row.mode,
    amountNgn: toNumber(row.amount_ngn),
    description: row.description ?? undefined,
    status: row.status,
    createdAt: toIso(row.created_at),
  };
}

function mapOrder(row: Row, transferAttempts: TransferAttemptRecord[] = []): OrderRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    paymentLinkId: row.payment_link_id ?? undefined,
    bankAccountId: row.bank_account_id ?? undefined,
    payerName: row.payer_name,
    payerEmail: row.payer_email,
    amountNgn: Number(row.amount_ngn),
    token: row.token,
    network: row.network,
    quotedRate: Number(row.quoted_rate),
    cryptoAmountDue: Number(row.crypto_amount_due),
    senderFee: toNumber(row.sender_fee),
    transactionFee: toNumber(row.transaction_fee),
    paycrestOrderId: row.paycrest_order_id ?? undefined,
    providerReceiveAddress: row.provider_receive_address ?? undefined,
    validUntil: row.valid_until ? toIso(row.valid_until) : undefined,
    status: row.status,
    paycrestPayload: row.paycrest_payload ?? undefined,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    transferAttempts,
  };
}

function mapTransfer(row: Row): TransferAttemptRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    status: row.status,
    attemptNumber: Number(row.attempt_number),
    linqReference: row.paycrest_reference ?? undefined,
    resultPayload: row.result_payload ?? undefined,
    errorMessage: row.error_message ?? undefined,
    createdAt: toIso(row.created_at),
  };
}

async function hydrateMerchant(row: Row | undefined) {
  if (!row) return undefined;
  const banks = await queryDb<Row>("select * from bank_accounts where business_id = $1 order by created_at asc", [row.id]);
  const wallets = await queryDb<Row>("select * from merchant_wallets where business_id = $1 order by created_at asc", [row.id]);
  return mapMerchant(row, banks?.rows.map(mapBank) ?? [], wallets?.rows.map(mapWallet) ?? []);
}

export async function getDefaultMerchant() {
  if (databaseEnabled) {
    const result = await queryDb<Row>(
      `select b.*, u.dynamic_user_id, u.email as user_email, u.name as user_name
       from merchant_businesses b
       join users u on u.id = b.user_id
       order by b.created_at asc
       limit 1`,
    );
    return hydrateMerchant(result?.rows[0]);
  }
  return state().merchants[0];
}

export async function getMerchant(id?: string) {
  if (databaseEnabled) {
    if (!id) return getDefaultMerchant();
    const result = await queryDb<Row>(
      `select b.*, u.dynamic_user_id, u.email as user_email, u.name as user_name
       from merchant_businesses b
       join users u on u.id = b.user_id
       where b.id = $1
       limit 1`,
      [id],
    );
    return hydrateMerchant(result?.rows[0]);
  }
  return id ? state().merchants.find((merchant) => merchant.id === id) : state().merchants[0];
}

export async function getMerchantByDynamicUserId(dynamicUserId?: string) {
  if (!dynamicUserId) return undefined;
  if (databaseEnabled) {
    const result = await queryDb<Row>(
      `select b.*, u.dynamic_user_id, u.email as user_email, u.name as user_name
       from merchant_businesses b
       join users u on u.id = b.user_id
       where u.dynamic_user_id = $1
       limit 1`,
      [dynamicUserId],
    );
    return hydrateMerchant(result?.rows[0]);
  }
  return state().merchants.find((merchant) => merchant.dynamicUserId === dynamicUserId);
}

export async function upsertMerchant(input: Omit<MerchantRecord, "id" | "onboardingStatus" | "bankAccounts" | "wallets"> & {
  bankAccounts: BankAccountRecord[];
  wallets: MerchantWalletRecord[];
}) {
  if (databaseEnabled) {
    const user = await queryDb<Row>(
      `insert into users (dynamic_user_id, email, name, updated_at)
       values ($1, $2, $3, now())
       on conflict (dynamic_user_id) do update set email = excluded.email, name = excluded.name, updated_at = now()
       returning *`,
      [input.dynamicUserId, input.userEmail, input.userName ?? null],
    );
    const userId = user?.rows[0]?.id;
    const onboardingStatus = input.bankAccounts.some((bank) => bank.verificationStatus === "verified")
      ? input.wallets.length
        ? "complete"
        : "bank_verified"
      : "started";
    const business = await queryDb<Row>(
      `insert into merchant_businesses (user_id, business_name, merchant_name, email, location, onboarding_status, updated_at)
       values ($1, $2, $3, $4, $5, $6, now())
       on conflict (user_id) do update set
         business_name = excluded.business_name,
         merchant_name = excluded.merchant_name,
         email = excluded.email,
         location = excluded.location,
         onboarding_status = excluded.onboarding_status,
         updated_at = now()
       returning *`,
      [userId, input.businessName, input.merchantName, input.businessEmail, input.location ?? null, onboardingStatus],
    );
    const businessId = business?.rows[0]?.id;
    for (const bank of input.bankAccounts) {
      await queryDb(
        `insert into bank_accounts (business_id, institution_code, institution_name, account_identifier, resolved_account_name, verification_status, updated_at)
         values ($1, $2, $3, $4, $5, $6, now())
         on conflict (business_id, institution_code, account_identifier) do update set
           institution_name = excluded.institution_name,
           resolved_account_name = excluded.resolved_account_name,
           verification_status = excluded.verification_status,
           updated_at = now()`,
        [businessId, bank.institutionCode, bank.institutionName ?? null, bank.accountIdentifier, bank.resolvedAccountName ?? null, bank.verificationStatus],
      );
    }
    for (const wallet of input.wallets) {
      await queryDb(
        `insert into merchant_wallets (business_id, chain, network, address, wallet_id, wallet_type, token_support, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb, now())
         on conflict (business_id, network, address) do update set
           chain = excluded.chain,
           wallet_id = excluded.wallet_id,
           wallet_type = excluded.wallet_type,
           token_support = excluded.token_support,
           updated_at = now()`,
        [businessId, wallet.chain, wallet.network, wallet.address, wallet.walletId ?? null, wallet.walletType, JSON.stringify(wallet.tokenSupport)],
      );
    }
    const merchant = await getMerchant(businessId);
    if (!merchant) throw new Error("Merchant could not be saved.");
    return merchant;
  }

  const current = state();
  const existing = current.merchants.find((merchant) => merchant.dynamicUserId === input.dynamicUserId);
  const businessId = existing?.id ?? makeSlug("biz");
  const bankAccounts = input.bankAccounts.map((bank) => ({ ...bank, businessId }));
  const wallets = input.wallets.map((wallet) => ({ ...wallet, businessId }));
  const merchant: MerchantRecord = {
    id: businessId,
    dynamicUserId: input.dynamicUserId,
    userEmail: input.userEmail,
    userName: input.userName,
    businessName: input.businessName,
    merchantName: input.merchantName,
    businessEmail: input.businessEmail,
    location: input.location,
    onboardingStatus: bankAccounts.some((bank) => bank.verificationStatus === "verified")
      ? wallets.length
        ? "complete"
        : "bank_verified"
      : "started",
    bankAccounts,
    wallets,
  };
  current.merchants = existing ? current.merchants.map((entry) => (entry.id === existing.id ? merchant : entry)) : [merchant, ...current.merchants];
  return merchant;
}

export async function syncWallets(businessId: string, wallets: MerchantWalletRecord[]) {
  if (databaseEnabled) {
    for (const wallet of wallets) {
      await queryDb(
        `insert into merchant_wallets (business_id, chain, network, address, wallet_id, wallet_type, token_support, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb, now())
         on conflict (business_id, network, address) do update set
           chain = excluded.chain,
           wallet_id = excluded.wallet_id,
           wallet_type = excluded.wallet_type,
           token_support = excluded.token_support,
           updated_at = now()`,
        [businessId, wallet.chain, wallet.network, wallet.address, wallet.walletId ?? null, wallet.walletType, JSON.stringify(wallet.tokenSupport)],
      );
    }
    await queryDb("update merchant_businesses set onboarding_status = 'complete', updated_at = now() where id = $1", [businessId]);
    return (await getMerchant(businessId))?.wallets ?? [];
  }
  const merchant = await getMerchant(businessId);
  if (!merchant) return [];
  merchant.wallets = wallets.map((wallet) => ({ ...wallet, businessId }));
  merchant.onboardingStatus = merchant.bankAccounts.some((bank) => bank.verificationStatus === "verified") ? "complete" : "wallet_synced";
  return merchant.wallets;
}

export async function createPaymentLink(input: Omit<PaymentLinkRecord, "id" | "slug" | "createdAt" | "status">) {
  const slug = makeSlug(input.mode);
  if (databaseEnabled) {
    const result = await queryDb<Row>(
      `insert into payment_links (business_id, slug, mode, amount_ngn, description, status)
       values ($1, $2, $3, $4, $5, 'active')
       returning *`,
      [input.businessId, slug, input.mode, input.amountNgn ?? null, input.description ?? null],
    );
    return mapPaymentLink(result!.rows[0]);
  }
  const created: PaymentLinkRecord = { ...input, id: slug, slug, status: "active", createdAt: now() };
  state().paymentLinks.unshift(created);
  return created;
}

export async function getPaymentLink(idOrSlug: string) {
  if (databaseEnabled) {
    const result = await queryDb<Row>("select * from payment_links where id::text = $1 or slug = $1 limit 1", [idOrSlug]);
    return result?.rows[0] ? mapPaymentLink(result.rows[0]) : undefined;
  }
  return state().paymentLinks.find((link) => link.id === idOrSlug || link.slug === idOrSlug);
}

export async function listPaymentLinks(businessId?: string) {
  if (!businessId) return [];
  if (databaseEnabled) {
    const result = await queryDb<Row>("select * from payment_links where business_id = $1 order by created_at desc", [businessId]);
    return result?.rows.map(mapPaymentLink) ?? [];
  }
  return state().paymentLinks.filter((link) => link.businessId === businessId);
}

export async function createOrder(input: Omit<OrderRecord, "id" | "createdAt" | "updatedAt" | "status"> & { status?: OrderStatus }) {
  if (databaseEnabled) {
    const result = await queryDb<Row>(
      `insert into orders (
        business_id, payment_link_id, bank_account_id, payer_name, payer_email, amount_ngn, token, network,
        quoted_rate, crypto_amount_due, sender_fee, transaction_fee, paycrest_order_id, provider_receive_address,
        valid_until, status, paycrest_payload
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)
       returning *`,
      [
        input.businessId,
        input.paymentLinkId ?? null,
        input.bankAccountId ?? null,
        input.payerName,
        input.payerEmail,
        input.amountNgn,
        input.token,
        input.network,
        input.quotedRate,
        input.cryptoAmountDue,
        input.senderFee ?? null,
        input.transactionFee ?? null,
        input.paycrestOrderId ?? null,
        input.providerReceiveAddress ?? null,
        input.validUntil ?? null,
        input.status ?? "initiated",
        JSON.stringify(input.paycrestPayload ?? null),
      ],
    );
    const created = mapOrder(result!.rows[0]);
    await addOrderEvent(created.id, "app", "order.created", created);
    return created;
  }
  const created: OrderRecord = { ...input, id: `order-${Date.now().toString(36)}`, status: input.status ?? "initiated", createdAt: now(), updatedAt: now() };
  state().orders.unshift(created);
  await addOrderEvent(created.id, "app", "order.created", created);
  return created;
}

export async function listOrders(businessId?: string) {
  if (!businessId) return [];
  if (databaseEnabled) {
    const result = await queryDb<Row>("select * from orders where business_id = $1 order by created_at desc", [businessId]);
    const transfers = await queryDb<Row>("select * from transfer_attempts where order_id = any($1::uuid[]) order by created_at desc", [result?.rows.map((row) => row.id) ?? []]);
    const attempts = transfers?.rows.map(mapTransfer) ?? [];
    return result?.rows.map((row) => mapOrder(row, attempts.filter((attempt) => attempt.orderId === row.id))) ?? [];
  }
  const current = state();
  return current.orders
    .filter((order) => order.businessId === businessId)
    .map((order) => ({ ...order, transferAttempts: current.transfers.filter((attempt) => attempt.orderId === order.id) }));
}

export async function getOrder(id: string) {
  if (databaseEnabled) {
    const result = await queryDb<Row>("select * from orders where id::text = $1 or paycrest_order_id = $1 limit 1", [id]);
    const row = result?.rows[0];
    if (!row) return undefined;
    const transfers = await queryDb<Row>("select * from transfer_attempts where order_id = $1 order by created_at desc", [row.id]);
    return mapOrder(row, transfers?.rows.map(mapTransfer) ?? []);
  }
  const current = state();
  const order = current.orders.find((entry) => entry.id === id || entry.paycrestOrderId === id);
  return order ? { ...order, transferAttempts: current.transfers.filter((attempt) => attempt.orderId === order.id) } : undefined;
}

export async function updateOrder(id: string, patch: Partial<OrderRecord>) {
  if (databaseEnabled) {
    const current = await getOrder(id);
    if (!current) return undefined;
    const merged = { ...current, ...patch };
    const result = await queryDb<Row>(
      `update orders set
        payer_name = $2,
        payer_email = $3,
        amount_ngn = $4,
        token = $5,
        network = $6,
        quoted_rate = $7,
        crypto_amount_due = $8,
        sender_fee = $9,
        transaction_fee = $10,
        paycrest_order_id = $11,
        provider_receive_address = $12,
        valid_until = $13,
        status = $14,
        paycrest_payload = $15::jsonb,
        updated_at = now()
       where id = $1
       returning *`,
      [
        current.id,
        merged.payerName,
        merged.payerEmail,
        merged.amountNgn,
        merged.token,
        merged.network,
        merged.quotedRate,
        merged.cryptoAmountDue,
        merged.senderFee ?? null,
        merged.transactionFee ?? null,
        merged.paycrestOrderId ?? null,
        merged.providerReceiveAddress ?? null,
        merged.validUntil ?? null,
        merged.status,
        JSON.stringify(merged.paycrestPayload ?? null),
      ],
    );
    return mapOrder(result!.rows[0], current.transferAttempts);
  }
  const current = state();
  const index = current.orders.findIndex((order) => order.id === id || order.paycrestOrderId === id);
  if (index === -1) return undefined;
  current.orders[index] = { ...current.orders[index], ...patch, updatedAt: now() };
  return current.orders[index];
}

export async function addOrderEvent(orderId: string | undefined, source: "app" | "linq", eventName: string, rawPayload: unknown) {
  if (databaseEnabled) {
    const result = await queryDb<Row>(
      "insert into order_events (order_id, source, event_name, raw_payload) values ($1, $2, $3, $4::jsonb) returning *",
      [orderId && uuidPattern.test(orderId) ? orderId : null, source, eventName, JSON.stringify(rawPayload)],
    );
    const row = result!.rows[0];
    return { id: row.id, orderId: row.order_id ?? undefined, source: row.source, eventName: row.event_name, rawPayload: row.raw_payload, createdAt: toIso(row.created_at) };
  }
  const event: OrderEventRecord = { id: makeSlug("evt"), orderId, source, eventName, rawPayload, createdAt: now() };
  state().events.unshift(event);
  return event;
}

export async function createTransferAttempt(orderId: string, status: TransferAttemptRecord["status"], resultPayload?: unknown, errorMessage?: string) {
  if (databaseEnabled) {
    const count = await queryDb<Row>("select count(*)::int as count from transfer_attempts where order_id = $1", [orderId]);
    const attemptNumber = Number(count?.rows[0]?.count ?? 0) + 1;
    const result = await queryDb<Row>(
      `insert into transfer_attempts (order_id, status, attempt_number, paycrest_reference, result_payload, error_message)
       values ($1, $2, $3, $4, $5::jsonb, $6)
       returning *`,
      [orderId, status, attemptNumber, makeSlug("retry"), JSON.stringify(resultPayload ?? null), errorMessage ?? null],
    );
    return mapTransfer(result!.rows[0]);
  }
  const current = state();
  const attemptNumber = current.transfers.filter((attempt) => attempt.orderId === orderId).length + 1;
  const attempt: TransferAttemptRecord = { id: makeSlug("transfer"), orderId, status, attemptNumber, linqReference: makeSlug("retry"), resultPayload, errorMessage, createdAt: now() };
  current.transfers.unshift(attempt);
  return attempt;
}

export async function addReceipt(input: Omit<ReceiptRecord, "id" | "createdAt">) {
  if (databaseEnabled) {
    const result = await queryDb<Row>(
      `insert into receipts (order_id, business_id, kind, audience, recipient_email, subject, status, html, pdf_base64, provider_message_id, error_message, metadata)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
       returning *`,
      [input.orderId ?? null, input.businessId, input.kind, input.audience, input.recipientEmail, input.subject, input.status, input.html, input.pdfBase64 ?? null, input.providerMessageId ?? null, input.errorMessage ?? null, JSON.stringify(input.metadata ?? null)],
    );
    const row = result!.rows[0];
    return { ...input, id: row.id, createdAt: toIso(row.created_at) };
  }
  const receipt: ReceiptRecord = { ...input, id: makeSlug("receipt"), createdAt: now() };
  state().receipts.unshift(receipt);
  return receipt;
}

export async function listReceipts(orderId?: string) {
  if (databaseEnabled) {
    const result = await queryDb<Row>("select * from receipts where ($1::text is null or order_id::text = $1) order by created_at desc", [orderId ?? null]);
    return result?.rows.map((row) => ({
      id: row.id,
      orderId: row.order_id ?? undefined,
      businessId: row.business_id,
      kind: row.kind,
      audience: row.audience,
      recipientEmail: row.recipient_email,
      subject: row.subject,
      status: row.status,
      html: row.html,
      pdfBase64: row.pdf_base64 ?? undefined,
      providerMessageId: row.provider_message_id ?? undefined,
      errorMessage: row.error_message ?? undefined,
      metadata: row.metadata ?? undefined,
      createdAt: toIso(row.created_at),
    })) ?? [];
  }
  return state().receipts.filter((receipt) => !orderId || receipt.orderId === orderId);
}

export async function addWalletIncoming(input: Omit<WalletIncomingRecord, "id" | "createdAt">) {
  if (databaseEnabled) {
    const result = await queryDb<Row>(
      `insert into wallet_incoming (business_id, wallet_address, network, token, amount_token, source, reason, transaction_hash, raw_payload)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
       returning *`,
      [input.businessId, input.walletAddress, input.network, input.token, input.amountToken, input.source, input.reason, input.transactionHash ?? null, JSON.stringify(input.rawPayload ?? null)],
    );
    const row = result!.rows[0];
    return { ...input, id: row.id, createdAt: toIso(row.created_at) };
  }
  const incoming: WalletIncomingRecord = { ...input, id: makeSlug("wallet-in"), createdAt: now() };
  state().walletIncoming.unshift(incoming);
  return incoming;
}

export async function listWalletIncoming(businessId: string) {
  if (databaseEnabled) {
    const result = await queryDb<Row>("select * from wallet_incoming where business_id = $1 order by created_at desc", [businessId]);
    return result?.rows.map((row) => ({
      id: row.id,
      businessId: row.business_id,
      walletAddress: row.wallet_address,
      network: row.network,
      token: row.token,
      amountToken: Number(row.amount_token),
      source: row.source,
      reason: row.reason,
      transactionHash: row.transaction_hash ?? undefined,
      rawPayload: row.raw_payload ?? undefined,
      createdAt: toIso(row.created_at),
    })) ?? [];
  }
  return state().walletIncoming.filter((entry) => entry.businessId === businessId);
}

export function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}
