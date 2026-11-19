"use client";

import { useState } from "react";
import { Copy, Download, ExternalLink, Mail, RefreshCcw } from "lucide-react";
import { Receipt } from "@/components/brand/Receipt";
import { merchantReceiptKind, OrderOutcome } from "@/components/OrderOutcome";
import { Button, buttonClasses } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { apiUrl, retryTransfer, sendOrderReceipt } from "@/lib/api-client";
import { explorerName, explorerTxUrl, shortenHash } from "@/lib/explorer";
import type { MerchantRecord, OrderRecord, ReceiptKind } from "@/server/types";

/** States where the Naira leg can be attempted again. */
const RETRYABLE = new Set(["failed", "refunded", "expired", "cancelled"]);

/**
 * One order, opened from anywhere in the dashboard: the receipt the payer got,
 * the deposit on its explorer, what happened, and what can be done next.
 *
 * Home and Orders each carried their own copy of this; it lives here now so a
 * fix to one is a fix to both.
 */
export function OrderSheet({
  order,
  merchant,
  onClose,
  onChanged,
}: {
  order: OrderRecord | null;
  merchant: MerchantRecord | null;
  onClose: () => void;
  /** Called after a retry, so the caller can refetch its list. */
  onChanged?: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState<"retry" | "payer" | "merchant" | null>(null);
  const { toast } = useToast();

  const retry = async (target: OrderRecord) => {
    setBusy("retry");
    try {
      const response = await retryTransfer(target.id);
      toast(response.message ?? "Retry queued");
      await onChanged?.();
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Retry failed", "error");
    } finally {
      setBusy(null);
    }
  };

  const emailReceipt = async (target: OrderRecord, kind: ReceiptKind, who: "payer" | "merchant") => {
    setBusy(who);
    try {
      await sendOrderReceipt(target.id, { kind, audience: kind.startsWith("payer_") ? "payer" : "merchant" });
      toast(who === "payer" ? `Receipt sent to ${target.payerEmail}` : "Invoice sent to your business email");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not send receipt", "error");
    } finally {
      setBusy(null);
    }
  };

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast("Order ID copied");
    } catch {
      toast("Could not copy", "error");
    }
  };

  const txUrl = order ? explorerTxUrl(order.network, order.depositDigest) : null;

  return (
    <Sheet open={Boolean(order)} onClose={onClose} title="Payment" className="bg-bg">
      {order ? (
        <>
          <Receipt order={order} merchant={merchant} />

          {/* Only once the payment has been seen on-chain. Before that there is
              no digest, and a dead link would be worse than none. */}
          {txUrl && order.depositDigest ? (
            <a
              href={txUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex items-center justify-between gap-3 rounded-md bg-surface-2 px-4 py-3 text-xs transition-colors duration-fast ease-linq hover:bg-surface-3"
            >
              <span className="text-text-muted">Deposit on {explorerName(order.network)}</span>
              <span className="flex items-center gap-1.5 font-medium text-text">
                <span className="font-mono">{shortenHash(order.depositDigest)}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              </span>
            </a>
          ) : null}

          <OrderOutcome order={order} />

          {RETRYABLE.has(order.status) ? (
            <Button className="mt-6 w-full" loading={busy === "retry"} onClick={() => retry(order)}>
              <RefreshCcw className="h-4 w-4" /> Retry payout to verified account
            </Button>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <a
              href={apiUrl(`/api/orders/${order.id}/receipt.pdf?kind=payer_transaction_success`)}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              <Download className="h-3.5 w-3.5" /> Receipt PDF
            </a>
            <Button variant="secondary" size="sm" onClick={() => copyId(order.id)}>
              <Copy className="h-3.5 w-3.5" /> Copy order ID
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={busy === "payer"}
              disabled={busy !== null && busy !== "payer"}
              onClick={() => emailReceipt(order, "payer_transaction_success", "payer")}
            >
              <Mail className="h-3.5 w-3.5" /> Email payer
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={busy === "merchant"}
              disabled={busy !== null && busy !== "merchant"}
              onClick={() => emailReceipt(order, merchantReceiptKind(order), "merchant")}
            >
              <Mail className="h-3.5 w-3.5" /> Email me
            </Button>
          </div>
        </>
      ) : null}
    </Sheet>
  );
}
