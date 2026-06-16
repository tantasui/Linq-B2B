"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#8A4FFF] flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-5 h-5 text-white"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Linq</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors">
                Products <ChevronDown className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                <DropdownMenuItem className="text-zinc-300 hover:text-white focus:text-white focus:bg-zinc-800">
                  Payment Links
                </DropdownMenuItem>
                <DropdownMenuItem className="text-zinc-300 hover:text-white focus:text-white focus:bg-zinc-800">
                  Crypto Invoicing
                </DropdownMenuItem>
                <DropdownMenuItem className="text-zinc-300 hover:text-white focus:text-white focus:bg-zinc-800">
                  On-Chain Payments
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="#docs" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Docs
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5">
                Setup
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button className="bg-[#8A4FFF] hover:bg-[#7B3FEE] text-white rounded-full px-6">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 border-t border-white/5">
          <div className="px-6 py-4 space-y-4">
            <Link href="#features" className="block text-zinc-400 hover:text-white">
              Features
            </Link>
            <Link href="#pricing" className="block text-zinc-400 hover:text-white">
              Pricing
            </Link>
            <Link href="#docs" className="block text-zinc-400 hover:text-white">
              Docs
            </Link>
            <div className="pt-4 border-t border-zinc-800 space-y-2">
              <Link href="/dashboard" className="block">
                <Button variant="outline" className="w-full border-zinc-700 text-white">
                  Setup
                </Button>
              </Link>
              <Link href="/dashboard" className="block">
                <Button className="w-full bg-[#8A4FFF] hover:bg-[#7B3FEE] text-white">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
