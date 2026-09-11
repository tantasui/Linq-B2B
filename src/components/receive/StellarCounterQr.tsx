"use client";

/**
 * A scannable Stellar payment QR for the merchant to hold up at a counter.
 *
 * The payment-request QR beside it encodes a link: scanning opens the checkout,
 * where the payer chooses a chain and is then shown a Stellar QR. This is that
 * second QR brought forward — a `web+stellar:pay` request any Stellar wallet
 * can settle directly, with no Linq account and no intermediate page.
 *
 * It is generated on demand rather than living permanently on the request.
 * Every order is paid into a single-use account created with the order and
 * merged away once it settles, so there is no standing address to encode —
 * the same design that lets Linq charge nothing per payment. That account also
 * has a deadline, so this QR is good only while the countdown lasts, and the
 * countdown is shown rather than left for the merchant to discover.
 */

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy";
import { createOrder } from "@/lib/api-client";
import type { OrderRecord } from "@/server/types";

interface Props {
  /** The fixed-amount payment request this QR collects against. */
  paymentLinkId: string;
  amountNgn: number;
  merchantName: string;
}

function countdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function StellarCounterQr({ paymentLinkId, amountNgn, merchantName }: Props) {
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const deadline = order?.validUntil;
    if (!deadline) return;
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [order?.validUntil]);

  const generate = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      const { order: created } = await createOrder({
        paymentLinkId,
        // Nobody to name yet — the payer is whoever walks up. The merchant is
        // recorded so the order is still attributable; the checkout collects
        // real payer details when a link is used instead.
        payerName: `${merchantName} counter`,
        payerEmail: "",
        amountNgn,
        token: "USDC",
        network: "stellar",
      });
      setOrder(created);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create a Stellar payment.");
    } finally {
      setBusy(false);
    }
  }, [paymentLinkId, amountNgn, merchantName]);

  if (!order) {
    return (
      <div className="mt-5">
        <Button variant="secondary" size="lg" className="w-full" loading={busy} onClick={generate}>
          Show Stellar QR
        </Button>
        <p className="mt-2 text-center text-xs text-text-muted">
          A USDC request any Stellar wallet can scan and pay. No fees.
        </p>
        {error ? (
          <div className="mt-3 rounded-md bg-danger-soft p-3">
            <p className="text-xs leading-5 text-danger">{error}</p>
          </div>
        ) : null}
      </div>
    );
  }

  const uri = order.paymentUri ?? "";
  const address = order.providerReceiveAddress ?? "";

  // Without a payment URI there is nothing a wallet can act on. Falling back to
  // a QR of the bare address would look identical while silently dropping the
  // asset and amount, which is how a payer ends up sending XLM.
  if (!uri || !address) {
    return (
      <div className="mt-5 rounded-md bg-danger-soft p-4">
        <p className="text-sm font-semibold text-danger">Stellar payment unavailable</p>
        <p className="mt-1.5 text-xs leading-5 text-text-muted">
          Share the payment link instead — the checkout will show a Stellar QR there.
        </p>
      </div>
    );
  }

  if (secondsLeft <= 0) {
    return (
      <div className="mt-5 rounded-md bg-surface-2 p-4 text-center">
        <p className="text-sm font-semibold text-text">This Stellar QR has expired</p>
        <p className="mt-1.5 text-xs leading-5 text-text-muted">
          Each one is good for a single payment within its window.
        </p>
        <Button variant="secondary" size="lg" className="mt-4 w-full" loading={busy} onClick={generate}>
          Show a new QR
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="mx-auto w-fit rounded-lg bg-white p-4 ring-1 ring-line">
        <QRCodeSVG value={uri} size={176} fgColor="#09090d" bgColor="#ffffff" />
      </div>
      <p className="mt-3 text-center text-xs text-text-muted">
        Scan with any Stellar wallet · expires in{" "}
        <span className="tnum font-medium text-text">{countdown(secondsLeft)}</span>
      </p>
      <CopyField value={address} label="Address" className="mt-4" />
      <p className="mt-2 text-center text-xs text-text-muted">
        {order.cryptoAmountDue} USDC · paid straight to this address
      </p>
    </div>
  );
}
