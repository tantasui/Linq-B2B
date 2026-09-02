"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis } from "recharts";
import { ChartFrame } from "@/components/ui/chart-frame";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { NetworkLogo } from "@/components/icons/NetworkLogos";
import { listOrders } from "@/lib/api-client";
import { chainDisplayName } from "@/lib/chains";
import { formatCurrency } from "@/lib/payment-data";
import { cn } from "@/lib/utils";
import type { OrderRecord } from "@/server/types";

/** The brand ramp, so the one multi-series chart still reads as one palette. */
const SERIES = ["#8A4FFF", "#A172FF", "#B995FF", "#D0B9FF", "#E8DCFF"];

const RANGES = [
  { id: "24H", days: 1 },
  { id: "7D", days: 7 },
  { id: "30D", days: 30 },
];

const SETTLED = ["settled", "fulfilled"];

export default function AnalyticsPage() {
  const [range, setRange] = useState("7D");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listOrders()
      .then(({ orders: data }) => setOrders(data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const days = RANGES.find((entry) => entry.id === range)?.days ?? 7;

  // Everything below is scoped to the selected range, so the range control
  // actually changes the numbers rather than only the chart.
  const inRange = useMemo(() => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return orders.filter((order) => new Date(order.createdAt).getTime() >= cutoff);
  }, [days, orders]);

  const settled = inRange.filter((order) => SETTLED.includes(order.status));
  const totalNgn = settled.reduce((sum, order) => sum + order.amountNgn, 0);
  const averageOrder = settled.length ? totalNgn / settled.length : 0;

  /** One bucket per day (or per 4 hours for the 24H view). */
  const volume = useMemo(() => {
    if (days === 1) {
      const buckets = ["00", "04", "08", "12", "16", "20"].map((hour) => ({ label: hour, value: 0 }));
      for (const order of settled) {
        const index = Math.min(Math.floor(new Date(order.createdAt).getHours() / 4), buckets.length - 1);
        buckets[index].value += order.amountNgn;
      }
      return buckets;
    }
    const buckets = Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - index));
      return {
        label: date.toLocaleDateString(undefined, { day: "numeric", month: days > 7 ? undefined : "short" }),
        key: date.toISOString().slice(0, 10),
        value: 0,
      };
    });
    for (const order of settled) {
      const key = new Date(order.createdAt).toISOString().slice(0, 10);
      const bucket = buckets.find((entry) => entry.key === key);
      if (bucket) bucket.value += order.amountNgn;
    }
    return buckets;
  }, [days, settled]);

  const routes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of inRange) counts.set(order.network, (counts.get(order.network) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value], index) => ({ name, value, fill: SERIES[index] ?? SERIES[4] }));
  }, [inRange]);

  const stats = [
    ["Settled volume", formatCurrency(totalNgn, "NGN"), `${settled.length} order${settled.length === 1 ? "" : "s"}`],
    ["Orders", String(inRange.length), "created"],
    [
      "Settlement rate",
      inRange.length ? `${Math.round((settled.length / inRange.length) * 100)}%` : "—",
      "of orders settled",
    ],
    ["Average order", settled.length ? formatCurrency(averageOrder, "NGN") : "—", "per settlement"],
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-micro uppercase tracking-[0.16em] text-accent-text">Analytics</p>
          <h1 className="mt-2 text-hero font-semibold">Performance</h1>
        </div>
        <div className="flex rounded-full bg-surface-2 p-1">
          {RANGES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setRange(entry.id)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-medium",
                "transition duration-fast ease-linq active:scale-[0.97]",
                range === entry.id
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-muted hover:text-text",
              )}
            >
              {entry.id}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value, hint]) => (
          <Card key={label}>
            <p className="text-xs text-text-muted">{label}</p>
            {loading ? (
              <Skeleton className="mt-3 h-6 w-24" />
            ) : (
              <p className="tnum mt-2.5 text-xl font-semibold">{value}</p>
            )}
            <p className="mt-1.5 text-micro text-text-subtle">{hint}</p>
          </Card>
        ))}
      </div>

      <Card>
        <p className="text-sm font-medium">Settlement volume</p>
        <p className="mt-1 text-xs text-text-muted">Naira received · {range}</p>
        <ChartFrame className="mt-6 h-56">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={volume} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="volume-fill" x2="0" y2="1">
                  <stop stopColor="hsl(var(--accent))" stopOpacity="0.4" />
                  <stop offset="1" stopColor="hsl(var(--accent))" stopOpacity="0" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--text-subtle))", fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <Area
                dataKey="value"
                type="monotone"
                stroke="hsl(var(--accent))"
                strokeWidth={2.5}
                fill="url(#volume-fill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <p className="text-sm font-medium">Network mix</p>
          {routes.length ? (
            <div className="mt-2 flex items-center gap-4">
              <ChartFrame className="h-40 w-[45%]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie data={routes} dataKey="value" innerRadius={44} outerRadius={64} paddingAngle={3} strokeWidth={0}>
                      {routes.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartFrame>
              <div className="flex-1 space-y-3">
                {routes.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-2 text-text-muted">
                      <NetworkLogo network={entry.name} size={18} />
                      <span className="truncate">{chainDisplayName(entry.name)}</span>
                    </span>
                    <span className="tnum shrink-0 font-medium">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title="No network data yet"
              body="Once payments arrive, you'll see which chains your customers prefer."
              art="none"
            />
          )}
        </Card>

        <Card>
          <p className="text-sm font-medium">Order value distribution</p>
          <p className="mt-1 text-xs text-text-muted">Count by band</p>
          <ChartFrame className="mt-6 h-40">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={[
                  ["< ₦50k", 0, 50_000],
                  ["₦50k–200k", 50_000, 200_000],
                  ["₦200k–1m", 200_000, 1_000_000],
                  ["> ₦1m", 1_000_000, Number.POSITIVE_INFINITY],
                ].map(([label, low, high]) => ({
                  label,
                  value: inRange.filter(
                    (order) => order.amountNgn >= (low as number) && order.amountNgn < (high as number),
                  ).length,
                }))}
                margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
              >
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--text-subtle))", fontSize: 10 }}
                />
                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </Card>
      </div>
    </div>
  );
}
