"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Filter, RefreshCcw, Search } from "lucide-react";
import { TokenIcon } from "@/components/icons/CryptoIcons";
import { apiUrl, listOrders, retryTransfer, sendOrderReceipt } from "@/lib/api-client";
import type { OrderRecord } from "@/server/types";
import { cn } from "@/lib/utils";

const retryable = new Set(["failed", "refunded", "expired", "cancelled"]);

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function TransactionsPage() {
  const [query, setQuery] = useState("");
  const [network, setNetwork] = useState("All");
  const [status, setStatus] = useState("All");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const refresh = async () => {
    const data = await listOrders();
    setOrders(data.orders);
  };

  useEffect(() => {
    refresh().catch(() => undefined);
    const timer = window.setInterval(() => refresh().catch(() => undefined), 12000);
    return () => window.clearInterval(timer);
  }, []);

  const networks = useMemo(() => ["All", ...Array.from(new Set(orders.map((item) => item.network)))], [orders]);
  const statuses = useMemo(() => ["All", ...Array.from(new Set(orders.map((item) => item.status)))], [orders]);
  const filtered = useMemo(() => orders.filter((item) => {
    const search = `${item.id} ${item.payerName} ${item.payerEmail} ${item.token} ${item.network} ${item.paycrestOrderId}`.toLowerCase().includes(query.toLowerCase());
    return search && (network === "All" || item.network === network) && (status === "All" || item.status === status);
  }), [network, orders, query, status]);
  const settled = orders.filter((order) => order.status === "settled").reduce((sum, order) => sum + order.amountNgn, 0);
  const pending = orders.filter((order) => !["settled", "failed", "refunded", "cancelled"].includes(order.status)).reduce((sum, order) => sum + order.amountNgn, 0);

  const retry = async (order: OrderRecord) => {
    try {
      const response = await retryTransfer(order.id);
      setFeedback(response.message);
      await refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Retry failed");
    }
  };

  const sendReceipt = async (order: OrderRecord, kind: "payer_transaction_success" | "merchant_fiat_received" | "merchant_payout_failed") => {
    try {
      await sendOrderReceipt(order.id, {
        kind,
        audience: kind === "payer_transaction_success" ? "payer" : "merchant",
      });
      setFeedback("Receipt email queued. If Resend is not configured, it was recorded locally.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not send receipt");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#a985ff]">Orders</p>
        <h1 className="mt-2 text-3xl font-semibold">Payments</h1>
      </div>
      <label className="flex h-12 items-center gap-3 rounded-xl border border-zinc-100 bg-white px-4 text-zinc-500 shadow-sm">
        <Search className="h-4 w-4" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search payer, order, wallet" className="w-full bg-transparent text-sm text-zinc-950 outline-none" />
      </label>
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
        <label className="flex shrink-0 items-center gap-2 rounded-full border border-zinc-100 bg-white px-3 py-2 shadow-sm">
          <Filter className="h-3.5 w-3.5 text-[#a985ff]" />
          <select value={network} onChange={(event) => setNetwork(event.target.value)} className="bg-transparent capitalize outline-none">
            {networks.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="shrink-0 rounded-full border border-zinc-100 bg-white px-3 py-2 shadow-sm">
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="bg-transparent capitalize outline-none">
            {statuses.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <button onClick={() => refresh()} className="flex shrink-0 items-center gap-2 rounded-full border border-zinc-100 bg-white px-3 py-2 shadow-sm"><RefreshCcw className="h-3.5 w-3.5" /> Refresh</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm"><p className="text-xs text-zinc-500">Settled</p><p className="mt-2 text-xl font-medium">{formatNaira(settled)}</p></div>
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm"><p className="text-xs text-zinc-500">Pending</p><p className="mt-2 text-xl font-medium">{formatNaira(pending)}</p></div>
      </div>
      <section className="space-y-3">
        {filtered.map((payment) => {
          const open = expanded === payment.id;
          return (
            <article key={payment.id} className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
              <button onClick={() => setExpanded(open ? null : payment.id)} className="flex w-full items-center gap-3 text-left">
                <TokenIcon token={payment.token} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{payment.payerName}</p>
                  <p className="truncate text-xs text-zinc-500">{payment.payerEmail}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatNaira(payment.amountNgn)}</p>
                  <p className={cn("text-xs capitalize", payment.status === "settled" ? "text-emerald-500" : payment.status === "pending" ? "text-amber-500" : "text-zinc-500")}>{payment.status}</p>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", open && "rotate-180")} />
              </button>
              {open && (
                <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <p><span className="block text-zinc-500">Order</span><span className="font-medium">{payment.id}</span></p>
                    <p><span className="block text-zinc-500">Paycrest</span><span className="font-medium">{payment.paycrestOrderId ?? "Pending"}</span></p>
                    <p><span className="block text-zinc-500">Token</span><span className="font-medium">{payment.cryptoAmountDue.toFixed(6)} {payment.token}</span></p>
                    <p><span className="block text-zinc-500">Network</span><span className="font-medium capitalize">{payment.network.replaceAll("-", " ")}</span></p>
                    <p><span className="block text-zinc-500">Rate</span><span className="font-medium">{formatNaira(payment.quotedRate)}</span></p>
                    <p><span className="block text-zinc-500">Created</span><span className="font-medium">{new Date(payment.createdAt).toLocaleString()}</span></p>
                  </div>
                  {payment.providerReceiveAddress && <code className="block truncate rounded-xl bg-zinc-50 p-3 text-zinc-500">{payment.providerReceiveAddress}</code>}
                  <div className="grid grid-cols-2 gap-2">
                    <a href={apiUrl(`/api/orders/${payment.id}/receipt.pdf?kind=payer_transaction_success`)} target="_blank" className="flex h-10 items-center justify-center rounded-xl border border-zinc-200 text-xs text-zinc-700">Open receipt PDF</a>
                    <button onClick={() => sendReceipt(payment, "payer_transaction_success")} className="h-10 rounded-xl border border-zinc-200 text-xs text-zinc-700">Email payer receipt</button>
                    <button onClick={() => sendReceipt(payment, payment.status === "settled" ? "merchant_fiat_received" : "merchant_payout_failed")} className="col-span-2 h-10 rounded-xl border border-zinc-200 text-xs text-zinc-700">Email merchant invoice/notice</button>
                  </div>
                  {retryable.has(payment.status) && (
                    <button onClick={() => retry(payment)} className="h-10 w-full rounded-xl bg-[#8A4FFF] text-xs font-medium text-white">
                      Retry transfer to verified bank account
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
        {!filtered.length && <p className="rounded-2xl border border-zinc-100 bg-white p-8 text-center text-sm text-zinc-500">No matching payments.</p>}
      </section>
      {feedback && <p className="rounded-2xl bg-[#f3edff] p-3 text-center text-xs text-[#8A4FFF]">{feedback}</p>}
    </div>
  );
}
