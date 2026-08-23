import Link from "next/link";
import { MerchantOnboarding } from "@/components/onboarding/MerchantOnboarding";
import { LinqMark, LinqWordmark } from "@/components/brand/LinqMark";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-bg px-5 py-6 text-text">
      <div className="mx-auto w-full max-w-[520px]">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-accent">
            <LinqMark size={30} />
            <LinqWordmark size={17} />
          </Link>
          <Link
            href="/login"
            className="text-sm text-text-muted transition-colors duration-fast ease-linq hover:text-text"
          >
            Log in
          </Link>
        </header>

        <section className="mb-6">
          <p className="text-micro uppercase tracking-[0.16em] text-accent-text">Merchant setup</p>
          <h1 className="mt-2 text-hero font-semibold">Start accepting payments</h1>
          <p className="mt-3 text-sm leading-6 text-text-muted">
            Create your business profile, sign in, and verify the Naira account we should settle to.
          </p>
        </section>

        <MerchantOnboarding onCompleteHref="/dashboard" />
      </div>
    </main>
  );
}
