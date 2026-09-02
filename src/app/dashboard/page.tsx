"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowRight, ChevronRight, Eye, EyeOff, Receipt } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ChartFrame } from "@/components/ui/chart-frame";
import { buttonClasses } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BalanceSkeleton, RowSkeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status";
import { NetworkLogo } from "@/components/icons/NetworkLogos";
import { listOrders } from "@/lib/api-client";
import { chainDisplayName } from "@/lib/chains";
import { formatCurrency } from "@/lib/payment-data";
import type { OrderRecord } from "@/server/types";

const IN_FLIGHT = ["initiated", "deposited", "pending", "fulfilling", "validated", "settling"];

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    listOrders()
      .then(({ orders: data }) => setOrders(data))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const settled = orders.filter((order) => order.status === "settled");
  const pending = orders.filter((order) => IN_FLIGHT.includes(order.status));
  const totalNgn = settled.reduce((sum, order) => sum + order.amountNgn, 0);
  const pendingNgn = pending.reduce((sum, order) => sum + order.amountNgn, 0);
  const trend = settled.length
    ? settled.slice(0, 12).reverse().map((order) => ({ value: order.amountNgn }))
    : Array.from({ length: 8 }, () => ({ value: 0 }));

  return (
    <div className="space-y-8">
      {/* Balance: the one figure the page exists to show. */}
      <section>
        <div className="flex items-end justify-between gap-6">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setHidden((value) => !value)}
              className="flex items-center gap-2 text-sm text-text-muted transition-colors duration-fast ease-linq hover:text-text"
            >
              Total settled
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>

            {loading ? (
              <div className="mt-4">
                <BalanceSkeleton />
              </div>
            ) : (
              <>
                <p className="tnum mt-3 text-hero font-semibold sm:text-display">
                  {hidden ? "••••••" : formatCurrency(totalNgn, "NGN")}
                </p>
                <p className="mt-2 text-sm text-text-muted">
                  {settled.length} settled order{settled.length === 1 ? "" : "s"}
                  {pendingNgn > 0 ? (
                    <>
                      {" · "}
                      <span className="text-accent-text">
                        {formatCurrency(pendingNgn, "NGN")} in flight
                      </span>
                    </>
                  ) : null}
                </p>
              </>
            )}
          </div>

          <ChartFrame className="hidden h-16 w-32 shrink-0 sm:block">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="home-trend" x2="0" y2="1">
                    <stop stopColor="hsl(var(--accent))" stopOpacity="0.35" />
                    <stop offset="1" stopColor="hsl(var(--accent))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--accent))"
                  fill="url(#home-trend)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>

        <div className="mt-7">
          <Link
            href="/dashboard/receive"
            className={buttonClasses({ size: "lg", className: "w-full sm:w-auto" })}
          >
            Convert to cash <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Two ways to get paid, given equal weight. */}
      <section className="grid grid-cols-2 gap-3">
        {[
          {
            label: "Receive",
            hint: "Payer picks the amount",
            icon: ArrowDownLeft,
            href: "/dashboard/receive",
          },
          {
            label: "Request",
            hint: "You set the amount",
            icon: Receipt,
            href: "/dashboard/receive?mode=fixed",
          },
        ].map((action) => (
          <Link key={action.label} href={action.href} className="block">
            <Card interactive className="h-full">
              <action.icon className="h-6 w-6 text-accent" />
              <p className="mt-6 text-sm font-medium">{action.label}</p>
              <p className="mt-1 text-xs text-text-muted">{action.hint}</p>
            </Card>
          </Link>
        ))}
      </section>

      <section>
        <SectionHeader
          title="Recent incoming"
          action={
            <Link
              href="/dashboard/transactions"
              className="flex items-center gap-0.5 text-xs text-accent-text transition-opacity duration-fast ease-linq hover:opacity-75"
            >
              All orders <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        />

        {loading ? (
          <RowSkeleton />
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
          <div className="space-y-2.5">
            {orders.slice(0, 5).map((order) => (
              <Card key={order.id} interactive className="flex items-center gap-3.5 py-4">
                <NetworkLogo network={order.network} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{order.payerName}</p>
                  <p className="truncate text-xs text-text-muted">
                    {chainDisplayName(order.network)} ·{" "}
                    {new Date(order.createdAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <p className="tnum text-sm font-medium">+{formatCurrency(order.amountNgn, "NGN")}</p>
                  <StatusPill status={order.status} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
