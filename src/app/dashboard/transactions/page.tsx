"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, RotateCcw, Search, X } from "lucide-react";
import { getMerchantMe, listOrders } from "@/lib/api-client";
import { ENABLED_CHAINS, chainDisplayName } from "@/lib/chains";
import { formatCurrency } from "@/lib/payment-data";
import { formatTokenAmount } from "@/lib/money";
import type { MerchantRecord, OrderRecord } from "@/server/types";
import { NetworkLogo } from "@/components/icons/NetworkLogos";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateCarousel } from "@/components/ui/date-carousel";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { RowSkeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status";
import { OrderSheet } from "@/components/dashboard/OrderSheet";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/dashboard/DataTable";
import { cn, localIsoDay } from "@/lib/utils";

/** Status filters a merchant thinks in, each covering the raw states that mean it. */
const GROUPS = [
  { id: "all", label: "All", statuses: [] as string[] },
  { id: "settled", label: "Settled", statuses: ["settled", "fulfilled"] },
  {
    id: "progress",
    label: "In progress",
    statuses: ["initiated", "partially_paid", "awaiting_completion", "deposited", "pending", "fulfilling", "validated", "settling"],
  },
  { id: "failed", label: "Needs attention", statuses: ["failed", "refunding"] },
  { id: "closed", label: "Closed", statuses: ["expired", "cancelled", "refunded"] },
] as const;
type GroupId = (typeof GROUPS)[number]["id"];

const FINAL = ["settled", "failed", "refunded", "cancelled", "expired"];


function toCsv(rows: OrderRecord[]) {
  const header = ["id", "created", "payer", "email", "amount_ngn", "crypto", "token", "network", "rate", "status", "deposit_tx"];
  const cell = (value: unknown) => {
    const text = value == null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    header.join(","),
    ...rows.map((order) =>
      [
        order.id,
        order.createdAt,
        order.payerName,
        order.payerEmail,
        order.amountNgn,
        // The figure the payer was shown, rounded up the same way.
        formatTokenAmount(order.cryptoAmountDue),
        order.token,
        order.network,
        order.quotedRate,
        order.status,
        order.depositDigest ?? "",
      ]
        .map(cell)
        .join(","),
    ),
  ].join("\n");
}

function OrdersPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const query = params.get("q") ?? "";
  const network = params.get("network") ?? "all";
  const group = (GROUPS.some((entry) => entry.id === params.get("status")) ? params.get("status") : "all") as GroupId;
  const day = params.get("day");
  const openId = params.get("order");

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // Typing updates the field at once and the URL a beat later, so history
  // gets one entry per search rather than one per keystroke.
  const [draft, setDraft] = useState(query);
  // True when this page opened the order sheet (and so pushed its history
  // entry). A sheet reached by a link — from the notification bell, say —
  // closes by clearing the parameter instead, so closing never leaves the page.
  const [openedHere, setOpenedHere] = useState(false);

  /** Filters live in the URL, so Back undoes them and a filtered view can be linked to. */
  const update = useCallback(
    (next: Record<string, string | null>, replace = false) => {
      const merged = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value == null || value === "" || value === "all") merged.delete(key);
        else merged.set(key, value);
      }
      const search = merged.toString();
      const url = search ? `${pathname}?${search}` : pathname;
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [params, pathname, router],
  );

  useEffect(() => setDraft(query), [query]);
  useEffect(() => {
    if (draft === query) return;
    const timer = window.setTimeout(() => update({ q: draft }, true), 250);
    return () => window.clearTimeout(timer);
  }, [draft, query, update]);

  const refresh = useCallback(async () => {
    try {
      const data = await listOrders();
      setOrders(data.orders);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    document.title = "Orders · LinqSwitch";
    refresh().finally(() => setLoading(false));
    getMerchantMe()
      .then((data) => setMerchant(data.merchant))
      .catch(() => undefined);
    // Polls while something can still change, and only while the tab is visible.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 12000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  /** Orders per day, so the scrubber can show where activity actually is. */
  const countsByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const order of orders) {
      const key = localIsoDay(order.createdAt);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [orders]);

  const groupStatuses = GROUPS.find((entry) => entry.id === group)?.statuses ?? [];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = orders.filter((order) => {
      const haystack =
        `${order.id} ${order.payerName} ${order.payerEmail} ${order.token} ${order.network} ${order.paycrestOrderId ?? ""} ${order.depositDigest ?? ""}`.toLowerCase();
      return (
        (!needle || haystack.includes(needle)) &&
        (network === "all" || order.network === network) &&
        (group === "all" || (groupStatuses as readonly string[]).includes(order.status)) &&
        (!day || localIsoDay(order.createdAt) === day)
      );
    });
    return rows;
  }, [day, group, groupStatuses, network, orders, query]);

  const openOrder = openId ? orders.find((order) => order.id === openId) ?? null : null;
  const hasFilters = Boolean(query || network !== "all" || group !== "all" || day);

  /**
   * Columns, in the order a merchant decides in: who paid, how much, and
   * whether it arrived. Network and time fall away first on a narrow table,
   * and the payer cell then carries the status and date itself.
   */
  const columns: DataTableColumn<OrderRecord>[] = [
    {
      key: "payer",
      header: "Payer",
      sortValue: (order) => order.payerName.toLowerCase(),
      render: (order, { narrow }) => (
        <span className="flex min-w-0 items-center gap-3">
          <NetworkLogo network={order.network} size={28} />
          <span className="min-w-0">
            <span className="block truncate font-medium text-text">{order.payerName}</span>
            {narrow ? (
              <span className="mt-1 flex items-center gap-2 text-xs text-text-subtle">
                <StatusPill status={order.status} />
                {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            ) : (
              <span className="block truncate text-xs text-text-subtle">{order.payerEmail}</span>
            )}
          </span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: 168,
      narrowHide: true,
      sortValue: (order) => order.status,
      render: (order) => <StatusPill status={order.status} />,
    },
    {
      key: "network",
      header: "Network",
      width: 148,
      narrowHide: true,
      sortValue: (order) => chainDisplayName(order.network),
      render: (order) => <span className="truncate text-text-muted">{chainDisplayName(order.network)}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      numeric: true,
      width: 150,
      sortValue: (order) => order.amountNgn,
      render: (order) => (
        <span className="block">
          <span className="block font-medium text-text">{formatCurrency(order.amountNgn, "NGN")}</span>
          <span className="block text-xs text-text-subtle">
            {formatTokenAmount(order.cryptoAmountDue)} {order.token}
          </span>
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      align: "right",
      width: 120,
      narrowHide: true,
      sortValue: (order) => new Date(order.createdAt).getTime(),
      numeric: true,
      render: (order) => (
        <span className="block text-text-muted">
          <span className="block">{new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
          <span className="block text-xs text-text-subtle">
            {new Date(order.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </span>
      ),
    },
  ];

  const settledTotal = orders.filter((order) => order.status === "settled").reduce((sum, order) => sum + order.amountNgn, 0);
  const pendingTotal = orders.filter((order) => !FINAL.includes(order.status)).reduce((sum, order) => sum + order.amountNgn, 0);
  const groupCount = (id: GroupId) =>
    id === "all"
      ? orders.length
      : orders.filter((order) => (GROUPS.find((entry) => entry.id === id)?.statuses as readonly string[]).includes(order.status)).length;

  const openOrderSheet = (id: string) => {
    setOpenedHere(true);
    update({ order: id });
  };
  const closeOrderSheet = () => {
    if (openedHere) router.back();
    else update({ order: null }, true);
    setOpenedHere(false);
  };

  const exportCsv = (rows: OrderRecord[] = filtered) => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `linqswitch-orders-${localIsoDay(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Every payment through your links, newest first."
        actions={
          <Button variant="secondary" size="sm" onClick={() => exportCsv()} disabled={!filtered.length}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-micro font-medium text-text-subtle">Settled</p>
          <p className="tnum u-display mt-2 text-xl sm:text-2xl">{formatCurrency(settledTotal, "NGN")}</p>
        </Card>
        <Card>
          <p className="text-micro font-medium text-text-subtle">On its way</p>
          <p className="tnum u-display mt-2 text-xl text-accent-text sm:text-2xl">{formatCurrency(pendingTotal, "NGN")}</p>
        </Card>
      </div>

      {/* Period scrubber — the selected day animates to the centre. */}
      <Card className="px-0 py-3">
        <div className="mb-1 flex items-center justify-between px-5">
          <p className="text-micro font-medium text-text-subtle">
            {day ? new Date(`${day}T00:00:00`).toLocaleDateString("en-GB", { dateStyle: "full" }) : "All dates"}
          </p>
          {day ? (
            <button
              type="button"
              onClick={() => update({ day: null })}
              className="text-micro font-medium text-accent-text transition-opacity duration-fast ease-linq hover:opacity-75"
            >
              Show all dates
            </button>
          ) : null}
        </div>
        <DateCarousel
          value={day ? new Date(`${day}T00:00:00`) : new Date()}
          onChange={(next) => update({ day: localIsoDay(next) })}
          counts={countsByDay}
        />
      </Card>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex h-12 w-full items-center gap-3 rounded-full bg-surface px-5 sm:flex-1 text-text-muted ring-1 ring-inset ring-line transition-shadow duration-fast ease-linq focus-within:ring-2 focus-within:ring-accent focus-within:shadow-[0_0_0_4px_hsl(var(--accent)/0.12)]">
            <Search className="h-4 w-4 shrink-0" />
            <span className="sr-only">Search orders</span>
            <input
              type="search"
              enterKeyHint="search"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Payer, email, order or hash"
              className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-subtle [&::-webkit-search-cancel-button]:hidden"
            />
            {draft ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setDraft("")}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-text-subtle hover:bg-surface-2 hover:text-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </label>
          <Select
            className="sm:w-[200px]"
            value={network}
            onChange={(value) => update({ network: value })}
            options={[
              { value: "all", label: "All networks" },
              ...ENABLED_CHAINS.map((chain) => ({
                value: chain.id,
                label: chain.name,
                adornment: <NetworkLogo network={chain.id} size={20} />,
              })),
            ]}
          />
        </div>

        <fieldset className="-mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          <legend className="sr-only">Filter by status</legend>
          {GROUPS.map((entry) => {
            const active = entry.id === group;
            const count = groupCount(entry.id);
            return (
              <button
                key={entry.id}
                type="button"
                aria-pressed={active}
                onClick={() => update({ status: entry.id })}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium",
                  "transition-colors duration-fast ease-linq",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  active ? "bg-text text-bg" : "bg-surface text-text-muted ring-1 ring-inset ring-line hover:text-text",
                )}
              >
                {entry.label}
                <span className={cn("tnum", active ? "text-bg/70" : "text-text-subtle")}>{count}</span>
              </button>
            );
          })}
        </fieldset>
      </div>

      {failed && orders.length === 0 && !loading ? (
        <Card className="p-0">
          <EmptyState
            art="none"
            title="Could not load your orders"
            body="The request did not complete. Check your connection and try again."
            action={
              <Button size="sm" variant="secondary" onClick={() => void refresh()}>
                Try again
              </Button>
            }
          />
        </Card>
      ) : (
        <DataTable<OrderRecord>
          caption="Orders"
          data={filtered}
          columns={columns}
          getRowId={(order) => order.id}
          loading={loading}
          noun={["order", "orders"]}
          selectable={false}
          initialSort={{ key: "date", dir: "desc" }}
          onRowOpen={(order) => openOrderSheet(order.id)}
          isRowOpen={(order) => order.id === openId}
          rowLabel={(order) => `Open payment from ${order.payerName}`}
          empty={
            <EmptyState
              title={orders.length ? "Nothing matches those filters" : "No orders yet"}
              body={
                orders.length
                  ? "Try another day, network or status."
                  : "Share a receive link and the first payment through it lands here."
              }
              art="none"
              action={
                hasFilters ? (
                  <Button size="sm" variant="secondary" onClick={() => update({ q: null, network: null, status: null, day: null })}>
                    <RotateCcw className="h-3.5 w-3.5" /> Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
        />
      )}

      <OrderSheet
        order={openOrder}
        merchant={merchant}
        onClose={closeOrderSheet}
        onChanged={refresh}
      />
    </div>
  );
}

/** Wraps the page for useSearchParams, which Next requires a Suspense boundary around. */
export default function TransactionsPage() {
  return (
    <Suspense fallback={<RowSkeleton rows={5} />}>
      <OrdersPage />
    </Suspense>
  );
}

