"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ChevronRight, Download, Eye, EyeOff, Mail, Receipt as ReceiptIcon, RefreshCcw } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ChartFrame } from "@/components/ui/chart-frame";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BalanceSkeleton, RowSkeleton } from "@/components/ui/skeleton";
import { Sheet } from "@/components/ui/sheet";
import { StatusPill } from "@/components/ui/status";
import { useToast } from "@/components/ui/toast";
import { NetworkLogo } from "@/components/icons/NetworkLogos";
import { Receipt } from "@/components/brand/Receipt";
import { apiUrl, getMerchantMe, listOrders, retryTransfer, sendOrderReceipt } from "@/lib/api-client";
import { chainDisplayName } from "@/lib/chains";
import { explorerTxUrl, shortenHash } from "@/lib/explorer";
import { formatCurrency } from "@/lib/payment-data";
import type { MerchantRecord, OrderRecord } from "@/server/types";

const IN_FLIGHT = ["initiated", "deposited", "pending", "fulfilling", "validated", "settling"];
/** States where the Naira leg can be attempted again. */
const RETRYABLE = new Set(["failed", "refunded", "expired", "cancelled"]);

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [openOrder, setOpenOrder] = useState<OrderRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    listOrders()
      .then(({ orders: data }) => setOrders(data))
      .catch(() => undefined)
      .finally(() => setLoading(false));
    getMerchantMe()
      .then((data) => setMerchant(data.merchant))
      .catch(() => undefined);
  }, []);

  const retry = async (order: OrderRecord) => {
    setBusy(true);
    try {
      const response = await retryTransfer(order.id);
      toast(response.message ?? "Retry queued");
      const { orders: data } = await listOrders();
      setOrders(data);
      setOpenOrder((current) => (current ? data.find((entry) => entry.id === current.id) ?? current : current));
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
            icon: ReceiptIcon,
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
              <button
                key={order.id}
                type="button"
                onClick={() => setOpenOrder(order)}
                className="block w-full text-left"
              >
                <Card interactive className="flex items-center gap-3.5 py-4">
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
                <Button className="col-span-2" loading={busy} onClick={() => retry(openOrder)}>
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
