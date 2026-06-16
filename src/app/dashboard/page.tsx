"use client";

import Link from "next/link";
import { ArrowDownLeft, ChevronRight, Eye, Receipt, WalletMinimal } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { ChartFrame } from "@/components/ui/chart-frame";
import { listOrders } from "@/lib/api-client";
import type { OrderRecord } from "@/server/types";
import { cn } from "@/lib/utils";

const emptyTrend = Array.from({ length: 8 }, () => ({ value: 0 }));

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const totalNgn = orders.reduce((sum, order) => sum + order.amountNgn, 0);
  const trend = orders.length ? orders.slice(0, 8).reverse().map((order) => ({ value: order.amountNgn })) : emptyTrend;

  useEffect(() => {
    listOrders().then(({ orders }) => setOrders(orders)).catch(() => undefined);
  }, []);

  return (
    <div className="space-y-7">
      <section>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm text-zinc-400">Total volume <Eye className="h-4 w-4" /></p>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-[38px] font-semibold tracking-[-0.06em]">{new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(totalNgn)}</p>
            <p className="mt-1 text-sm text-zinc-500">{orders.length} live order{orders.length === 1 ? "" : "s"}</p>
          </div>
          <ChartFrame className="h-16 w-28">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={trend}>
                <Area type="monotone" dataKey="value" stroke="#8A4FFF" fill="#8A4FFF" fillOpacity={0.12} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {[
          { label: "Receive", icon: ArrowDownLeft, href: "/dashboard/receive" },
          { label: "Request", icon: Receipt, href: "/dashboard/receive?mode=fixed" },
        ].map((action) => (
          <Link key={action.label} href={action.href} className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-100 bg-white px-2 py-4 text-xs text-zinc-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <action.icon className="h-7 w-7 text-[#8A4FFF]" />
            {action.label}
          </Link>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent incoming</h2>
          <Link href="/dashboard/transactions" className="flex items-center text-xs text-[#a985ff]">All orders <ChevronRight className="h-4 w-4" /></Link>
        </div>
        <div className="space-y-3">
          {orders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-5 text-sm text-zinc-500">
              No live orders yet. Create a receive link when your merchant setup is complete.
            </div>
          )}
          {orders.slice(0, 4).map((payment) => (
            <div key={payment.id} className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <WalletMinimal className="h-5 w-5 shrink-0 text-[#8A4FFF]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{payment.payerName}</p>
                <p className="text-xs text-zinc-500 capitalize">{payment.network} - {new Date(payment.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">+{new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(payment.amountNgn)}</p>
                <p className={cn("text-xs capitalize", payment.status === "pending" ? "text-amber-400" : "text-emerald-400")}>{payment.status}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
