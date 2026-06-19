"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Calculator, Check, Copy, ExternalLink, Link2, Share2, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { createPaymentLink, getMerchantMe } from "@/lib/api-client";
import {
  type FiatCurrency,
  type PaymentMode,
  formatCurrency,
  makePaymentPath,
} from "@/lib/payment-data";
import type { MerchantRecord } from "@/server/types";
import { cn } from "@/lib/utils";

function CalculatorPad({ amount, onChange, onClose }: { amount: string; onChange: (value: string) => void; onClose: () => void }) {
  const [display, setDisplay] = useState(amount || "0");
  const [left, setLeft] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);

  useEffect(() => {
    onChange(display);
  }, [display, onChange]);

  const calculate = (first: number, second: number, action: string) => {
    const result = action === "+" ? first + second : action === "-" ? first - second : action === "x" ? first * second : second === 0 ? 0 : first / second;
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
    if (key === "Back") {
      setDisplay((current) => current.length > 1 ? current.slice(0, -1) : "0");
      return;
    }
    if (key === "%") {
      setDisplay(String(Number(display || 0) / 100));
      return;
    }
    if (["+", "-", "x", "/"].includes(key)) {
      if (left !== null && operator && !replace) {
        const result = calculate(left, Number(display || 0), operator);
        setDisplay(result);
        setLeft(Number(result));
      } else {
        setLeft(Number(display || 0));
      }
      setOperator(key);
      setReplace(true);
      return;
    }
    if (key === "=") {
      if (left === null || !operator) return;
      setDisplay(calculate(left, Number(display || 0), operator));
      setLeft(null);
      setOperator(null);
      setReplace(true);
      return;
    }
    setDisplay((current) => {
      if (replace) {
        setReplace(false);
        return key === "." ? "0." : key;
      }
      if (key === "." && current.includes(".")) return current;
      return current === "0" && key !== "." ? key : current + key;
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-950/55 transition-opacity duration-200">
      <div className="linq-sheet-up w-full max-w-[460px] rounded-t-[30px] bg-white p-5 shadow-2xl">
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-zinc-200" />
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-medium">Calculator</h2>
          <button onClick={onClose} className="text-sm text-zinc-500">Done</button>
        </div>
        <div className="mb-4 rounded-2xl bg-[#f6f2ff] p-5 text-right text-4xl font-medium text-zinc-950">{display}</div>
        <div className="grid grid-cols-4 gap-2">
          {["C", "%", "Back", "/", "7", "8", "9", "x", "4", "5", "6", "-", "1", "2", "3", "+", "0", ".", "=", "Apply"].map((key) => (
            <button
              key={key}
              onClick={() => key === "Apply" ? applyAndClose() : enter(key)}
              className={cn(
                "h-14 rounded-xl border border-zinc-100 bg-zinc-50 text-lg text-zinc-900",
                ["/", "x", "-", "+", "="].includes(key) && "border-[#e4d7ff] bg-[#f3edff] text-[#8A4FFF]",
                key === "Apply" && "border-[#8A4FFF] bg-[#8A4FFF] text-sm font-medium text-white",
                key === "Back" && "text-sm",
              )}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReceivePage() {
  const [mode, setMode] = useState<PaymentMode>("open");
  const [currency] = useState<FiatCurrency>("NGN");
  const [amount, setAmount] = useState("50000");
  const [description, setDescription] = useState("Order payment");
  const [requestId, setRequestId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [calculator, setCalculator] = useState(false);
  const [requestReadyOpen, setRequestReadyOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setOrigin((process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, ""));
    if (new URLSearchParams(window.location.search).get("mode") === "fixed") setMode("fixed");
    getMerchantMe().then(({ merchant }) => setMerchant(merchant)).catch(() => undefined);
  }, []);

  const request = {
    id: requestId || "new",
    mode,
    currency,
    amount: mode === "fixed" ? Number(amount || 0) : undefined,
    description: mode === "fixed" ? description : undefined,
    merchantId: merchant?.id ?? "pending",
  };
  const relativeLink = makePaymentPath(request);
  const publicLink = requestId && origin ? `${origin}${relativeLink}` : "";

  const notify = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 1800);
  };

  const copy = async (value: string, name: string) => {
    await navigator.clipboard.writeText(value);
    notify(`${name} copied`);
  };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Linq payment", url: publicLink });
      else await copy(publicLink, "Link");
      notify("Ready to share");
    } catch {
      notify("Share cancelled");
    }
  };

  const regenerate = async () => {
    setCreating(true);
    try {
      if (!merchant) {
        notify("Complete merchant onboarding first");
        return;
      }
      const { link } = await createPaymentLink({
        mode: mode === "fixed" ? "fixed" : "open",
        amountNgn: mode === "fixed" ? Number(amount || 0) : undefined,
        description: mode === "fixed" ? description : undefined,
      });
      setRequestId(link.slug);
      setRequestReadyOpen(true);
      notify(mode === "fixed" ? "Payment request generated" : "Receive link generated");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not create link");
    } finally {
      setCreating(false);
    }
  };

  const updateAmountFromCalculator = useCallback((value: string) => {
    setAmount(value);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#a985ff]">Receive</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Collect payment</h1>
        <p className="mt-2 text-sm text-zinc-500">Share a checkout link or charge a set amount.</p>
      </div>

      <div className="grid grid-cols-2 rounded-2xl bg-[#f3effb] p-1">
        {[
          { value: "open" as const, title: "Open Receive", text: "Payer enters amount" },
          { value: "fixed" as const, title: "Payment Request", text: "Locked amount" },
        ].map((entry) => (
          <button key={entry.value} onClick={() => setMode(entry.value)} className={cn("rounded-xl px-3 py-3 text-left", mode === entry.value && "bg-white shadow-sm")}>
            <p className={cn("text-sm font-medium", mode === entry.value ? "text-[#8A4FFF]" : "text-zinc-500")}>{entry.title}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{entry.text}</p>
          </button>
        ))}
      </div>

      {mode === "open" ? (
        <section className="space-y-4">
          <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-[#f3edff] p-3 text-[#8A4FFF]"><Link2 className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-medium">Open receive link</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">Customers enter the amount at checkout, choose a stablecoin, and we handle the crypto-to-Naira payment flow.</p>
              </div>
            </div>
            <button onClick={regenerate} disabled={creating} className="mt-4 h-12 w-full rounded-xl bg-[#8A4FFF] text-sm font-medium text-white disabled:opacity-60">
              {creating ? "Generating..." : requestId ? "Generate new receive link" : "Generate receive link"}
            </button>
          </section>
        </section>
      ) : (
        <section className="space-y-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <label className="block">
            <span className="mb-2 block text-xs text-zinc-500">Required amount</span>
            <div className="flex items-center rounded-xl border border-zinc-200 bg-white px-4">
              <span className="mr-2 text-zinc-400">₦</span>
              <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className="h-14 min-w-0 flex-1 bg-transparent text-2xl outline-none" />
              <button aria-label="Open calculator" onClick={() => setCalculator(true)} className="p-2 text-[#8A4FFF] transition duration-200 hover:scale-105"><Calculator className="h-5 w-5" /></button>
            </div>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs text-zinc-500">Description</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-[#8A4FFF]" />
          </label>
          <button onClick={regenerate} disabled={creating} className="h-12 w-full rounded-xl bg-[#8A4FFF] text-sm font-medium text-white disabled:opacity-60">{creating ? "Generating..." : "Generate payment request"}</button>
        </section>
      )}

      {requestReadyOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-950/55 transition-opacity duration-200">
          <button aria-label="Close payment request" className="absolute inset-0" onClick={() => setRequestReadyOpen(false)} />
          <section className="linq-sheet-up relative z-10 w-full max-w-[460px] rounded-t-[30px] bg-white p-5 shadow-2xl">
            <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-zinc-200" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#a985ff]">{mode === "fixed" ? "Payment request" : "Receive link"}</p>
                <h2 className="mt-1 text-xl font-semibold">{mode === "fixed" ? "Payment request ready" : "Receive link ready"}</h2>
              </div>
              <button aria-label="Close" onClick={() => setRequestReadyOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="mx-auto w-fit rounded-2xl bg-white p-4">
              <QRCodeSVG value={publicLink} size={180} fgColor="#09090d" />
            </div>
            {mode === "fixed" ? (
              <>
                <p className="mt-3 text-center text-2xl font-semibold">{formatCurrency(Number(amount || 0), currency)}</p>
                {description && <p className="mt-1 text-center text-sm text-zinc-500">{description}</p>}
              </>
            ) : (
              <p className="mt-3 text-center text-sm text-zinc-500">Customer enters the amount and pays through LinqSwitch checkout.</p>
            )}
            <div className="mt-4 flex gap-2 rounded-xl bg-zinc-50 p-3">
              <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">{publicLink}</span>
              <button onClick={() => copy(publicLink, "Link")}><Copy className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={share} className="flex h-11 items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-700"><Share2 className="h-4 w-4" /> Share</button>
              <Link href={relativeLink} className="flex h-11 items-center justify-center gap-1 rounded-xl bg-[#8A4FFF] text-xs text-white"><ExternalLink className="h-4 w-4" /> Preview</Link>
            </div>
            {feedback && <p className="mt-4 flex justify-center gap-1 text-xs text-emerald-400"><Check className="h-4 w-4" />{feedback}</p>}
          </section>
        </div>
      )}

      {calculator && <CalculatorPad amount={amount} onClose={() => setCalculator(false)} onChange={updateAmountFromCalculator} />}
    </div>
  );
}
