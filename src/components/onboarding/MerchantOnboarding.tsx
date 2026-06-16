"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Check, CreditCard, Loader2, Mail, ShieldCheck } from "lucide-react";
import { getActiveBusinessId, getActiveDynamicUserId, getActiveSessionToken, getMerchantMe, onboardMerchant, setActiveBusinessId, setActiveDynamicUserId } from "@/lib/api-client";
import { useDynamicBridge } from "@/components/providers/DynamicBridgeProvider";
import { cn } from "@/lib/utils";
import { getBankByCode, nigerianBanks } from "@/lib/banks";

type Step = "account" | "business" | "bank" | "review";

const steps: Array<{ id: Step; label: string }> = [
  { id: "account", label: "Account" },
  { id: "business", label: "Business" },
  { id: "bank", label: "Payout" },
  { id: "review", label: "Review" },
];

export function MerchantOnboarding({ onCompleteHref }: { onCompleteHref?: string }) {
  const router = useRouter();
  const dynamic = useDynamicBridge();
  const [step, setStep] = useState<Step>("account");
  const [businessName, setBusinessName] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [location, setLocation] = useState("");
  const [institutionCode, setInstitutionCode] = useState("");
  const [bankQuery, setBankQuery] = useState("");
  const [accountIdentifier, setAccountIdentifier] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [walletSetupTick, setWalletSetupTick] = useState(0);
  const [walletSetupSlow, setWalletSetupSlow] = useState(false);

  const stepIndex = steps.findIndex((entry) => entry.id === step);
  const selectedBank = getBankByCode(institutionCode);
  const filteredBanks = useMemo(() => {
    const query = bankQuery.trim().toLowerCase();
    if (!query) return nigerianBanks.slice(0, 8);
    return nigerianBanks
      .filter((bank) => bank.name.toLowerCase().includes(query) || bank.code.includes(query))
      .slice(0, 10);
  }, [bankQuery]);
  const accountSignedIn = dynamic.connected && Boolean(dynamic.user?.id);
  const walletReady = dynamic.wallets.length > 0;
  const waitingForWallet = step === "account" && accountSignedIn && !walletReady;
  const walletSetupDots = ".".repeat((walletSetupTick % 3) + 1);
  const continueDisabled = saving || waitingForWallet;

  const wallets = dynamic.wallets.map((wallet) => ({
    walletId: wallet.id,
    chain: wallet.chain,
    network: wallet.network,
    address: wallet.address,
    walletType: wallet.walletType,
    tokenSupport: ["USDSUI", "USDC"],
  }));

  useEffect(() => {
    if (!waitingForWallet) {
      setWalletSetupTick(0);
      setWalletSetupSlow(false);
      return;
    }

    const interval = window.setInterval(() => {
      setWalletSetupTick((current) => current + 1);
    }, 450);
    const slowTimer = window.setTimeout(() => {
      setWalletSetupSlow(true);
    }, 12000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(slowTimer);
    };
  }, [waitingForWallet]);

  useEffect(() => {
    if (!onCompleteHref) return;
    let cancelled = false;
    const storedBusinessId = getActiveBusinessId();
    const storedDynamicUserId = getActiveDynamicUserId();
    const storedSessionToken = getActiveSessionToken();
    if (dynamic.user?.id) setActiveDynamicUserId(dynamic.user.id);
    if (!dynamic.user?.id && !storedBusinessId && !storedDynamicUserId && !storedSessionToken) return;
    getMerchantMe()
      .then(({ merchant }) => {
        if (cancelled || !merchant?.id) return;
        if (dynamic.user?.id && merchant.dynamicUserId !== dynamic.user.id) return;
        setActiveBusinessId(merchant.id);
        router.replace(onCompleteHref);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [dynamic.user?.id, onCompleteHref, router]);

  const startSignIn = async () => {
    setFeedback("");
    try {
      await dynamic.connect();
      if (!dynamic.connected) setFeedback("Complete sign in, then continue.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Sign-in could not start.");
    }
  };

  const next = async () => {
    setFeedback("");
    if (step === "account") {
      if (!dynamic.connected) {
        await startSignIn();
        return;
      }
      if (!dynamic.user?.id || !dynamic.user.email) {
        setFeedback("Finish sign in before continuing.");
        return;
      }
      if (!dynamic.wallets.length) {
        setFeedback("Your business wallet is not ready yet. Finish sign-up, then continue.");
        return;
      }
      setStep("business");
      return;
    }
    if (step === "business") {
      if (!businessName.trim() || !merchantName.trim() || !businessEmail.includes("@")) {
        setFeedback("Add business name, merchant name, and a valid email.");
        return;
      }
      setStep("bank");
      return;
    }
    if (step === "bank") {
      if (!institutionCode.trim() || !accountIdentifier.trim()) {
        setFeedback("Add payout bank code and account number.");
        return;
      }
      setStep("review");
    }
  };

  const back = () => {
    setFeedback("");
    setStep(steps[Math.max(0, stepIndex - 1)].id);
  };

  const submit = async () => {
    setSaving(true);
    setFeedback("");
    try {
      if (!dynamic.connected) {
        await dynamic.connect();
        setFeedback("Complete sign in, then press save again.");
        return;
      }
      if (!dynamic.user?.id || !dynamic.user.email) {
        throw new Error("Sign in before saving merchant setup.");
      }
      setActiveDynamicUserId(dynamic.user.id);
      if (!dynamic.wallets.length) {
        throw new Error("Your business wallet is not ready yet. Finish sign-up, then save.");
      }
      const response = await onboardMerchant({
        dynamicUserId: dynamic.user.id,
        userEmail: dynamic.user.email,
        userName: dynamic.user.name ?? merchantName,
        businessName,
        merchantName,
        businessEmail,
        location,
        bank: {
          institutionCode,
          accountIdentifier,
          institutionName: selectedBank?.name,
        },
        wallets,
      });
      setFeedback(`Saved ${response.merchant.businessName}. Bank account is ${response.merchant.bankAccounts[0]?.verificationStatus}.`);
      if (onCompleteHref) router.push(onCompleteHref);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Onboarding failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <span className="rounded-2xl bg-[#f3edff] p-3 text-[#8A4FFF]"><Building2 className="h-5 w-5" /></span>
        <div>
          <h2 className="font-medium">Merchant onboarding</h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">Create your merchant account, add business details, and verify the Naira payout account.</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-4 gap-2">
        {steps.map((entry, index) => (
          <div key={entry.id} className="space-y-2">
            <div className={cn("h-1.5 rounded-full", index <= stepIndex ? "bg-[#8A4FFF]" : "bg-zinc-100")} />
            <p className={cn("text-[11px]", entry.id === step ? "font-medium text-[#8A4FFF]" : "text-zinc-400")}>{entry.label}</p>
          </div>
        ))}
      </div>

      {step === "account" && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-zinc-50 p-4">
            <p className="text-sm font-medium">{accountSignedIn ? "Account verified" : "Sign in or create your account"}</p>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {accountSignedIn
                ? walletReady
                  ? "Your Sui wallet is ready. You can continue."
                  : "Setting up your Sui wallet — this takes a moment."
                : "Use email or Google. Your Sui wallet is created for you and stays under your control."}
            </p>
          </div>
          {dynamic.connected ? (
            <div className="rounded-2xl border border-zinc-100 p-4">
              <p className="text-sm font-medium">{dynamic.user?.email ?? "Account ready"}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {walletReady ? `${dynamic.wallets.length} business wallet${dynamic.wallets.length === 1 ? "" : "s"} ready` : `Finishing wallet setup${walletSetupDots}`}
              </p>
              {!walletReady && (
                <button onClick={startSignIn} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-700">
                  <Mail className="h-4 w-4" /> Open wallet setup
                </button>
              )}
              {walletSetupSlow && !walletReady && (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-700">
                  Wallet setup is taking longer than expected. Open Dynamic setup to finish any passkey, backup, or embedded-wallet step.
                </p>
              )}
              <div className="mt-3 space-y-2">
                {dynamic.wallets.map((wallet) => (
                  <code key={`${wallet.network}-${wallet.address}`} className="block truncate rounded-xl bg-zinc-50 p-3 text-xs text-zinc-500">{wallet.network}: {wallet.address}</code>
                ))}
              </div>
            </div>
          ) : (
            <button onClick={startSignIn} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#8A4FFF] text-sm font-medium text-white">
              <Mail className="h-4 w-4" /> Continue with email or Google
            </button>
          )}
        </div>
      )}

      {step === "business" && (
        <div className="grid gap-3">
          <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} className="h-12 rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-[#8A4FFF]" placeholder="Business name" />
          <input value={merchantName} onChange={(event) => setMerchantName(event.target.value)} className="h-12 rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-[#8A4FFF]" placeholder="Merchant name" />
          <input value={businessEmail} onChange={(event) => setBusinessEmail(event.target.value)} className="h-12 rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-[#8A4FFF]" placeholder="Business email" />
          <input value={location} onChange={(event) => setLocation(event.target.value)} className="h-12 rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-[#8A4FFF]" placeholder="Business location" />
        </div>
      )}

      {step === "bank" && (
        <div className="grid gap-3">
          <div className="rounded-2xl bg-zinc-50 p-4">
            <p className="text-sm font-medium">Verified Naira payout</p>
            <p className="mt-2 text-xs leading-5 text-zinc-500">Paycrest verifies this account during save. Transfers and retries will use this same account.</p>
          </div>
          <label className="block">
            <span className="mb-2 block text-xs text-zinc-500">Bank</span>
            <input
              value={bankQuery}
              onChange={(event) => {
                setBankQuery(event.target.value);
                setInstitutionCode("");
              }}
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-[#8A4FFF]"
              placeholder="Search bank name or code"
            />
          </label>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-zinc-100 bg-white p-2">
            {filteredBanks.map((bank) => (
              <button
                key={`${bank.code}-${bank.name}`}
                type="button"
                onClick={() => {
                  setInstitutionCode(bank.code);
                  setBankQuery(bank.name);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl p-3 text-left transition duration-200 hover:bg-zinc-50",
                  institutionCode === bank.code && "bg-[#f7f3ff] text-[#8A4FFF]",
                )}
              >
                {bank.logo ? <img src={bank.logo} alt="" loading="eager" decoding="async" className="h-8 w-8 rounded-lg object-contain" /> : <span className="h-8 w-8 rounded-lg bg-zinc-100" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{bank.name}</span>
                  <span className="text-xs text-zinc-500">Bank code {bank.code}</span>
                </span>
              </button>
            ))}
            {filteredBanks.length === 0 && <p className="p-3 text-xs text-zinc-500">No bank found.</p>}
          </div>
          {selectedBank && (
            <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white p-3">
              {selectedBank.logo ? <img src={selectedBank.logo} alt="" loading="eager" decoding="async" className="h-8 w-8 rounded-lg object-contain" /> : <span className="h-8 w-8 rounded-lg bg-zinc-100" />}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{selectedBank.name}</p>
                <p className="text-xs text-zinc-500">Bank code {selectedBank.code}</p>
              </div>
            </div>
          )}
          <div>
            <input value={accountIdentifier} onChange={(event) => setAccountIdentifier(event.target.value)} className="h-12 w-full rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-[#8A4FFF]" placeholder="Account number" />
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="divide-y divide-zinc-100 rounded-2xl bg-zinc-50 px-4 text-sm">
          {[
            ["Business", businessName],
            ["Merchant", merchantName],
            ["Email", businessEmail],
            ["Location", location || "Not set"],
            ["Bank", `${selectedBank?.name ?? institutionCode} / ${accountIdentifier}`],
            ["Business wallet", `${dynamic.wallets.length} wallet${dynamic.wallets.length === 1 ? "" : "s"} ready`],
          ].map(([label, value]) => (
            <p key={label} className="flex justify-between gap-4 py-3"><span className="text-zinc-500">{label}</span><span className="text-right font-medium">{value}</span></p>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-2xl bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">
        <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#8A4FFF]" /> Your business wallet stays under your control.</p>
        <p className="mt-1 flex items-center gap-2"><CreditCard className="h-4 w-4 text-[#8A4FFF]" /> Payout retries always use the verified account above.</p>
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
        <button onClick={back} disabled={stepIndex === 0 || saving} className="flex h-12 items-center justify-center rounded-xl border border-zinc-200 px-4 text-sm font-medium text-zinc-600 disabled:opacity-40">
          <ArrowLeft className="h-4 w-4" />
        </button>
        {step === "review" ? (
          <button onClick={submit} disabled={saving} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#8A4FFF] text-sm font-medium text-white disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save merchant setup
          </button>
        ) : (
          <button onClick={next} disabled={continueDisabled} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#8A4FFF] text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500">
            {waitingForWallet ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Finishing setup{walletSetupDots}
              </>
            ) : (
              <>
                Continue <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>
      {feedback && <p className="mt-3 text-xs text-zinc-500">{feedback}</p>}
    </section>
  );
}
