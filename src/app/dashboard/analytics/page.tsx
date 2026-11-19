"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ChartFrame } from "@/components/ui/chart-frame";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { NetworkLogo } from "@/components/icons/NetworkLogos";
import { listOrders } from "@/lib/api-client";
import { chainDisplayName } from "@/lib/chains";
import { formatCurrency } from "@/lib/payment-data";
import { cn } from "@/lib/utils";
import type { OrderRecord } from "@/server/types";

/** The brand ramp, so the one multi-series chart still reads as one palette. */
const SERIES = ["#8A4FFF", "#A172FF", "#B995FF", "#D0B9FF", "#E8DCFF"];

const RANGES = [
  { id: "24H", label: "24 hours", days: 1 },
  { id: "7D", label: "7 days", days: 7 },
  { id: "30D", label: "30 days", days: 30 },
];

/** Orders that have reached an end state, one way or the other. */
const FINISHED = ["settled", "fulfilled", "failed", "expired", "refunded", "cancelled"];

/** The chart tooltip, in the dashboard's own surface rather than Recharts' default box. */
function VolumeTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md bg-surface px-3 py-2 text-xs shadow-md ring-1 ring-line">
      <p className="text-text-subtle">{label}</p>
      <p className="tnum mt-0.5 font-medium text-text">{formatCurrency(payload[0].value, "NGN")}</p>
    </div>
  );
}

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

  const finished = inRange.filter((order) => FINISHED.includes(order.status));
  const rangeLabel = RANGES.find((entry) => entry.id === range)?.label ?? range;

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
      finished.length ? `${Math.round((settled.length / finished.length) * 100)}%` : "—",
      // Measured over finished orders: one still waiting on its deposit has
      // not failed to settle, and counting it pulled the rate down.
      "of finished orders settled",
    ],
    ["Average order", settled.length ? formatCurrency(averageOrder, "NGN") : "—", "per settlement"],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="How much you settled, and how your customers pay."
        actions={
          // A segmented control: one rounded track, and the active range rides
          // in it as a filled capsule.
          <fieldset className="flex gap-1 rounded-full bg-surface-2 p-1 ring-1 ring-inset ring-line">
            <legend className="sr-only">Date range</legend>
            {RANGES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                aria-pressed={range === entry.id}
                aria-label={entry.label}
                onClick={() => setRange(entry.id)}
                className={cn(
                  "rounded-full px-4 py-1.5 font-sans font-medium text-xs",
                  "transition-[background-color,color] duration-fast ease-linq",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  range === entry.id ? "bg-text text-bg shadow-sm" : "text-text-muted hover:bg-surface hover:text-text",
                )}
              >
                {entry.id}
              </button>
            ))}
          </fieldset>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value, hint]) => (
          <Card key={label}>
            <p className="text-micro font-medium text-text-subtle">{label}</p>
            {loading ? (
              <Skeleton className="mt-3 h-7 w-24" />
            ) : (
              <p className="tnum u-display mt-3 text-2xl">{value}</p>
            )}
            <p className="mt-2 text-xs text-text-subtle">{hint}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="text-label font-medium text-text">Settled volume</h2>
        <p className="mt-1 text-xs text-text-muted">Naira settled to your account, last {rangeLabel}</p>
        <div className="relative">
        {!loading && settled.length === 0 ? (
          // A flat line at zero reads as a broken chart; say what it means.
          <p className="absolute inset-0 z-10 grid place-items-center text-sm text-text-subtle">
            No settled payments in the last {rangeLabel}
          </p>
        ) : null}
        <ChartFrame className="mt-6 h-56">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={volume} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="volume-fill" x2="0" y2="1">
                  <stop stopColor="hsl(var(--accent))" stopOpacity="0.18" />
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
              <Tooltip
                content={<VolumeTooltip />}
                cursor={{ stroke: "hsl(var(--border-strong))", strokeDasharray: "3 3" }}
              />
              <Area
                dataKey="value"
                type="monotone"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                fill="url(#volume-fill)"
                activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(var(--accent))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <h2 className="text-label font-medium text-text">Networks</h2>
          <p className="mt-1 text-xs text-text-muted">Orders by the chain the payer used</p>
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
                    <span className="tnum shrink-0 font-medium">
                      {entry.value}
                      <span className="ml-1.5 font-normal text-text-subtle">
                        {Math.round((entry.value / Math.max(1, inRange.length)) * 100)}%
                      </span>
                    </span>
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
          <h2 className="text-label font-medium text-text">Order sizes</h2>
          <p className="mt-1 text-xs text-text-muted">How many orders fall in each band</p>
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
                <Bar dataKey="value" fill="hsl(var(--accent))" maxBarSize={44} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </Card>
      </div>
    </div>
  );
}
