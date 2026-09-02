"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Mail, RefreshCcw, RotateCcw, Search } from "lucide-react";
import { apiUrl, getMerchantMe, listOrders, retryTransfer, sendOrderReceipt } from "@/lib/api-client";
import { chainDisplayName } from "@/lib/chains";
import { explorerTxUrl, shortenHash } from "@/lib/explorer";
import { formatCurrency } from "@/lib/payment-data";
import type { MerchantRecord, OrderRecord } from "@/server/types";
import { NetworkLogo } from "@/components/icons/NetworkLogos";
import { Receipt } from "@/components/brand/Receipt";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateCarousel } from "@/components/ui/date-carousel";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { RowSkeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/** States where the Naira leg can be attempted again. */
const RETRYABLE = new Set(["failed", "refunded", "expired", "cancelled"]);

const isoDay = (value: string | Date) =>
  (typeof value === "string" ? new Date(value) : value).toISOString().slice(0, 10);

export default function TransactionsPage() {
  const [query, setQuery] = useState("");
  const [network, setNetwork] = useState("all");
  const [status, setStatus] = useState("all");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [openOrder, setOpenOrder] = useState<OrderRecord | null>(null);
  const [busy, setBusy] = useState(false);
  // Null means "all time" — the scrubber narrows to a day only once used.
  const [day, setDay] = useState<Date | null>(null);
  const { toast } = useToast();

  const refresh = async () => {
    const data = await listOrders();
    setOrders(data.orders);
    // Keep an open receipt in sync with polling rather than freezing a stale copy.
    setOpenOrder((current) =>
      current ? data.orders.find((order) => order.id === current.id) ?? current : current,
    );
  };

  useEffect(() => {
    refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false));
    getMerchantMe()
      .then((data) => setMerchant(data.merchant))
      .catch(() => undefined);
    const timer = window.setInterval(() => refresh().catch(() => undefined), 12000);
    return () => window.clearInterval(timer);
  }, []);

  const networks = useMemo(
    () => Array.from(new Set(orders.map((order) => order.network))),
    [orders],
  );
  const statuses = useMemo(
    () => Array.from(new Set(orders.map((order) => order.status))),
    [orders],
  );

  /** Orders per day, so the scrubber can show where activity actually is. */
  const countsByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const order of orders) {
      const key = isoDay(order.createdAt);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [orders]);

  const filtered = useMemo(
    () =>
      orders.filter((order) => {
        const haystack =
          `${order.id} ${order.payerName} ${order.payerEmail} ${order.token} ${order.network} ${order.paycrestOrderId ?? ""}`.toLowerCase();
        return (
          haystack.includes(query.toLowerCase()) &&
          (network === "all" || order.network === network) &&
          (status === "all" || order.status === status) &&
          (!day || isoDay(order.createdAt) === isoDay(day))
        );
      }),
    [day, network, orders, query, status],
  );

  const settledTotal = orders
    .filter((order) => order.status === "settled")
    .reduce((sum, order) => sum + order.amountNgn, 0);
  const pendingTotal = orders
    .filter((order) => !["settled", "failed", "refunded", "cancelled", "expired"].includes(order.status))
    .reduce((sum, order) => sum + order.amountNgn, 0);

  const retry = async (order: OrderRecord) => {
    setBusy(true);
    try {
      const response = await retryTransfer(order.id);
      toast(response.message ?? "Retry queued");
      await refresh();
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Retry failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const emailReceipt = async (
    order: OrderRecord,
    kind: "payer_transaction_success" | "merchant_fiat_received" | "merchant_payout_failed",
  ) => {
    setBusy(true);
    try {
      await sendOrderReceipt(order.id, {
        kind,
        audience: kind === "payer_transaction_success" ? "payer" : "merchant",
      });
      toast("Receipt queued for delivery");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not send receipt", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-micro uppercase tracking-[0.16em] text-accent-text">Orders</p>
        <h1 className="mt-2 text-hero font-semibold">Payments</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-text-muted">Settled</p>
          <p className="tnum mt-2.5 text-xl font-semibold">{formatCurrency(settledTotal, "NGN")}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted">In flight</p>
          <p className="tnum mt-2.5 text-xl font-semibold text-accent-text">
            {formatCurrency(pendingTotal, "NGN")}
          </p>
        </Card>
      </div>

      {/* Period scrubber — the selected day animates to the centre. */}
      <Card className="px-0 py-3">
        <div className="mb-1 flex items-center justify-between px-5">
          <p className="text-xs text-text-muted">
            {day
              ? day.toLocaleDateString(undefined, { dateStyle: "full" })
              : "All time"}
          </p>
          {day ? (
            <button
              type="button"
              onClick={() => setDay(null)}
              className="text-xs text-accent-text transition-opacity duration-fast ease-linq hover:opacity-75"
            >
              Clear
            </button>
          ) : null}
        </div>
        <DateCarousel value={day ?? new Date()} onChange={setDay} counts={countsByDay} />
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex h-12 flex-1 items-center gap-3 rounded-md bg-surface px-4 text-text-muted ring-1 ring-line focus-within:ring-2 focus-within:ring-accent">
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search payer, order or wallet"
            className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-subtle"
          />
        </label>
        <div className="grid grid-cols-2 gap-3 sm:w-[340px]">
          <Select
            value={network}
            onChange={setNetwork}
            options={[
              { value: "all", label: "All networks" },
              ...networks.map((entry) => ({
                value: entry,
                label: chainDisplayName(entry),
                adornment: <NetworkLogo network={entry} size={20} />,
              })),
            ]}
          />
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All statuses" },
              ...statuses.map((entry) => ({
                value: entry,
                label: entry.charAt(0).toUpperCase() + entry.slice(1),
              })),
            ]}
          />
        </div>
      </div>

      <section>
        {loading ? (
          <RowSkeleton rows={4} />
        ) : filtered.length === 0 ? (
          <Card className="p-0">
            <EmptyState
              title={orders.length ? "Nothing matches those filters" : "No transactions yet"}
              body={
                orders.length
                  ? "Try a different day, network or status."
                  : "Your first settled payment will appear here."
              }
              art={orders.length ? "none" : "coin"}
              action={
                orders.length ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setNetwork("all");
                      setStatus("all");
                      setDay(null);
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Clear filters
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => setOpenOrder(order)}
                className="block w-full text-left"
              >
                <Card interactive className="flex items-center gap-3.5 py-4">
                  <NetworkLogo network={order.network} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{order.payerName}</p>
                    <p className="truncate text-xs text-text-muted">
                      {order.cryptoAmountDue.toFixed(2)} {order.token} ·{" "}
                      {new Date(order.createdAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <p className="tnum text-sm font-medium">{formatCurrency(order.amountNgn, "NGN")}</p>
                    <StatusPill status={order.status} />
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Tapping a row opens its receipt — the same ticket the payer received. */}
      <Sheet
        open={Boolean(openOrder)}
        onClose={() => setOpenOrder(null)}
        title="Transaction"
        className="bg-bg"
      >
        {openOrder ? (
          <>
            <Receipt order={openOrder} merchant={merchant} />

            {/* Only rendered once the payment has been seen on-chain. Before
                that there is no digest, and a dead link would be worse than
                none. */}
            {explorerTxUrl(openOrder.network, openOrder.depositDigest) ? (
              <a
                href={explorerTxUrl(openOrder.network, openOrder.depositDigest)!}
                target="_blank"
                rel="noreferrer"
                className="mt-5 flex items-center justify-between gap-3 rounded-md bg-surface-2 px-3 py-2.5 text-xs transition duration-fast ease-linq hover:bg-surface-3"
              >
                <span className="text-text-muted">Deposit transaction</span>
                <span className="flex items-center gap-1.5 font-medium text-text">
                  <span className="font-mono">{shortenHash(openOrder.depositDigest!)}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                </span>
              </a>
            ) : null}

            <div className="mt-7 grid grid-cols-2 gap-2">
              <a
                href={apiUrl(`/api/orders/${openOrder.id}/receipt.pdf?kind=payer_transaction_success`)}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                <Download className="h-3.5 w-3.5" /> Download PDF
              </a>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => emailReceipt(openOrder, "payer_transaction_success")}
              >
                <Mail className="h-3.5 w-3.5" /> Email payer
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                className="col-span-2"
                onClick={() =>
                  emailReceipt(
                    openOrder,
                    openOrder.status === "settled" ? "merchant_fiat_received" : "merchant_payout_failed",
                  )
                }
              >
                <Mail className="h-3.5 w-3.5" /> Email myself the invoice
              </Button>
              {RETRYABLE.has(openOrder.status) ? (
                <Button
                  className={cn("col-span-2")}
                  loading={busy}
                  onClick={() => retry(openOrder)}
                >
                  <RefreshCcw className="h-4 w-4" /> Retry payout to verified account
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </Sheet>
    </div>
  );
}
