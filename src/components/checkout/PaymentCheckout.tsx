"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Banknote, Wallet } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { NairaTransferDetails } from "@/components/checkout/NairaTransferDetails";
import { NetworkLogo } from "@/components/icons/NetworkLogos";
import { TokenIcon } from "@/components/icons/CryptoIcons";
import { LinqMark, LinqWordmark } from "@/components/brand/LinqMark";
import { Receipt } from "@/components/brand/Receipt";
import { SegmentedBar } from "@/components/brand/SegmentedBar";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { createOrder, getOrder, getPaycrestRate, getPaymentLink } from "@/lib/api-client";
import { chainDisplayName, ENABLED_CHAINS, getChain, isAddressValidForNetwork } from "@/lib/chains";
import type { FiatCurrency, PaymentMode, StablecoinSymbol } from "@/lib/payment-data";
import type { MerchantRecord, OrderRecord, PaymentLinkRecord } from "@/server/types";
import { cn } from "@/lib/utils";

type Stage = null | "naira" | "customer" | "asset" | "network" | "token" | "review" | "transfer" | "success";

interface PaymentCheckoutProps {
  linkId: string;
  mode: PaymentMode;
  initialAmount?: number;
  currency: FiatCurrency;
  description?: string;
}

const payerStorageKey = "linq:payer";

/** Order states where no further deposit is expected. */
const EXPIRED_OR_DONE = ["settled", "refunded", "expired", "failed", "cancelled"];

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** A large, tappable choice tile — network and token pickers share the shape. */
function ChoiceTile({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-24 flex-col items-center justify-center gap-2.5 rounded-md bg-surface",
        "ring-1 ring-line transition duration-fast ease-linq active:scale-[0.97]",
        // Selected badges get a ring and a slight lift rather than being greyed
        // out — payers rely on true brand colour to recognise a chain.
        selected ? "shadow-md ring-2 ring-accent" : "hover:shadow-md",
      )}
    >
      <span className={cn("transition-transform duration-fast ease-linq", selected && "scale-105")}>
        {children}
      </span>
    </button>
  );
}

