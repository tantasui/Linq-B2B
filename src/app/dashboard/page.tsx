"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowDownLeft, ArrowRight, ChevronRight, Eye, EyeOff, Receipt as ReceiptIcon, ShieldCheck } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ChartFrame } from "@/components/ui/chart-frame";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BalanceSkeleton, RowSkeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status";
import { NetworkLogo } from "@/components/icons/NetworkLogos";
import { CountUp } from "@/components/dashboard/PageHeader";
import { OrderSheet } from "@/components/dashboard/OrderSheet";
import { getMerchantMe, listOrders } from "@/lib/api-client";
import { chainDisplayName } from "@/lib/chains";
import { formatCurrency } from "@/lib/payment-data";
import { cn } from "@/lib/utils";
import type { MerchantRecord, OrderRecord } from "@/server/types";

const IN_FLIGHT = ["initiated", "partially_paid", "awaiting_completion", "deposited", "pending", "fulfilling", "validated", "settling"];
const HIDE_KEY = "linq:hide-balance";

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [openOrder, setOpenOrder] = useState<OrderRecord | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const { orders: data } = await listOrders();
      setOrders(data);
      setOpenOrder((current) => (current ? data.find((entry) => entry.id === current.id) ?? current : current));
    } catch {
      // Before, a failed fetch fell through to "No payments yet" — telling a
      // merchant with sales that they have none.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Home · LinqSwitch";
    void load();
    getMerchantMe()
      .then((data) => setMerchant(data.merchant))
      .catch(() => undefined);
    try {
      setHidden(window.localStorage.getItem(HIDE_KEY) === "1");
    } catch {
      // Storage refused: the balance just shows, which is the default anyway.
    }
  }, [load]);

  const toggleHidden = () =>
    setHidden((value) => {
      try {
        window.localStorage.setItem(HIDE_KEY, value ? "0" : "1");
      } catch {
        // Not worth surfacing; the toggle still works for this visit.
      }
      return !value;
    });

  const settled = orders.filter((order) => order.status === "settled");
  const pending = orders.filter((order) => IN_FLIGHT.includes(order.status));
  const totalNgn = settled.reduce((sum, order) => sum + order.amountNgn, 0);
  const pendingNgn = pending.reduce((sum, order) => sum + order.amountNgn, 0);
  const trend = settled.length
    ? settled.slice(0, 12).reverse().map((order) => ({ value: order.amountNgn }))
    : Array.from({ length: 8 }, () => ({ value: 0 }));
  const unverified = merchant !== null && merchant.onboardingStatus !== "complete";

  return (
    <div className="space-y-8">
      {/* Balance: the one figure the page exists to show. */}
      <section aria-labelledby="balance-label" className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 id="balance-label" className="text-label font-medium text-text-subtle">
              Total settled
            </h1>
            <button
              type="button"
              onClick={toggleHidden}
              aria-label={hidden ? "Show balance" : "Hide balance"}
              aria-pressed={hidden}
              className="grid h-7 w-7 place-items-center rounded-full text-text-subtle transition-colors duration-fast ease-linq hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>

          {loading ? (
            <div className="mt-4">
              <BalanceSkeleton />
            </div>
          ) : (
            <>
              <p className="tnum u-display mt-3 text-hero sm:text-display">
                {hidden ? "₦ ••••••" : <CountUp value={totalNgn} format={(n) => formatCurrency(n, "NGN")} />}
              </p>
              <p className="mt-3 text-label text-text-muted">
                {settled.length} settled order{settled.length === 1 ? "" : "s"}
                {pendingNgn > 0 && !hidden ? (
                  <span className="text-accent-text">, {formatCurrency(pendingNgn, "NGN")} on its way</span>
                ) : null}
              </p>
            </>
          )}
        </div>

        <ChartFrame className="hidden h-16 w-36 shrink-0 sm:block">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="home-trend" x2="0" y2="1">
                  <stop stopColor="hsl(var(--accent))" stopOpacity="0.22" />
                  <stop offset="1" stopColor="hsl(var(--accent))" stopOpacity="0" />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke="hsl(var(--accent))" fill="url(#home-trend)" strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>
      </section>

      {unverified ? (
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3.5 rounded-lg bg-accent-soft px-4 py-3.5 text-sm text-accent-text ring-1 ring-inset ring-accent/15 transition-colors duration-fast ease-linq hover:bg-accent-soft/70"
        >
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="font-medium">Finish verification</span>
            <span className="text-accent-text/80"> to accept payments.</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      ) : null}

      {/* No "N payouts need attention" banner. It counted every order marked
          failed, and an order is also marked failed when creating it fails
          before any money moves, so a run of abandoned checkouts read as
          payouts gone wrong. A real payout failure still reaches the
          merchant by email and under Transactions. */}

      {/* Two ways to get paid, given equal weight. */}
      <section aria-label="Get paid" className="grid grid-cols-2 gap-3">
        {[
          { label: "Receive", hint: "The payer picks the amount", icon: ArrowDownLeft, href: "/dashboard/receive" },
          { label: "Request", hint: "You set the amount", icon: ReceiptIcon, href: "/dashboard/receive?mode=fixed" },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <Card interactive className="flex h-full flex-col">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent-text">
                <action.icon className="h-5 w-5" />
              </span>
              <p className="mt-6 flex items-center gap-1 text-[0.9375rem] font-medium">
                {action.label}
                <ArrowRight className="h-3.5 w-3.5 text-text-subtle transition-transform duration-fast ease-linq group-hover:translate-x-0.5" />
              </p>
              <p className="mt-1 text-xs text-text-muted">{action.hint}</p>
            </Card>
          </Link>
        ))}
      </section>

      <section>
        <SectionHeader
          title="Recent payments"
          action={
            <Link
              href="/dashboard/transactions"
              className="flex items-center gap-0.5 text-micro font-medium text-accent-text transition-opacity duration-fast ease-linq hover:opacity-75"
            >
              All orders <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        />

        {loading ? (
          <RowSkeleton />
        ) : failed ? (
          <Card className="p-0">
            <EmptyState
              art="none"
              title="Could not load your payments"
              body="The request did not complete. Check your connection and try again."
              action={
                <Button size="sm" variant="secondary" onClick={() => void load()}>
                  Try again
                </Button>
              }
            />
          </Card>
        ) : orders.length === 0 ? (
          <Card className="p-0">
            <EmptyState
              title="No payments yet"
              body="Create a receive link and your first settled payment will land here."
              action={
                <Link href="/dashboard/receive" className={buttonClasses({ size: "sm" })}>
                  Create a receive link
                </Link>
              }
            />
          </Card>
        ) : (
          <ul>
            {orders.slice(0, 6).map((order) => (
              <li key={order.id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenOrder(order)}
                  className={cn(
                    "-mx-2 flex w-[calc(100%+1rem)] items-center gap-3.5 rounded-md px-2 py-3.5 text-left",
                    "transition-colors duration-fast ease-linq hover:bg-surface-2",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  )}
                >
                  <NetworkLogo network={order.network} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{order.payerName}</p>
                    <p className="truncate text-micro text-text-subtle">
                      {chainDisplayName(order.network)},{" "}
                      {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <p className="tnum text-sm font-medium">{formatCurrency(order.amountNgn, "NGN")}</p>
                    <StatusPill status={order.status} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <OrderSheet order={openOrder} merchant={merchant} onClose={() => setOpenOrder(null)} onChanged={load} />
    </div>
  );
}
