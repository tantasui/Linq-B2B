"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="relative py-32 bg-black overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#8A4FFF]/20 blur-[150px]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl lg:text-6xl font-bold text-white mb-6">
            Ready to accept
            <br />
            <span className="gradient-text">crypto payments?</span>
          </h2>
          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
            Join merchants using Linq to grow their business with stablecoin payments.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="bg-[#8A4FFF] hover:bg-[#7B3FEE] text-white rounded-full px-10 h-14 text-lg font-medium group"
              >
                Get started free
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-zinc-700 text-white hover:bg-white/5 rounded-full px-10 h-14 text-lg"
            >
              Talk to sales
            </Button>
          </div>

          <p className="mt-8 text-zinc-500 text-sm">
            No credit card required. Start accepting payments in minutes.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
