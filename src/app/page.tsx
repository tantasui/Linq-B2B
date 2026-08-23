"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Link2, Menu, QrCode, ShieldCheck, Waypoints, X } from "lucide-react";
import { AuthRedirect } from "@/components/AuthRedirect";
import { LinqMark, LinqWordmark } from "@/components/brand/LinqMark";
import { Receipt } from "@/components/brand/Receipt";
import { SegmentedBar } from "@/components/brand/SegmentedBar";
import { NetworkLogo } from "@/components/icons/NetworkLogos";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ENABLED_CHAINS } from "@/lib/chains";
import { cn } from "@/lib/utils";
import type { OrderRecord } from "@/server/types";

/** A representative receipt, so the hero shows the actual product surface. */
const heroReceipt: OrderRecord = {
  id: "ord_8fd21c4a",
  businessId: "biz_1",
  payerName: "Adaeze Okonkwo",
  payerEmail: "adaeze@example.com",
  amountNgn: 485_000,
  token: "USDC",
  network: "base",
  quotedRate: 1612,
  cryptoAmountDue: 300.87,
  transactionFee: 0.45,
  paycrestOrderId: "0x7d3f9ac41b8e25f6a0c9",
  status: "settled",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const FEATURES = [
  {
    icon: Link2,
    title: "Payment links",
    body: "Price an invoice once. Your customer picks the wallet, the stablecoin and the chain.",
  },
  {
    icon: QrCode,
    title: "Wallet deposits",
    body: "Network-specific deposit addresses and QR codes for every stablecoin and chain we support.",
  },
  {
    icon: Waypoints,
    title: "Settlement analytics",
    body: "Watch incoming flow, settlement rate and payout quality without exporting a spreadsheet.",
  },
];

const STEPS = [
  ["Share a link", "Generate a receive link or a fixed payment request in one tap."],
  ["Customer pays in crypto", "They choose a chain, send stablecoins, and see the status live."],
  ["You get Naira", "Linq converts and settles to your verified bank account, with a receipt."],
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-bg text-text">
      <AuthRedirect />

      <nav className="sticky top-0 z-50 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center gap-8 px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-2.5 text-accent">
            <LinqMark size={32} />
            <LinqWordmark size={18} />
          </Link>

          <div className="hidden items-center gap-8 text-sm text-text-muted md:flex">
            <a href="#products" className="transition-colors duration-fast ease-linq hover:text-text">
              Products
            </a>
            <a href="#how" className="transition-colors duration-fast ease-linq hover:text-text">
              How it works
            </a>
            <a href="#pricing" className="transition-colors duration-fast ease-linq hover:text-text">
              Pricing
            </a>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle className="hidden sm:flex" />
            <Link
              href="/login"
              className="hidden px-3 py-2 text-sm text-text-muted transition-colors duration-fast ease-linq hover:text-text sm:block"
            >
              Log in
            </Link>
            <Link href="/onboarding" className={buttonClasses({ className: "rounded-full" })}>
              Start now
            </Link>
            <button
              type="button"
              aria-label="Menu"
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-10 w-10 place-items-center rounded-md text-text-muted transition duration-fast ease-linq hover:bg-surface-2 active:scale-[0.94] md:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="linq-fade-in border-t border-line bg-surface px-6 py-4 md:hidden">
            <div className="flex flex-col gap-1">
              {[
                ["Products", "#products"],
                ["How it works", "#how"],
                ["Pricing", "#pricing"],
                ["Log in", "/login"],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-sm px-3 py-2.5 text-sm text-text-muted transition-colors duration-fast ease-linq hover:bg-surface-2 hover:text-text"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-line px-6 pb-24 pt-20 lg:px-10 lg:pb-28 lg:pt-28">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-22rem] h-[42rem] w-[62rem] -translate-x-1/2 rounded-full bg-accent/15 blur-[110px]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="mb-7 inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-2 text-xs font-medium text-accent-text">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Stablecoin payments, settled in Naira
            </p>
            <h1 className="max-w-xl text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl">
              Money moves at internet speed.
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-text-muted">
              Accept USDC, USDT and USDSUI across Sui, Base, BNB, Solana, Stellar and Tron. We
              convert and settle to your bank account, with a receipt for every payment.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/onboarding" className={buttonClasses({ size: "lg", className: "rounded-full px-7" })}>
                Start setup <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className={buttonClasses({ variant: "secondary", size: "lg", className: "rounded-full px-7" })}
              >
                Log in
              </Link>
            </div>
          </div>

          {/* The receipt is the product's signature surface — show it, don't describe it. */}
          <div className="relative">
            <Receipt order={heroReceipt} merchant={{ businessName: "Mama Tolu Foods" }} printing />
          </div>
        </div>
      </section>

      {/* ── Networks ── */}
      <section className="border-b border-line px-6 py-8 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 text-sm text-text-muted lg:flex-row lg:items-center lg:justify-between">
          <span>Settle stablecoins across chains</span>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            {ENABLED_CHAINS.map((chain) => (
              <span key={chain.id} className="flex items-center gap-2.5 font-medium text-text">
                <NetworkLogo network={chain.id} size={24} />
                {chain.shortName}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Products ── */}
      <section id="products" className="mx-auto max-w-6xl px-6 py-24 lg:px-10 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-micro uppercase tracking-[0.18em] text-accent-text">Platform</p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Payment infrastructure without the crypto clutter.
          </h2>
        </div>
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} interactive className="p-8">
              <feature.icon className="h-6 w-6 text-accent" />
              <h3 className="mt-12 text-lg font-medium tracking-[-0.02em]">{feature.title}</h3>
              <p className="mt-3 leading-7 text-text-muted">{feature.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="border-y border-line bg-surface px-6 py-24 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="text-micro uppercase tracking-[0.18em] text-accent-text">How it works</p>
          <h2 className="mt-5 max-w-xl text-4xl font-semibold tracking-[-0.04em]">
            Three steps from payment to payout.
          </h2>
          <div className="mt-14 grid gap-10 lg:grid-cols-3">
            {STEPS.map(([title, body], index) => (
              <div key={title}>
                <SegmentedBar value={index + 1} segments={3} />
                <h3 className="mt-6 text-lg font-medium tracking-[-0.02em]">{title}</h3>
                <p className="mt-3 leading-7 text-text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="px-6 py-24 lg:px-10 lg:py-28">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-12 lg:flex-row lg:items-center">
          <div>
            <p className="text-micro uppercase tracking-[0.18em] text-accent-text">Pricing</p>
            <h2 className="mt-5 max-w-xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              One percent per successful payment.
            </h2>
            <p className="mt-5 text-text-muted">No setup cost. No monthly fee. No minimum volume.</p>
          </div>
          <Card className="p-7 shadow-lg sm:w-96">
            {[
              "Payment links and QR receive",
              "USDC, USDT and USDSUI on six chains",
              "Receipts, exports and analytics",
            ].map((line) => (
              <p
                key={line}
                className="flex items-center gap-3 border-b border-line py-4 text-sm text-text-muted last:border-0"
              >
                <Check className="h-4 w-4 shrink-0 text-accent" />
                {line}
              </p>
            ))}
            <Link
              href="/onboarding"
              className={buttonClasses({ size: "lg", className: "mt-6 w-full rounded-full" })}
            >
              Start accepting payments
            </Link>
          </Card>
        </div>
      </section>

      <footer className="border-t border-line px-6 py-12 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <Link href="/" className="flex items-center gap-2.5 text-accent">
            <LinqMark size={28} />
            <LinqWordmark size={16} />
          </Link>
          <p className="text-xs text-text-subtle">
            © {new Date().getFullYear()} Linq · linq.xyz
          </p>
          <div className={cn("flex items-center gap-5 text-xs text-text-muted")}>
            <a href="mailto:support@linq.xyz" className="transition-colors duration-fast ease-linq hover:text-text">
              Support
            </a>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> Verified payouts
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
