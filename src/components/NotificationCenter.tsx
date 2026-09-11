"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

/**
 * How often the bell looks for movement while the dashboard is open.
 *
 * Fifteen seconds against a settlement path that now reports in single digits.
 * The alternative — only loading when the sheet is opened — meant the bell
 * could not tell a merchant anything they had not already gone looking for.
 */
const POLL_INTERVAL_MS = 15_000;

/** Where "you have already seen everything up to here" is remembered. */
const SEEN_KEY = "linq:notifications:seen";

/**
 * What a status means for someone reading a list of them.
 *
 * The pill next to it names the state; this line says what happened, in the
 * words the same event's email uses. "refunding" is the one that matters: a
 * merchant scanning a list needs to see that a payout failed, not a status they
 * have to translate.
 */
function activityLine(order: OrderRecord) {
  switch (order.status) {
    case "settled":
      return "Payout settled to your account";
    case "deposited":
    case "fulfilling":
    case "settling":
      return "Payment received — payout in progress";
    case "refunding":
      return "Payout failed — refunding the customer";
    case "refunded":
      return "Refunded to the customer";
    case "failed":
    case "cancelled":
      return "Payout could not be completed";
    case "expired":
      return "Payment window closed unpaid";
    default:
      return "Waiting for the customer's deposit";
  }
}

/** Recent order activity, standing in for notifications until there's a real feed. */
export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false);
  // Held in a ref as well as storage: the poll runs on an interval that must
  // not be torn down and rebuilt every time the marker moves.
  const seenAt = useRef<string>("");
  const router = useRouter();

  const markSeen = useCallback((latest: string) => {
    seenAt.current = latest;
    setUnread(false);
    try {
      window.localStorage.setItem(SEEN_KEY, latest);
    } catch {
      // A browser refusing storage costs the dot its memory across reloads,
      // which is not worth failing the panel over.
    }
  }, []);

  useEffect(() => {
    try {
      seenAt.current = window.localStorage.getItem(SEEN_KEY) ?? "";
    } catch {
      seenAt.current = "";
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { orders: data } = await listOrders();
      // Most recently moved first. An order that failed an hour after it was
      // created is news; the list it was created in is not.
      const recent = [...data]
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        .slice(0, 8);
      setOrders(recent);
      const latest = recent[0]?.updatedAt ?? "";
      setUnread(Boolean(latest) && latest > seenAt.current);
      return latest;
    } catch {
      // A dropped poll is not worth surfacing; the next tick retries.
      return "";
    }
  }, []);

  // Watched in the background, not only when the panel is opened. Polling stops
  // while the tab is hidden and catches up the moment it is looked at again.
  useEffect(() => {
    void refresh();
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const interval = window.setInterval(tick, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  const openPanel = async () => {
    setOpen(true);
    setLoading(orders.length === 0);
    const latest = await refresh();
    setLoading(false);
    if (latest) markSeen(latest);
  };

  return (
    <>
      <button
        type="button"
        aria-label={unread ? "Notifications, new activity" : "Notifications"}
        onClick={openPanel}
        className={cn(
          "relative grid h-10 w-10 place-items-center rounded-full bg-transparent text-text-muted ring-1 ring-inset ring-line",
          "transition duration-fast ease-linq hover:text-text hover:ring-line-strong active:scale-[0.97]",
        )}
      >
        <Bell className="h-[18px] w-[18px]" />
        {/* Shown only when something has actually moved since this merchant
            last looked. A dot that is always lit is not a notification. */}
        {unread ? <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-accent" /> : null}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Notifications">
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
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
                  <p className="truncate text-sm font-medium">{activityLine(order)}</p>
                  <p className="truncate text-xs text-text-muted">
                    {order.payerName} · {chainDisplayName(order.network)} ·{" "}
                    {new Date(order.updatedAt).toLocaleString(undefined, {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
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
