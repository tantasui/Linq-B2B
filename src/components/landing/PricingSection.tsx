"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    description: "Perfect for small businesses just getting started",
    price: "0",
    priceLabel: "Free forever",
    features: [
      "Up to $10,000/month volume",
      "2 team members",
      "Payment links",
      "Basic analytics",
      "Email support",
    ],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Growth",
    description: "For growing businesses with higher volume",
    price: "1",
    priceLabel: "1% per transaction",
    features: [
      "Unlimited volume",
      "10 team members",
      "Payment links + API access",
      "Advanced analytics",
      "Priority support",
      "Custom branding",
      "Webhooks & integrations",
    ],
    cta: "Get Started",
    highlighted: true,
  },
  {
    name: "Enterprise",
    description: "For large organizations with custom needs",
    price: "Custom",
    priceLabel: "Contact us",
    features: [
      "Unlimited everything",
      "Unlimited team members",
      "Custom API limits",
      "White-label solution",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-32 bg-black">
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#8A4FFF]/30 bg-[#8A4FFF]/10 text-[#A978FF] text-sm mb-6">
            Pricing
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Simple, transparent
            <br />
            <span className="gradient-text">pricing for everyone</span>
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            No hidden fees. No monthly minimums. Just pay as you go.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl p-8 ${
                plan.highlighted
                  ? "bg-gradient-to-b from-[#8A4FFF]/20 to-zinc-900 border-2 border-[#8A4FFF]/50"
                  : "bg-zinc-900/50 border border-white/10"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#8A4FFF] text-white text-sm font-medium">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                <p className="text-zinc-400 text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                {plan.price === "Custom" ? (
                  <div className="text-4xl font-bold text-white">{plan.price}</div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-zinc-400">%</span>
                  </div>
                )}
                <div className="text-zinc-500 text-sm mt-1">{plan.priceLabel}</div>
              </div>

              <Link href="/dashboard" className="block mb-8">
                <Button
                  className={`w-full rounded-full h-12 ${
                    plan.highlighted
                      ? "bg-[#8A4FFF] hover:bg-[#7B3FEE] text-white"
                      : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                  }`}
                >
                  {plan.cta}
                </Button>
              </Link>

              <div className="space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      plan.highlighted ? "bg-[#8A4FFF]/20" : "bg-white/10"
                    }`}>
                      <Check className={`w-3 h-3 ${plan.highlighted ? "text-[#8A4FFF]" : "text-zinc-400"}`} />
                    </div>
                    <span className="text-zinc-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
