"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Calculator, ExternalLink, Link2, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { createPaymentLink, getMerchantMe } from "@/lib/api-client";
import { type FiatCurrency, type PaymentMode, formatCurrency, makePaymentPath } from "@/lib/payment-data";
import type { MerchantRecord } from "@/server/types";
import { cn } from "@/lib/utils";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";

const KEYS = ["C", "%", "←", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "0", ".", "=", "Apply"];
const OPERATORS = ["÷", "×", "−", "+"];

/**
 * A calculator on the amount field, because merchants price in the moment —
 * three items at ₦4,500 plus delivery — and doing that arithmetic elsewhere
 * before typing the total is where mistakes get made.
 */
function CalculatorPad({
  amount,
  onChange,
  onClose,
}: {
  amount: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const [display, setDisplay] = useState(amount || "0");
  const [left, setLeft] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);

  useEffect(() => {
    onChange(display);
  }, [display, onChange]);

  const calculate = (first: number, second: number, action: string) => {
    const result =
      action === "+" ? first + second
      : action === "−" ? first - second
      : action === "×" ? first * second
      : second === 0 ? 0
      : first / second;
    return String(Number(result.toFixed(2)));
  };

  const applyAndClose = () => {
    if (left !== null && operator) {
      const result = calculate(left, Number(display || 0), operator);
      setDisplay(result);
      onChange(result);
    }
    onClose();
  };

  const enter = (key: string) => {
    if (key === "C") {
      setDisplay("0");
      setLeft(null);
      setOperator(null);
      setReplace(false);
      return;
    }
    if (key === "←") {
      setDisplay((current) => (current.length > 1 ? current.slice(0, -1) : "0"));
      return;
    }
    if (key === "%") {
      setDisplay(String(Number(display || 0) / 100));
      return;
    }
    if (OPERATORS.includes(key)) {
      if (left !== null && operator && !replace) {
        setDisplay(calculate(left, Number(display || 0), operator));
        setLeft(Number(calculate(left, Number(display || 0), operator)));
      } else {
        setLeft(Number(display || 0));
      }
      setOperator(key);
      setReplace(true);
      return;
    }
    if (key === "=") {
      if (left !== null && operator) {
        setDisplay(calculate(left, Number(display || 0), operator));
        setLeft(null);
        setOperator(null);
        setReplace(true);
      }
      return;
    }
    if (key === ".") {
      setDisplay((current) => (current.includes(".") ? current : `${current}.`));
      setReplace(false);
      return;
    }
    setDisplay((current) => (replace || current === "0" ? key : current + key));
    setReplace(false);
  };

  return (
    <Sheet open onClose={applyAndClose} title="Calculator">
      <div className="tnum mb-4 rounded-lg bg-accent-soft px-5 py-6 text-right text-3xl font-semibold text-text">
        {display}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => (key === "Apply" ? applyAndClose() : enter(key))}
            className={cn(
              "h-14 rounded-md bg-surface-2 text-lg text-text",
              "transition duration-fast ease-linq hover:bg-surface-3 active:scale-[0.95]",
              OPERATORS.includes(key) || key === "=" ? "bg-accent-soft text-accent-text" : "",
              key === "Apply" && "bg-accent text-sm font-medium text-accent-contrast hover:bg-accent-hover",
              key === "←" && "text-base",
            )}
          >
            {key}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export default function ReceivePage() {
  const [mode, setMode] = useState<PaymentMode>("open");
  const [currency] = useState<FiatCurrency>("NGN");
  const [amount, setAmount] = useState("50000");
  const [description, setDescription] = useState("Order payment");
  const [requestId, setRequestId] = useState("");
  const [calculator, setCalculator] = useState(false);
  const [ready, setReady] = useState(false);
  const [origin, setOrigin] = useState("");
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    setOrigin((process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, ""));
    if (new URLSearchParams(window.location.search).get("mode") === "fixed") setMode("fixed");
    getMerchantMe()
      .then(({ merchant: record }) => setMerchant(record))
      .catch(() => undefined);
  }, []);

  const relativeLink = makePaymentPath({
    id: requestId || "new",
    mode,
    currency,
    amount: mode === "fixed" ? Number(amount || 0) : undefined,
    description: mode === "fixed" ? description : undefined,
    merchantId: merchant?.id ?? "pending",
  });
  const publicLink = requestId && origin ? `${origin}${relativeLink}` : "";

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Linq payment", url: publicLink });
      } else {
        await navigator.clipboard.writeText(publicLink);
        toast("Link copied");
      }
    } catch {
      // The user dismissed the share sheet; nothing went wrong.
    }
  };

  const generate = async () => {
    setError("");
    if (!merchant) {
      setError("Complete merchant onboarding before creating a link.");
      return;
    }
    if (mode === "fixed" && Number(amount || 0) <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setCreating(true);
    try {
      const { link } = await createPaymentLink({
        mode: mode === "fixed" ? "fixed" : "open",
        amountNgn: mode === "fixed" ? Number(amount || 0) : undefined,
        description: mode === "fixed" ? description : undefined,
      });
      setRequestId(link.slug);
      setReady(true);
      toast(mode === "fixed" ? "Payment request created" : "Receive link created");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the link.");
    } finally {
      setCreating(false);
    }
  };

  const updateAmount = useCallback((value: string) => setAmount(value), []);

  return (
    <div className="space-y-7">
      <header>
        <p className="text-micro uppercase tracking-[0.16em] text-accent-text">Receive</p>
        <h1 className="mt-2 text-hero font-semibold">Collect payment</h1>
        <p className="mt-2 text-sm text-text-muted">
          Share a checkout link, or charge a set amount.
        </p>
      </header>

      {/* Segmented control: two modes, equal weight, active one raised. */}
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1.5">
        {[
          { value: "open" as const, title: "Open receive", hint: "Payer enters amount" },
          { value: "fixed" as const, title: "Payment request", hint: "Locked amount" },
        ].map((entry) => {
          const active = mode === entry.value;
          return (
            <button
              key={entry.value}
              type="button"
              onClick={() => setMode(entry.value)}
              className={cn(
                "rounded-md px-3.5 py-3 text-left transition duration-fast ease-linq active:scale-[0.99]",
                active ? "bg-surface shadow-sm" : "hover:bg-surface/60",
              )}
            >
              <p className={cn("text-sm font-medium", active ? "text-text" : "text-text-muted")}>
                {entry.title}
              </p>
              <p className="mt-0.5 text-micro text-text-subtle">{entry.hint}</p>
            </button>
          );
        })}
      </div>

      {mode === "open" ? (
        <Card className="space-y-5">
          <div className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent-soft text-accent-text">
              <Link2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium">Open receive link</p>
              <p className="mt-1.5 text-xs leading-5 text-text-muted">
                Customers enter the amount at checkout, choose a stablecoin and network, and Linq
                settles the Naira to your verified account.
              </p>
            </div>
          </div>
          <Button size="lg" className="w-full" loading={creating} onClick={generate}>
            {requestId ? "Generate a new link" : "Generate receive link"}
          </Button>
        </Card>
      ) : (
        <Card className="space-y-5">
          <Field label="Amount to charge">
            <div className="flex items-center rounded-md bg-surface ring-1 ring-line focus-within:ring-2 focus-within:ring-accent">
              <span className="pl-4 text-text-muted">₦</span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                aria-label="Amount in Naira"
                className="tnum h-14 min-w-0 flex-1 bg-transparent px-2 text-2xl font-medium outline-none"
              />
              <button
                type="button"
                aria-label="Open calculator"
                onClick={() => setCalculator(true)}
                className="mr-2 grid h-10 w-10 place-items-center rounded-sm text-accent-text transition duration-fast ease-linq hover:bg-accent-soft active:scale-[0.94]"
              >
                <Calculator className="h-[18px] w-[18px]" />
              </button>
            </div>
          </Field>

          <Field label="Description" hint="Shown to the payer at checkout.">
            <Input value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>

          <Button size="lg" className="w-full" loading={creating} onClick={generate}>
            Generate payment request
          </Button>
        </Card>
      )}

      {error ? (
        <p className="linq-fade-in rounded-md bg-danger-soft px-4 py-3 text-xs text-danger">{error}</p>
      ) : null}

      <Sheet
        open={ready}
        onClose={() => setReady(false)}
        title={mode === "fixed" ? "Payment request ready" : "Receive link ready"}
      >
        <div className="mx-auto w-fit rounded-lg bg-white p-4 ring-1 ring-line">
          <QRCodeSVG value={publicLink} size={176} fgColor="#09090d" bgColor="#ffffff" />
        </div>

        {mode === "fixed" ? (
          <div className="mt-5 text-center">
            <p className="tnum text-2xl font-semibold">
              {formatCurrency(Number(amount || 0), currency)}
            </p>
            {description ? <p className="mt-1.5 text-sm text-text-muted">{description}</p> : null}
          </div>
        ) : (
          <p className="mt-5 text-center text-sm text-text-muted">
            The customer enters the amount and pays through Linq checkout.
          </p>
        )}

        <CopyField value={publicLink} label="Link" className="mt-6" />

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={share}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Link href={relativeLink} className={buttonClasses({ variant: "secondary" })}>
            <ExternalLink className="h-4 w-4" /> Preview
          </Link>
        </div>
      </Sheet>

      {calculator ? (
        <CalculatorPad amount={amount} onChange={updateAmount} onClose={() => setCalculator(false)} />
      ) : null}
    </div>
  );
}