export function PaymentCheckout({
  linkId,
  mode,
  initialAmount = 0,
  description,
}: PaymentCheckoutProps) {
  const [stage, setStage] = useState<Stage>(null);
  const [link, setLink] = useState<PaymentLinkRecord | null>(null);
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : "");
  const [token, setToken] = useState<StablecoinSymbol>("USDSUI");
  // No pre-selected network: the payer must actively choose one, so they never
  // send on a chain they didn't pick.
  const [networkId, setNetworkId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rate, setRate] = useState(1500);
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const activeMerchant = merchant ?? {
    businessName: "",
    location: "",
    bankAccounts: [],
    wallets: [],
  };
  const locked = (link?.mode ?? mode) === "fixed";
  const value = Number(link?.amountNgn ?? (amount || 0));
  const cryptoDue = value > 0 ? value / rate : 0;

  useEffect(() => {
    const saved = window.localStorage.getItem(payerStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { name?: string; email?: string };
        setPayerName(parsed.name ?? "");
        setPayerEmail(parsed.email ?? "");
      } catch {
        window.localStorage.removeItem(payerStorageKey);
      }
    }
    getPaymentLink(linkId)
      .then(({ link: remoteLink, merchant: remoteMerchant }) => {
        setLink(remoteLink);
        setMerchant(remoteMerchant);
        if (remoteLink.amountNgn) setAmount(String(remoteLink.amountNgn));
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [linkId]);

  // Keep the selected token valid for the selected network (USDSUI is Sui-only).
  useEffect(() => {
    const chain = getChain(networkId);
    if (chain && !chain.tokens.includes(token)) setToken(chain.tokens[0]);
  }, [networkId, token]);

  useEffect(() => {
    if (!value || !networkId) return;
    getPaycrestRate({ network: networkId, token, amountNgn: value })
      .then((data) => setRate(data.marketRate || 1500))
      .catch(() => setRate(1500));
  }, [networkId, token, value]);

  useEffect(() => {
    if (!order?.id || EXPIRED_OR_DONE.includes(order.status)) return;
    const interval = window.setInterval(async () => {
      try {
        const { order: fresh } = await getOrder(order.id);
        setOrder(fresh);
        if (EXPIRED_OR_DONE.includes(fresh.status)) window.clearInterval(interval);
      } catch {
        // A dropped poll is not worth surfacing; the next tick retries.
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [order?.id, order?.status]);

  // Linq only watches the deposit wallet for 10 minutes, so the payer must be
  // able to see how long they have left.
  useEffect(() => {
    if (!order?.validUntil) {
      setSecondsLeft(null);
      return;
    }
    const deadline = new Date(order.validUntil).getTime();
    const tick = () => setSecondsLeft(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [order?.validUntil]);

  // When the window closes, ask the server to finalise so merchant and payer
  // both get the expiry notification.
  useEffect(() => {
    if (secondsLeft !== 0 || !order?.id || EXPIRED_OR_DONE.includes(order.status)) return;
    getOrder(order.id)
      .then(({ order: fresh }) => setOrder(fresh))
      .catch(() => undefined);
  }, [secondsLeft, order?.id, order?.status]);

  // The confirmation is driven by the order itself, not by the payer telling us
  // they paid — the ticket prints when the deposit is actually seen.
  useEffect(() => {
    if (order && ["settled", "fulfilled", "validated", "settling"].includes(order.status)) {
      setStage("success");
    }
  }, [order]);

  const startCrypto = () => setStage(payerName && payerEmail ? "asset" : "customer");

  const savePayer = () => {
    if (!payerName.trim()) {
      setFormError("Enter your name.");
      return;
    }
    if (!payerEmail.includes("@")) {
      setFormError("Enter a valid email address.");
      return;
    }
    setFormError("");
    window.localStorage.setItem(
      payerStorageKey,
      JSON.stringify({ name: payerName.trim(), email: payerEmail.trim().toLowerCase() }),
    );
    setStage("asset");
  };

  const createPaymentOrder = async () => {
    setBusy(true);
    setFormError("");
    try {
      const response = await createOrder({
        paymentLinkId: link?.id ?? linkId,
        payerName,
        payerEmail,
        amountNgn: locked ? undefined : value,
        token,
        network: networkId,
      });
      setOrder(response.order);
      setStage("transfer");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not create the order.");
    } finally {
      setBusy(false);
    }
  };

  const depositAddress = order?.providerReceiveAddress ?? "";
  // A deposit address that doesn't match the chain the payer chose would send
  // their funds somewhere unrecoverable, so it is never displayed.
  const addressTrusted = Boolean(order && depositAddress && isAddressValidForNetwork(depositAddress, order.network));
  const expired = order?.status === "expired" || secondsLeft === 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-[480px] bg-bg text-text">
      <header className="flex items-center justify-between px-5 pt-6">
        <span className="w-10" />
        <LinqMark size={32} className="text-accent" />
        <span className="w-10" />
      </header>

      <section className="px-5 pb-8 pt-9 text-center">
        <MerchantAvatar className="mx-auto h-[72px] w-[72px] rounded-full" />
        {loading ? (
          <div className="mt-5 flex flex-col items-center gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : (
          <>
            <h1 className="mt-5 text-2xl font-semibold tracking-[-0.02em]">
              {activeMerchant.businessName || "Merchant"}
            </h1>
            {activeMerchant.location ? (
              <p className="mt-1.5 text-sm text-text-muted">{activeMerchant.location}</p>
            ) : null}
          </>
        )}

        {locked ? (
          <div className="mt-7 rounded-lg bg-accent-soft px-5 py-6">
            <p className="text-micro uppercase tracking-[0.16em] text-accent-text">Payment request</p>
            <p className="tnum mt-2.5 text-3xl font-semibold">{formatNaira(value)}</p>
            {link?.description || description ? (
              <p className="mt-2 text-sm text-text-muted">{link?.description ?? description}</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="px-5">
        <h2 className="text-center text-sm font-medium text-text-muted">Choose how to pay</h2>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setStage("naira")}
            className="flex h-32 flex-col items-center justify-center gap-3.5 rounded-lg bg-surface shadow-sm ring-1 ring-line transition duration-fast ease-linq hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] active:translate-y-0"
          >
            <Banknote className="h-9 w-9 text-success" />
            <span className="text-sm font-medium">Pay with Naira</span>
          </button>
          <button
            type="button"
            onClick={startCrypto}
            className="flex h-32 flex-col items-center justify-center gap-3.5 rounded-lg bg-surface shadow-sm ring-1 ring-line transition duration-fast ease-linq hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] active:translate-y-0"
          >
            <span className="flex -space-x-2.5">
              {ENABLED_CHAINS.slice(0, 4).map((chain) => (
                <NetworkLogo key={chain.id} network={chain.id} size={30} />
              ))}
            </span>
            <span className="text-sm font-medium">Pay with crypto</span>
          </button>
        </div>
      </section>

      <footer className="mt-12 flex items-center justify-center gap-2 pb-10 text-xs text-text-subtle">
        Powered by
        <LinqWordmark size={13} className="text-accent" />
      </footer>

      {/* ── Naira ── */}
      <Sheet open={stage === "naira"} onClose={() => setStage(null)} title="Pay with Naira">
        <NairaTransferDetails merchant={activeMerchant} />
        {locked ? (
          <p className="tnum mt-5 rounded-md bg-surface-2 px-4 py-3 text-center text-lg font-semibold">
            {formatNaira(value)}
          </p>
        ) : null}
      </Sheet>

      {/* ── Payer details ── */}
      <Sheet open={stage === "customer"} onClose={() => setStage(null)} title="Your details">
        <div className="space-y-4">
          <Field label="Full name">
            <Input
              value={payerName}
              onChange={(event) => setPayerName(event.target.value)}
              placeholder="Adaeze Okonkwo"
              autoComplete="name"
              invalid={Boolean(formError) && !payerName.trim()}
            />
          </Field>
          <Field
            label="Email"
            hint="Your receipt is sent here."
            error={formError && !payerEmail.includes("@") ? formError : undefined}
          >
            <Input
              value={payerEmail}
              onChange={(event) => setPayerEmail(event.target.value)}
              placeholder="you@example.com"
              inputMode="email"
              autoComplete="email"
              invalid={Boolean(formError) && !payerEmail.includes("@")}
            />
          </Field>
        </div>
        <Button size="lg" className="mt-6 w-full" onClick={savePayer}>
          Continue
        </Button>
      </Sheet>

      {/* ── Amount ── */}
      <Sheet open={stage === "asset"} onClose={() => setStage(null)} title="Pay with crypto">
        {locked ? (
          <p className="tnum rounded-lg bg-surface-2 px-5 py-6 text-center text-3xl font-semibold">
            {formatNaira(value)}
          </p>
        ) : (
          <Field label="Amount">
            <div className="flex items-center rounded-md bg-surface ring-1 ring-line focus-within:ring-2 focus-within:ring-accent">
              <span className="pl-4 text-2xl text-text-muted">₦</span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                placeholder="0"
                aria-label="Amount in Naira"
                className="tnum h-16 min-w-0 flex-1 bg-transparent px-3 text-3xl font-semibold outline-none"
              />
            </div>
          </Field>
        )}
        <Button size="lg" className="mt-6 w-full" disabled={value <= 0} onClick={() => setStage("network")}>
          Continue
        </Button>
      </Sheet>

      {/* ── Network ── */}
      <Sheet
        open={stage === "network"}
        onClose={() => setStage(null)}
        title="Select network"
        leading={
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => setStage("asset")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      >
        <div className="grid grid-cols-3 gap-3">
          {ENABLED_CHAINS.map((chain) => (
            <ChoiceTile
              key={chain.id}
              selected={networkId === chain.id}
              onClick={() => setNetworkId(chain.id)}
            >
              <NetworkLogo network={chain.id} size={32} />
              {/* Paired with its label the first time it is shown, so the payer
                  learns the badge before meeting it alone in a dense list. */}
              <span className="mt-2 block text-xs font-medium">{chain.shortName}</span>
            </ChoiceTile>
          ))}
        </div>
        <Button size="lg" className="mt-6 w-full" disabled={!networkId} onClick={() => setStage("token")}>
          {networkId ? "Continue" : "Select a network"}
        </Button>
      </Sheet>

      {/* ── Token ── */}
      <Sheet
        open={stage === "token"}
        onClose={() => setStage(null)}
        title="Select token"
        leading={
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => setStage("network")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          {(getChain(networkId)?.tokens ?? []).map((symbol) => (
            <ChoiceTile key={symbol} selected={token === symbol} onClick={() => setToken(symbol)}>
              <TokenIcon token={symbol} size={34} />
              <span className="mt-2 block text-sm font-medium">{symbol}</span>
            </ChoiceTile>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-text-muted">
          On {chainDisplayName(networkId)}
        </p>
        <Button size="lg" className="mt-5 w-full" onClick={() => setStage("review")}>
          Continue
        </Button>
      </Sheet>

      {/* ── Review ── */}
      <Sheet
        open={stage === "review"}
        onClose={() => setStage(null)}
        title="Payment details"
        leading={
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => setStage("token")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      >
        <p className="tnum text-center text-3xl font-semibold">{formatNaira(value)}</p>
        <p className="tnum mt-2 text-center text-sm text-text-muted">
          about {cryptoDue.toFixed(2)} {token}
        </p>

        <dl className="mt-7 divide-y divide-line rounded-lg bg-surface-2 px-4">
          {[
            ["Payer", payerName],
            ["To", activeMerchant.businessName],
            ["Asset", token],
            ["Network", chainDisplayName(networkId)],
            ["Rate", `₦${rate.toLocaleString()} / ${token}`],
          ].map(([label, answer]) => (
            <div key={label} className="flex justify-between gap-4 py-3.5 text-sm">
              <dt className="text-text-muted">{label}</dt>
              <dd className="text-right font-medium">{answer}</dd>
            </div>
          ))}
        </dl>

        {formError ? (
          <p className="linq-fade-in mt-4 rounded-md bg-danger-soft px-4 py-3 text-xs text-danger">
            {formError}
          </p>
        ) : null}

        <Button size="lg" className="mt-6 w-full" loading={busy} onClick={createPaymentOrder}>
          <Wallet className="h-4 w-4" /> Get payment address
        </Button>
      </Sheet>

      {/* ── Transfer ── */}
      <Sheet open={stage === "transfer" && Boolean(order)} onClose={() => setStage(null)} title="Send payment">
        {order ? (
          <>
            <p className="tnum text-center text-sm text-text-muted">
              Send about {order.cryptoAmountDue.toFixed(2)} {order.token} on{" "}
              {chainDisplayName(order.network)}
            </p>
            <p className="mt-1 text-center text-xs text-text-subtle">
              Your payout follows whatever you actually send.
            </p>

            {expired ? (
              <div className="mt-5 rounded-lg bg-danger-soft p-4 text-center">
                <p className="text-sm font-semibold text-danger">This payment window has closed</p>
                <p className="mt-1.5 text-xs leading-5 text-text-muted">
                  Do not send funds to this address. Start a new payment to get a fresh one.
                </p>
              </div>
            ) : secondsLeft !== null ? (
              <div
                className={cn(
                  "mt-5 rounded-lg px-4 py-3 text-center",
                  secondsLeft <= 60 ? "bg-danger-soft" : "bg-surface-2",
                )}
              >
                <p className={cn("text-xs", secondsLeft <= 60 ? "text-danger" : "text-text-muted")}>
                  Time left to send
                </p>
                <p
                  className={cn(
                    "tnum mt-1 text-2xl font-semibold",
                    secondsLeft <= 60 ? "text-danger" : "text-text",
                  )}
                >
                  {formatCountdown(secondsLeft)}
                </p>
              </div>
            ) : null}

            {expired ? null : addressTrusted ? (
              <>
                <div className="mx-auto mt-6 w-fit rounded-lg bg-white p-4 ring-1 ring-line">
                  <QRCodeSVG value={depositAddress} size={172} fgColor="#09090d" bgColor="#ffffff" />
                </div>
                <div className="mt-5 flex items-center gap-2 rounded-md bg-surface-2 py-1 pl-4 pr-1">
                  <code className="min-w-0 flex-1 truncate font-mono text-xs text-text-muted">
                    {depositAddress}
                  </code>
                  <CopyButton value={depositAddress} label="Address" />
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-lg bg-danger-soft p-4 text-center">
                <p className="text-sm font-semibold text-danger">Address could not be verified</p>
                <p className="mt-1.5 text-xs leading-5 text-text-muted">
                  The deposit address we received does not match the {chainDisplayName(order.network)}{" "}
                  format. Do not send funds — contact support.
                </p>
              </div>
            )}

            <div className="mt-6">
              <SegmentedBar
                label={
                  order.status === "initiated"
                    ? "Waiting for your deposit"
                    : `Status: ${order.status}`
                }
              />
            </div>

            <p className="mt-5 text-xs leading-5 text-text-muted">
              Only send {order.token} on {chainDisplayName(order.network)}. Your Naira payout is
              reconciled to the exact amount received, and this screen updates on its own once the
              deposit lands.
            </p>
          </>
        ) : null}
      </Sheet>

      {/* ── Success ── */}
      <Sheet open={stage === "success" && Boolean(order)} onClose={() => setStage(null)} title="" className="bg-bg">
        {order ? (
          <>
            <Receipt order={order} merchant={merchant} printing />
            <p className="mx-auto mt-7 max-w-xs text-center text-sm leading-6 text-text-muted">
              A copy has been sent to {payerEmail || "your email"}.
            </p>
            <Button size="lg" className="mt-5 w-full" onClick={() => setStage(null)}>
              Done
            </Button>
          </>
        ) : null}
      </Sheet>
    </main>
  );
}
