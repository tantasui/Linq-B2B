"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Create your account",
    description: "Sign up in less than 2 minutes. No KYC required to start accepting payments.",
  },
  {
    number: "02",
    title: "Get your wallet addresses",
    description: "We generate dedicated addresses for each chain. Share them or create payment links.",
  },
  {
    number: "03",
    title: "Accept crypto payments",
    description: "Customers send USDC or USDT. You get notified instantly when payment is received.",
  },
  {
    number: "04",
    title: "Auto-convert & withdraw",
    description: "We convert crypto to fiat automatically. Withdraw to your bank anytime.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-32 bg-zinc-950">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#8A4FFF]/30 bg-[#8A4FFF]/10 text-[#A978FF] text-sm mb-6">
            How It Works
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Get started in
            <br />
            <span className="gradient-text">four simple steps</span>
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="relative"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-[#8A4FFF]/50 to-transparent" />
              )}

              <div className="relative p-6">
                {/* Number */}
                <div className="text-6xl font-bold text-[#8A4FFF]/20 mb-4">{step.number}</div>

                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Visual Demo */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 relative"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none z-10" />

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Payment Link Card */}
            <div className="rounded-2xl bg-zinc-900 border border-white/10 p-6">
              <div className="text-zinc-400 text-sm mb-4">Payment Link</div>
              <div className="p-4 rounded-xl bg-white/5 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#8A4FFF]/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#8A4FFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">uselinq.site/pay/your-link</div>
                    <div className="text-zinc-500 text-xs">Created 2 min ago</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-lg bg-[#8A4FFF] text-white text-sm font-medium">
                  Copy Link
                </button>
                <button className="py-2 px-4 rounded-lg bg-white/5 text-zinc-400 text-sm">
                  QR
                </button>
              </div>
            </div>

            {/* Incoming Payment */}
            <div className="rounded-2xl bg-zinc-900 border border-white/10 p-6">
              <div className="text-zinc-400 text-sm mb-4">Incoming Payment</div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-semibold">+$250.00</div>
                    <div className="text-zinc-500 text-sm">USDC on Base</div>
                  </div>
                </div>
                <div className="text-green-400 text-sm">Confirmed</div>
              </div>
              <div className="h-px bg-white/10 mb-4" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">From</span>
                  <span className="text-white font-mono">0x8a4f...3c2d</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Network fee</span>
                  <span className="text-white">$0.02</span>
                </div>
              </div>
            </div>

            {/* Auto Conversion */}
            <div className="rounded-2xl bg-zinc-900 border border-white/10 p-6">
              <div className="text-zinc-400 text-sm mb-4">Auto Conversion</div>
              <div className="p-4 rounded-xl bg-white/5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs text-blue-400">$</div>
                    <span className="text-white">250.00 USDC</span>
                  </div>
                  <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs text-green-400">$</div>
                  <span className="text-white font-semibold">$249.75 USD</span>
                </div>
              </div>
              <div className="text-center text-sm text-zinc-500">
                0.1% conversion fee applied
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
