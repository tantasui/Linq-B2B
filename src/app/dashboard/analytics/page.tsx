"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis } from "recharts";
import { ChartFrame } from "@/components/ui/chart-frame";
import { cn } from "@/lib/utils";
import { listOrders } from "@/lib/api-client";
import type { OrderRecord } from "@/server/types";

const emptyRevenue = ["M", "T", "W", "T", "F", "S", "S"].map((day) => ({ day, value: 0 }));
const colors = ["#8A4FFF", "#B997FF", "#D7C7FA", "#EEE8FB"];

export default function AnalyticsPage() {
  const [range, setRange] = useState("7D");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const settled = orders.filter((order) => order.status === "settled" || order.status === "fulfilled");
  const totalNgn = settled.reduce((sum, order) => sum + order.amountNgn, 0);
  const averageOrder = settled.length ? totalNgn / settled.length : 0;
  const revenue = settled.length ? settled.slice(0, 7).reverse().map((order, index) => ({ day: String(index + 1), value: order.amountNgn })) : emptyRevenue;
  const routes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of orders) counts.set(order.network, (counts.get(order.network) ?? 0) + 1);
    return Array.from(counts.entries()).slice(0, 4).map(([name, value], index) => ({ name, value, fill: colors[index] ?? colors[3] }));
  }, [orders]);
  const hourly = useMemo(() => {
    const buckets = ["00", "04", "08", "12", "16", "20"].map((hour) => ({ hour, value: 0 }));
    for (const order of orders) {
      const bucket = Math.min(Math.floor(new Date(order.createdAt).getHours() / 4), buckets.length - 1);
      buckets[bucket].value += order.amountNgn;
    }
    return buckets;
  }, [orders]);

  useEffect(() => {
    listOrders().then(({ orders }) => setOrders(orders)).catch(() => setOrders([]));
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div><p className="text-xs uppercase tracking-[0.2em] text-[#a985ff]">Analytics</p><h1 className="mt-2 text-3xl font-semibold">Performance</h1></div>
        <div className="flex rounded-full bg-[#f3effb] p-1 text-xs text-zinc-500">{["24H", "7D", "30D"].map((value) => <button key={value} onClick={() => setRange(value)} className={cn("rounded-full px-3 py-2", range === value && "bg-[#8A4FFF] text-white")}>{value}</button>)}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          ["Net revenue", new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(totalNgn), `${settled.length} settled`],
          ["Orders", String(orders.length), "live"],
          ["Conversion", orders.length ? `${Math.round((settled.length / orders.length) * 100)}%` : "0%", "settled"],
          ["Avg order", new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(averageOrder), "settled"],
        ].map(([label, value, change]) => (
          <div key={label} className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm"><p className="text-xs text-zinc-500">{label}</p><p className="mt-3 text-xl font-medium">{value}</p><p className="mt-1 text-xs text-[#8A4FFF]">{change}</p></div>
        ))}
      </div>
      <section className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
        <p className="font-medium">Settlement volume</p><p className="mt-1 text-xs text-zinc-500">NGN received · {range}</p>
        <ChartFrame className="mt-5 h-48"><ResponsiveContainer width="100%" height="100%" minWidth={0}><AreaChart data={revenue}><defs><linearGradient id="mobile-revenue" x2="0" y2="1"><stop stopColor="#8A4FFF" stopOpacity=".45" /><stop offset="1" stopColor="#8A4FFF" stopOpacity="0" /></linearGradient></defs><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#71717a" }} /><Area dataKey="value" type="monotone" stroke="#8A4FFF" strokeWidth={3} fill="url(#mobile-revenue)" /></AreaChart></ResponsiveContainer></ChartFrame>
      </section>
      <section className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
        <p className="font-medium">Network mix</p>
        <div className="flex items-center">
          <ChartFrame className="h-40 w-[48%]"><ResponsiveContainer width="100%" height="100%" minWidth={0}><PieChart><Pie data={routes} dataKey="value" innerRadius={43} outerRadius={62} paddingAngle={4}>{routes.map((item) => <Cell key={item.name} fill={item.fill} />)}</Pie></PieChart></ResponsiveContainer></ChartFrame>
          <div className="flex-1 space-y-3">{routes.length ? routes.map((item) => <div key={item.name} className="flex justify-between text-xs"><span className="flex items-center gap-2 text-zinc-400"><i className="h-2 w-2 rounded-full" style={{ background: item.fill }} />{item.name}</span><span>{item.value}</span></div>) : <p className="text-xs text-zinc-500">No live network data yet.</p>}</div>
        </div>
      </section>
      <section className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
        <p className="font-medium">Activity by hour</p>
        <ChartFrame className="mt-5 h-36"><ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={hourly}><XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} /><Bar dataKey="value" fill="#8A4FFF" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></ChartFrame>
      </section>
    </div>
  );
}
