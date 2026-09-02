"use client";

import { Check } from "lucide-react";
import { NetworkLogo } from "@/components/icons/NetworkLogos";
import { LinqMark } from "@/components/brand/LinqMark";
import { CopyButton } from "@/components/ui/copy";
import { chainDisplayName } from "@/lib/chains";
import { formatCurrency, formatRate, ORDER_STATUS_LABELS } from "@/lib/payment-data";
import { cn } from "@/lib/utils";
import type { MerchantRecord, OrderRecord } from "@/server/types";

/**
 * The transaction receipt, built as the brand's ticket rather than a plain
 * card: a printer dispensing a scalloped-edge ticket with a dashed tear line,
 * matching the source asset's construction.
 *
 * One component with a light and a dark variant — not two designs. Light mode
 * is the source of truth and dark mode is the same structure on dark tokens:
 * nothing moves, resizes or reorders between modes, only colour values change.
 * That is also why export renders in whatever mode the app is currently in
 * rather than forcing light.
 *
 * Used for the success confirmation (`printing`), the historical detail view
 * (static), and image/PDF export.
 */

function truncateMiddle(value: string, lead = 6, tail = 6) {
  return value.length > lead + tail + 3 ? `${value.slice(0, lead)}…${value.slice(-tail)}` : value;
}

/**
 * The slot the ticket feeds out of. Wider than the ticket, with the dark mouth
 * the paper appears to come through — the asset's own construction.
 */
function Printer() {
  return (
    <div className="relative z-20 rounded-lg bg-printer p-2 shadow-lg">
      <div className="rounded-md bg-white/15 p-2 ring-1 ring-inset ring-white/25">
        <div className="flex h-4 items-center justify-between rounded-full bg-black/70 px-3">
          <LinqMark size={16} className="text-white/40" />
          <span className="h-0.5 w-8 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}

/** Label left, value right — labels recede so the values are what scan. */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5">
      <span className="shrink-0 text-xs text-text-muted">{label}</span>
      <span className="min-w-0 text-right text-xs font-medium text-text">{children}</span>
    </div>
  );
}

export function Receipt({
  order,
  merchant,
  printing = false,
  className,
}: {
  order: OrderRecord;
  merchant?: Pick<MerchantRecord, "businessName"> | null;
  /** Show the printer and animate the ticket feeding out. Success state only. */
  printing?: boolean;
  className?: string;
}) {
  const status = ORDER_STATUS_LABELS[order.status] ?? "Payment";
  const fee = (order.transactionFee ?? 0) + (order.senderFee ?? 0);
  const reference = order.paycrestOrderId ?? order.id;
  const settled = order.status === "settled" || order.status === "fulfilled";

  return (
    <div className={cn("mx-auto w-full max-w-[420px]", className)}>
      {printing ? <Printer /> : null}

      <div
        className={cn(
          "mx-auto w-[88%]",
          // Tucked under the slot so the paper reads as coming through it.
          printing && "-mt-2",
          printing && "linq-print",
        )}
      >
        {/* Head: who this is from and the figure the reader came for. */}
        <div className="rounded-t-md bg-ticket px-5 pt-6">
          <div className="flex items-center justify-between gap-3">
            <LinqMark size={28} className="text-accent" />
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-accent-text">
              {settled ? <Check className="h-3.5 w-3.5" /> : null}
              {status}
            </span>
          </div>

          <div className="mt-8 pb-7 text-center">
            <p className="tnum text-[2.125rem] font-semibold leading-none tracking-[-0.04em] text-text">
              {formatCurrency(order.amountNgn, "NGN")}
            </p>
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-text-muted">
              <NetworkLogo network={order.network} size={18} />
              <span className="tnum">
                {order.cryptoAmountDue.toFixed(2)} {order.token}
              </span>
            </p>
          </div>
        </div>

        {/* Perforation: the strip's ends are punched out of the paper. */}
        <div className="linq-ticket-notch flex h-6 items-center bg-ticket px-4" aria-hidden>
          <span className="w-full border-t-2 border-dashed border-ticket-edge" />
        </div>

        {/* Foot: the details, closed by the scalloped edge. */}
        <div className="linq-ticket-foot bg-ticket px-5 pb-8 pt-2">
          <div className="divide-y divide-ticket-edge/60">
            <DetailRow label="Date & time">
              {new Date(order.createdAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </DetailRow>
            <DetailRow label="From">{order.payerName || "—"}</DetailRow>
            {/* The same business name the payer saw before paying, repeated here
                so both ends of the transaction visibly match. */}
            <DetailRow label="To">{merchant?.businessName ?? "—"}</DetailRow>
            <DetailRow label="Network">{chainDisplayName(order.network)}</DetailRow>
            <DetailRow label="Rate">
              <span className="tnum">{formatRate(order.quotedRate, order.token)}</span>
            </DetailRow>
            <DetailRow label="Fee">
              <span className="tnum">{fee > 0 ? `${fee.toFixed(2)} ${order.token}` : "No fee"}</span>
            </DetailRow>
            <div className="flex items-center justify-between gap-4 py-1.5">
              <span className="shrink-0 text-xs text-text-muted">Transaction ID</span>
              <span className="flex min-w-0 items-center gap-1">
                <code className="truncate font-mono text-xs text-text">{truncateMiddle(reference)}</code>
                <CopyButton value={reference} label="Transaction ID" size={13} className="p-1.5" />
              </span>
            </div>
          </div>

          <p className="mt-7 text-center text-[11px] text-text-subtle">
            linq.xyz ·{" "}
            <a href="mailto:support@linq.xyz" className="underline underline-offset-2 hover:text-text-muted">
              support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
