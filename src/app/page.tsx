import Link from "next/link";
import { ArrowRight, Check, Command, Link2, QrCode, ShieldCheck, Waypoints } from "lucide-react";
import { AuthRedirect } from "@/components/AuthRedirect";

const networks = ["Ethereum", "Base", "Arbitrum", "Tron", "BNB Chain"];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#0b0b10]">
      <AuthRedirect />
      <nav className="absolute left-0 right-0 top-0 z-10">
        <div className="mx-auto flex h-20 max-w-7xl items-center px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-3 text-lg font-semibold tracking-[-0.04em]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#8A4FFF] text-white">
              <Command className="h-5 w-5" />
            </span>
            Linq
          </Link>
          <div className="ml-16 hidden items-center gap-9 text-sm text-zinc-600 md:flex">
            <a href="#products">Products</a>
            <a href="#network">Networks</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/onboarding" className="hidden px-4 py-2 text-sm sm:block">Setup</Link>
            <Link href="/onboarding" className="rounded-full bg-[#8A4FFF] px-5 py-3 text-sm font-medium text-white">Start now</Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b border-black/[0.06] px-6 pb-24 pt-36 lg:px-10 lg:pb-32 lg:pt-48">
        <div className="absolute left-[45%] top-[-18rem] h-[48rem] w-[58rem] rounded-full bg-[#8A4FFF]/20 blur-[95px]" />
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(0,0,0,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.045)_1px,transparent_1px)] [background-size:76px_76px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[.95fr_1.05fr]">
          <div>
            <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#8A4FFF]/20 bg-white/60 px-4 py-2 text-sm text-[#6d32e5]">
              <span className="h-2 w-2 rounded-full bg-[#8A4FFF]" />
              Stablecoin payments, simplified
            </p>
            <h1 className="max-w-xl text-6xl font-medium leading-[.95] tracking-[-0.075em] sm:text-7xl">
              Money moves at internet speed.
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-zinc-600">
              Create payment links and accept USDC or USDT across every network your customers already use.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-full bg-[#8A4FFF] px-7 py-4 text-sm font-medium text-white">
                Start setup <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/onboarding" className="rounded-full border border-black/10 bg-white px-7 py-4 text-sm font-medium">
                Create receive link
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[32px] border border-black/[0.07] bg-white p-4 shadow-[0_40px_110px_rgba(50,23,104,.13)]">
              <div className="overflow-hidden rounded-[25px] border border-[#eee8fb] bg-[#fdfcff] p-6 text-zinc-950 sm:p-8">
                <div className="flex justify-between">
                  <p className="text-sm text-zinc-500">Live volume</p>
                  <span className="rounded-full bg-[#f3edff] px-3 py-1 text-xs text-[#8A4FFF]">Beta</span>
                </div>
                <p className="mt-4 text-4xl font-medium tracking-[-0.06em]">₦0</p>
                <div className="mt-10 h-28">
                  <svg viewBox="0 0 500 110" className="h-full w-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="hero-flow" x2="0" y2="1">
                        <stop stopColor="#8A4FFF" stopOpacity=".42" />
                        <stop offset="1" stopColor="#8A4FFF" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0 93 C70 72 92 80 142 48 C191 18 219 61 273 51 C334 40 348 62 408 32 C444 15 468 22 500 7 L500 110 L0 110Z" fill="url(#hero-flow)" />
                    <path d="M0 93 C70 72 92 80 142 48 C191 18 219 61 273 51 C334 40 348 62 408 32 C444 15 468 22 500 7" fill="none" stroke="#8A4FFF" strokeWidth="3" />
                  </svg>
                </div>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {[
                    ["No live order yet", "Create a link", "Paycrest"],
                    ["No payout yet", "Verify bank", "Wallet"],
                  ].map(([client, total, chain]) => (
                    <div key={client} className="rounded-2xl border border-zinc-100 bg-white p-4">
                      <p className="text-xs text-zinc-500">{chain}</p>
                      <p className="mt-4 text-sm text-zinc-600">{client}</p>
                      <p className="mt-1 font-medium">{total}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-7 -left-5 hidden rounded-2xl border border-black/[0.06] bg-white p-4 shadow-xl sm:flex sm:items-center sm:gap-3">
              <Check className="h-5 w-5 rounded-full bg-[#8A4FFF] p-1 text-white" />
              <div className="text-sm"><p className="font-medium">Ready for beta</p><p className="text-zinc-500">Connect live backend</p></div>
            </div>
          </div>
        </div>
      </section>

      <section id="network" className="border-b border-black/[0.06] bg-white/45 px-6 py-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-zinc-500 lg:flex-row lg:items-center lg:justify-between">
          <span>Settle on networks customers trust</span>
          <div className="flex flex-wrap gap-x-9 gap-y-3 font-medium text-zinc-700">
            {networks.map((network) => <span key={network}>{network}</span>)}
          </div>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8A4FFF]">Platform</p>
          <h2 className="mt-5 text-4xl font-medium tracking-[-0.06em] sm:text-5xl">Payment infrastructure with no crypto clutter.</h2>
        </div>
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {[
            { icon: Link2, title: "Payment links", body: "Price an invoice once. Let customers select wallet, stablecoin, and route." },
            { icon: QrCode, title: "Wallet deposits", body: "Generate network-specific QR destinations for USDC and USDT collections." },
            { icon: Waypoints, title: "Operations analytics", body: "Measure incoming flow, conversion, and settlement quality in real time." },
          ].map((feature) => (
            <div key={feature.title} className="rounded-[26px] border border-black/[0.07] bg-white p-8">
              <feature.icon className="h-6 w-6 text-[#8A4FFF]" />
              <h3 className="mt-14 text-xl font-medium tracking-tight">{feature.title}</h3>
              <p className="mt-4 leading-7 text-zinc-600">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-t border-zinc-100 bg-[#f7f3ff] px-6 py-24 text-zinc-950 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-12 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#8A4FFF]">Get started</p>
            <h2 className="mt-5 max-w-xl text-4xl font-medium tracking-[-0.06em] sm:text-5xl">One percent per successful payment.</h2>
            <p className="mt-5 text-zinc-600">No setup cost. No monthly fee. No minimum volume.</p>
          </div>
          <div className="rounded-[28px] border border-zinc-100 bg-white p-7 shadow-[0_20px_60px_rgba(70,35,120,.08)] sm:w-96">
            {["Payment links and QR receive", "USDC and USDT support", "Nine supported networks", "Analytics included"].map((line) => (
              <p key={line} className="flex items-center gap-3 border-b border-zinc-100 py-4 text-sm text-zinc-600 last:border-0">
                <ShieldCheck className="h-4 w-4 text-[#8A4FFF]" />
                {line}
              </p>
            ))}
            <Link href="/onboarding" className="mt-6 flex justify-center rounded-full bg-[#8A4FFF] px-6 py-4 text-sm font-medium">
              Start accepting payments
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
