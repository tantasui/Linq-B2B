"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Banknote, Check, Copy, Landmark, Loader2, Wallet, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { TokenIcon } from "@/components/icons/CryptoIcons";
import { apiUrl, createOrder, getPaycrestRate, getPaycrestTokens, getPaymentLink } from "@/lib/api-client";
import { getBankLogo } from "@/lib/banks";
import type { FiatCurrency, PaymentMode, StablecoinSymbol } from "@/lib/payment-data";
import { formatCurrency } from "@/lib/payment-data";
import type { MerchantRecord, OrderRecord, PaymentLinkRecord, TokenNetworkRecord } from "@/server/types";
type Stage = null | "naira" | "customer" | "asset" | "review" | "transfer" | "success";

interface PaymentCheckoutProps {
  linkId: string;
  mode: PaymentMode;
  initialAmount?: number;
  currency: FiatCurrency;
  description?: string;
}

const payerStorageKey = "linq:payer";

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
  const [networkId, setNetworkId] = useState("sui");
  const [tokens, setTokens] = useState<TokenNetworkRecord[]>([]);
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [rate, setRate] = useState(1500);
  const [order, setOrder] = useState<OrderRecord | null>(null);

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
      setTokens(supported.filter((entry) => entry.symbol === "USDSUI"));
    }).catch(() => undefined);
  }, [linkId]);

  useEffect(() => {
    if (!tokens.length) return;
    if (!tokens.some((entry) => entry.symbol === token && entry.network === networkId)) {
      setNetworkId(tokens.find((entry) => entry.symbol === token)?.network ?? "base");
    }
  }, [networkId, token, tokens]);

  useEffect(() => {
    if (!value || !networkId) return;
    getPaycrestRate({ network: "sui", token: "USDSUI", amountNgn: value }).then((data) => setRate(data.marketRate || 1500)).catch(() => setRate(1500));
  }, [networkId, token, value]);

  useEffect(() => {
    if (!order || ["settled", "refunded", "expired", "failed", "cancelled"].includes(order.status)) return;
    const wsUrl = apiUrl("/ws").replace(/^http/, "ws");
    const orderId = order.id;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    function connect() {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => ws!.send(JSON.stringify({ type: "subscribe", orderId }));
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "order_update" && msg.order) {
            setOrder(msg.order);
            if (["settled", "refunded", "expired", "failed", "cancelled"].includes(msg.order.status)) ws?.close();
          }
        } catch {}
      };
      ws.onclose = () => { reconnectTimer = setTimeout(connect, 5000); };
    }
    connect();
    return () => { ws?.close(); clearTimeout(reconnectTimer); };
  }, [order]);

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
        <p className="text-sm font-medium text-[#8A4FFF]">Linq</p>
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
              <TokenIcon token="USDSUI" size={36} />
              <TokenIcon token="USDC" size={36} />
            </div>
            <span className="text-sm text-zinc-600">Pay with Sui</span>
          </button>
        </div>
      </section>
      <footer className="fixed bottom-0 left-1/2 w-full max-w-[460px] -translate-x-1/2 border-t border-zinc-100 bg-white/95 py-5 text-center text-sm text-zinc-500">
        Powered by <span className="font-medium text-[#8A4FFF]">Linq</span>
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
          <p className="mb-3 mt-6 text-sm font-medium">Select stablecoin</p>
          <div className="grid grid-cols-2 gap-3">
            {(["USDSUI", "USDC"] as const).map((symbol) => (
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
          <p className="mt-3 text-center text-xs text-zinc-400">Both on Sui network</p>
          <button disabled={!canContinue} onClick={() => setStage("review")} className="mt-5 h-14 w-full rounded-xl bg-[#8A4FFF] font-medium text-white disabled:opacity-40">Continue</button>
        </BottomSheet>
      )}


{stage === "review" && (
        <BottomSheet onClose={() => setStage("asset")}>
          <div className="mb-5 flex items-center gap-3"><button onClick={() => setStage("asset")}><ArrowLeft /></button><h2 className="text-xl font-semibold">Payment details</h2></div>
          <p className="text-center text-3xl font-semibold">{formatNaira(value)}</p>
          <p className="mt-2 text-center text-sm text-zinc-500">Estimated {cryptoDue.toFixed(3)} {token}</p>
          <div className="mt-7 divide-y divide-zinc-100 rounded-2xl bg-zinc-50 px-4">
            {[["Payer", payerName], ["Merchant", activeMerchant.businessName], ["Asset", token], ["Network", "Sui"], ["Rate", `₦${rate.toLocaleString()} / ${token}`]].map(([label, answer]) => (
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
          <p className="text-center text-sm text-zinc-500">Send exactly {order.cryptoAmountDue.toFixed(6)} {order.token} on Sui</p>
          <div className="mx-auto mt-5 w-fit rounded-2xl border border-zinc-100 p-4"><QRCodeSVG value={order.providerReceiveAddress ?? ""} size={178} fgColor="#111111" /></div>
          <div className="mt-5 flex gap-2 rounded-xl bg-zinc-50 p-3">
            <code className="min-w-0 flex-1 truncate text-xs text-zinc-500">{order.providerReceiveAddress}</code>
            <button onClick={() => copy(order.providerReceiveAddress ?? "", "Address")}><Copy className="h-4 w-4" /></button>
          </div>
          <div className="mt-2 flex gap-2 rounded-xl bg-zinc-50 p-3">
            <p className="text-xs text-zinc-400 shrink-0">Coin type</p>
            <code className="min-w-0 flex-1 truncate text-xs text-zinc-500">
              {order.token === "USDC" ? "0xdba346...USDC" : "0x44f838...USDSUI"}
            </code>
            <button onClick={() => copy(
              order.token === "USDC"
                ? "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
                : "0x44f838219cf67b058f3b37907b655f226153c18e33dfcd0da559a844fea9b1c1::usdsui::USDSUI",
              "Coin type"
            )}><Copy className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 divide-y divide-zinc-100 rounded-2xl bg-zinc-50 px-4 text-sm">
            <p className="flex justify-between py-3"><span className="text-zinc-500">Status</span><span className="font-medium capitalize">{order.status}</span></p>
            <p className="flex justify-between py-3"><span className="text-zinc-500">Order</span><span className="font-medium">{order.paycrestOrderId}</span></p>
            {order.validUntil && <p className="flex justify-between py-3"><span className="text-zinc-500">Expires</span><span className="font-medium">{new Date(order.validUntil).toLocaleTimeString()}</span></p>}
          </div>
          <p className="mt-4 text-xs text-zinc-500">Only send {order.token} on the Sui network. You have 10 minutes to complete the transfer.</p>
          <button onClick={() => setStage("success")} className="mt-6 h-14 w-full rounded-xl bg-[#8A4FFF] font-medium text-white">I have paid</button>
        </BottomSheet>
      )}

      {stage === "success" && (
        <BottomSheet onClose={() => setStage(null)}>
          <div className="py-8 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#8A4FFF]/10 text-[#8A4FFF]"><Check className="h-8 w-8" /></span>
            <h2 className="mt-5 text-2xl font-semibold">Payment submitted</h2>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-zinc-500">We’ll monitor the deposit and notify {activeMerchant.businessName} once Linq confirms the transfer and initiates the NGN payout.</p>
            <div className="mt-7 rounded-2xl bg-zinc-50 p-4 text-left text-sm">
              <p className="flex justify-between py-2"><span className="text-zinc-500">Request</span><span>#{linkId.toUpperCase()}</span></p>
              <p className="flex justify-between py-2"><span className="text-zinc-500">Amount</span><span>{formatCurrency(value, initialCurrency)}</span></p>
            </div>
            <button onClick={() => setStage(null)} className="mt-7 h-14 w-full rounded-xl bg-[#8A4FFF] font-medium text-white">Done</button>
          </div>
        </BottomSheet>
      )}
      {feedback && <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#8A4FFF] px-4 py-2 text-xs text-white shadow-lg">{feedback}</div>}
    </main>
  );
}
