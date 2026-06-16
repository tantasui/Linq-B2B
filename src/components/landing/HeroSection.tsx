"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

export function HeroSection() {
  return (
    <section className="relative min-h-screen bg-black overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 grid-pattern opacity-50" />

      {/* Purple Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[#8A4FFF]/20 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#8A4FFF]/15 blur-[100px]" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#8A4FFF]/30 bg-[#8A4FFF]/10 text-[#A978FF] text-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-[#8A4FFF] animate-pulse" />
              Now supporting 5+ chains
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold text-white leading-[1.1] mb-6">
              Accept crypto.
              <br />
              <span className="gradient-text">Get paid in fiat.</span>
            </h1>

            <p className="text-xl text-zinc-400 mb-8 max-w-lg leading-relaxed">
              The simplest way to accept cryptocurrency payments and instantly convert them to your local currency. No volatility risk. No hassle.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="bg-[#8A4FFF] hover:bg-[#7B3FEE] text-white rounded-full px-8 h-14 text-lg font-medium group"
                >
                  Start accepting payments
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-zinc-700 text-white hover:bg-white/5 rounded-full px-8 h-14 text-lg"
              >
                <Play className="w-5 h-5 mr-2" />
                View setup
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-6">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center text-sm text-white"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="text-white font-semibold">2,500+ merchants</div>
                <div className="text-zinc-500">trust Linq</div>
              </div>
            </div>
          </motion.div>

          {/* Right Visual - Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/50 backdrop-blur-xl purple-glow">
              {/* Dashboard Preview */}
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-sm text-zinc-500">Total Balance</div>
                    <div className="text-3xl font-bold text-white">$84,532.41</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 text-sm">
                      +12.5%
                    </div>
                  </div>
                </div>

                {/* Chart Preview */}
                <div className="h-40 mb-6 relative">
                  <svg viewBox="0 0 400 100" className="w-full h-full">
                    <defs>
                      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#8A4FFF" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#8A4FFF" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,80 C50,70 100,30 150,40 C200,50 250,20 300,30 C350,40 400,10 400,20 L400,100 L0,100 Z"
                      fill="url(#chartGradient)"
                    />
                    <path
                      d="M0,80 C50,70 100,30 150,40 C200,50 250,20 300,30 C350,40 400,10 400,20"
                      fill="none"
                      stroke="#8A4FFF"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                {/* Recent Transactions */}
                <div className="space-y-3">
                  {[
                    { amount: "+$1,250.00", desc: "ETH payment received", chain: "Ethereum" },
                    { amount: "+$840.00", desc: "USDC payment", chain: "Base" },
                    { amount: "+$2,100.00", desc: "USDT payment", chain: "Tron" },
                  ].map((tx, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#8A4FFF]/20 flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full bg-[#8A4FFF]" />
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">{tx.desc}</div>
                          <div className="text-zinc-500 text-xs">{tx.chain}</div>
                        </div>
                      </div>
                      <div className="text-green-400 font-medium">{tx.amount}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
              className="absolute -top-4 -right-4 p-4 rounded-xl bg-zinc-900 border border-white/10 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <Image
                  src="https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=040"
                  alt="ETH"
                  width={32}
                  height={32}
                  unoptimized
                />
                <div>
                  <div className="text-white font-semibold text-sm">Ethereum</div>
                  <div className="text-green-400 text-xs">Connected</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
              className="absolute -bottom-4 -left-4 p-4 rounded-xl bg-zinc-900 border border-white/10 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">Auto-convert</div>
                  <div className="text-zinc-400 text-xs">To USD enabled</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Chain Logos */}
      <div className="relative border-t border-white/5 bg-black/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <p className="text-center text-zinc-500 text-sm mb-8">Supported on all major chains</p>
          <div className="flex items-center justify-center gap-12 flex-wrap">
            {[
              { name: "Ethereum", logo: "https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=040" },
              { name: "Base", logo: "https://images.mirror-media.xyz/publication-images/cgqxxPdUFBDjgKna_dDir.png" },
              { name: "Arbitrum", logo: "https://cryptologos.cc/logos/arbitrum-arb-logo.svg?v=040" },
              { name: "Tron", logo: "https://cryptologos.cc/logos/tron-trx-logo.svg?v=040" },
              { name: "BNB", logo: "https://cryptologos.cc/logos/bnb-bnb-logo.svg?v=040" },
            ].map((chain) => (
              <div key={chain.name} className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                <Image
                  src={chain.logo}
                  alt={chain.name}
                  width={32}
                  height={32}
                  className="grayscale hover:grayscale-0 transition-all"
                  unoptimized
                />
                <span className="text-zinc-400 font-medium">{chain.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
