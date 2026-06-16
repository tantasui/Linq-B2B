"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Bell, Home, QrCode, ReceiptText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMerchantMe, setActiveBusinessId, setActiveDynamicUserId, syncMerchantWallets } from "@/lib/api-client";
import type { MerchantRecord, StablecoinSymbol } from "@/server/types";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { useDynamicBridge } from "@/components/providers/DynamicBridgeProvider";

const navigation = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Receive", href: "/dashboard/receive", icon: QrCode },
  { name: "Orders", href: "/dashboard/transactions", icon: ReceiptText },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dynamic = useDynamicBridge();
  const isDashboardHome = pathname === "/dashboard";
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const lastWalletSync = useRef("");
  const dynamicUserId = dynamic.user?.id ?? "";
  const walletPayload = useMemo(
    () =>
      dynamic.wallets.map((wallet) => ({
        walletId: wallet.id,
        chain: wallet.chain,
        network: wallet.network,
        address: wallet.address,
        walletType: wallet.walletType,
        tokenSupport: ["USDSUI", "USDC"] satisfies StablecoinSymbol[],
      })),
    [dynamic.wallets],
  );

  useEffect(() => {
    if (dynamicUserId) setActiveDynamicUserId(dynamicUserId);
    getMerchantMe()
      .then((data) => {
        setMerchant(data.merchant);
        if (data.merchant?.id) setActiveBusinessId(data.merchant.id);
      })
      .catch(() => setMerchant(null));
  }, [dynamicUserId]);

  useEffect(() => {
    if (!merchant?.id || !walletPayload.length) return;
    const signature = JSON.stringify({ businessId: merchant.id, walletPayload });
    if (lastWalletSync.current === signature) return;
    lastWalletSync.current = signature;
    syncMerchantWallets({ businessId: merchant.id, wallets: walletPayload })
      .then(({ wallets }) => setMerchant((current) => (current ? { ...current, wallets } : current)))
      .catch(() => {
        lastWalletSync.current = "";
      });
  }, [merchant?.id, walletPayload]);

  return (
    <div className="min-h-screen bg-[#f6f3fb] text-zinc-950">
      <div className="mx-auto min-h-screen w-full max-w-[460px] border-x border-zinc-100 bg-[#fdfcfb] shadow-[0_0_70px_rgba(55,29,98,.08)]">
        <header className="sticky top-0 z-30 flex h-[66px] items-center justify-between border-b border-zinc-100 bg-[#fdfcfb]/95 px-5 backdrop-blur-xl">
          <Link href="/dashboard" className="flex items-center gap-3 transition-opacity duration-200 hover:opacity-80">
            {isDashboardHome ? (
              <>
                <MerchantAvatar className="h-10 w-10" />
                <div>
                  <p className="text-xs text-zinc-500">Welcome back</p>
                  <p className="text-sm font-medium">{merchant?.businessName ?? "Set up business"}</p>
                </div>
              </>
            ) : (
              <p className="text-sm font-medium text-[#8A4FFF]">Linq</p>
            )}
          </Link>
          <button aria-label="Notifications" className="relative rounded-full border border-zinc-100 bg-white p-3 text-zinc-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <Bell className="h-5 w-5" />
            <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#8A4FFF]" />
          </button>
        </header>

        <main className="min-h-[calc(100vh-66px)] px-5 pb-28 pt-6">{children}</main>

        <nav className="fixed bottom-0 left-1/2 z-40 flex h-[76px] w-full max-w-[460px] -translate-x-1/2 items-start justify-around border-t border-zinc-100 bg-white/98 px-2 pt-3 backdrop-blur-xl">
          {navigation.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex min-w-[66px] flex-col items-center gap-1.5 text-[11px] transition duration-200 hover:-translate-y-0.5",
                  active ? "text-[#8A4FFF]" : "text-zinc-400",
                )}
              >
                <span className="px-4 py-1.5">
                  <item.icon className="h-5 w-5" />
                </span>
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
