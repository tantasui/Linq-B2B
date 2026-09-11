import { ExternalLink } from "lucide-react";
import { explorerName, explorerTxUrl, shortenHash } from "@/lib/explorer";
import { formatTokenAmount } from "@/lib/money";
import type { OrderRecord, ReceiptKind } from "@/server/types";

/**
 * What happened to an order, beyond the word in its status pill.
 *
 * A refunded order used to show the merchant exactly what a settled one did —
 * the ticket, the deposit link — and nothing at all about the refund. The two
 * questions it leaves are "why" and "where did the money go", and both answers
 * were already in the record; they simply had nowhere to be shown.
 *
 * Renders nothing when there is nothing to add, so a clean settlement keeps the
 * drawer it always had.
 */
export function OrderOutcome({ order }: { order: OrderRecord }) {
  const refunding = order.status === "refunding" || order.status === "refunded";
  const failed = order.status === "failed" || order.status === "cancelled";
  const reason = order.statusReason?.trim();
  const refundUrl = explorerTxUrl(order.network, order.refundTxHash ?? "");

  if (!refunding && !failed && !reason) return null;

  return (
    <div className="mt-5 space-y-2">
      {refunding || failed ? (
        <div className="rounded-md bg-warning-soft px-4 py-3 ring-1 ring-inset ring-warning/15">
          <p className="font-sans font-medium text-micro tracking-mono text-warning">
            {refunding
              ? order.status === "refunded"
                ? "Refunded to the customer"
                : "Refund in progress"
              : "Payout failed"}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-text-muted">
            {refunding
              ? `The naira payout could not be completed, so ${formatTokenAmount(order.cryptoAmountDue)} ${order.token} ${order.status === "refunded" ? "has been" : "is being"} returned to the customer. This order will not settle.`
              : "This payout did not go through. The customer's funds are safe."}
            {reason ? ` ${reason}` : ""}
          </p>
        </div>
      ) : reason ? (
        <p className="rounded-md bg-surface-2 px-4 py-3 text-xs leading-5 text-text-muted">{reason}</p>
      ) : null}

      {refunding && order.refundDestination ? (
        <div className="flex items-center justify-between gap-3 rounded-md bg-surface-2 px-4 py-2.5 text-xs">
          <span className="font-sans font-medium text-micro tracking-mono text-text-subtle">
            Refunded to
          </span>
          <span className="min-w-0 truncate font-mono font-medium text-text">
            {shortenHash(order.refundDestination, 6, 6)}
          </span>
        </div>
      ) : null}

      {refundUrl ? (
        <a
          href={refundUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 rounded-md bg-surface-2 px-4 py-2.5 text-xs transition duration-fast ease-linq hover:bg-surface-3"
          title={`View on ${explorerName(order.network)}`}
        >
          <span className="font-sans font-medium text-micro tracking-mono text-text-subtle">
            Refund transaction
          </span>
          <span className="flex items-center gap-1.5 font-medium text-text">
            <span className="font-mono">{shortenHash(order.refundTxHash ?? "")}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          </span>
        </a>
      ) : null}

      {order.payoutReference ? (
        <div className="flex items-center justify-between gap-3 rounded-md bg-surface-2 px-4 py-2.5 text-xs">
          <span className="font-sans font-medium text-micro tracking-mono text-text-subtle">
            Payout reference
          </span>
          <span className="min-w-0 truncate font-mono font-medium text-text">{order.payoutReference}</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Which notice the merchant gets when they re-send one to themselves.
 *
 * The button says "email myself the invoice", and what that means depends on
 * what happened: a settled order has an invoice, a refunded one has a refund
 * notice, and a failed one has neither — it has an explanation.
 */
export function merchantReceiptKind(order: OrderRecord): ReceiptKind {
  switch (order.status) {
    case "settled":
    case "fulfilled":
    case "validated":
      return "merchant_fiat_received";
    case "refunded":
      return "merchant_refund_completed";
    case "expired":
      return "merchant_order_expired";
    case "refunding":
    case "failed":
    case "cancelled":
      return "merchant_payout_failed";
    default:
      return "merchant_payment_incoming";
  }
}
