"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Banknote, Check, Copy, Landmark, Loader2, Wallet, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { NetworkIcon, TokenIcon } from "@/components/icons/CryptoIcons";
import { createOrder, getOrder, getPaycrestRate, getPaycrestTokens, getPaymentLink } from "@/lib/api-client";
import { getBankLogo } from "@/lib/banks";
import { chainDisplayName, ENABLED_CHAINS, getChain } from "@/lib/chains";
import type { FiatCurrency, PaymentMode, StablecoinSymbol } from "@/lib/payment-data";
import { formatCurrency } from "@/lib/payment-data";
import type { MerchantRecord, OrderRecord, PaymentLinkRecord, TokenNetworkRecord } from "@/server/types";
type Stage = null | "naira" | "customer" | "asset" | "network" | "token" | "review" | "transfer" | "success";

interface PaymentCheckoutProps {
  linkId: string;
  mode: PaymentMode;
  initialAmount?: number;
  currency: FiatCurrency;
  description?: string;
}

const payerStorageKey = "linq:payer";

// Order states where no further deposit is expected.
const EXPIRED_OR_DONE = ["settled", "refunded", "expired", "failed", "cancelled"];

/**
 * Live view of an order's lifecycle for the payer.
 *
 * The order is polled after submission, so this screen must reflect the real
 * status rather than a fixed "submitted" message — the payer needs to see the
 * deposit actually being detected, processed and settled.
 */
