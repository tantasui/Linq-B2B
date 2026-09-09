"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Mail } from "lucide-react";
import {
  getMerchantMe,
  hasActiveSessionHint,
  setActiveBusinessId,
  setActiveSessionToken,
} from "@/lib/api-client";
import { LinqLoader, LinqMark, LinqWordmark } from "@/components/brand/LinqMark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Step = "email" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checking, setChecking] = useState(hasActiveSessionHint());
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasActiveSessionHint()) return;
    getMerchantMe()
      .then(({ merchant }) => {
        if (merchant?.id) {
          setActiveBusinessId(merchant.id);
          router.replace("/dashboard");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  useEffect(() => {
    if (step === "code") codeInput.current?.focus();
  }, [step]);

  const requestCode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body?.message ?? "Could not send a code. Try again.");
        return;
      }
      setStep("code");
      setNotice(`We sent a 6-digit code to ${email.trim()}.`);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          body?.needsOnboarding
            ? "No merchant account found for this email. Complete setup first."
            : body?.message ?? "That code is incorrect or has expired.",
        );
        return;
      }
      setActiveSessionToken(body.token);
      if (body.merchant?.id) setActiveBusinessId(body.merchant.id);
      router.replace("/dashboard");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg">
        <LinqLoader size={44} label="Checking your session" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg px-5 py-6 text-text">
      <div className="mx-auto w-full max-w-[460px]">
        <header className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 text-accent">
            <LinqMark size={30} />
            <LinqWordmark size={17} />
          </Link>
        </header>

<section className="mb-8">
          <p className="font-sans font-medium text-label tracking-mono text-accent-text">Welcome back</p>
          <h1 className="u-display mt-4 text-hero">
            Log in to
            <br />
            your account.
          </h1>
          <p className="mt-5 text-sm leading-6 text-text-muted">
            {step === "email"
              ? "Enter the email you set your merchant profile up with. We'll send you a sign-in code."
              : "Enter the 6-digit code we just emailed you."}
          </p>
        </section>

        <Card className="p-5">
          {step === "email" ? (
            <form onSubmit={requestCode}>
              <label htmlFor="email" className="mb-2 block text-xs font-medium text-text-muted">
                Email address
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                className="mb-4 w-full rounded-md bg-surface-2 px-4 py-2.5 text-sm text-text outline-none ring-1 ring-line focus:ring-accent"
              />
              <Button size="lg" type="submit" className="w-full" loading={busy} disabled={!email.trim()}>
                {busy ? null : <Mail className="h-4 w-4" />}
                {busy ? "Sending…" : "Send sign-in code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyCode}>
              <label htmlFor="code" className="mb-2 block text-xs font-medium text-text-muted">
                Sign-in code
              </label>
              <input
                id="code"
                ref={codeInput}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={code}
                // Digits only: a pasted code carrying a stray space would
                // otherwise fail with no explanation.
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="mb-4 w-full rounded-md bg-surface-2 px-4 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-text outline-none ring-1 ring-line focus:ring-accent"
              />
              <Button size="lg" type="submit" className="w-full" loading={busy} disabled={code.length !== 6}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>

              <div className="mt-4 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError("");
                    setNotice("");
                  }}
                  className="inline-flex items-center gap-1 text-text-muted transition-opacity hover:opacity-75"
                >
                  <ArrowLeft className="h-3 w-3" /> Change email
                </button>
                <button
                  type="button"
                  onClick={() => requestCode()}
                  disabled={busy}
                  className="font-medium text-accent-text transition-opacity hover:opacity-75 disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>
            </form>
          )}

          {notice && !error ? (
            <p className="linq-fade-in mt-4 rounded-md bg-surface-2 px-4 py-3 text-xs leading-5 text-text-muted">
              {notice}
            </p>
          ) : null}

          {error ? (
            <div className="linq-fade-in mt-4 rounded-md bg-danger-soft px-4 py-3 text-xs ring-1 ring-inset ring-danger/20 leading-5 text-danger">
              {error}
              {error.includes("setup") ? (
                <Link href="/onboarding" className="ml-1 font-medium underline underline-offset-2">
                  Go to setup
                </Link>
              ) : null}
            </div>
          ) : null}

          <p className="mt-6 text-center font-sans font-medium text-micro tracking-mono text-text-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/onboarding"
              className="text-accent-text transition-opacity duration-fast ease-linq hover:opacity-75"
            >
              Set up now <ArrowRight className="inline h-3 w-3" />
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
