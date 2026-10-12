import { liveLinqEnabled } from "./env";
import { putLinq } from "./linq-offramp";
import { logger } from "./logger";
import {
  linqSyncDone,
  listExternalOrderReports,
  listMerchantDirectory,
  markLinqSyncDone,
  type ExternalOrderReport,
  type MerchantDirectoryEntry,
} from "./store";

/**
 * Tells Linq who our merchants are and about the orders it does not settle.
 *
 * Linq sees this whole app as one business. It learns a merchant exists only
 * from an order sent through its dedicated offramp — so a merchant who signed
 * up and has not been paid yet, or is paid on Stellar (settled by linq-stellar,
 * which never names the merchant), was missing from Linq's admin dashboard, and
 * everyone else's volume there was short by their Stellar orders.
 *
 * Everything here is reporting. None of it is on the path of a payment, so
 * every function swallows its own failure and logs it: Linq being unreachable
 * must never fail a sign-up or an order.
 */

const BATCH = 500;
const STELLAR_BACKFILL = "stellar_orders_backfill_v1";

async function putInBatches<T>(path: string, key: string, items: T[]) {
  for (let i = 0; i < items.length; i += BATCH) {
    await putLinq(path, { [key]: items.slice(i, i + BATCH) });
  }
}

/** A merchant who just signed up, or changed their details. */
export async function reportMerchantToLinq(merchant: { id: string; businessName: string; businessEmail?: string }) {
  if (!liveLinqEnabled) return;
  try {
    const entry: MerchantDirectoryEntry = {
      ref: merchant.id,
      name: merchant.businessName,
      email: merchant.businessEmail ?? "",
      joinedAt: new Date().toISOString(),
    };
    // The directory row carries the real sign-up date; use it when it exists.
    const known = (await listMerchantDirectory()).find((row) => row.ref === merchant.id);
    await putLinq("/linq-b2b/merchants", { merchants: [known ?? entry] });
    logger.info("linq.directory.merchant_reported", { merchantId: merchant.id, name: merchant.businessName });
  } catch (error) {
    logger.warn("linq.directory.merchant_report_failed", {
      merchantId: merchant.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** A Stellar order, when it is created and each time its status moves. */
export async function reportStellarOrderToLinq(orderId: string) {
  if (!liveLinqEnabled) return;
  try {
    const reports = await listExternalOrderReports(orderId);
    if (reports.length === 0) return;
    await putLinq("/linq-b2b/external-orders", { orders: reports });
    logger.info("linq.directory.order_reported", { orderId, status: reports[0].status });
  } catch (error) {
    logger.warn("linq.directory.order_report_failed", {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Sends everything Linq should already know: all merchants, and — once — all
 * existing Stellar orders. Run at boot; safe to run again, since both sides
 * upsert. `force` re-sends the Stellar orders regardless of the marker.
 */
export async function syncDirectoryToLinq(options: { force?: boolean } = {}) {
  if (!liveLinqEnabled) return { merchants: 0, orders: 0, skipped: "Linq API key not configured" };
  const merchants = await listMerchantDirectory();
  await putInBatches("/linq-b2b/merchants", "merchants", merchants);

  let orders: ExternalOrderReport[] = [];
  if (options.force || !(await linqSyncDone(STELLAR_BACKFILL))) {
    orders = await listExternalOrderReports();
    await putInBatches("/linq-b2b/external-orders", "orders", orders);
    await markLinqSyncDone(STELLAR_BACKFILL);
  }
  logger.info("linq.directory.synced", { merchants: merchants.length, stellarOrders: orders.length, forced: Boolean(options.force) });
  return { merchants: merchants.length, orders: orders.length };
}

/** Boot-time sync. Never throws: a failed sync is retried on the next boot. */
export async function syncDirectoryToLinqAtBoot() {
  try {
    await syncDirectoryToLinq();
  } catch (error) {
    logger.warn("linq.directory.sync_failed", { error: error instanceof Error ? error.message : String(error) });
  }
}
