"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import { useDynamicBridge } from "@/components/providers/DynamicBridgeProvider";
import { getMerchantMe, hasActiveSessionHint, setActiveBusinessId, setActiveDynamicUserId } from "@/lib/api-client";
import { LinqLoader, LinqMark, LinqWordmark } from "@/components/brand/LinqMark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const dynamic = useDynamicBridge();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(hasActiveSessionHint());

  useEffect(() => {
    if (!hasActiveSessionHint()) return;
    getMerchantMe()
      .then(({ merchant }) => {
        if (merchant?.id) {
          setActiveBusinessId(merchant.id);
          if (merchant.dynamicUserId) setActiveDynamicUserId(merchant.dynamicUserId);
          router.replace("/dashboard");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  useEffect(() => {
    if (!dynamic.connected || !dynamic.user?.id) return;
    setBusy(true);
    setError("");
    if (dynamic.user.id) setActiveDynamicUserId(dynamic.user.id);
    getMerchantMe()
      .then(({ merchant }) => {
        if (merchant?.id) {
          setActiveBusinessId(merchant.id);
          router.replace("/dashboard");
        } else {
          setError("No merchant account found. Please complete setup first.");
          setBusy(false);
        }
      })
      .catch(() => {
        setError("Could not load your account. Please try again.");
        setBusy(false);
      });
  }, [dynamic.connected, dynamic.user?.id, router]);

  const signIn = async () => {
    setError("");
    setBusy(true);
    try {
      await dynamic.connect();
      if (!dynamic.connected) {
        setError("Sign-in was not completed. Try again.");
        setBusy(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
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

        <section className="mb-7">
          <p className="text-micro uppercase tracking-[0.16em] text-accent-text">Welcome back</p>
          <h1 className="mt-2 text-hero font-semibold">Log in to your account</h1>
          <p className="mt-3 text-sm leading-6 text-text-muted">
            Use the same email or Google account you set your merchant profile up with.
          </p>
        </section>

        <Card className="p-5">
          <Button size="lg" className="w-full" loading={busy} onClick={signIn}>
            {busy ? null : <Mail className="h-4 w-4" />}
            {busy ? "Signing in…" : "Continue with email or Google"}
          </Button>

          {error ? (
            <div className="linq-fade-in mt-4 rounded-md bg-danger-soft px-4 py-3 text-xs leading-5 text-danger">
              {error}
              {error.includes("setup") ? (
                <Link href="/onboarding" className="ml-1 font-medium underline underline-offset-2">
                  Go to setup
                </Link>
              ) : null}
            </div>
          ) : null}

          <p className="mt-6 text-center text-xs text-text-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/onboarding"
              className="font-medium text-accent-text transition-opacity duration-fast ease-linq hover:opacity-75"
            >
              Set up now <ArrowRight className="inline h-3 w-3" />
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
