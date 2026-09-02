"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { NetworkLogo } from "@/components/icons/NetworkLogos";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status";
import { listOrders } from "@/lib/api-client";
import { chainDisplayName } from "@/lib/chains";
import { formatCurrency } from "@/lib/payment-data";
import { cn } from "@/lib/utils";
import type { OrderRecord } from "@/server/types";

/** Recent order activity, standing in for notifications until there's a real feed. */
export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listOrders()
      .then(({ orders: data }) => setOrders(data.slice(0, 8)))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen(true)}
        className={cn(
          "relative grid h-10 w-10 place-items-center rounded-md bg-surface text-text-muted ring-1 ring-line",
          "shadow-sm transition duration-fast ease-linq hover:-translate-y-px hover:text-text hover:shadow-md active:scale-[0.97]",
        )}
      >
        <Bell className="h-[18px] w-[18px]" />
        <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-accent" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Notifications">
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState title="Nothing yet" body="Activity on your orders will show up here." />
        ) : (
          <div className="space-y-2.5">
            {orders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/dashboard/transactions");
                }}
                className="flex w-full items-center gap-3 rounded-md bg-surface-2 p-3 text-left transition duration-fast ease-linq hover:bg-surface-3"
              >
                <NetworkLogo network={order.network} size={30} />
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
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <p className="tnum text-xs font-medium">{formatCurrency(order.amountNgn, "NGN")}</p>
                  <StatusPill status={order.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}
