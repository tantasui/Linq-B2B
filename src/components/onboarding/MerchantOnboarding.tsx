"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Check, CreditCard, Loader2, Mail, ShieldCheck } from "lucide-react";
import { getActiveBusinessId, getActiveDynamicUserId, getActiveSessionToken, getMerchantMe, onboardMerchant, setActiveBusinessId, setActiveDynamicUserId, verifyBank } from "@/lib/api-client";
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
  const [verifying, setVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState<string | undefined>(undefined);
  const [verifyError, setVerifyError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

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
  const continueDisabled = saving;

  const wallets = dynamic.wallets.map((wallet) => ({
    walletId: wallet.id,
    chain: wallet.chain,
    network: wallet.network,
    address: wallet.address,
    walletType: wallet.walletType,
    tokenSupport: ["USDSUI", "USDC"],
  }));

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

  useEffect(() => {
    setVerifiedName(undefined);
    setVerifyError("");
    if (!institutionCode || accountIdentifier.length !== 10) return;
    setVerifying(true);
    const timer = window.setTimeout(() => {
      verifyBank(institutionCode, accountIdentifier)
        .then((result) => {
          setVerifiedName(result.accountName ?? undefined);
          setVerifyError(result.accountName ? "" : "Could not resolve account name.");
        })
        .catch((error) => {
          setVerifyError(error instanceof Error ? error.message : "Verification failed.");
        })
        .finally(() => setVerifying(false));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [institutionCode, accountIdentifier]);

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
        setFeedback("Select a bank and enter your account number.");
        return;
      }
      if (verifying) {
        setFeedback("Please wait for account verification to complete.");
        return;
      }
      if (!verifiedName) {
        setFeedback("Account verification failed. Check your account number and try again.");
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
          resolvedAccountName: verifiedName,
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
              {accountSignedIn ? "Signed in. You can continue to the next step." : "Use email or Google to create your merchant account."}
            </p>
          </div>
          {dynamic.connected ? (
            <div className="rounded-2xl border border-zinc-100 p-4">
              <p className="text-sm font-medium">{dynamic.user?.email ?? "Account ready"}</p>
              <p className="mt-1 text-xs text-zinc-500">Account verified — continue to set up your business.</p>
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
            <p className="mt-2 text-xs leading-5 text-zinc-500">We verify this account during save. Transfers and retries will use this same account.</p>
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
              placeholder="Search bank name"
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
                <span className="block truncate text-sm font-medium">{bank.name}</span>
              </button>
            ))}
            {filteredBanks.length === 0 && <p className="p-3 text-xs text-zinc-500">No bank found.</p>}
          </div>
          <div className="space-y-2">
            <input value={accountIdentifier} onChange={(event) => setAccountIdentifier(event.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" className="h-12 w-full rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-[#8A4FFF]" placeholder="Account number" />
            {verifying && (
              <p className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying account...</p>
            )}
            {verifiedName && !verifying && (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"><Check className="h-3.5 w-3.5" /> {verifiedName}</p>
            )}
            {verifyError && !verifying && (
              <p className="text-xs text-red-500">{verifyError}</p>
            )}
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
          ].map(([label, value]) => (
            <p key={label} className="flex justify-between gap-4 py-3"><span className="text-zinc-500">{label}</span><span className="text-right font-medium">{value}</span></p>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-2xl bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">
        <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#8A4FFF]" /> Payments settle directly to your verified Naira account.</p>
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
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
          </button>
        )}
      </div>
      {feedback && <p className="mt-3 text-xs text-zinc-500">{feedback}</p>}
    </section>
  );
}
