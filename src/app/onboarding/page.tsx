import Link from "next/link";
import { Command } from "lucide-react";
import { MerchantOnboarding } from "@/components/onboarding/MerchantOnboarding";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[#f6f3fb] px-5 py-6 text-zinc-950">
      <div className="mx-auto w-full max-w-[460px]">
        <header className="mb-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-lg font-semibold tracking-[-0.04em]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#8A4FFF] text-white">
              <Command className="h-5 w-5" />
            </span>
            LinqSwitch
          </Link>
          <Link href="/dashboard" className="text-sm text-zinc-500">Dashboard</Link>
        </header>
        <section className="mb-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#a985ff]">Merchant setup</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Start accepting payments</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Create the business profile, sign in with email or Google, and verify the Naira payout account.</p>
        </section>
        <MerchantOnboarding onCompleteHref="/dashboard" />
      </div>
    </main>
  );
}
