"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Command, Loader2, Mail } from "lucide-react";
import { useDynamicBridge } from "@/components/providers/DynamicBridgeProvider";
import { getMerchantMe, hasActiveSessionHint, setActiveBusinessId, setActiveDynamicUserId } from "@/lib/api-client";

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
      <main className="flex min-h-screen items-center justify-center bg-[#f6f3fb]">
        <Loader2 className="h-6 w-6 animate-spin text-[#8A4FFF]" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f3fb] px-5 py-6 text-zinc-950">
      <div className="mx-auto w-full max-w-[460px]">
        <header className="mb-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-lg font-semibold tracking-[-0.04em]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#8A4FFF] text-white">
              <Command className="h-5 w-5" />
            </span>
            Linq
          </Link>
        </header>

        <section className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[#a985ff]">Welcome back</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Log in to your account</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Sign in with the same email or Google account you used to set up your merchant profile.</p>
        </section>

        <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
          <button
            onClick={signIn}
            disabled={busy}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#8A4FFF] text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {busy ? "Signing in..." : "Continue with email or Google"}
          </button>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-600">
              {error}
              {error.includes("setup") && (
                <Link href="/onboarding" className="ml-1 font-medium underline">Go to setup</Link>
              )}
            </div>
          )}

          <p className="mt-5 text-center text-xs text-zinc-400">
            Don&apos;t have an account?{" "}
            <Link href="/onboarding" className="font-medium text-[#8A4FFF]">
              Set up now <ArrowRight className="inline h-3 w-3" />
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
