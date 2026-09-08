"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Mail, Search, ShieldCheck } from "lucide-react";
import { getActiveBusinessId, getActiveSessionToken, getMerchantMe, onboardMerchant, setActiveBusinessId, verifyBank } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { getBankByCode, nigerianBanks } from "@/lib/banks";
import { SegmentedBar } from "@/components/brand/SegmentedBar";
import { LinqMark } from "@/components/brand/LinqMark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

type Step = "account" | "business" | "bank" | "review";

const steps: Array<{ id: Step; label: string }> = [
  { id: "account", label: "Account" },
  { id: "business", label: "Business" },
  { id: "bank", label: "Payout" },
  { id: "review", label: "Review" },
];

export function MerchantOnboarding({ onCompleteHref }: { onCompleteHref?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  // Server-signed proof that this address was confirmed by a one-time code.
  // The account is created under the address inside it, not the one typed in.
  const [emailProof, setEmailProof] = useState("");
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
  const accountSignedIn = Boolean(emailProof);
  const continueDisabled = saving;

  useEffect(() => {
    if (!onCompleteHref) return;
    let cancelled = false;
    const storedBusinessId = getActiveBusinessId();
    const storedSessionToken = getActiveSessionToken();
    if (!storedBusinessId && !storedSessionToken) return;
    getMerchantMe()
      .then(({ merchant }) => {
        if (cancelled || !merchant?.id) return;
        setActiveBusinessId(merchant.id);
        router.replace(onCompleteHref);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [onCompleteHref, router]);

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

  const sendCode = async () => {
    setFeedback("");
    setSendingCode(true);
    try {
      const response = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback(body?.message ?? "Could not send a code. Try again.");
        return;
      }
      setCodeSent(true);
    } catch {
      setFeedback("Could not reach the server. Check your connection.");
    } finally {
      setSendingCode(false);
    }
  };

  const confirmCode = async () => {
    setFeedback("");
    setSendingCode(true);
    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback(body?.message ?? "That code is incorrect or has expired.");
        return;
      }
      // An address that already has a merchant account signs straight in
      // rather than being walked through setup a second time.
      if (body.token) {
        setActiveBusinessId(body.merchant?.id ?? "");
        router.replace(onCompleteHref ?? "/dashboard");
        return;
      }
      if (!body.emailProof) {
        setFeedback("Could not verify that address. Try again.");
        return;
      }
      setEmailProof(body.emailProof);
      // Prefill the business email with the verified one; most merchants use
      // the same address for both, and it stays editable.
      setBusinessEmail((current) => current || body.email || email.trim());
      setStep("business");
    } catch {
      setFeedback("Could not reach the server. Check your connection.");
    } finally {
      setSendingCode(false);
    }
  };

  const next = async () => {
    setFeedback("");
    if (step === "account") {
      if (!accountSignedIn) {
        setFeedback("Verify your email before continuing.");
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
      if (!emailProof) {
        throw new Error("Verify your email before saving merchant setup.");
      }
      const response = await onboardMerchant({
        emailProof,
        userName: merchantName,
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
        wallets: [],
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
    <Card className="p-5 sm:p-6">
      <div className="mb-6 flex items-start gap-3">
        <LinqMark size={30} className="mt-0.5 shrink-0 text-accent" />
        <div>
          <h2 className="text-sm font-medium">Merchant setup</h2>
          <p className="mt-1 text-xs leading-5 text-text-muted">
            Four steps to start accepting stablecoins and settling in Naira.
          </p>
        </div>
      </div>

      {/* Step progress uses the brand's segmented bar rather than a percentage. */}
      <SegmentedBar value={stepIndex + 1} segments={steps.length} className="mb-3" />
      <div className="mb-7 flex justify-between">
        {steps.map((entry, index) => (
          <p
            key={entry.id}
            className={cn(
              "text-micro transition-colors duration-fast ease-linq",
              index === stepIndex
                ? "font-medium text-accent-text"
                : index < stepIndex
                  ? "text-text-muted"
                  : "text-text-subtle",
            )}
          >
            {entry.label}
          </p>
        ))}
      </div>

      {step === "account" ? (
        <div className="space-y-4">
          <div className="rounded-md bg-surface-2 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-accent-text" />
              {accountSignedIn ? "Email verified" : "Create your account"}
            </p>
            <p className="mt-2 text-xs leading-5 text-text-muted">
              {accountSignedIn
                ? `Verified ${email.trim()}. Continue to your business details.`
                : "We'll email you a 6-digit code. This is also how you will log in later."}
            </p>
          </div>

          {accountSignedIn ? (
            <p className="flex items-center gap-2 text-xs text-success">
              <Check className="h-3.5 w-3.5" /> Account ready
            </p>
          ) : codeSent ? (
            <div className="space-y-3">
              <Field label="Sign-in code">
                <Input
                  value={code}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  // Digits only: a pasted code carrying a stray space would
                  // otherwise fail with no explanation.
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                />
              </Field>
              <Button
                size="lg"
                className="w-full"
                loading={sendingCode}
                disabled={code.length !== 6}
                onClick={confirmCode}
              >
                Verify email
              </Button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setCodeSent(false);
                    setCode("");
                    setFeedback("");
                  }}
                  className="inline-flex items-center gap-1 text-text-muted transition-opacity hover:opacity-75"
                >
                  <ArrowLeft className="h-3 w-3" /> Change email
                </button>
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={sendingCode}
                  className="font-medium text-accent-text transition-opacity hover:opacity-75 disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="Email address">
                <Input
                  value={email}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@business.com"
                />
              </Field>
              <Button
                size="lg"
                className="w-full"
                loading={sendingCode}
                disabled={!email.includes("@")}
                onClick={sendCode}
              >
                <Mail className="h-4 w-4" /> Send code
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {step === "business" ? (
        <div className="space-y-4">
          <Field label="Business name">
            <Input
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="Mama Tolu Foods"
            />
          </Field>
          <Field label="Merchant name" hint="The person responsible for this account.">
            <Input
              value={merchantName}
              onChange={(event) => setMerchantName(event.target.value)}
              placeholder="Tolu Adeyemi"
            />
          </Field>
          <Field label="Business email">
            <Input
              value={businessEmail}
              onChange={(event) => setBusinessEmail(event.target.value)}
              placeholder="hello@mamatolu.ng"
              inputMode="email"
            />
          </Field>
          <Field label="Location">
            <Input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Lagos, Nigeria"
            />
          </Field>
        </div>
      ) : null}

      {step === "bank" ? (
        <div className="space-y-4">
          <div className="rounded-md bg-surface-2 p-4">
            <p className="text-sm font-medium">Where should we send your Naira?</p>
            <p className="mt-2 text-xs leading-5 text-text-muted">
              We resolve the account name with your bank and show it to payers before they send —
              so they can confirm they are paying the right business.
            </p>
          </div>

          <Field label="Bank">
            <label className="flex h-12 items-center gap-3 rounded-md bg-surface px-4 text-text-muted ring-1 ring-line focus-within:ring-2 focus-within:ring-accent">
              <Search className="h-4 w-4 shrink-0" />
              <input
                value={bankQuery}
                onChange={(event) => setBankQuery(event.target.value)}
                placeholder="Search banks"
                className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-subtle"
              />
            </label>
          </Field>

          <div className="max-h-56 space-y-1 overflow-y-auto rounded-md bg-surface-2 p-1.5">
            {filteredBanks.map((bank) => (
              <button
                key={bank.code}
                type="button"
                onClick={() => {
                  setInstitutionCode(bank.code);
                  setBankQuery(bank.name);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-sm px-3 py-2.5 text-left text-sm",
                  "transition-colors duration-fast ease-linq hover:bg-surface",
                  institutionCode === bank.code && "bg-surface",
                )}
              >
                <span className="min-w-0 truncate">{bank.name}</span>
                {institutionCode === bank.code ? (
                  <Check className="h-4 w-4 shrink-0 text-accent" />
                ) : null}
              </button>
            ))}
            {filteredBanks.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-text-muted">No banks match that search.</p>
            ) : null}
          </div>

          <Field
            label="Account number"
            error={verifyError || undefined}
            hint={verifying ? "Checking with your bank…" : undefined}
          >
            <Input
              value={accountIdentifier}
              onChange={(event) =>
                setAccountIdentifier(event.target.value.replace(/\D/g, "").slice(0, 10))
              }
              inputMode="numeric"
              placeholder="0123456789"
              className="tnum"
              invalid={Boolean(verifyError)}
            />
          </Field>

          {/* The resolved name is the whole point of this step — give it weight. */}
          {verifiedName ? (
            <div className="linq-fade-in flex items-start gap-2.5 rounded-md bg-success-soft px-4 py-3.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <div className="min-w-0">
                <p className="text-xs text-text-muted">Account name</p>
                <p className="mt-0.5 truncate text-sm font-semibold">{verifiedName}</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === "review" ? (
        <dl className="divide-y divide-line rounded-md bg-surface-2 px-4 text-sm">
          {[
            ["Business", businessName],
            ["Merchant", merchantName],
            ["Email", businessEmail],
            ["Location", location || "—"],
            ["Bank", selectedBank?.name ?? institutionCode],
            ["Account", accountIdentifier],
            ["Account name", verifiedName ?? "Not resolved"],
            ["Sign-in email", email.trim() || "—"],
          ].map(([label, answer]) => (
            <div key={label} className="flex justify-between gap-4 py-3">
              <dt className="text-text-muted">{label}</dt>
              <dd className="min-w-0 truncate text-right font-medium">{answer}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {feedback ? (
        <p className="linq-fade-in mt-4 rounded-md bg-accent-soft px-4 py-3 text-xs leading-5 text-accent-text">
          {feedback}
        </p>
      ) : null}

      <div className="mt-6 flex gap-2">
        <Button
          variant="secondary"
          size="lg"
          aria-label="Back"
          disabled={stepIndex === 0 || saving}
          onClick={back}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {step === "review" ? (
          <Button size="lg" className="flex-1" loading={saving} onClick={submit}>
            <Check className="h-4 w-4" /> Save and finish
          </Button>
        ) : (
          <Button size="lg" className="flex-1" disabled={continueDisabled} onClick={next}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
