"use client";

import { motion } from "framer-motion";
import { Zap, Shield, Globe, ArrowRightLeft, Link2, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Settlement",
    description: "Receive payments in seconds with our lightning-fast processing. No waiting days for bank transfers.",
    color: "#8A4FFF",
  },
  {
    icon: ArrowRightLeft,
    title: "Auto-Convert to Fiat",
    description: "Automatically convert crypto to USD, EUR, or your preferred currency. Zero exposure to volatility.",
    color: "#22C55E",
  },
  {
    icon: Link2,
    title: "Payment Links",
    description: "Generate shareable payment links in seconds. Perfect for invoices, donations, or one-time purchases.",
    color: "#F59E0B",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade security with multi-sig wallets, encryption, and real-time fraud detection.",
    color: "#3B82F6",
  },
  {
    icon: Globe,
    title: "Multi-Chain Support",
    description: "Accept payments on Ethereum, Base, Arbitrum, Tron, and BNB Chain. All major stablecoins supported.",
    color: "#EC4899",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Deep insights into your payment data. Track volume, conversion rates, and customer behavior.",
    color: "#06B6D4",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-32 bg-black">
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#8A4FFF]/30 bg-[#8A4FFF]/10 text-[#A978FF] text-sm mb-6">
            Features
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Everything you need to
            <br />
            <span className="gradient-text">accept crypto payments</span>
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Built for modern businesses that want to tap into the $2 trillion crypto economy without the complexity.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-8 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-[#8A4FFF]/30 transition-all duration-300"
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                style={{ backgroundColor: `${feature.color}20` }}
              >
                <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
              </div>

              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Large Feature Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 p-8 lg:p-12 rounded-2xl bg-gradient-to-br from-[#8A4FFF]/20 to-transparent border border-[#8A4FFF]/20"
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-white mb-4">
                One dashboard for all your crypto payments
              </h3>
              <p className="text-lg text-zinc-400 mb-6">
                Track payments, manage invoices, view analytics, and withdraw your earnings — all from a single, intuitive dashboard.
              </p>
              <ul className="space-y-3">
                {[
                  "Real-time payment notifications",
                  "Multi-currency balance management",
                  "Detailed transaction history",
                  "One-click withdrawals to your bank",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-zinc-300">
                    <div className="w-5 h-5 rounded-full bg-[#8A4FFF]/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#8A4FFF]" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Mini Dashboard */}
            <div className="relative">
              <div className="rounded-xl bg-zinc-900 border border-white/10 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Today&apos;s Volume</span>
                  <span className="text-green-400 text-sm">+23.5%</span>
                </div>
                <div className="text-3xl font-bold text-white">$12,450.00</div>
                <div className="h-24 relative">
                  <svg viewBox="0 0 200 60" className="w-full h-full">
                    <defs>
                      <linearGradient id="miniGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#8A4FFF" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#8A4FFF" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,50 C30,45 60,20 100,30 C140,40 170,15 200,25 L200,60 L0,60 Z"
                      fill="url(#miniGradient)"
                    />
                    <path
                      d="M0,50 C30,45 60,20 100,30 C140,40 170,15 200,25"
                      fill="none"
                      stroke="#8A4FFF"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-white/5">
                    <div className="text-zinc-400 text-xs mb-1">Transactions</div>
                    <div className="text-white font-semibold">847</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <div className="text-zinc-400 text-xs mb-1">Avg. Value</div>
                    <div className="text-white font-semibold">$14.70</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