function paymentStatusView(status?: OrderRecord["status"]) {
  switch (status) {
    case "deposited":
    case "validated":
      return { tone: "progress" as const, title: "Payment received", body: "We've detected your deposit and are processing the payout to the merchant." };
    case "fulfilling":
    case "fulfilled":
    case "settling":
      return { tone: "progress" as const, title: "Processing payout", body: "Your deposit is confirmed. The merchant's Naira payout is on its way." };
    case "settled":
      return { tone: "done" as const, title: "Payment complete", body: "The merchant has been paid. Thank you." };
    case "expired":
      return { tone: "error" as const, title: "Payment expired", body: "The deposit window closed before funds arrived. If you already sent funds, they are held safely — contact the merchant." };
    case "failed":
    case "cancelled":
      return { tone: "error" as const, title: "Payment failed", body: "This payment could not be completed. Any funds received are held safely and will be reconciled." };
    case "refunding":
    case "refunded":
      return { tone: "error" as const, title: "Payment refunded", body: "This payment was refunded to the sending wallet." };
    default:
      return { tone: "waiting" as const, title: "Waiting for your deposit", body: "We're watching the deposit address. This updates automatically once your transfer is detected on-chain." };
  }
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function BottomSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <button aria-label="Close payment flow" className="absolute inset-0" onClick={onClose} />
        <motion.section
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative z-10 max-h-[88vh] w-full max-w-[460px] overflow-y-auto rounded-t-[30px] bg-white px-5 pb-8 pt-4 shadow-2xl"
        >
          <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-zinc-300" />
          {children}
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PaymentCheckout({ linkId, mode, initialAmount = 0, currency: initialCurrency, description }: PaymentCheckoutProps) {
  const [stage, setStage] = useState<Stage>(null);
  const [link, setLink] = useState<PaymentLinkRecord | null>(null);
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : "");
  const [token, setToken] = useState<StablecoinSymbol>("USDSUI");
  // No pre-selected network: the payer must actively choose one, so they never
  // send on a chain they didn't pick.
  const [networkId, setNetworkId] = useState("");
  const [tokens, setTokens] = useState<TokenNetworkRecord[]>([]);
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [rate, setRate] = useState(1500);
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const activeMerchant = merchant ?? {
    businessName: "Loading merchant",
    location: "",
    bankAccounts: [],
    wallets: [],
  };
  const payoutBank = activeMerchant.bankAccounts.find((entry) => entry.verificationStatus === "verified");
  const payoutBankLogo = getBankLogo(payoutBank?.institutionCode, payoutBank?.institutionName);
  const locked = (link?.mode ?? mode) === "fixed";
  const value = Number(link?.amountNgn ?? (amount || 0));
  const canContinue = value > 0;
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
    getPaymentLink(linkId).then(({ link: remoteLink, merchant: remoteMerchant }) => {
      setLink(remoteLink);
      setMerchant(remoteMerchant);
      if (remoteLink.amountNgn) setAmount(String(remoteLink.amountNgn));
    }).catch(() => undefined);
    getPaycrestTokens().then(({ tokens: supported }) => {
      setTokens(supported);
    }).catch(() => undefined);
  }, [linkId]);

  // Keep the selected token valid for the selected network (e.g. USDSUI only exists on Sui).
  useEffect(() => {
    const chain = getChain(networkId);
    if (chain && !chain.tokens.includes(token)) {
      setToken(chain.tokens[0]);
    }
  }, [networkId, token]);

  useEffect(() => {
    if (!value || !networkId) return;
    getPaycrestRate({ network: networkId, token, amountNgn: value }).then((data) => setRate(data.marketRate || 1500)).catch(() => setRate(1500));
  }, [networkId, token, value]);

  useEffect(() => {
    const TERMINAL = EXPIRED_OR_DONE;
    if (!order?.id || TERMINAL.includes(order.status)) return;
    const interval = window.setInterval(async () => {
      try {
        const { order: fresh } = await getOrder(order.id);
        setOrder(fresh);
        if (TERMINAL.includes(fresh.status)) window.clearInterval(interval);
      } catch {}
    }, 5000);
    return () => window.clearInterval(interval);
  }, [order?.id, order?.status]);

  // Countdown to the deposit deadline. Linq only watches the deposit wallet for
  // 10 minutes, so the payer must see how long they have left.
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

  // When the window closes, ask the server to finalise the order so the merchant
  // and payer both get the expiry notification.
  useEffect(() => {
    if (secondsLeft !== 0 || !order?.id || EXPIRED_OR_DONE.includes(order.status)) return;
    getOrder(order.id).then(({ order: fresh }) => setOrder(fresh)).catch(() => undefined);
  }, [secondsLeft, order?.id, order?.status]);

  const notify = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 1700);
  };

  const copy = async (text: string, name: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      notify(`${name} copied`);
    } catch {
      notify("Copy failed — select and copy manually");
    }
  };

  const startCrypto = () => {
    if (!payerName || !payerEmail) setStage("customer");
    else setStage("asset");
  };

  const savePayer = () => {
    if (!payerName.trim() || !payerEmail.includes("@")) {
      notify("Enter a valid name and email");
      return;
    }
    window.localStorage.setItem(payerStorageKey, JSON.stringify({ name: payerName.trim(), email: payerEmail.trim().toLowerCase() }));
    setStage("asset");
  };

  const createPaymentOrder = async () => {
    setBusy(true);
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
    } catch (error) {
      notify(error instanceof Error ? error.message : "Order creation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-[460px] bg-[#fdfcfb] text-zinc-950 shadow-[0_0_50px_rgba(0,0,0,.1)]">
      <div className="flex items-center justify-between px-5 pt-7">
        <button aria-label="Back" className="rounded-xl border border-zinc-200 p-2.5"><ArrowLeft className="h-5 w-5" /></button>
        <p className="text-sm font-medium text-[#8A4FFF]">LinqSwitch</p>
        <span className="w-10" />
      </div>
      <section className="px-5 pb-8 pt-10 text-center">
        <MerchantAvatar className="mx-auto h-[74px] w-[74px] rounded-full" />
        <h1 className="mt-5 text-2xl font-semibold">{activeMerchant.businessName}</h1>
        <p className="mt-2 text-sm text-zinc-500">{activeMerchant.location}</p>
        {locked && (
          <div className="mt-7 rounded-2xl bg-[#f4f1ff] p-4">
            <p className="text-xs uppercase tracking-wider text-[#8A4FFF]">Payment request</p>
            <p className="mt-2 text-3xl font-semibold">{formatNaira(value)}</p>
            {(link?.description || description) && <p className="mt-2 text-sm text-zinc-500">{link?.description ?? description}</p>}
          </div>
        )}
      </section>
      <section className="px-5 pt-4">
        <h2 className="text-center text-lg font-semibold">Choose your payment method</h2>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={() => setStage("naira")} className="flex h-32 flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white">
            <Banknote className="h-11 w-11 text-[#008751]" />
            <span className="text-sm text-zinc-600">Pay with Naira</span>
          </button>
          <button onClick={startCrypto} className="flex h-32 flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white">
            <div className="flex -space-x-2">
              {ENABLED_CHAINS.slice(0, 4).map((chain) => (
                <NetworkIcon key={chain.id} network={chain.id} size={32} />
              ))}
            </div>
            <span className="text-sm text-zinc-600">Pay with Crypto</span>
          </button>
        </div>
      </section>
      <footer className="fixed bottom-0 left-1/2 w-full max-w-[460px] -translate-x-1/2 border-t border-zinc-100 bg-white/95 py-5 text-center text-sm text-zinc-500">
        Powered by <span className="font-medium text-[#8A4FFF]">LinqSwitch</span>
      </footer>

      {stage === "naira" && (
        <BottomSheet onClose={() => setStage(null)}>
          <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold">Pay with Naira</h2><button onClick={() => setStage(null)}><X /></button></div>
          <div className="rounded-2xl bg-zinc-50 p-4">
            <p className="mb-4 text-sm font-medium">Transfer to bank</p>
            {payoutBank ? (
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
                {payoutBankLogo ? <img src={payoutBankLogo} alt="" className="h-8 w-8 rounded-lg object-contain" /> : <Landmark className="h-8 w-8 text-[#8A4FFF]" />}
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">{payoutBank.resolvedAccountName}</p><p className="text-xs text-zinc-500">{payoutBank.accountIdentifier} - {payoutBank.institutionName ?? payoutBank.institutionCode}</p></div>
                <button onClick={() => copy(payoutBank.accountIdentifier, "Account number")}><Copy className="h-5 w-5 text-zinc-500" /></button>
              </div>
            ) : (
              <p className="rounded-xl bg-white p-3 text-sm text-zinc-500">This merchant has not configured a verified Naira payout account.</p>
            )}
          </div>
        </BottomSheet>
      )}

      {stage === "customer" && (
        <BottomSheet onClose={() => setStage(null)}>
          <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold">Your details</h2><button onClick={() => setStage(null)}><X /></button></div>
          <div className="space-y-3">
            <input value={payerName} onChange={(event) => setPayerName(event.target.value)} className="h-13 w-full rounded-xl border border-zinc-200 px-4 py-4 text-sm outline-none focus:border-[#8A4FFF]" placeholder="Name" />
            <input value={payerEmail} onChange={(event) => setPayerEmail(event.target.value)} className="h-13 w-full rounded-xl border border-zinc-200 px-4 py-4 text-sm outline-none focus:border-[#8A4FFF]" placeholder="Email" inputMode="email" />
          </div>
          <button onClick={savePayer} className="mt-6 h-14 w-full rounded-xl bg-[#8A4FFF] font-medium text-white">Continue</button>
        </BottomSheet>
      )}

      {stage === "asset" && (
        <BottomSheet onClose={() => setStage(null)}>
          <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold">Pay with Crypto</h2><button onClick={() => setStage(null)}><X /></button></div>
          {!locked && (
            <div className="rounded-2xl border border-zinc-200 p-4">
              <p className="mb-3 text-xs text-zinc-500">Enter amount</p>
              <div className="flex items-center gap-2 text-3xl font-semibold">
                <span>₦</span>
                <input value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="0" className="min-w-0 flex-1 bg-transparent outline-none" />
              </div>
            </div>
          )}
          {locked && <p className="rounded-2xl border border-zinc-200 p-4 text-2xl font-semibold">{formatNaira(value)}</p>}
          <button disabled={!canContinue} onClick={() => setStage("network")} className="mt-5 h-14 w-full rounded-xl bg-[#8A4FFF] font-medium text-white disabled:opacity-40">Continue</button>
        </BottomSheet>
      )}

      {stage === "network" && (
        <BottomSheet onClose={() => setStage(null)}>
          <div className="mb-5 flex items-center gap-3"><button onClick={() => setStage("asset")}><ArrowLeft /></button><h2 className="text-xl font-semibold">Select network</h2></div>
          <div className="grid grid-cols-3 gap-3">
            {ENABLED_CHAINS.map((chain) => (
              <button
                key={chain.id}
                onClick={() => setNetworkId(chain.id)}
                className={`flex h-24 flex-col items-center justify-center gap-2 rounded-xl border transition-colors ${networkId === chain.id ? "border-[#8A4FFF] bg-[#f6f2ff]" : "border-zinc-200"}`}
              >
                <NetworkIcon network={chain.id} size={34} />
                <span className="text-xs font-medium">{chain.name}</span>
              </button>
            ))}
          </div>
          <button disabled={!networkId} onClick={() => setStage("token")} className="mt-5 h-14 w-full rounded-xl bg-[#8A4FFF] font-medium text-white disabled:opacity-40">
            {networkId ? "Continue" : "Select a network"}
          </button>
        </BottomSheet>
      )}

      {stage === "token" && (
        <BottomSheet onClose={() => setStage(null)}>
          <div className="mb-5 flex items-center gap-3"><button onClick={() => setStage("network")}><ArrowLeft /></button><h2 className="text-xl font-semibold">Select token</h2></div>
          <div className="grid grid-cols-2 gap-3">
            {(getChain(networkId)?.tokens ?? []).map((symbol) => (
              <button
                key={symbol}
                onClick={() => setToken(symbol)}
                className={`flex h-24 flex-col items-center justify-center gap-2 rounded-xl border transition-colors ${token === symbol ? "border-[#8A4FFF] bg-[#f6f2ff]" : "border-zinc-200"}`}
              >
                <TokenIcon token={symbol} size={38} />
                <span className="text-sm font-medium">{symbol}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-zinc-400">On {chainDisplayName(networkId)} network</p>
          <button onClick={() => setStage("review")} className="mt-5 h-14 w-full rounded-xl bg-[#8A4FFF] font-medium text-white">Continue</button>
        </BottomSheet>
      )}


{stage === "review" && (
        <BottomSheet onClose={() => setStage("token")}>
          <div className="mb-5 flex items-center gap-3"><button onClick={() => setStage("token")}><ArrowLeft /></button><h2 className="text-xl font-semibold">Payment details</h2></div>
          <p className="text-center text-3xl font-semibold">{formatNaira(value)}</p>
          <p className="mt-2 text-center text-sm text-zinc-500">Estimated {cryptoDue.toFixed(2)} {token}</p>
          <div className="mt-7 divide-y divide-zinc-100 rounded-2xl bg-zinc-50 px-4">
            {[["Payer", payerName], ["Merchant", activeMerchant.businessName], ["Asset", token], ["Network", chainDisplayName(networkId)], ["Rate", `₦${rate.toLocaleString()} / ${token}`]].map(([label, answer]) => (
              <div key={label} className="flex justify-between gap-4 py-4 text-sm"><span className="text-zinc-500">{label}</span><span className="text-right font-medium capitalize">{answer}</span></div>
            ))}
          </div>
          <button onClick={createPaymentOrder} disabled={busy} className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#8A4FFF] text-sm font-medium text-white disabled:opacity-60">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Creating order...</> : <><Wallet className="h-4 w-4" />Get payment address</>}
          </button>
        </BottomSheet>
      )}

      {stage === "transfer" && order && (
        <BottomSheet onClose={() => setStage("review")}>
          <div className="mb-5 flex items-center gap-3"><button onClick={() => setStage("review")}><ArrowLeft /></button><h2 className="text-xl font-semibold">Manual transfer</h2></div>
          <p className="text-center text-sm text-zinc-500">Send ≈ {order.cryptoAmountDue.toFixed(2)} {order.token} on {chainDisplayName(order.network)}</p>
          <p className="mt-1 text-center text-xs text-zinc-400">Suggested amount — your payout follows whatever you actually send.</p>
          {order.status === "expired" || secondsLeft === 0 ? (
            <div className="mt-4 rounded-2xl bg-red-50 p-4 text-center">
              <p className="text-sm font-semibold text-red-700">This payment window has expired</p>
              <p className="mt-1 text-xs text-red-600">Do not send funds to this address. Start a new payment to get a fresh address.</p>
            </div>
          ) : secondsLeft !== null ? (
            <div className={`mt-4 rounded-2xl p-3 text-center ${secondsLeft <= 60 ? "bg-red-50" : "bg-zinc-50"}`}>
              <p className={`text-xs ${secondsLeft <= 60 ? "text-red-600" : "text-zinc-500"}`}>Time left to send</p>
              <p className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${secondsLeft <= 60 ? "text-red-700" : "text-zinc-900"}`}>{formatCountdown(secondsLeft)}</p>
            </div>
          ) : null}
          <div className="mx-auto mt-5 w-fit rounded-2xl border border-zinc-100 p-4"><QRCodeSVG value={order.providerReceiveAddress ?? ""} size={178} fgColor="#111111" /></div>
          <div className="mt-5 flex gap-2 rounded-xl bg-zinc-50 p-3">
            <code className="min-w-0 flex-1 truncate text-xs text-zinc-500">{order.providerReceiveAddress}</code>
            <button onClick={async () => {
              await copy(order.providerReceiveAddress ?? "", "Address");
              setAddressCopied(true);
              window.setTimeout(() => setAddressCopied(false), 1500);
            }}>
              {addressCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-3 divide-y divide-zinc-100 rounded-2xl bg-zinc-50 px-4 text-sm">
            <p className="flex justify-between py-3"><span className="text-zinc-500">Status</span><span className="font-medium capitalize">{order.status}</span></p>
            <p className="flex justify-between py-3"><span className="text-zinc-500">Order</span><span className="font-medium">{order.paycrestOrderId}</span></p>
            {order.validUntil && <p className="flex justify-between py-3"><span className="text-zinc-500">Expires</span><span className="font-medium">{new Date(order.validUntil).toLocaleTimeString()}</span></p>}
          </div>
          <p className="mt-4 text-xs text-zinc-500">Only send {order.token} on the {chainDisplayName(order.network)} network. You have 10 minutes to complete the transfer. The NGN payout is reconciled to the exact amount received.</p>
          <button onClick={() => setStage("success")} className="mt-6 h-14 w-full rounded-xl bg-[#8A4FFF] font-medium text-white">I have paid</button>
        </BottomSheet>
      )}

      {stage === "success" && (
        <BottomSheet onClose={() => setStage(null)}>
          {(() => {
            const view = paymentStatusView(order?.status);
            const tone = {
              waiting: { bg: "bg-[#8A4FFF]/10", fg: "text-[#8A4FFF]" },
              progress: { bg: "bg-amber-100", fg: "text-amber-600" },
              done: { bg: "bg-emerald-100", fg: "text-emerald-600" },
              error: { bg: "bg-red-100", fg: "text-red-600" },
            }[view.tone];
            return (
          <div className="py-8 text-center">
            <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${tone.bg} ${tone.fg}`}>
              {view.tone === "waiting" || view.tone === "progress" ? <Loader2 className="h-8 w-8 animate-spin" /> : view.tone === "done" ? <Check className="h-8 w-8" /> : <X className="h-8 w-8" />}
            </span>
            <h2 className="mt-5 text-2xl font-semibold">{view.title}</h2>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-zinc-500">{view.body}</p>
            <div className="mt-7 rounded-2xl bg-zinc-50 p-4 text-left text-sm">
              <p className="flex justify-between py-2"><span className="text-zinc-500">Request</span><span>#{linkId.toUpperCase()}</span></p>
              <p className="flex justify-between py-2"><span className="text-zinc-500">Amount</span><span>{formatCurrency(value, initialCurrency)}</span></p>
              {order && <p className="flex justify-between py-2"><span className="text-zinc-500">Status</span><span className="font-medium capitalize">{order.status}</span></p>}
            </div>
            <button onClick={() => setStage(null)} className="mt-7 h-14 w-full rounded-xl bg-[#8A4FFF] font-medium text-white">Done</button>
          </div>
            );
          })()}
        </BottomSheet>
      )}
      {feedback && <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#8A4FFF] px-4 py-2 text-xs text-white shadow-lg">{feedback}</div>}
    </main>
  );
}
